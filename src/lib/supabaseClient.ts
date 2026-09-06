import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NutritionLogEntry, GutHealthLogEntry, SupabaseConfig, DailyNutrientGoals } from '../types';

const STORAGE_KEY = 'trackmyplate_supabase_config';

/**
 * SQL Schema migration script to run directly in the Supabase SQL Editor.
 * Creates nutrition_logs, gut_health_logs, and user_goals with appropriate
 * column types, check constraints, indexes, and RLS policies.
 */
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- TrackMyPlate PostgreSQL Schema for Supabase
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Nutrition Logs Table (Macronutrients & Micronutrients)
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  meal TEXT NOT NULL,
  portion TEXT NOT NULL,
  calories NUMERIC(7,1) NOT NULL DEFAULT 0,
  protein NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat NUMERIC(6,1) NOT NULL DEFAULT 0,
  fiber NUMERIC(6,1) NOT NULL DEFAULT 0,
  sodium NUMERIC(7,1) NOT NULL DEFAULT 0,
  potassium NUMERIC(7,1) NOT NULL DEFAULT 0,
  key_vitamins JSONB DEFAULT '[]'::jsonb,
  is_estimated BOOLEAN DEFAULT true,
  confidence NUMERIC(5,2) DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Gut Health & FODMAP Logs Table
