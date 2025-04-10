import {
  defineEventHandler,
  sendRedirect,
  setCookie,
  getQuery,
  getCookie,
  createError,
  H3Event,
} from "h3";
import { getAsgardeoSdkInstance } from "./services/asgardeo/index";
import { randomUUID } from "node:crypto";
import type { CookieSerializeOptions } from "cookie-es";

export interface AsgardeoAuthHandlerOptions {
  basePath?: string;
  cookies?: {
    state?: string;
    sessionId?: string;
    defaultOptions?: CookieSerializeOptions;
    stateOptions?: CookieSerializeOptions;
    sessionIdOptions?: CookieSerializeOptions;
  };
  defaultCallbackUrl?: string;
}

function mergeCookieOptions(
  base: CookieSerializeOptions | undefined,
  specific: CookieSerializeOptions | undefined
): CookieSerializeOptions {
  return { ...base, ...specific };
}

export const createAsgardeoAuthHandler = (
  options?: AsgardeoAuthHandlerOptions
) => {
  const basePath = options?.basePath ?? "/api/auth";

  const isProduction = process.env.NODE_ENV === "production";

  const defaultCookieOptsFromUser = options?.cookies?.defaultOptions ?? {};

  const sessionIdCookieName =
    options?.cookies?.sessionId ?? "ASGARDEO_SESSION_ID";
  const sessionIdCookieOptions = mergeCookieOptions(
    {
      httpOnly: true,
      secure: isProduction,
      path: "/",
      sameSite: "lax",
      maxAge: 900000 / 1000,
    },
    { ...defaultCookieOptsFromUser, ...options?.cookies?.sessionIdOptions }
  );

  return defineEventHandler(async (event: H3Event) => {
    const action = event.context.params?._;
    const method = event.node.req.method;

    const sdk = getAsgardeoSdkInstance();
    if (!sdk) {
      console.error("Asgardeo SDK instance is not available.");
      throw createError({
        statusCode: 500,
        statusMessage: "Authentication SDK not configured.",
      });
    }

    if (action === "signin" && method === "GET") {
      console.log(`Handling GET ${basePath}/signin`);

      try {
        // 1. Generate session ID and store it in a cookie
        const sessionId = randomUUID();
        console.log(`Generated Session ID: ${sessionId}`);

        setCookie(
          event,
          sessionIdCookieName,
          sessionId,
          sessionIdCookieOptions
        );
        console.log(
          `Set ${sessionIdCookieName} cookie with ID: ${sessionId}, Options:`,
          sessionIdCookieOptions
        );

        // 2. Start sign-in with redirect
        await sdk.signIn(
          (authorizationUrl) => {
            console.log("Redirecting to Asgardeo URL:", authorizationUrl);
            sendRedirect(event, authorizationUrl, 302);
          },
          sessionId,
          getQuery(event).code?.toString(),
          getQuery(event).session_state?.toString(),
          getQuery(event).state?.toString()
        );

        return;
      } catch (error: any) {
        console.error("Error initiating Asgardeo sign in:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to initiate sign in",
          data: error.message,
        });
      }
    } else if (action === "callback" && method === "GET") {
      console.log(`Handling GET ${basePath}/callback`);

      const sessionId = getCookie(event, sessionIdCookieName);
      if (!sessionId) {
        console.error(`Missing ${sessionIdCookieName} cookie.`);
        throw createError({
          statusCode: 400,
          statusMessage: "Authentication callback error: Session ID missing.",
        });
      }
      console.log(`Retrieved Session ID from cookie: ${sessionId}`);

      const query = getQuery(event);
      const authorizationCode = query.code?.toString();
      const sessionState = query.session_state?.toString() ?? "";
      const stateReceived = query.state?.toString() ?? "";

      if (!authorizationCode) {
        console.error("Authorization code missing in callback.");
        if (query.error) {
          console.error(
            `Asgardeo returned error: ${query.error} - ${query.error_description}`
          );
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

      try {
        console.log("Exchanging code for tokens using Session ID:", sessionId);

        const dummyRedirectCallback = () => {};

        const tokenResponse = await sdk.signIn(
          dummyRedirectCallback,
          sessionId,
          authorizationCode,
          sessionState,
          stateReceived
        );

        if (
          !tokenResponse ||
          (!tokenResponse.accessToken && !tokenResponse.idToken)
        ) {
          console.error("Token exchange failed. Response:", tokenResponse);
          throw createError({
            statusCode: 500,
            statusMessage: "Token exchange failed: Invalid response from SDK.",
          });
        }

        console.log("Token exchange successful. Redirecting to '/'");
        await sendRedirect(event, "/", 302);

        const isAuth = await sdk.isAuthenticated(sessionId);
        if (isAuth) {
          console.log("✅ User is authenticated.");
        } else {
          console.log("❌ User is NOT authenticated.");
        }

        return;
      } catch (error: any) {
        console.error("Token exchange error:", error);
        throw createError({
          statusCode: 500,
          statusMessage: "Token exchange failed",
          data: error.message || "An unexpected error occurred",
        });
      }
    } else {
      console.warn(
        `Auth action "${action}" with method "${method}" not found.`
      );
      throw createError({
        statusCode: 404,
        statusMessage: `Authentication endpoint not found for action: ${action}`,
      });
    }
  });
};
