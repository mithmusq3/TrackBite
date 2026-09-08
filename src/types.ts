export type IBSRiskLevel = 'Low' | 'Medium' | 'High';

export type FODMAPCategory =
  | 'fructans'
  | 'lactose'
  | 'excess_fructose'
  | 'polyols'
  | 'gos';

export interface NutritionLogEntry {
  id: string;
  userId?: string;
  timestamp: string; // ISO 8601
  meal: string;
  portion: string;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sodium: number; // mg
  potassium: number; // mg
  keyVitamins: string[]; // e.g. ["Vitamin D", "B12"]
  isEstimated: boolean;
  confidence: number; // 0-100 percentage
  notes?: string;
}

export interface GutHealthLogEntry {
  id: string;
  userId?: string;
  timestamp: string; // ISO 8601
  mealReferenceId: string;
  mealName: string;
  ibsRiskLevel: IBSRiskLevel;
  identifiedTriggers: string[]; // e.g. ["Garlic (Fructans)", "Milk (Lactose)"]
  fodmapCategories: {
    fructans: number;
    lactose: number;
    excess_fructose: number;
    polyols: number;
    gos: number;
  };
  predictiveDigestiveReaction: string;
  aiRecommendation: string;
  groundingReference?: string;
}

export interface FoodAnalysisResponse {
  nutrition: NutritionLogEntry;
  gutHealth: GutHealthLogEntry;
  analysisSummary: string;
}

export interface FavoriteMeal {
  id: string;
  userId?: string;
  name: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  result: FoodAnalysisResponse;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isDemo?: boolean;
}

export interface NotebookGroundingRule {
  id: string;
  category: string;
  title: string;
  ruleText: string;
  source: string;
  enabled: boolean;
}

export interface DailyNutrientGoals {
  // Macronutrients
  calories?: number;
  caloriesMin?: number;
  caloriesMax?: number;
  protein?: number;
  proteinMin?: number;
  proteinMax?: number;
  carbs?: number;
  carbsMin?: number;
  carbsMax?: number;
  fat?: number;
  fatMin?: number;
  fatMax?: number;
  fiber?: number;
  fiberMin?: number;
  fiberMax?: number;

  // Micronutrients
  sodiumCeiling?: number;
  potassiumTarget?: number;
  potassiumMax?: number;
  sodiumPotassiumRatioMax?: number;
  calciumTarget?: number;
  ironTarget?: number;
}


export interface UserPersonalToleranceContext {
  subtype: 'IBS-D' | 'IBS-C' | 'IBS-M' | 'IBS-U' | 'Unspecified';
  knownSevereTriggers: string[];
  toleratedFoods: string[];
  dailyFiberGoal: number;
  customClinicalNotes: string;
  dailyGoals?: DailyNutrientGoals;
}