CREATE TABLE IF NOT EXISTS public.gut_health_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  meal_reference_id TEXT REFERENCES public.nutrition_logs(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL,
  ibs_risk_level TEXT NOT NULL CHECK (ibs_risk_level IN ('Low', 'Medium', 'High')),
  identified_triggers JSONB DEFAULT '[]'::jsonb,
  fodmap_fructans NUMERIC(5,2) DEFAULT 0,
  fodmap_lactose NUMERIC(5,2) DEFAULT 0,
  fodmap_excess_fructose NUMERIC(5,2) DEFAULT 0,
  fodmap_polyols NUMERIC(5,2) DEFAULT 0,
  fodmap_gos NUMERIC(5,2) DEFAULT 0,
  predictive_digestive_reaction TEXT,
  ai_recommendation TEXT,
  grounding_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Daily Goals & Corridor Targets
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id TEXT PRIMARY KEY DEFAULT 'default_user',
  calories_target NUMERIC(7,1) DEFAULT 2000,
  calories_min NUMERIC(7,1) DEFAULT 1800,
  calories_max NUMERIC(7,1) DEFAULT 2400,
  protein_target NUMERIC(6,1) DEFAULT 75,
  protein_min NUMERIC(6,1) DEFAULT 60,
  protein_max NUMERIC(6,1) DEFAULT 120,
  carbs_target NUMERIC(6,1) DEFAULT 225,
  carbs_min NUMERIC(6,1) DEFAULT 170,
  carbs_max NUMERIC(6,1) DEFAULT 300,
  fat_target NUMERIC(6,1) DEFAULT 65,
  fat_min NUMERIC(6,1) DEFAULT 45,
  fat_max NUMERIC(6,1) DEFAULT 85,
  fiber_target NUMERIC(6,1) DEFAULT 28,
  fiber_min NUMERIC(6,1) DEFAULT 25,
  fiber_max NUMERIC(6,1) DEFAULT 38,
  sodium_ceiling NUMERIC(7,1) DEFAULT 2300,
  potassium_target NUMERIC(7,1) DEFAULT 3000,
  potassium_max NUMERIC(7,1) DEFAULT 3500,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Helpful Analytical Indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_timestamp ON public.nutrition_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal ON public.nutrition_logs (meal);
CREATE INDEX IF NOT EXISTS idx_gut_health_timestamp ON public.gut_health_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gut_health_risk ON public.gut_health_logs (ibs_risk_level);

-- 6. Row Level Security (RLS)
-- Enable RLS for production security
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gut_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

-- Allow anonymous key to read/write for the TrackMyPlate client application
DROP POLICY IF EXISTS "Allow anon all on nutrition_logs" ON public.nutrition_logs;
CREATE POLICY "Allow anon all on nutrition_logs" ON public.nutrition_logs
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on gut_health_logs" ON public.gut_health_logs;
CREATE POLICY "Allow anon all on gut_health_logs" ON public.gut_health_logs
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on daily_goals" ON public.daily_goals;
CREATE POLICY "Allow anon all on daily_goals" ON public.daily_goals
  FOR ALL USING (true) WITH CHECK (true);
`;

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getInitialSupabaseConfig(): SupabaseConfig {
  // Check localStorage first
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read saved Supabase config:', e);
  }

  // Fallback to Vite environment variables if defined
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  return {
    url: envUrl,
    anonKey: envKey,
    connected: Boolean(envUrl && envKey),
    autoSync: true,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Invalidate cached client if credentials changed
    cachedClient = null;
    cachedConfigKey = '';
  } catch (e) {
    console.warn('Could not save Supabase config:', e);
  }
}

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const effectiveConfig = config || getInitialSupabaseConfig();
  const url = effectiveConfig.url?.trim();
  const anonKey = effectiveConfig.anonKey?.trim();

  if (!url || !anonKey) {
    return null;
  }

  const key = `${url}:::${anonKey}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedConfigKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/**
 * Test connectivity and verify if the nutrition_logs table is queryable.
 */
export async function testSupabaseConnection(
  config: SupabaseConfig
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL and Anon Key are required.',
    };
  }

  try {
    // Attempt a lightweight query to test connectivity
    const { error } = await client
      .from('nutrition_logs')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        // 42P01 = PostgreSQL relation does not exist
        return {
          success: false,
          message:
            'Connected to Supabase, but tables are missing. Please run the SQL schema script in the SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase query error: ${error.message} (${error.code || 'UNKNOWN'})`,
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Sync a single meal's nutrition & gut-health entry to Supabase
 */
export async function syncMealToSupabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry,
  config?: SupabaseConfig
): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client) return false;

  try {
    // 1. Insert/Upsert into nutrition_logs
    const { error: nutError } = await client.from('nutrition_logs').upsert({
      id: nutrition.id,
      timestamp: nutrition.timestamp,
      meal: nutrition.meal,
      portion: nutrition.portion,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sodium: nutrition.sodium,
      potassium: nutrition.potassium,
      key_vitamins: nutrition.keyVitamins || [],
      is_estimated: nutrition.isEstimated,
      confidence: nutrition.confidence,
      notes: nutrition.notes || '',
    });

    if (nutError) {
      console.warn('Supabase nutrition log upsert error:', nutError);
      return false;
    }

    // 2. Insert/Upsert into gut_health_logs
    const { error: gutError } = await client.from('gut_health_logs').upsert({
      id: gutHealth.id,
      timestamp: gutHealth.timestamp,
      meal_reference_id: nutrition.id,
      meal_name: gutHealth.mealName || nutrition.meal,
      ibs_risk_level: gutHealth.ibsRiskLevel,
      identified_triggers: gutHealth.identifiedTriggers || [],
      fodmap_fructans: gutHealth.fodmapCategories?.fructans || 0,
      fodmap_lactose: gutHealth.fodmapCategories?.lactose || 0,
      fodmap_excess_fructose: gutHealth.fodmapCategories?.excess_fructose || 0,
      fodmap_polyols: gutHealth.fodmapCategories?.polyols || 0,
      fodmap_gos: gutHealth.fodmapCategories?.gos || 0,
      predictive_digestive_reaction: gutHealth.predictiveDigestiveReaction || '',
      ai_recommendation: gutHealth.aiRecommendation || '',
      grounding_reference: gutHealth.groundingReference || '',
    });

    if (gutError) {
      console.warn('Supabase gut health log upsert error:', gutError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to sync meal to Supabase:', err);
    return false;
  }
}

/**
 * Delete a meal from Supabase by its nutrition ID
 */
export async function deleteMealFromSupabase(
  mealId: string,
  config?: SupabaseConfig
): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client) return false;

  try {
    // gut_health_logs has ON DELETE CASCADE if created with our schema,
    // but we can also delete explicitly to be safe
    await client.from('gut_health_logs').delete().eq('meal_reference_id', mealId);
    const { error } = await client.from('nutrition_logs').delete().eq('id', mealId);
    return !error;
  } catch (err) {
    console.error('Failed to delete meal from Supabase:', err);
    return false;
  }
}

/**
 * Bulk upload all local logs to Supabase
 */
