import type {
  ActivityLevel,
  AppLocale,
  CookingMethod,
  DietaryPreference,
  FoodSource,
  GoalMode,
  GoalType,
  MealItem,
  MealSource,
  MealType,
  Micronutrients,
  Nutrients,
  Sex,
  StrengthExercise,
  SupplementUnit,
  UnitSystem,
  WorkoutIntensity,
} from '@plato/shared';

/** Local record shapes (what screens read). Each collection maps 1:1 to a Supabase table. */

export interface ProfileRecord {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  sex: Sex | null;
  height_cm: number | null;
  unit_system: UnitSystem;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  weekly_rate_kg: number | null;
  target_weight_kg: number | null;
  dietary_preferences: DietaryPreference[];
  allergies: string[];
  timezone: string;
  locale: AppLocale;
  country: string | null;
  onboarding_completed: boolean;
  save_photos: boolean;
  analytics_consent: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
}

export interface GoalRecord {
  id: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  water_ml: number | null;
  mode: GoalMode;
  effective_from: string;
  tdee_estimate: number | null;
}

export interface MealRecord {
  id: string;
  eaten_at: string;
  local_date: string;
  meal_type: MealType;
  source: MealSource;
  photo_path: string | null;
  /** On-device copy of the photo (never synced). */
  local_photo_uri: string | null;
  note: string | null;
  ai_scan_id: string | null;
  items: MealItem[];
  totals: Nutrients;
}

export interface WaterRecord {
  id: string;
  logged_at: string;
  local_date: string;
  ml: number;
}

export interface WeightRecord {
  id: string;
  logged_at: string;
  local_date: string;
  weight_kg: number;
  source: 'manual' | 'health';
}

export interface MeasurementRecord {
  id: string;
  measured_at: string;
  local_date: string;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  body_fat_pct: number | null;
  photo_path: string | null;
}

export interface Serving {
  unit: string;
  grams: number;
  label?: string;
}

export interface CustomFoodRecord {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  per100g: Nutrients;
  micros?: Micronutrients;
  servings: Serving[];
  origin: 'manual' | 'label' | 'off' | 'ai';
}

export interface RecipeItem {
  display_name: string;
  food_id: string | null;
  food_source: FoodSource;
  grams: number;
  per100g: Nutrients;
}

export interface RecipeRecord {
  id: string;
  name: string;
  servings: number;
  note: string | null;
  items: RecipeItem[];
  total_grams: number;
  /** Totals for the whole recipe (all servings). */
  totals: Nutrients;
}

export interface FavoriteRecord {
  id: string;
  kind: 'food' | 'meal';
  label: string;
  payload: { items: MealItem[]; meal_type?: MealType };
}

export interface AchievementRecord {
  id: string;
  unlocked_at: string;
}

export interface ReminderTime {
  enabled: boolean;
  time: string;
}

export interface NotificationSettingsRecord {
  id: string;
  meal_reminders: Record<'breakfast' | 'lunch' | 'snack' | 'dinner', ReminderTime>;
  water_reminder: { enabled: boolean; everyHours: number; from: string; to: string };
  weigh_in_reminder: { enabled: boolean; weekday: number; time: string };
  smart_reminders: boolean;
  weekly_summary: boolean;
}

export interface StreakRecord {
  id: string;
  current_streak: number;
  longest_streak: number;
  last_logged_date: string | null;
}

export interface WorkoutRecord {
  id: string;
  started_at: string;
  local_date: string;
  /** ACTIVITIES key (packages/shared/src/training.ts). */
  activity: string;
  /** Optional custom title ("Piernas", "Fútbol con amigos"). */
  title: string | null;
  duration_min: number;
  intensity: WorkoutIntensity;
  /** Net kcal: estimated from METs unless the user typed it (kcal_source 'manual'). */
  kcal: number;
  kcal_source: 'estimated' | 'manual';
  distance_km: number | null;
  /** Gym log: exercises with sets of reps × kg. */
  exercises: StrengthExercise[];
  /** Perceived effort 1–10. */
  rpe: number | null;
  note: string | null;
}

export interface SupplementRecord {
  id: string;
  name: string;
  /** SUPPLEMENT_PRESETS key when created from a preset (for localized names/icons). */
  preset: string | null;
  dose_amount: number;
  dose_unit: SupplementUnit;
  /** 0 = Sunday … 6 = Saturday; empty = every day. */
  days: number[];
  /** "HH:MM", at least one. */
  times: string[];
  reminders: boolean;
  /** Doses left; null = not tracking stock. */
  stock: number | null;
  low_stock_threshold: number | null;
  /** Nutrition of one dose (e.g. whey); counted in the diary when count_in_macros. */
  nutrition: Nutrients | null;
  count_in_macros: boolean;
  active: boolean;
  start_date: string;
  note: string | null;
}

export interface SupplementIntakeRecord {
  id: string;
  supplement_id: string;
  taken_at: string;
  local_date: string;
  /** Scheduled "HH:MM" or "extra". */
  slot: string;
  dose_amount: number;
  /** Diary meal created when the supplement counts in macros. */
  meal_id: string | null;
}

export interface CollectionMap {
  profile: ProfileRecord;
  goals: GoalRecord;
  meals: MealRecord;
  water: WaterRecord;
  weight: WeightRecord;
  measurements: MeasurementRecord;
  foods_custom: CustomFoodRecord;
  recipes: RecipeRecord;
  favorites: FavoriteRecord;
  achievements: AchievementRecord;
  notification_settings: NotificationSettingsRecord;
  streaks: StreakRecord;
  workouts: WorkoutRecord;
  supplements: SupplementRecord;
  supplement_intakes: SupplementIntakeRecord;
}

export type CollectionName = keyof CollectionMap;

export type { CookingMethod };
