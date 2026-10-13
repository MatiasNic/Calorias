/**
 * App-side AI client. Production: uploads the compressed photo to the private bucket and calls the
 * Edge Functions (the API key never leaves the server). Demo mode: deterministic fixtures with the
 * same contracts, a simulated delay and locally enforced daily quotas so the paywall can be tested.
 */
export { aiAvailable } from './mode';
export { analyzeMealPhoto, analyzeMealText, readNutritionLabel, reportAiMistake } from './analyze';
export type { PhotoAnalysis } from './analyze';
export { askCoach } from './coach';
export { generateMealPlan } from './mealPlan';
export { fetchQuotaStatus } from './quota';
