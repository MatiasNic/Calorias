#!/usr/bin/env bash
# Deploys the whole backend (database, seed, Edge Functions, secrets) to a Supabase project and
# prints the two public values the app needs. Idempotent: safe to run again.
#
# Required environment variables (never commit them; set them in your shell or CI secrets):
#   SUPABASE_ACCESS_TOKEN  personal token from https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_REF   project id (the xxxx in https://xxxx.supabase.co)
#   SUPABASE_DB_PASSWORD   database password chosen when creating the project
#   ANTHROPIC_API_KEY      key from https://console.anthropic.com (set a monthly spend limit!)
# Optional:
#   USDA_FDC_API_KEY, REVENUECAT_WEBHOOK_SECRET, AI_DAILY_BUDGET_USD (default 20),
#   AI_MODEL_FREE, AI_MODEL_PREMIUM, AI_ALERT_WEBHOOK_URL
set -euo pipefail

cd "$(dirname "$0")/.."
: "${SUPABASE_ACCESS_TOKEN:?missing}"
: "${SUPABASE_PROJECT_REF:?missing}"
: "${SUPABASE_DB_PASSWORD:?missing}"
: "${ANTHROPIC_API_KEY:?missing}"

SB="pnpm exec supabase"
echo "→ Linking project $SUPABASE_PROJECT_REF"
$SB link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "→ Applying migrations and the regional foods seed (upsert, safe to repeat)"
$SB db push --include-seed --password "$SUPABASE_DB_PASSWORD"

echo "→ Setting Edge Function secrets"
SECRETS_FILE="$(mktemp)"
trap 'rm -f "$SECRETS_FILE"' EXIT
{
  echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
  echo "AI_MODEL_FREE=${AI_MODEL_FREE:-claude-haiku-4-5}"
  echo "AI_MODEL_PREMIUM=${AI_MODEL_PREMIUM:-claude-sonnet-5-5}"
  echo "AI_DAILY_BUDGET_USD=${AI_DAILY_BUDGET_USD:-20}"
  echo "AI_MOCK=false"
  [ -n "${USDA_FDC_API_KEY:-}" ] && echo "USDA_FDC_API_KEY=$USDA_FDC_API_KEY"
  [ -n "${REVENUECAT_WEBHOOK_SECRET:-}" ] && echo "REVENUECAT_WEBHOOK_SECRET=$REVENUECAT_WEBHOOK_SECRET"
  [ -n "${AI_ALERT_WEBHOOK_URL:-}" ] && echo "AI_ALERT_WEBHOOK_URL=$AI_ALERT_WEBHOOK_URL"
} > "$SECRETS_FILE"
$SB secrets set --env-file "$SECRETS_FILE" --project-ref "$SUPABASE_PROJECT_REF"

echo "→ Deploying Edge Functions"
$SB functions deploy --project-ref "$SUPABASE_PROJECT_REF"

echo
echo "✔ Backend ready. Public values for the app build (safe to embed):"
echo "  EXPO_PUBLIC_SUPABASE_URL=https://${SUPABASE_PROJECT_REF}.supabase.co"
echo "  EXPO_PUBLIC_SUPABASE_ANON_KEY=$($SB projects api-keys --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null | awk '/anon/ {print $NF}')"
echo "  EXPO_PUBLIC_USE_MOCKS=false"
echo
echo "Remember in the dashboard: Auth → URL configuration → add bocado://auth/callback and"
echo "bocado://auth/reset-password; enable email confirmations; set a spend limit in Anthropic."
