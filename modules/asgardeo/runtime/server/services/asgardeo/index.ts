import { AsgardeoNodeClient, type AuthClientConfig } from "@asgardeo/auth-node"; // Adjust import if necessary
import { useRuntimeConfig } from '#imports';

let _sdkInstance: AsgardeoNodeClient<any> | null = null;

export function getAsgardeoSdkInstance(): AsgardeoNodeClient<any> {
  if (_sdkInstance) {
    return _sdkInstance;
  }

  const config = useRuntimeConfig().public.asgardeoAuth;

  if (!config || !config.clientID || !config.baseUrl || !config.signInRedirectURL || !config.signOutRedirectURL) {
       throw new Error("Asgardeo SDK configuration is incomplete in runtimeConfig. Check module setup and nuxt.config.ts. Required: clientID, serverOrigin (maps to baseUrl), signInRedirectURL, signOutRedirectURL.");
  }

  const sdkConfig: AuthClientConfig = {
    clientID: config.clientID,
    clientSecret: useRuntimeConfig().asgardeoAuth.clientSecret as string, 
    baseUrl: config.baseUrl,
    signInRedirectURL: config.signInRedirectURL,
    signOutRedirectURL: config.signOutRedirectURL,
    scope: config.scope,
};

  console.log("Initializing Asgardeo Node SDK with config:", {
      clientID: sdkConfig.clientID,
      baseUrl: sdkConfig.baseUrl,
      signInRedirectURL: sdkConfig.signInRedirectURL,
      signOutRedirectURL: sdkConfig.signOutRedirectURL,
      scope: sdkConfig.scope,
  });

  try {
    _sdkInstance = new AsgardeoNodeClient(sdkConfig);
    console.log("Asgardeo Node SDK Initialized successfully.");
  } catch (error) {
     console.error("Failed to initialize Asgardeo Node SDK:", error);
     throw new Error("Asgardeo SDK Initialization failed. Check configuration and SDK compatibility.");
  }

  return _sdkInstance;
}