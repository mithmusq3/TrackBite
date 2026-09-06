import { NutritionLogEntry, GutHealthLogEntry } from '../types';

export function exportNutritionToCSV(logs: NutritionLogEntry[]): void {
  const headers = [
    'Timestamp',
    'Meal',
    'Portion',
    'Calories',
    'Protein (g)',
    'Carbs (g)',
    'Fat (g)',
    'Fiber (g)',
    'Sodium (mg)',
    'Potassium (mg)',
    'Key Vitamins',
    'Confidence (%)',
    'Is Estimated',
    'Notes',
  ];

  const rows = logs.map((log) => [
    `"${log.timestamp}"`,
    `"${log.meal.replace(/"/g, '""')}"`,
    `"${log.portion.replace(/"/g, '""')}"`,
    log.calories,
    log.protein,
    log.carbs,
    log.fat,
    log.fiber,
    log.sodium,
    log.potassium,
    `"${log.keyVitamins.join(', ').replace(/"/g, '""')}"`,
    log.confidence,
    log.isEstimated ? 'Yes' : 'No',
    `"${(log.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  downloadBlob(csvContent, `Nutrition_Log_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

export function exportGutHealthToCSV(logs: GutHealthLogEntry[]): void {
  const headers = [
    'Timestamp',
    'Meal Reference',
    'IBS Risk Level',
    'Identified Triggers / High-FODMAPs',
    'Fructans (0-5)',
    'Lactose (0-5)',
    'Excess Fructose (0-5)',
    'Polyols (0-5)',
    'GOS (0-5)',
    'Predictive Digestive Reaction',
    'AI Recommendation',
    'Grounding Reference',
  ];

  const rows = logs.map((log) => [
    `"${log.timestamp}"`,
    `"${log.mealName.replace(/"/g, '""')}"`,
    `"${log.ibsRiskLevel}"`,
    `"${log.identifiedTriggers.join('; ').replace(/"/g, '""')}"`,
    log.fodmapCategories.fructans,
    log.fodmapCategories.lactose,
    log.fodmapCategories.excess_fructose,
    log.fodmapCategories.polyols,
    log.fodmapCategories.gos,
    `"${log.predictiveDigestiveReaction.replace(/"/g, '""')}"`,
    `"${log.aiRecommendation.replace(/"/g, '""')}"`,
    `"${(log.groundingReference || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  downloadBlob(csvContent, `Gut_Health_Log_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
  URL.revokeObjectURL(url);
}
