import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Sliders,
  RotateCcw,
  Check,
  Sparkles,
  HeartPulse,
  Flame,
  ShieldCheck,
  Info
} from 'lucide-react';
import { DailyNutrientGoals, UserPersonalToleranceContext } from '../types';
import { DEFAULT_DAILY_GOALS, resolveNutrientGoals } from '../lib/clinicalKnowledgeBase';
import { InfoButton } from './InfoButton';

interface DailyGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userContext: UserPersonalToleranceContext;
  onUpdateGoals: (goals: DailyNutrientGoals, fiberGoal: number) => void;
}

export const DailyGoalsModal: React.FC<DailyGoalsModalProps> = ({
  isOpen,
  onClose,
  userContext,
  onUpdateGoals,
}) => {
  const [activeTab, setActiveTab] = useState<'macros' | 'micros'>('macros');

  // Form state initialized from existing custom goals or defaults
  const [formGoals, setFormGoals] = useState<DailyNutrientGoals>(() => {
    return userContext.dailyGoals || {};
  });

  // Sync state when modal opens or userContext changes
  useEffect(() => {
    if (isOpen) {
      setFormGoals(userContext.dailyGoals || {});
    }
  }, [isOpen, userContext.dailyGoals]);

  if (!isOpen) return null;

  const resolved = resolveNutrientGoals(formGoals, userContext.dailyFiberGoal);
  const isCustomActive = Boolean(
    userContext.dailyGoals && Object.keys(userContext.dailyGoals).length > 0
  );

  // Field change handler helper
  const handleNumberChange = (field: keyof DailyNutrientGoals, valStr: string) => {
    if (valStr.trim() === '') {
      setFormGoals((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return;
    }
    const num = parseFloat(valStr);
    setFormGoals((prev) => ({
      ...prev,
      [field]: isNaN(num) ? undefined : num,
    }));
  };

  // Presets
  const applyPreset = (presetName: string) => {
    if (presetName === 'default') {
      setFormGoals({});
    } else if (presetName === 'high_protein') {
      setFormGoals({
        calories: 2200,
        caloriesMin: 2000,
        caloriesMax: 2600,
        protein: 130,
        proteinMin: 110,
        proteinMax: 160,
        carbs: 180,
        carbsMin: 140,
        carbsMax: 230,
        fat: 65,
        fatMin: 45,
        fatMax: 80,
        fiber: 30,
        fiberMin: 25,
        fiberMax: 35,
        sodiumCeiling: 2300,
        potassiumTarget: 3000,
        potassiumMax: 3500,
        sodiumPotassiumRatioMax: 0.9,
      });
    } else if (presetName === 'low_sodium') {
      setFormGoals({
        calories: 1900,
        caloriesMin: 1700,
        caloriesMax: 2200,
        protein: 70,
        proteinMin: 55,
        proteinMax: 85,
        carbs: 210,
        carbsMin: 150,
        carbsMax: 250,
        fat: 55,
        fatMin: 35,
        fatMax: 70,
        fiber: 28,
        fiberMin: 25,
        fiberMax: 35,
        sodiumCeiling: 1500,
        potassiumTarget: 3200,
        potassiumMax: 3600,
        sodiumPotassiumRatioMax: 0.6,
      });
    } else if (presetName === 'ibs_gentle') {
      setFormGoals({
        calories: 1900,
        caloriesMin: 1750,
        caloriesMax: 2250,
        protein: 70,
        proteinMin: 55,
        proteinMax: 85,
        carbs: 190,
        carbsMin: 140,
        carbsMax: 230,
        fat: 45,
        fatMin: 30,
        fatMax: 60,
        fiber: 22,
        fiberMin: 18,
        fiberMax: 28,
        sodiumCeiling: 2000,
        potassiumTarget: 2600,
        potassiumMax: 3200,
        sodiumPotassiumRatioMax: 0.9,
      });
    }
  };

  const handleSave = () => {
    const fiberGoal = formGoals.fiber || DEFAULT_DAILY_GOALS.fiber;
    onUpdateGoals(formGoals, fiberGoal);
    onClose();
  };

  const handleReset = () => {
    setFormGoals({});
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[94vh] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Daily Macro & Micro Goals
                </h3>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isCustomActive
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {isCustomActive ? 'Custom' : 'Defaults'}
                </span>
                <InfoButton
                  title="Nutrient Goals & Corridors"
                  content="Configure personalized per-day targets and min–max tolerance corridors. The analytics gauges and shaded chart corridors adjust in real time. If any value is left empty, standard clinical maintenance baselines are applied automatically."
                />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
          <span className="font-semibold text-zinc-600 dark:text-zinc-400 flex items-center mr-1 shrink-0 text-[11px]">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 mr-1" />
            Presets:
          </span>
          <button
            onClick={() => applyPreset('default')}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 transition-colors text-[11px] font-medium shadow-2xs whitespace-nowrap shrink-0"
          >
            Clinical Defaults
          </button>
          <button
            onClick={() => applyPreset('high_protein')}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 transition-colors text-[11px] font-medium shadow-2xs whitespace-nowrap shrink-0"
          >
            High Protein
          </button>
          <button
            onClick={() => applyPreset('low_sodium')}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 transition-colors text-[11px] font-medium shadow-2xs whitespace-nowrap shrink-0"
          >
            Cardio (Low Na)
          </button>
          <button
            onClick={() => applyPreset('ibs_gentle')}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-emerald-500 transition-colors text-[11px] font-medium shadow-2xs whitespace-nowrap shrink-0"
          >
            IBS Gentle
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/80 px-5 pt-2">
          <button
            onClick={() => setActiveTab('macros')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'macros'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t-2 border-emerald-500 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Macronutrients & Corridors</span>
          </button>
          <button
            onClick={() => setActiveTab('micros')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'micros'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t-2 border-emerald-500 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-teal-500" />
            <span>Micronutrients & Electrolytes</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'macros' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                  Macronutrient Corridors
                </span>
                <InfoButton
                  title="Macronutrient Corridors"
                  content="Set your daily target and optional clinical tolerance range (Min–Max). The analytics gauges and shaded corridor graphs will automatically reflect these boundaries."
                />
              </div>

              {/* Energy (Calories) */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 dark:bg-zinc-200" />
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Daily Calories / Energy
                    </label>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Default: {DEFAULT_DAILY_GOALS.calories} kcal ({DEFAULT_DAILY_GOALS.caloriesMin}–{DEFAULT_DAILY_GOALS.caloriesMax})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Target (kcal)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.calories)}
                      value={formGoals.calories ?? ''}
                      onChange={(e) => handleNumberChange('calories', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Min Normal (kcal)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.caloriesMin)}
                      value={formGoals.caloriesMin ?? ''}
                      onChange={(e) => handleNumberChange('caloriesMin', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Max Normal (kcal)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.caloriesMax)}
                      value={formGoals.caloriesMax ?? ''}
                      onChange={(e) => handleNumberChange('caloriesMax', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Protein */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Daily Protein
                    </label>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Default: {DEFAULT_DAILY_GOALS.protein}g ({DEFAULT_DAILY_GOALS.proteinMin}–{DEFAULT_DAILY_GOALS.proteinMax}g)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Target (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.protein)}
                      value={formGoals.protein ?? ''}
                      onChange={(e) => handleNumberChange('protein', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Min Range (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.proteinMin)}
                      value={formGoals.proteinMin ?? ''}
                      onChange={(e) => handleNumberChange('proteinMin', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Max Range (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.proteinMax)}
                      value={formGoals.proteinMax ?? ''}
                      onChange={(e) => handleNumberChange('proteinMax', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Carbs */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Daily Carbohydrates
                    </label>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Default: {DEFAULT_DAILY_GOALS.carbs}g ({DEFAULT_DAILY_GOALS.carbsMin}–{DEFAULT_DAILY_GOALS.carbsMax}g)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Target (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.carbs)}
                      value={formGoals.carbs ?? ''}
                      onChange={(e) => handleNumberChange('carbs', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Min Range (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.carbsMin)}
                      value={formGoals.carbsMin ?? ''}
                      onChange={(e) => handleNumberChange('carbsMin', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Max Range (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.carbsMax)}
                      value={formGoals.carbsMax ?? ''}
                      onChange={(e) => handleNumberChange('carbsMax', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fats */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Daily Healthy Fats
                    </label>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Default: {DEFAULT_DAILY_GOALS.fat}g ({DEFAULT_DAILY_GOALS.fatMin}–{DEFAULT_DAILY_GOALS.fatMax}g)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Target (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.fat)}
                      value={formGoals.fat ?? ''}
                      onChange={(e) => handleNumberChange('fat', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Min Range (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.fatMin)}
                      value={formGoals.fatMin ?? ''}
                      onChange={(e) => handleNumberChange('fatMin', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Max Range (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.fatMax)}
                      value={formGoals.fatMax ?? ''}
                      onChange={(e) => handleNumberChange('fatMax', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fiber */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Daily Dietary Fiber
                    </label>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Clinical Target: {userContext.dailyFiberGoal || DEFAULT_DAILY_GOALS.fiber}g ({DEFAULT_DAILY_GOALS.fiberMin}–{DEFAULT_DAILY_GOALS.fiberMax}g)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Target (g)</span>
                    <input
                      type="number"
                      placeholder={String(userContext.dailyFiberGoal || DEFAULT_DAILY_GOALS.fiber)}
                      value={formGoals.fiber ?? ''}
                      onChange={(e) => handleNumberChange('fiber', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Min Corridor (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.fiberMin)}
                      value={formGoals.fiberMin ?? ''}
                      onChange={(e) => handleNumberChange('fiberMin', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Max Corridor (g)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.fiberMax)}
                      value={formGoals.fiberMax ?? ''}
                      onChange={(e) => handleNumberChange('fiberMax', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'micros' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                  Electrolytes & Fluid Balance Corridors
                </span>
                <InfoButton
                  title="Electrolyte Guidelines"
                  content="Electrolytes and minerals regulate cellular osmolarity and gut fluid retention. If left unconfigured, standard Dietary Guidelines (Sodium ≤ 2300 mg ceiling, Potassium ≥ 2600 mg target) apply."
                />
              </div>

              {/* Sodium Ceiling */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Sodium Ceiling Limit (mg/day)
                    </label>
                    <InfoButton
                      size="xs"
                      title="Sodium Dietary Guideline"
                      content="Dietary Guidelines for Americans and the American Heart Association recommend ≤ 2300 mg/day (or ≤ 1500 mg for hypertension/DASH) to reduce cardiovascular strain and fluid retention."
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Guideline Max: {DEFAULT_DAILY_GOALS.sodiumCeiling} mg
                  </span>
                </div>
                <input
                  type="number"
                  placeholder={String(DEFAULT_DAILY_GOALS.sodiumCeiling)}
                  value={formGoals.sodiumCeiling ?? ''}
                  onChange={(e) => handleNumberChange('sodiumCeiling', e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Intakes above this threshold are flagged in the analytics corridors.
                </span>
              </div>

              {/* Potassium Range */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Potassium Adequate Intake (mg/day)
                    </label>
                    <InfoButton
                      size="xs"
                      title="Potassium Adequate Intake"
                      content="Adequate intake is 2600–3400 mg/day for adults. Potassium counterbalances sodium, supports smooth muscle function in the GI tract, and stabilizes vascular tone."
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Standard: {DEFAULT_DAILY_GOALS.potassiumTarget}–{DEFAULT_DAILY_GOALS.potassiumMax} mg
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Target Min (mg)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.potassiumTarget)}
                      value={formGoals.potassiumTarget ?? ''}
                      onChange={(e) => handleNumberChange('potassiumTarget', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Optimal Upper (mg)</span>
                    <input
                      type="number"
                      placeholder={String(DEFAULT_DAILY_GOALS.potassiumMax)}
                      value={formGoals.potassiumMax ?? ''}
                      onChange={(e) => handleNumberChange('potassiumMax', e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Na:K Ratio Limit */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Sodium-to-Potassium (Na:K) Ratio Max
                    </label>
                    <InfoButton
                      size="xs"
                      title="Na:K Ratio"
                      content="A ratio ≤ 1.0 indicates consuming at least as much potassium as sodium in milligrams, clinically associated with optimal endothelial health and fluid balance."
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Recommended: &le; {DEFAULT_DAILY_GOALS.sodiumPotassiumRatioMax}
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  placeholder={String(DEFAULT_DAILY_GOALS.sodiumPotassiumRatioMax)}
                  value={formGoals.sodiumPotassiumRatioMax ?? ''}
                  onChange={(e) => handleNumberChange('sodiumPotassiumRatioMax', e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Calcium & Iron */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Calcium (mg/day)
                    </label>
                  </div>
                  <input
                    type="number"
                    placeholder={String(DEFAULT_DAILY_GOALS.calciumTarget)}
                    value={formGoals.calciumTarget ?? ''}
                    onChange={(e) => handleNumberChange('calciumTarget', e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Standard: 1000 mg
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      Iron (mg/day)
                    </label>
                  </div>
                  <input
                    type="number"
                    placeholder={String(DEFAULT_DAILY_GOALS.ironTarget)}
                    value={formGoals.ironTarget ?? ''}
                    onChange={(e) => handleNumberChange('ironTarget', e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 p-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Standard: 18 mg
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto justify-center px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors flex items-center space-x-1.5 text-xs font-semibold min-h-[38px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold min-h-[38px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-xs min-h-[38px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