export async function syncAllLogsToSupabase(
  nutritionLogs: NutritionLogEntry[],
  gutLogs: GutHealthLogEntry[],
  config?: SupabaseConfig
): Promise<{ count: number; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { count: 0, error: 'Supabase client is not configured' };
  }

  if (nutritionLogs.length === 0) {
    return { count: 0 };
  }

  try {
    // 1. Format nutrition rows
    const nutritionRows = nutritionLogs.map((n) => ({
      id: n.id,
      timestamp: n.timestamp,
      meal: n.meal,
      portion: n.portion,
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      sodium: n.sodium,
      potassium: n.potassium,
      key_vitamins: n.keyVitamins || [],
      is_estimated: n.isEstimated,
      confidence: n.confidence,
      notes: n.notes || '',
    }));

    const { error: nutError } = await client.from('nutrition_logs').upsert(nutritionRows);
    if (nutError) {
      return { count: 0, error: nutError.message };
    }

    // 2. Format gut health rows
    const gutRows = gutLogs.map((g) => ({
      id: g.id,
      timestamp: g.timestamp,
      meal_reference_id: g.mealReferenceId,
      meal_name: g.mealName,
      ibs_risk_level: g.ibsRiskLevel,
      identified_triggers: g.identifiedTriggers || [],
      fodmap_fructans: g.fodmapCategories?.fructans || 0,
      fodmap_lactose: g.fodmapCategories?.lactose || 0,
      fodmap_excess_fructose: g.fodmapCategories?.excess_fructose || 0,
      fodmap_polyols: g.fodmapCategories?.polyols || 0,
      fodmap_gos: g.fodmapCategories?.gos || 0,
      predictive_digestive_reaction: g.predictiveDigestiveReaction || '',
      ai_recommendation: g.aiRecommendation || '',
      grounding_reference: g.groundingReference || '',
    }));

    if (gutRows.length > 0) {
      const { error: gutError } = await client.from('gut_health_logs').upsert(gutRows);
      if (gutError) {
        console.warn('Gut health rows upsert warning:', gutError);
      }
    }

    return { count: nutritionRows.length };
  } catch (err: any) {
    return { count: 0, error: err.message || 'Unknown sync error' };
  }
}

/**
 * Fetch all logs from Supabase to hydrate local state
 */
export async function fetchAllLogsFromSupabase(
  config?: SupabaseConfig
): Promise<{ nutrition: NutritionLogEntry[]; gutHealth: GutHealthLogEntry[] } | null> {
  const client = getSupabaseClient(config);
  if (!client) return null;

  try {
    // 1. Query nutrition_logs sorted by timestamp descending
    const { data: nutData, error: nutErr } = await client
      .from('nutrition_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (nutErr || !nutData) {
      console.warn('Error fetching nutrition logs from Supabase:', nutErr);
      return null;
    }

    // 2. Query gut_health_logs
    const { data: gutData, error: gutErr } = await client
      .from('gut_health_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (gutErr || !gutData) {
      console.warn('Error fetching gut health logs from Supabase:', gutErr);
      return null;
    }

    // Transform database rows to TypeScript interfaces
    const nutrition: NutritionLogEntry[] = nutData.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      meal: row.meal,
      portion: row.portion,
      calories: Number(row.calories) || 0,
      protein: Number(row.protein) || 0,
      carbs: Number(row.carbs) || 0,
      fat: Number(row.fat) || 0,
      fiber: Number(row.fiber) || 0,
      sodium: Number(row.sodium) || 0,
      potassium: Number(row.potassium) || 0,
      keyVitamins: Array.isArray(row.key_vitamins) ? row.key_vitamins : [],
      isEstimated: Boolean(row.is_estimated),
      confidence: Number(row.confidence) || 90,
      notes: row.notes || '',
    }));

    const gutHealth: GutHealthLogEntry[] = gutData.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      mealReferenceId: row.meal_reference_id,
      mealName: row.meal_name,
      ibsRiskLevel: row.ibs_risk_level as any,
      identifiedTriggers: Array.isArray(row.identified_triggers) ? row.identified_triggers : [],
      fodmapCategories: {
        fructans: Number(row.fodmap_fructans) || 0,
        lactose: Number(row.fodmap_lactose) || 0,
        excess_fructose: Number(row.fodmap_excess_fructose) || 0,
        polyols: Number(row.fodmap_polyols) || 0,
        gos: Number(row.fodmap_gos) || 0,
      },
      predictiveDigestiveReaction: row.predictive_digestive_reaction || '',
      aiRecommendation: row.ai_recommendation || '',
      groundingReference: row.grounding_reference || '',
    }));

    return { nutrition, gutHealth };
  } catch (err) {
    console.error('Error in fetchAllLogsFromSupabase:', err);
    return null;
  }
}
