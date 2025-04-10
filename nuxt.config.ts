export default defineNuxtConfig({
  modules: ['./modules/asgardeo/module'],

  runtimeConfig: {
    // Private (server-only)
    asgardeoAuth: {
      clientSecret: process.env.ASGARDEO_CLIENT_SECRET
    },

    // Public (client + server)
    public: {
      asgardeoAuth: {
        clientID: process.env.ASGARDEO_CLIENT_ID || '',
        baseUrl: process.env.ASGARDEO_BASE_URL || '',
        signInRedirectURL: process.env.ASGARDEO_SIGN_IN_REDIRECT_URL,
        signOutRedirectURL: process.env.ASGARDEO_SIGN_OUT_REDIRECT_URL || 'http://localhost:3000',
        scope:['openid', 'profile'],
      }
    }
  },

  devtools: { enabled: true },
  compatibilityDate: '2025-04-09'
});