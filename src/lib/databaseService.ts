import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NutritionLogEntry, GutHealthLogEntry } from '../types';

export interface UserAccountData {
  id: string;
  displayName: string;
  email?: string;
  photoURL?: string;
}

// Client-side direct Supabase fallback (works seamlessly on Vercel preview/production)
let directClient: SupabaseClient | null = null;

function getDirectSupabase(): SupabaseClient | null {
  if (directClient) return directClient;
  const url =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    'https://kmfgriqexjdkbchlqbfi.supabase.co';
  const key =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZmdyaXFleGpka2JjaGxxYmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTQ3ODEsImV4cCI6MjEwNDI3MDc4MX0.5lYVXzj_QI3dvafHPGeihWD-tePCle5IrRmgkVhHng4';

  if (url && key) {
    try {
      directClient = createClient(url, key);
      return directClient;
    } catch (e) {
      console.warn('Could not initialize direct Supabase fallback:', e);
    }
  }
  return null;
}

export async function syncUserProfile(_user: UserAccountData): Promise<void> {
  // No-op for now unless requested to add a users table
}

export async function seedUserLogsIfEmpty(_userId: string): Promise<void> {
  // Purposely removed to prevent unrequested fake data
}

function mapNutritionRow(row: any): NutritionLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
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
  };
}

function mapGutRow(row: any): GutHealthLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    timestamp: row.timestamp,
    mealReferenceId: row.meal_reference_id,
    mealName: row.meal_name,
    ibsRiskLevel: row.ibs_risk_level,
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
  };
}

/**
 * Fetch database logs belonging strictly to the authenticated user.
 * Tries server-side /api/logs first; if it encounters an issue (e.g. serverless cold boot),
 * falls back directly to Supabase client using public anon key.
 */
export function subscribeToUserLogs(
  userId: string,
  onData: (nutrition: NutritionLogEntry[], gutHealth: GutHealthLogEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isSubscribed = true;

  const fetchData = async () => {
    // 1. Try server API route
    try {
      const response = await fetch(`/api/logs?userId=${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (isSubscribed) {
          onData(data.nutrition || [], data.gutHealth || []);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('API route /api/logs fetch failed, attempting direct Supabase query:', apiErr);
    }

    // 2. Direct Supabase fallback
    const sb = getDirectSupabase();
    if (sb) {
      try {
        const [nutRes, gutRes] = await Promise.all([
          sb.from('nutrition_logs').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
          sb.from('gut_health_logs').select('*').eq('user_id', userId).order('timestamp', { ascending: false }),
        ]);

        if (nutRes.error) throw nutRes.error;
        if (gutRes.error) throw gutRes.error;

        if (isSubscribed) {
          onData(
            (nutRes.data || []).map(mapNutritionRow),
            (gutRes.data || []).map(mapGutRow)
          );
        }
        return;
      } catch (directErr: any) {
        console.error('Direct Supabase fetch also failed:', directErr);
        if (onError && isSubscribed) onError(directErr);
      }
    }
  };

  fetchData();
  const intervalId = setInterval(fetchData, 10000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}

/**
 * Save a new meal log to PostgreSQL database under the authenticated userId.
 */
export async function saveMealToDatabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry,
  userId: string
): Promise<void> {
  // Try server API first
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nutrition, gutHealth, userId }),
    });
    if (res.ok) return;
  } catch (err) {
    console.warn('POST /api/logs failed, falling back to direct Supabase write:', err);
  }

  // Fallback to direct client write
  const sb = getDirectSupabase();
  if (!sb) throw new Error('Could not connect to database to save meal.');

  const { error: nutErr } = await sb.from('nutrition_logs').insert({
    id: nutrition.id,
    user_id: userId,
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
  if (nutErr) throw nutErr;

  const { error: gutErr } = await sb.from('gut_health_logs').insert({
    id: gutHealth.id,
    user_id: userId,
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
  if (gutErr) throw gutErr;
}

/**
 * Update an existing meal log in PostgreSQL database.
 */
export async function updateMealInDatabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry | undefined,
  userId: string
): Promise<void> {
  try {
    const res = await fetch(`/api/logs/${nutrition.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nutrition, gutHealth, userId }),
    });
    if (res.ok) return;
  } catch (err) {
    console.warn('PUT /api/logs failed, falling back to direct Supabase update:', err);
  }

  const sb = getDirectSupabase();
  if (!sb) throw new Error('Could not connect to database to update meal.');

  if (nutrition) {
    const { error: nutErr } = await sb
      .from('nutrition_logs')
      .update({
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
      })
      .eq('id', nutrition.id)
      .eq('user_id', userId);
    if (nutErr) throw nutErr;
  }

  if (gutHealth) {
    const { error: gutErr } = await sb
      .from('gut_health_logs')
      .update({
        timestamp: gutHealth.timestamp,
        meal_name: gutHealth.mealName || nutrition?.meal,
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
      })
      .eq('meal_reference_id', nutrition.id)
      .eq('user_id', userId);
    if (gutErr) throw gutErr;
  }
}

/**
 * Delete a meal log and its matching gut health entry from PostgreSQL.
 */
export async function deleteMealFromDatabase(id: string, userId: string): Promise<void> {
  try {
    const res = await fetch(`/api/logs/${id}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (res.ok) return;
  } catch (err) {
    console.warn('DELETE /api/logs failed, falling back to direct Supabase deletion:', err);
  }

  const sb = getDirectSupabase();
  if (!sb) throw new Error('Could not connect to database to delete meal.');

  const { error } = await sb.from('nutrition_logs').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function getFavoriteMeals(userId: string): Promise<any[]> {
  const sb = getDirectSupabase();
  if (!sb) return [];
  
  const { data, error } = await sb
    .from('favorite_meals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Failed to fetch favorite meals:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    result: row.result,
    createdAt: row.created_at
  }));
}

export async function saveFavoriteMeal(favorite: any): Promise<void> {
  const sb = getDirectSupabase();
  if (!sb) throw new Error('Could not connect to database.');
  
  const { error } = await sb.from('favorite_meals').insert({
    id: favorite.id,
    user_id: favorite.userId,
    name: favorite.name,
    category: favorite.category,
    result: favorite.result,
    created_at: favorite.createdAt || new Date().toISOString()
  });
  
  if (error) throw error;
}

export async function deleteFavoriteMeal(id: string, userId: string): Promise<void> {
  const sb = getDirectSupabase();
  if (!sb) throw new Error('Could not connect to database.');
  
  const { error } = await sb.from('favorite_meals').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

