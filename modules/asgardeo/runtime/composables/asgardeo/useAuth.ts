// runtime/composables/asgardeo/useAuth.ts
import { navigateTo, useRequestURL } from '#imports' // Auto-imported by Nuxt

export const useAuth = () => {
  // Placeholder for reactive state (add later)
  // const status = useState('auth-status', () => 'unauthenticated')
  // const data = useState('auth-data', () => null)

  /**
   * Initiates the Asgardeo sign-in flow by redirecting the user
   * to the server-side sign-in handler.
   * @param { string } [callbackUrl] - Optional URL to redirect to after successful login. Defaults to current page.
   */
  const signIn = async (callbackUrl?: string) => {
    // We trigger the sign-in by navigating to our server endpoint
    // We can pass the desired final callback URL as a query parameter
    const targetUrl = '/api/auth/signin' // Your server route to initiate login
    const options = {} as any; // Use external: true for full page navigation

    // Store the intended callback URL. The server callback handler will use this later.
    // We could pass it via query param to /api/auth/signin
    const redirectParam = callbackUrl || useRequestURL().pathname
    options.query = { callbackUrl: redirectParam };
    options.external = true; // Required for navigating away to Asgardeo

    console.log(`Redirecting to ${targetUrl} to initiate Asgardeo login...`);
    await navigateTo(targetUrl, options);
  };

  // Placeholder for signOut (add later)
  const signOut = async () => {
    console.warn('signOut not implemented yet');
  };

  return {
    // status, // expose later
    // data,    // expose later
    signIn,
    signOut, // expose later
  };
};