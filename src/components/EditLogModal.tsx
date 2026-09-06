import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Edit3,
  AlertTriangle,
  Flame,
  Activity,
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import { NutritionLogEntry, GutHealthLogEntry, IBSRiskLevel } from '../types';

interface EditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  nutritionEntry: NutritionLogEntry | null;
  gutHealthEntry?: GutHealthLogEntry | null;
  onSave: (updatedNutrition: NutritionLogEntry, updatedGutHealth?: GutHealthLogEntry) => void;
}

export const EditLogModal: React.FC<EditLogModalProps> = ({
  isOpen,
  onClose,
  nutritionEntry,
  gutHealthEntry,
  onSave,
}) => {
  if (!isOpen || !nutritionEntry) return null;

  // Form states for Nutrition Log
  const [meal, setMeal] = useState(nutritionEntry.meal);
  const [portion, setPortion] = useState(nutritionEntry.portion);
  const [timestamp, setTimestamp] = useState(nutritionEntry.timestamp);
  const [calories, setCalories] = useState(nutritionEntry.calories);
  const [protein, setProtein] = useState(nutritionEntry.protein);
  const [carbs, setCarbs] = useState(nutritionEntry.carbs);
  const [fat, setFat] = useState(nutritionEntry.fat);
  const [fiber, setFiber] = useState(nutritionEntry.fiber);
  const [sodium, setSodium] = useState(nutritionEntry.sodium);
  const [potassium, setPotassium] = useState(nutritionEntry.potassium);
  const [vitaminsText, setVitaminsText] = useState(nutritionEntry.keyVitamins.join(', '));
  const [notes, setNotes] = useState(nutritionEntry.notes || '');

  // Form states for Gut Health Log
  const [ibsRiskLevel, setIbsRiskLevel] = useState<IBSRiskLevel>(
    gutHealthEntry?.ibsRiskLevel || 'Low'
  );
  const [triggersText, setTriggersText] = useState(
    gutHealthEntry?.identifiedTriggers.join(', ') || ''
  );
  const [predictiveReaction, setPredictiveReaction] = useState(
    gutHealthEntry?.predictiveDigestiveReaction || ''
  );
  const [aiRecommendation, setAiRecommendation] = useState(
    gutHealthEntry?.aiRecommendation || ''
  );

  // Sync state if initial props change
  useEffect(() => {
    if (nutritionEntry) {
      setMeal(nutritionEntry.meal);
      setPortion(nutritionEntry.portion);
      setTimestamp(nutritionEntry.timestamp);
      setCalories(nutritionEntry.calories);
      setProtein(nutritionEntry.protein);
      setCarbs(nutritionEntry.carbs);
      setFat(nutritionEntry.fat);
      setFiber(nutritionEntry.fiber);
      setSodium(nutritionEntry.sodium);
      setPotassium(nutritionEntry.potassium);
      setVitaminsText(nutritionEntry.keyVitamins.join(', '));
      setNotes(nutritionEntry.notes || '');
    }
    if (gutHealthEntry) {
      setIbsRiskLevel(gutHealthEntry.ibsRiskLevel);
      setTriggersText(gutHealthEntry.identifiedTriggers.join(', '));
      setPredictiveReaction(gutHealthEntry.predictiveDigestiveReaction);
      setAiRecommendation(gutHealthEntry.aiRecommendation);
    }
  }, [nutritionEntry, gutHealthEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedVitamins = vitaminsText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const updatedNutrition: NutritionLogEntry = {
      ...nutritionEntry,
      meal: meal.trim(),
      portion: portion.trim(),
      timestamp,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: Number(fiber) || 0,
      sodium: Number(sodium) || 0,
      potassium: Number(potassium) || 0,
      keyVitamins: parsedVitamins,
      notes: notes.trim() || undefined,
      isEstimated: false, // User explicitly reviewed and edited
    };

    let updatedGutHealth: GutHealthLogEntry | undefined;
    if (gutHealthEntry) {
      const parsedTriggers = triggersText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      updatedGutHealth = {
        ...gutHealthEntry,
        mealName: meal.trim(),
        timestamp,
        ibsRiskLevel,
        identifiedTriggers: parsedTriggers,
        predictiveDigestiveReaction: predictiveReaction.trim(),
        aiRecommendation: aiRecommendation.trim(),
      };
    }

    onSave(updatedNutrition, updatedGutHealth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                Edit Log Entry
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Correct parsed macronutrients, micronutrients, portion sizes, or FODMAP indicators.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Meal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Meal Name
              </label>
              <input
                type="text"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Portion Size
              </label>
              <input
                type="text"
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
                required
                placeholder="e.g. 1 bowl, 200g, 2 slices"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Macronutrients Grid */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center">
              <Flame className="w-3.5 h-3.5 text-amber-500 mr-1" />
              Macronutrients & Energy
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Calories (kcal)</span>
                <input
                  type="number"
                  min="0"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Protein (g)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Carbs (g)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Fat (g)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Fiber (g)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fiber}
                  onChange={(e) => setFiber(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Micronutrients */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center">
              <HeartPulse className="w-3.5 h-3.5 text-teal-500 mr-1" />
              Micronutrients & Minerals
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Sodium (mg)</span>
                <input
                  type="number"
                  min="0"
                  value={sodium}
                  onChange={(e) => setSodium(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Potassium (mg)</span>
                <input
                  type="number"
                  min="0"
                  value={potassium}
                  onChange={(e) => setPotassium(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">Key Vitamins</span>
                <input
                  type="text"
                  value={vitaminsText}
                  onChange={(e) => setVitaminsText(e.target.value)}
                  placeholder="e.g. Vitamin C, Folate, Iron"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Gut Health & FODMAP Section */}
          {gutHealthEntry && (
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                  Gut Health & FODMAP Classification
                </span>
                <div className="flex items-center space-x-1.5">
                  {(['Low', 'Medium', 'High'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setIbsRiskLevel(level)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                        ibsRiskLevel === level
                          ? level === 'Low'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : level === 'Medium'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Identified Triggers / High-FODMAP Ingredients (comma-separated)
                </label>
                <input
                  type="text"
                  value={triggersText}
                  onChange={(e) => setTriggersText(e.target.value)}
                  placeholder="e.g. Garlic (Fructans), Onion powder, Inulin"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
                    Predictive Digestive Reaction
                  </label>
                  <textarea
                    rows={2}
                    value={predictiveReaction}
                    onChange={(e) => setPredictiveReaction(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
                    Clinical Recommendation & Substitutes
                  </label>
                  <textarea
                    rows={2}
                    value={aiRecommendation}
                    onChange={(e) => setAiRecommendation(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-zinc-900 dark:text-zinc-100 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* User Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Personal Notes & Symptoms
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Felt fine after 2 hours, mild fullness, no pain"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
