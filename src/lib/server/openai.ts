import OpenAI from "openai";

/**
 * Pre-configured OpenAI client.
 *
 * Supports two credential sources, in order of precedence:
 *   1. Replit AI Integrations proxy — used in local Replit development.
 *      Requires BOTH `AI_INTEGRATIONS_OPENAI_BASE_URL` AND
 *      `AI_INTEGRATIONS_OPENAI_API_KEY`. The API key is a dummy string and
 *      the base URL routes through Replit's proxy. If only one of the two
 *      is set the integration is treated as misconfigured and we fall back
 *      to the direct credential — otherwise the dummy key would hit
 *      api.openai.com and 401 at runtime.
 *   2. Standard OpenAI direct (`OPENAI_API_KEY`) — used in production
 *      (Vercel) where the env var must be set on the project.
 *
 * Both env-var sources resolve to the same `openai` SDK instance, so
 * call-sites don't need to know which one is active.
 */
const integrationsKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const integrationsUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const directKey = process.env.OPENAI_API_KEY;

const useIntegrations = Boolean(integrationsKey && integrationsUrl);
const baseURL = useIntegrations ? integrationsUrl : undefined;
const apiKey = useIntegrations ? integrationsKey! : directKey || "";

export const openai = new OpenAI({ baseURL, apiKey });

export function isOpenAIConfigured(): boolean {
  return Boolean(apiKey);
}
