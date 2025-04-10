import {
  defineEventHandler,
  sendRedirect,
  setCookie,
  getQuery,
  getCookie,
  deleteCookie,
  createError,
  // getMethod // Can use event.node.req.method directly
} from "h3";
import { getAsgardeoSdkInstance } from "#auth/server"; // Use the alias created in the module
import { randomUUID } from "node:crypto";

export default defineEventHandler(async (event) => {
  // Get the specific path segment requested after /api/auth/
  // Example: for /api/auth/signin, action will be "signin"
  const action = event.context.params?._;
  const method = event.node.req.method; // GET, POST, etc.

  // Get the SDK instance
  const sdk = getAsgardeoSdkInstance();

  // --- Route based on action ---

  // --- Sign-in Initiation ---
  // server/api/auth/[...].ts -> ONLY the 'signin' block - REVISED

  // --- Sign-in Initiation ---
  if (action === "signin" && method === "GET") {
    console.log("Handling GET /api/auth/signin");
    try {
      const query = getQuery(event);
      const callbackUrl = query.callbackUrl?.toString() || "/"; // Target URL after successful login

      // 1. Generate state UUID
      const stateUUID = randomUUID();
      console.log("Generated State (UUID):", stateUUID);

      // 2. Generate distinct temporary User ID (required by signIn method)
      const tempUserIdForSdk = `signin_request_${randomUUID()}`;
      console.log("Generated Temporary UserID:", tempUserIdForSdk);

      // 3. Store state UUID, temp UserID, AND callbackUrl in the cookie
      const cookieMaxAge = 60 * 10; // 10 minutes validity for auth flow
      const stateCookieData = {
        state: stateUUID, // The unique value for CSRF check
        tempUserId: tempUserIdForSdk, // The temporary ID SDK needs for context
        callbackUrl: callbackUrl, // Where to redirect after success
      };
      // Use JSON.stringify to store the object in the cookie
      setCookie(event, "auth_state", JSON.stringify(stateCookieData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/api/auth", // Important: Path prefix for your auth routes
        maxAge: cookieMaxAge,
        sameSite: "lax",
      });
      console.log("Stored in auth_state cookie:", stateCookieData);

      // 4. Prepare signInConfig object with the state (as required by SDK)
      const signInOptions = {
        state: stateUUID, // Pass the generated UUID state here
        // Add other config options if needed by SDK's getAuthURL internal call
      };
      console.log("Passing signInConfig to SDK:", signInOptions);

      // 5. Call sdk.signIn to generate Auth URL and trigger redirect
      // Ensure parameters are in the correct order based on SDK source
      await sdk.signIn(
        (authorizationUrl) => {
          // This callback function executes the redirect
          console.log("Redirecting to Asgardeo URL:", authorizationUrl); // Check state param in this URL!
          sendRedirect(event, authorizationUrl, 302);
        },
        tempUserIdForSdk, // 2nd arg: userID (must be non-empty)
        undefined, // 3rd arg: authorizationCode (none for initial request)
        undefined, // 4th arg: sessionState (none for initial request)
        undefined, // 5th arg: state (direct param - ignored for URL gen, pass via config)
        signInOptions // 6th arg: signInConfig (contains the actual state)
      );
      return; // Response is handled by sendRedirect within the callback
    } catch (error: any) {
      console.error("Error initiating Asgardeo sign in:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to initiate sign in",
        data: error.message,
      });
    }
  }

  // server/api/auth/[...].ts -> ONLY the 'callback' block - REVISED
  else if (action === "callback" && method === "GET") {
    console.log("Handling GET /api/auth/callback");

    // --- 1. Get state cookie and parse ALL required data ---
    const stateCookieRaw = getCookie(event, "auth_state");
    deleteCookie(event, "auth_state", { path: "/api/auth" });

    if (!stateCookieRaw) {
      throw createError({
        statusCode: 400,
        statusMessage: "Authentication callback error: State cookie missing.",
      });
    }

    let storedStateUUID: string | undefined;
    let tempUserId: string | undefined;
    let finalRedirectUrl: string = "/";
    try {
      const stateData = JSON.parse(stateCookieRaw);
      storedStateUUID = stateData.state;
      tempUserId = stateData.tempUserId;
      finalRedirectUrl = stateData.callbackUrl || "/";
      if (!storedStateUUID || !tempUserId) {
        throw new Error("Incomplete state data in cookie.");
      }
    } catch (e: any) {
      throw createError({
        statusCode: 400,
        statusMessage: "Authentication callback error: Invalid state cookie.",
      });
    }

    // --- 2. Get parameters from callback URL ---
    const query = getQuery(event);
    const authorizationCode = query.code?.toString();
    const sessionState = query.session_state?.toString() ?? "";
    const stateReceived = query.state?.toString();

    // --- 3. Validate State ---
    if (!stateReceived || !stateReceived.startsWith(storedStateUUID)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Authentication callback error: State mismatch.",
      });
    }

    // --- 4. Check for authorization code ---
    if (!authorizationCode) {
      if (query.error) {
        throw createError({
          statusCode: 400,
          statusMessage: `Authentication failed: ${
            query.error_description || query.error
          }`,
        });
      }
      throw createError({
        statusCode: 400,
        statusMessage: "Authorization code missing in callback.",
      });
    }

    // --- 5. Exchange code for tokens using sdk.signIn correctly ---
    try {
      console.log("State validated. Exchanging code for tokens...");

      const dummyRedirectCallback = () => {
        // No redirect needed here – handled by SDK or ignored in this path
        console.log("Token exchange path — no redirect callback triggered.");
      };

      const tokenResponse = await sdk.signIn(
        dummyRedirectCallback,
        tempUserId,
        authorizationCode,
        sessionState,
        stateReceived
      );

      // --- 6. Set cookies (access/refresh/id tokens) ---
      // --- 6. Set cookies (access/refresh/id tokens) ---
      const accessTokenMaxAge = tokenResponse.expiresIn
        ? parseInt(tokenResponse.expiresIn, 10)
        : 3600;

      setCookie(event, "auth_access_token", tokenResponse.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: accessTokenMaxAge,
        sameSite: "lax",
      });
      // ... (set other cookies for refresh_token, id_token as before) ...
      if (tokenResponse.refreshToken) {
        setCookie(event, "auth_refresh_token", tokenResponse.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // Example: 30 days
          sameSite: "lax",
        });
      }
      if (tokenResponse.idToken) {
        setCookie(event, "auth_id_token", tokenResponse.idToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: accessTokenMaxAge,
          sameSite: "lax",
        });
      }

      // --- 7. Redirect browser back to the application frontend ---
      // Ensure 'finalRedirectUrl' was correctly retrieved from the cookie earlier
      console.log(
        `Authentication successful. Redirecting to final destination: ${finalRedirectUrl}`
      );
      await sendRedirect(event, finalRedirectUrl, 302); // <<< --- THIS IS THE FIX ---
      return; // Explicitly return after handling response with redirect

      // --- REMOVE THE JSON RETURN ---
      // return { message: "Authentication successful" }; // <<< DELETE THIS LINE
    } catch (error: any) {
      console.error("Error during token exchange via sdk.signIn:", error);
      // Reinstate proper error handling for production
      const errorMessage =
        error && typeof error.message === "string"
          ? error.message
          : "An unexpected error occurred during token exchange.";
      const errorCode =
        error && error.code ? String(error.code) : "TOKEN_EXCHANGE_FAILED";
      throw createError({
        statusCode: 500,
        statusMessage: errorMessage,
        data: {
          code: errorCode,
          detail: error ? String(error) : "Unknown error",
        },
      });
    }
  }

  // 3. Add other actions like signout, refresh, session here...
  // else if (action === 'signout' && method === 'POST') { ... }
  // else if (action === 'session' && method === 'GET') { ... }

  // 4. If no action matched, return 404
  else {
    console.warn(`Auth action "${action}" with method "${method}" not found.`);
    throw createError({
      statusCode: 404,
      statusMessage: `Authentication endpoint not found for action: ${action}`,
    });
  }
});
