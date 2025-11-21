/**
 * Environment configuration with validation
 */

interface EnvConfig {
  apiKey: string | undefined;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Validates and returns environment configuration
 */
export const getEnvConfig = (): EnvConfig => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  return {
    apiKey,
    isDevelopment: (import.meta as any).env?.DEV ?? false,
    isProduction: (import.meta as any).env?.PROD ?? false,
  };
};

/**
 * Checks if API key is configured
 */
export const hasApiKey = (): boolean => {
  const config = getEnvConfig();
  return Boolean(config.apiKey && config.apiKey.length > 0);
};

/**
 * Gets the API key or throws an error if not configured
 */
export const requireApiKey = (): string => {
  const config = getEnvConfig();
  if (!config.apiKey) {
    throw new Error(
      'API key not configured. Please set GEMINI_API_KEY in your .env.local file.'
    );
  }
  return config.apiKey;
};

