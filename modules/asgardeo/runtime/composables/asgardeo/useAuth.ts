// Client-side: composables/useAuth.ts
import { navigateTo } from '#imports'; // Make sure $fetch is imported

// Optional: Define or import a type for the user info for better type safety
// This should match the structure returned by your '/api/auth/user' endpoint
// (e.g., the structure of the `BasicUserInfo` type on the server)
interface BasicUserInfo {
  // Example properties - adjust based on your actual data
  sub: string; // Subject identifier is usually present
  name?: string;
  email?: string;
  picture?: string;
  // Add any other properties returned by getBasicUserInfo
  [key: string]: any; // Allow other properties if structure is dynamic
}

export const useAuth = () => {
  /**
   * Initiates the Asgardeo sign-in flow by redirecting the user
   * to the server-side sign-in handler.
   * @param { string } [callbackUrl] - Optional URL to redirect to after successful login. Defaults to current page.
   */
  const signIn = async (callbackUrl?: string) => {
    const targetUrl = '/api/auth/signin'; // Your server route to initiate login
    const options = {} as any;

    const redirectParam = callbackUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
    options.query = { callbackUrl: redirectParam };
    options.external = true; // Required for navigating away to Asgardeo

    console.log(`Redirecting to ${targetUrl} with callback ${redirectParam} to initiate Asgardeo login...`);
    await navigateTo(targetUrl, options);
  };

  /**
   * Initiates the sign-out flow by navigating to the server-side
   * sign-out handler. The server handler is responsible for clearing
   * the local session and redirecting the user to the Asgardeo
   * logout endpoint.
   */
  const signOut = async () => {
    const targetUrl = '/api/auth/signout'; // Your server route to handle logout
    const options = {
      external: true,
    };

    console.log(`Navigating to ${targetUrl} to initiate sign-out process...`);
    await navigateTo(targetUrl, options);
  };

  /**
   * Fetches basic information about the currently logged-in user
   * from the server-side '/api/auth/user' endpoint.
   * The browser automatically includes the necessary session cookie.
   * Returns the user info object on success, or null if the user is
   * not logged in or an error occurs.
   *
   * @returns {Promise<BasicUserInfo | null>} A promise resolving to user info or null.
   */
  const getUserInfo = async (): Promise<BasicUserInfo | null> => {
    // The target URL for the server-side user endpoint
    const targetUrl = '/api/auth/user';
    console.log(`Attempting to fetch user info from ${targetUrl}`);

    try {
      // Use $fetch to make a GET request. Cookies are sent automatically.
      // Specify the expected return type <BasicUserInfo> for type safety.
      const userInfo = await $fetch<BasicUserInfo>(targetUrl, {
        method: 'GET',
        // Optional: Set headers if needed, e.g., for content negotiation
        // headers: { 'Accept': 'application/json' }

        // $fetch automatically throws errors for non-2xx responses (like 401, 500)
      });

      console.log("User info fetched successfully:", userInfo);
      return userInfo;

    } catch (error: any) {
      // Catch errors thrown by $fetch (network errors, 4xx, 5xx responses)
      console.error(`Failed to fetch user info from ${targetUrl}:`, error.data || error.message || error);

      // If the error is a 401 Unauthorized, it means the session is invalid or missing
      if (error.response?.status === 401) {
        console.warn("User is not authenticated or session expired.");
      }
      // Return null to indicate that user info couldn't be retrieved
      return null;
    }
  };

  // Return all functions from the composable
  return {
    signIn,
    signOut,
    getUserInfo, // <-- Expose the new function
  };
};