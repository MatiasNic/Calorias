/** Server configuration from environment (Supabase secrets). Never shipped to the app. */
export interface ServerConfig {
  anthropicApiKey: string;
  aiModelFree: string;
  aiModelPremium: string;
  aiDailyBudgetUsd: number;
  aiMock: boolean;
  aiAlertWebhookUrl: string | null;
  usdaApiKey: string | null;
  revenuecatWebhookSecret: string | null;
  supabaseUrl: string;
  serviceRoleKey: string;
}

export function loadConfig(get: (key: string) => string | undefined): ServerConfig {
  return {
    anthropicApiKey: get('ANTHROPIC_API_KEY') ?? '',
    aiModelFree: get('AI_MODEL_FREE') || 'claude-haiku-4-5',
    aiModelPremium: get('AI_MODEL_PREMIUM') || 'claude-sonnet-5-5',
    aiDailyBudgetUsd: Number(get('AI_DAILY_BUDGET_USD') ?? '20') || 20,
    aiMock: get('AI_MOCK') === 'true' || !get('ANTHROPIC_API_KEY'),
    aiAlertWebhookUrl: get('AI_ALERT_WEBHOOK_URL') || null,
    usdaApiKey: get('USDA_FDC_API_KEY') || null,
    revenuecatWebhookSecret: get('REVENUECAT_WEBHOOK_SECRET') || null,
    supabaseUrl: get('SUPABASE_URL') ?? '',
    serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  };
}
