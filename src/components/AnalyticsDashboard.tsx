import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Flame,
  TrendingUp,
  CheckCircle,
  BarChart2,
  Calendar,
  HeartPulse,
  Clock,
  Utensils,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Sliders,
  Target,
  Lock,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { NutritionLogEntry, GutHealthLogEntry, UserPersonalToleranceContext, DailyNutrientGoals } from '../types';
import { DailyGoalsModal } from './DailyGoalsModal';
import { InfoButton } from './InfoButton';
import { GoogleSignInButton } from './GoogleSignInButton';
import { DEFAULT_DAILY_GOALS, resolveNutrientGoals } from '../lib/clinicalKnowledgeBase';

const ShadedZone = ReferenceArea as React.ComponentType<any>;

interface AnalyticsDashboardProps {
  nutritionLogs: NutritionLogEntry[];
  gutHealthLogs: GutHealthLogEntry[];
  userContext: UserPersonalToleranceContext;
  onUpdateUserContext?: (ctx: UserPersonalToleranceContext) => void;
  isDark?: boolean;
  currentUser: User | null;
  onAuthChange: (user: User | null) => void;
}

export type TimeRangeOption = '1d' | '7d' | '1m' | '3m' | '6m' | '9m' | '1y' | 'all' | 'custom';
export type MacroFocusOption = 'all' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';
export type MicroFocusOption = 'dual' | 'sodium' | 'potassium' | 'ratio';

const RISK_COLORS: Record<string, string> = {
  Low: '#10b981', // emerald-500
  Medium: '#f59e0b', // amber-500
  High: '#f43f5e', // rose-500
};

const FODMAP_COLORS: Record<string, string> = {
  Fructans: '#ef4444',
  Lactose: '#3b82f6',
  'Excess Fructose': '#f59e0b',
  Polyols: '#8b5cf6',
  GOS: '#ec4899',
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  nutritionLogs,
  gutHealthLogs,
  userContext,
  onUpdateUserContext,
  isDark = false,
  currentUser,
  onAuthChange,
}) => {
  // Customizable time range state (1d, 7d, 1m, 3m, 6m, 9m, 1y, all, custom)
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('1d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [isDailyGoalsModalOpen, setIsDailyGoalsModalOpen] = useState<boolean>(false);

  // Graph focus modes
  const [macroFocus, setMacroFocus] = useState<MacroFocusOption>('all');
  const [microFocus, setMicroFocus] = useState<MicroFocusOption>('dual');

  // Resolve goals with automatic fallback to clinical defaults if custom values are not set
  const goals = useMemo(() => {
    return resolveNutrientGoals(userContext.dailyGoals, userContext.dailyFiberGoal);
  }, [userContext.dailyGoals, userContext.dailyFiberGoal]);

  const isCustomGoalsActive = Boolean(
    userContext.dailyGoals && Object.keys(userContext.dailyGoals).length > 0
  );

  const handleUpdateGoals = (newGoals: DailyNutrientGoals, fiberGoal: number) => {
    if (onUpdateUserContext) {
      onUpdateUserContext({
        ...userContext,
        dailyGoals: newGoals,
        dailyFiberGoal: fiberGoal,
      });
    }
  };

  // Filter logs by selected time range
  const filteredNutrition = useMemo(() => {
    if (timeRange === 'all') return nutritionLogs;

    if (timeRange === 'custom') {
      if (!customStartDate && !customEndDate) return nutritionLogs;
      const startMs = customStartDate ? new Date(customStartDate).getTime() : 0;
      const endMs = customEndDate
        ? new Date(customEndDate).setHours(23, 59, 59, 999)
        : Infinity;
      return nutritionLogs.filter((n) => {
        const t = new Date(n.timestamp).getTime();
        return t >= startMs && t <= endMs;
      });
    }

    if (timeRange === '1d') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = nutritionLogs.filter(
        (n) => new Date(n.timestamp).toISOString().split('T')[0] === todayStr
      );
      if (todayLogs.length > 0) return todayLogs;

      // Fallback: If today has no logged entries yet, show the most recent day that has entries
      if (nutritionLogs.length > 0) {
        const sorted = [...nutritionLogs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const latestDate = new Date(sorted[0].timestamp).toISOString().split('T')[0];
        return nutritionLogs.filter(
          (n) => new Date(n.timestamp).toISOString().split('T')[0] === latestDate
        );
      }
      return [];
    }

    const now = new Date().getTime();
    let days = 30;
    if (timeRange === '7d') days = 7;
    else if (timeRange === '1m') days = 30;
    else if (timeRange === '3m') days = 90;
    else if (timeRange === '6m') days = 180;
    else if (timeRange === '9m') days = 270;
    else if (timeRange === '1y') days = 365;

    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return nutritionLogs.filter((n) => new Date(n.timestamp).getTime() >= cutoff);
  }, [nutritionLogs, timeRange, customStartDate, customEndDate]);

  // Corresponding Gut Health logs for filtered range
  const filteredGutHealth = useMemo(() => {
    const validMealIds = new Set(filteredNutrition.map((n) => n.id));
    return gutHealthLogs.filter(
      (g) => validMealIds.has(g.mealReferenceId) || validMealIds.has(g.id)
    );
  }, [filteredNutrition, gutHealthLogs]);

  // Chronological meal-by-meal list for single-day views
  const singleDayMealTimeline = useMemo(() => {
    return [...filteredNutrition]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((n) => {
        const d = new Date(n.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const gut = gutHealthLogs.find((g) => g.mealReferenceId === n.id || g.id === n.id);
        return {
          ...n,
          timeStr,
          date: timeStr,
          sodiumPotassiumRatio:
            (n.potassium || 0) > 0
              ? Math.round(((n.sodium || 0) / (n.potassium || 1)) * 100) / 100
              : 0,
          gut,
        };
      });
  }, [filteredNutrition, gutHealthLogs]);

  // Daily Aggregated Data (Macro & Micro) for multi-day views
  const dailyData = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        rawDate: string;
        timestamp: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        sodium: number;
        potassium: number;
        mealCount: number;
      }
    >();

    filteredNutrition.forEach((n) => {
      const d = new Date(n.timestamp);
      const rawDate = d.toISOString().split('T')[0];
      const dateStr = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      const existing = map.get(rawDate) || {
        date: dateStr,
        rawDate,
        timestamp: new Date(rawDate).getTime(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodium: 0,
        potassium: 0,
        mealCount: 0,
      };

      existing.calories += n.calories;
      existing.protein += n.protein;
      existing.carbs += n.carbs;
      existing.fat += n.fat;
      existing.fiber += n.fiber;
      existing.sodium += n.sodium || 0;
      existing.potassium += n.potassium || 0;
      existing.mealCount += 1;

      map.set(rawDate, existing);
    });

    // Sort chronologically (oldest to newest)
    return Array.from(map.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => ({
        ...item,
        sodiumPotassiumRatio:
          item.potassium > 0
            ? Math.round((item.sodium / item.potassium) * 100) / 100
            : 0,
        isProteinInRange: item.protein >= goals.proteinMin && item.protein <= goals.proteinMax,
        isCarbsInRange: item.carbs >= goals.carbsMin && item.carbs <= goals.carbsMax,
        isFatInRange: item.fat >= goals.fatMin && item.fat <= goals.fatMax,
        isFiberInRange: item.fiber >= goals.fiberMin && item.fiber <= goals.fiberMax,
        isCaloriesInRange: item.calories >= goals.caloriesMin && item.calories <= goals.caloriesMax,
        isSodiumSafe: item.sodium <= goals.sodiumCeiling,
        isPotassiumAdequate: item.potassium >= goals.potassiumTarget,
      }));
  }, [filteredNutrition, goals]);

  // Decide whether chart plots meal-by-meal (1 Day) or daily aggregate (Multi-day)
  const isOneDaySelected = timeRange === '1d';
  const chartPoints = isOneDaySelected ? singleDayMealTimeline : dailyData;

  // Totals and averages across the filtered scope
  const totalCalories = filteredNutrition.reduce((acc, curr) => acc + curr.calories, 0);
  const totalProtein = Math.round(filteredNutrition.reduce((acc, curr) => acc + curr.protein, 0));
  const totalCarbs = Math.round(filteredNutrition.reduce((acc, curr) => acc + curr.carbs, 0));
  const totalFat = Math.round(filteredNutrition.reduce((acc, curr) => acc + curr.fat, 0));
  const totalFiber =
    Math.round(filteredNutrition.reduce((acc, curr) => acc + curr.fiber, 0) * 10) / 10;
  const totalSodium = Math.round(
    filteredNutrition.reduce((acc, curr) => acc + (curr.sodium || 0), 0)
  );
  const totalPotassium = Math.round(
    filteredNutrition.reduce((acc, curr) => acc + (curr.potassium || 0), 0)
  );

  const dailyCount = isOneDaySelected ? 1 : dailyData.length || 1;
  const displayCalories = isOneDaySelected
    ? totalCalories
    : Math.round(totalCalories / dailyCount);
  const displayProtein = isOneDaySelected
    ? totalProtein
    : Math.round(totalProtein / dailyCount);
  const displayCarbs = isOneDaySelected
    ? totalCarbs
    : Math.round(totalCarbs / dailyCount);
  const displayFat = isOneDaySelected
    ? totalFat
    : Math.round(totalFat / dailyCount);
  const displayFiber = isOneDaySelected
    ? totalFiber
    : Math.round((totalFiber / dailyCount) * 10) / 10;
  const displaySodium = isOneDaySelected
    ? totalSodium
    : Math.round(totalSodium / dailyCount);
  const displayPotassium = isOneDaySelected
    ? totalPotassium
    : Math.round(totalPotassium / dailyCount);

  const avgNaKRatio =
    displayPotassium > 0
      ? Math.round((displaySodium / displayPotassium) * 100) / 100
      : 0;

  // Compliance metrics (% of days in range)
  const daysInSodiumSafePct = isOneDaySelected
    ? displaySodium <= 2300
      ? 100
      : 0
    : Math.round(
        (dailyData.filter((d) => d.isSodiumSafe).length / dailyCount) * 100
      );

  // FODMAP trigger category frequency counts
  const fodmapFrequencyData = useMemo(() => {
    let fructans = 0;
    let lactose = 0;
    let excess_fructose = 0;
    let polyols = 0;
    let gos = 0;

    const sourceLogs = isOneDaySelected ? filteredGutHealth : gutHealthLogs;

    sourceLogs.forEach((g) => {
      if (g.fodmapCategories.fructans > 0) fructans += g.fodmapCategories.fructans;
      if (g.fodmapCategories.lactose > 0) lactose += g.fodmapCategories.lactose;
      if (g.fodmapCategories.excess_fructose > 0)
        excess_fructose += g.fodmapCategories.excess_fructose;
      if (g.fodmapCategories.polyols > 0) polyols += g.fodmapCategories.polyols;
      if (g.fodmapCategories.gos > 0) gos += g.fodmapCategories.gos;
    });

    return [
      { category: 'Fructans', loadScore: fructans, fill: FODMAP_COLORS['Fructans'] },
      { category: 'Lactose', loadScore: lactose, fill: FODMAP_COLORS['Lactose'] },
      {
        category: 'Excess Fructose',
        loadScore: excess_fructose,
        fill: FODMAP_COLORS['Excess Fructose'],
      },
      { category: 'Polyols', loadScore: polyols, fill: FODMAP_COLORS['Polyols'] },
      { category: 'GOS (Legumes)', loadScore: gos, fill: FODMAP_COLORS['GOS'] },
    ];
  }, [gutHealthLogs, filteredGutHealth, isOneDaySelected]);

  // IBS Risk distribution breakdown
  const riskDistributionData = useMemo(() => {
    let low = 0;
    let medium = 0;
    let high = 0;

    const sourceLogs = isOneDaySelected ? filteredGutHealth : gutHealthLogs;

    sourceLogs.forEach((g) => {
      if (g.ibsRiskLevel === 'Low') low++;
      else if (g.ibsRiskLevel === 'Medium') medium++;
      else if (g.ibsRiskLevel === 'High') high++;
    });

    return [
      { name: 'Low Risk', value: low, color: RISK_COLORS.Low },
      { name: 'Moderate Risk', value: medium, color: RISK_COLORS.Medium },
      { name: 'High Risk', value: high, color: RISK_COLORS.High },
    ].filter((item) => item.value > 0);
  }, [gutHealthLogs, filteredGutHealth, isOneDaySelected]);

  // Correlation data: Fiber intake vs IBS Risk Level
  const fiberRiskCorrelationData = useMemo(() => {
    return filteredNutrition.map((nut) => {
      const gut = gutHealthLogs.find(
        (g) => g.mealReferenceId === nut.id || g.id === nut.id
      );
      const riskScore =
        gut?.ibsRiskLevel === 'High' ? 3 : gut?.ibsRiskLevel === 'Medium' ? 2 : 1;
      return {
        meal: nut.meal.length > 18 ? nut.meal.substring(0, 16) + '...' : nut.meal,
        fiber: nut.fiber,
        calories: nut.calories,
        riskLevel: gut?.ibsRiskLevel || 'Low',
        riskNumeric: riskScore,
      };
    });
  }, [filteredNutrition, gutHealthLogs]);

  const activeGutLogs = isOneDaySelected ? filteredGutHealth : gutHealthLogs;
  const highRiskCount = activeGutLogs.filter((g) => g.ibsRiskLevel === 'High').length;
  const lowRiskPct = activeGutLogs.length
    ? Math.round(
        (activeGutLogs.filter((g) => g.ibsRiskLevel === 'Low').length /
          activeGutLogs.length) *
          100
      )
    : 0;

  // Dynamic Chart Theme Styles (Strict Neutral Zinc Palette)
  const tooltipStyle = {
    backgroundColor: isDark ? '#18181b' : '#ffffff',
    borderColor: isDark ? '#27272a' : '#e4e4e7',
    color: isDark ? '#fafafa' : '#18181b',
    borderRadius: '10px',
    boxShadow: isDark
      ? '0 10px 15px -3px rgb(0 0 0 / 0.5)'
      : '0 4px 6px -1px rgb(0 0 0 / 0.05)',
    fontSize: '12px',
  };

  const gridStroke = isDark ? '#27272a' : '#f4f4f5';
  const axisTickColor = isDark ? '#a1a1aa' : '#71717a';

  // Target values for single-day fulfillment calculations (derived from resolved goals)
  const TARGET_CALORIES = goals.calories;
  const TARGET_PROTEIN = goals.protein;
  const TARGET_CARBS = goals.carbs;
  const TARGET_FAT = goals.fat;
  const TARGET_FIBER = goals.fiber;
  const CEILING_SODIUM = goals.sodiumCeiling;
  const TARGET_POTASSIUM = goals.potassiumTarget;

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-8 sm:p-12 text-center transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Private Health Analytics & Range Diagnostics
        </h3>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
          Sign in with your Google Account to view your private nutrient corridors, daily macro/micro tracking, cumulative FODMAP load, and clinical risk analysis. Your records are completely isolated and private to you.
        </p>
        <div className="mt-6 flex justify-center">
          <GoogleSignInButton currentUser={currentUser} onAuthChange={onAuthChange} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Customizable Range Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
              TrackMyPlate Analytics & Range Diagnostics
            </h2>
            <InfoButton
              title="Corridors & Range Diagnostics"
              content={`Plots daily Macro and Micro nutrient intake against clinical reference corridors (${isCustomGoalsActive ? 'Custom User Targets' : 'Clinical Default Ranges'}), tracks cumulative FODMAP load accumulation, and analyzes fiber tolerance patterns over your selected time period.`}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          {/* Set Daily Goals Button */}
          <button
            id="set-daily-goals-btn"
            onClick={() => setIsDailyGoalsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-2xs shrink-0 min-h-[34px]"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Set Daily Goals</span>
            {isCustomGoalsActive ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 text-white font-bold leading-none">
                Custom
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium leading-none">
                Defaults
              </span>
            )}
          </button>

          {/* Customizable Range Selector Pills */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg text-xs font-medium border border-zinc-200/50 dark:border-zinc-700/50 overflow-x-auto no-scrollbar max-w-full">
          <button
            id="time-range-1d-btn"
            onClick={() => {
              setTimeRange('1d');
              setShowCustomPicker(false);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors font-semibold whitespace-nowrap shrink-0 ${
              timeRange === '1d'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            1 Day
          </button>
          <button
            id="time-range-7d-btn"
            onClick={() => {
              setTimeRange('7d');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === '7d'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            1 Week
          </button>
          <button
            id="time-range-1m-btn"
            onClick={() => {
              setTimeRange('1m');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === '1m'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            1 Month
          </button>
          <button
            id="time-range-3m-btn"
            onClick={() => {
              setTimeRange('3m');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === '3m'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            3 Months
          </button>
          <button
            id="time-range-6m-btn"
            onClick={() => {
              setTimeRange('6m');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === '6m'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            6 Months
          </button>
          <button
            id="time-range-9m-btn"
            onClick={() => {
              setTimeRange('9m');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === '9m'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            9 Months
          </button>
          <button
            id="time-range-1y-btn"
            onClick={() => {
              setTimeRange('1y');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === '1y'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            1 Year
          </button>
          <button
            id="time-range-all-btn"
            onClick={() => {
              setTimeRange('all');
              setShowCustomPicker(false);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              timeRange === 'all'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Time
          </button>
          <button
            id="time-range-custom-btn"
            onClick={() => {
              setTimeRange('custom');
              setShowCustomPicker(!showCustomPicker);
            }}
            className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center whitespace-nowrap shrink-0 ${
              timeRange === 'custom'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3 mr-1" />
            Custom
          </button>
        </div>
      </div>
    </div>

      {/* Inline Custom Date Picker (Expands when Custom is selected) */}
      {(showCustomPicker || timeRange === 'custom') && (
        <div className="bg-zinc-50 dark:bg-zinc-800/80 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            Custom Date Interval:
          </span>
          <div className="flex items-center space-x-2">
            <label className="text-zinc-500 dark:text-zinc-400">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setTimeRange('custom');
              }}
              className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-zinc-500 dark:text-zinc-400">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setTimeRange('custom');
              }}
              className="px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {(customStartDate || customEndDate) && (
            <button
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setTimeRange('1d');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium ml-auto"
            >
              Reset to 1 Day
            </button>
          )}
        </div>
      )}

      {/* 4 Primary Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isOneDaySelected ? 'Day Energy' : 'Avg Calories'}
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1">
            {displayCalories} <span className="text-xs font-normal text-zinc-400">kcal{isOneDaySelected ? '' : '/day'}</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {filteredNutrition.length} {filteredNutrition.length === 1 ? 'meal' : 'meals'} logged
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isOneDaySelected ? 'Day Fiber' : 'Daily Fiber'}
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1">
            {displayFiber}g <span className="text-xs font-normal text-zinc-400">{isOneDaySelected ? 'total' : '/day'}</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Goal: {userContext.dailyFiberGoal}g ({userContext.subtype})
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sodium Balance</span>
            <HeartPulse className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <p className="text-xl font-bold text-teal-600 dark:text-teal-400 font-mono mt-1">
            {displaySodium} <span className="text-xs font-normal text-zinc-400">mg</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {displaySodium <= 2300 ? 'Within <=2300mg limit' : 'Above 2300mg ceiling'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Low-FODMAP Ratio</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {lowRiskPct}%
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {highRiskCount} trigger exposure meals
          </p>
        </div>
      </div>

      {/* DEDICATED SINGLE DAY VIEW: CHRONOLOGICAL TIMELINE & TARGET COMPLETION */}
      {isOneDaySelected && (
        <div className="space-y-4">
          {/* Day Macro & Micro Fulfillment Gauges */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Current Day Target Fulfillment</span>
                  </h3>
                  <InfoButton
                    title="Daily Fulfillment Gauges"
                    content={`Real-time progress toward ${isCustomGoalsActive ? 'custom per-day goals' : 'clinical baseline maintenance corridors'} based on meals logged today. Tracks Calories, Protein, Net Carbs, Fats, Fiber, Sodium (max ceiling), and Potassium.`}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  id="day-card-configure-goals-btn"
                  onClick={() => setIsDailyGoalsModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <Sliders className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Configure Goals</span>
                </button>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  1-Day Focused Analysis
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* Calories */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Calories</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalCalories}/{TARGET_CALORIES}
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalCalories / TARGET_CALORIES) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalCalories / TARGET_CALORIES) * 100)}% ({goals.caloriesMin}–{goals.caloriesMax})
                </span>
              </div>

              {/* Protein */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Protein</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalProtein}g/{TARGET_PROTEIN}g
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalProtein / TARGET_PROTEIN) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalProtein / TARGET_PROTEIN) * 100)}% ({goals.proteinMin}–{goals.proteinMax}g)
                </span>
              </div>

              {/* Net Carbs */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Carbs</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalCarbs}g/{TARGET_CARBS}g
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalCarbs / TARGET_CARBS) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalCarbs / TARGET_CARBS) * 100)}% ({goals.carbsMin}–{goals.carbsMax}g)
                </span>
              </div>

              {/* Fats */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Fats</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalFat}g/{TARGET_FAT}g
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalFat / TARGET_FAT) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalFat / TARGET_FAT) * 100)}% ({goals.fatMin}–{goals.fatMax}g)
                </span>
              </div>

              {/* Fiber */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Fiber</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalFiber}g/{TARGET_FIBER}g
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalFiber / TARGET_FIBER) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalFiber / TARGET_FIBER) * 100)}% ({goals.fiberMin}–{goals.fiberMax}g)
                </span>
              </div>

              {/* Sodium (Ceiling limit) */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Sodium</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalSodium}/{CEILING_SODIUM}mg
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalSodium > CEILING_SODIUM ? 'bg-rose-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((totalSodium / CEILING_SODIUM) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalSodium / CEILING_SODIUM) * 100)}% ceiling
                </span>
              </div>

              {/* Potassium (Adequate intake) */}
              <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Potassium</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                    {totalPotassium}/{TARGET_POTASSIUM}mg
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((totalPotassium / TARGET_POTASSIUM) * 100))}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {Math.round((totalPotassium / TARGET_POTASSIUM) * 100)}% target
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Meal Log Cards for this Day */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Today's Chronological Meals ({singleDayMealTimeline.length})</span>
              </h3>
              <span className="text-xs text-zinc-400">
                Logged meals plotted sequentially
              </span>
            </div>

            {singleDayMealTimeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No meals logged for today yet. Use the Multimodal Food Analyzer to log your next meal!
              </div>
            ) : (
              <div className="space-y-2.5">
                {singleDayMealTimeline.map((item, idx) => {
                  const riskLevel = item.gut?.ibsRiskLevel || 'Low';
                  const riskColor =
                    riskLevel === 'High'
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                      : riskLevel === 'Medium'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-600"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-zinc-700 dark:text-zinc-200">
                          <Utensils className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {item.timeStr}
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {item.meal}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${riskColor}`}>
                              {riskLevel} IBS Risk
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                            <span>Portion: {item.portion}</span>
                            <span>•</span>
                            <span>{item.calories} kcal</span>
                            <span>•</span>
                            <span>P: {item.protein}g</span>
                            <span>•</span>
                            <span>C: {item.carbs}g</span>
                            <span>•</span>
                            <span>F: {item.fat}g</span>
                            <span>•</span>
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              Fiber: {item.fiber}g
                            </span>
                          </div>
                          {item.gut && item.gut.identifiedTriggers && item.gut.identifiedTriggers.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Triggers: {item.gut.identifiedTriggers.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between text-xs text-zinc-400">
                        <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                          Na: {item.sodium || 0}mg / K: {item.potassium || 0}mg
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">
                          Na:K: {item.sodiumPotassiumRatio}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GRAPH 1: MACRONUTRIENTS RANGE GRAPH */}
      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {isOneDaySelected ? "Today's Meal Macronutrient Breakdown" : 'Daily Macronutrients Range Graph'}
              </h3>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                Clinical Targets
              </span>
              <InfoButton
                title="Macronutrient Reference Corridors"
                content={
                  isOneDaySelected
                    ? 'Chronological macronutrient intake across meals logged today, displaying meal-by-meal protein, carb, fat, and fiber distribution.'
                    : `Daily intake plotted against clinical reference corridors (Protein: ${goals.proteinMin}–${goals.proteinMax}g, Carbs: ${goals.carbsMin}–${goals.carbsMax}g, Fat: ${goals.fatMin}–${goals.fatMax}g, Fiber: ${goals.fiberMin}–${goals.fiberMax}g). Shaded green regions represent evidence-based maintenance boundaries.`
                }
              />
            </div>
          </div>

          {/* Macro Focus Mode Switcher */}
          <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto border border-zinc-200/50 dark:border-zinc-700/50 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setMacroFocus('all')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                macroFocus === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All Combined
            </button>
            <button
              onClick={() => setMacroFocus('protein')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                macroFocus === 'protein'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Protein
            </button>
            <button
              onClick={() => setMacroFocus('carbs')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                macroFocus === 'carbs'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Carbs
            </button>
            <button
              onClick={() => setMacroFocus('fat')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                macroFocus === 'fat'
                  ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Fats
            </button>
            <button
              onClick={() => setMacroFocus('fiber')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                macroFocus === 'fiber'
                  ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-purple-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Fiber
            </button>
            <button
              onClick={() => setMacroFocus('calories')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                macroFocus === 'calories'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Calories
            </button>
          </div>
        </div>

        {/* Macro Chart Viewport */}
        <div className="h-72 w-full">
          {chartPoints.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No meal data found for selected range.
            </div>
          ) : macroFocus === 'all' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: axisTickColor }} unit="g" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: axisTickColor }} unit=" kcal" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="left" dataKey="protein" name="Protein (g)" stackId="macros" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="carbs" name="Carbs (g)" stackId="macros" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="fat" name="Fat (g)" stackId="macros" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="fiber" name="Fiber (g)" stackId="macros" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="calories" name="Total Calories" stroke={isDark ? '#fafafa' : '#18181b'} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  unit={macroFocus === 'calories' ? ' kcal' : 'g'}
                />
                <Tooltip contentStyle={tooltipStyle} />

                {/* Shaded Target Corridors */}
                {macroFocus === 'protein' && (
                  <>
                    <ShadedZone y1={goals.proteinMin} y2={goals.proteinMax} fill="#10b981" fillOpacity={isDark ? 0.18 : 0.12} stroke="#10b981" strokeDasharray="2 2" />
                    <ReferenceLine y={goals.protein} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Target: ${goals.protein}g`, fill: '#10b981', fontSize: 10 }} />
                    <Area type="monotone" dataKey="protein" name="Protein (g)" stroke="#10b981" strokeWidth={2.5} fill="#10b981" fillOpacity={0.2} dot={{ r: 3 }} />
                  </>
                )}

                {macroFocus === 'carbs' && (
                  <>
                    <ShadedZone y1={goals.carbsMin} y2={goals.carbsMax} fill="#3b82f6" fillOpacity={isDark ? 0.18 : 0.12} stroke="#3b82f6" strokeDasharray="2 2" />
                    <ReferenceLine y={goals.carbs} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: `Target: ${goals.carbs}g`, fill: '#3b82f6', fontSize: 10 }} />
                    <Area type="monotone" dataKey="carbs" name="Carbs (g)" stroke="#3b82f6" strokeWidth={2.5} fill="#3b82f6" fillOpacity={0.2} dot={{ r: 3 }} />
                  </>
                )}

                {macroFocus === 'fat' && (
                  <>
                    <ShadedZone y1={goals.fatMin} y2={goals.fatMax} fill="#f59e0b" fillOpacity={isDark ? 0.18 : 0.12} stroke="#f59e0b" strokeDasharray="2 2" />
                    <ReferenceLine y={goals.fat} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Target: ${goals.fat}g`, fill: '#f59e0b', fontSize: 10 }} />
                    <Area type="monotone" dataKey="fat" name="Fat (g)" stroke="#f59e0b" strokeWidth={2.5} fill="#f59e0b" fillOpacity={0.2} dot={{ r: 3 }} />
                  </>
                )}

                {macroFocus === 'fiber' && (
                  <>
                    <ShadedZone y1={goals.fiberMin} y2={goals.fiberMax} fill="#8b5cf6" fillOpacity={isDark ? 0.18 : 0.12} stroke="#8b5cf6" strokeDasharray="2 2" />
                    <ReferenceLine y={goals.fiber} stroke="#10b981" strokeWidth={2} label={{ value: `Goal: ${goals.fiber}g`, fill: '#10b981', fontSize: 10 }} />
                    <Area type="monotone" dataKey="fiber" name="Fiber (g)" stroke="#8b5cf6" strokeWidth={2.5} fill="#8b5cf6" fillOpacity={0.2} dot={{ r: 3 }} />
                  </>
                )}

                {macroFocus === 'calories' && (
                  <>
                    <ShadedZone y1={goals.caloriesMin} y2={goals.caloriesMax} fill="#71717a" fillOpacity={isDark ? 0.2 : 0.12} stroke="#71717a" strokeDasharray="2 2" />
                    <ReferenceLine y={goals.calories} stroke="#71717a" strokeDasharray="3 3" label={{ value: `Target: ${goals.calories} kcal`, fill: '#71717a', fontSize: 10 }} />
                    <Area type="monotone" dataKey="calories" name="Calories (kcal)" stroke={isDark ? '#fafafa' : '#18181b'} strokeWidth={2.5} fill="#71717a" fillOpacity={0.2} dot={{ r: 3 }} />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Macro Footer Legend & Quick Badges */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-emerald-500 mr-1.5" /> Protein: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{displayProtein}g</strong>
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-blue-500 mr-1.5" /> Carbs: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{displayCarbs}g</strong>
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-amber-500 mr-1.5" /> Fat: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{displayFat}g</strong>
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-purple-500 mr-1.5" /> Fiber: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{displayFiber}g</strong>
            </span>
          </div>
          <span className="text-zinc-400">
            Shaded zones represent clinical tolerance and recommended corridors.
          </span>
        </div>
      </div>

      {/* GRAPH 2: MICRONUTRIENTS RANGE GRAPH */}
      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {isOneDaySelected ? "Today's Micronutrient Breakdown" : 'Daily Micronutrients Range Graph'}
              </h3>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                Electrolytes & Fluid Balance
              </span>
              <InfoButton
                title="Electrolytes & Fluid Balance"
                content={`Monitors daily Sodium intake against the ceiling (≤${goals.sodiumCeiling} mg/day) and Potassium adequate intake range (${goals.potassiumTarget}–${goals.potassiumMax} mg/day). Maintaining balanced electrolyte intake prevents fluid shifts in the gut and supports cardiovascular wellness.`}
              />
            </div>
          </div>

          {/* Micro Focus Mode Switcher */}
          <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto border border-zinc-200/50 dark:border-zinc-700/50 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setMicroFocus('dual')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                microFocus === 'dual'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Dual Na & K (mg)
            </button>
            <button
              onClick={() => setMicroFocus('sodium')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                microFocus === 'sodium'
                  ? 'bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Sodium (&le;2300mg)
            </button>
            <button
              onClick={() => setMicroFocus('potassium')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                microFocus === 'potassium'
                  ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Potassium (2600-3400mg)
            </button>
            <button
              onClick={() => setMicroFocus('ratio')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                microFocus === 'ratio'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Na:K Ratio (&lt;1.0)
            </button>
          </div>
        </div>

        {/* Micronutrient Chart Viewport */}
        <div className="h-72 w-full">
          {chartPoints.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No micronutrient data for selected range.
            </div>
          ) : microFocus === 'dual' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisTickColor }} unit=" mg" />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={goals.sodiumCeiling} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: `Max: ${goals.sodiumCeiling}mg`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine y={goals.potassiumTarget} stroke="#14b8a6" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: `Target: ${goals.potassiumTarget}mg`, fill: '#14b8a6', fontSize: 10, position: 'insideBottomRight' }} />
                <Bar dataKey="sodium" name="Sodium (mg)" fill="#f43f5e" radius={[2, 2, 0, 0]} opacity={0.85} />
                <Line type="monotone" dataKey="potassium" name="Potassium (mg)" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3.5, fill: '#0d9488' }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : microFocus === 'sodium' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisTickColor }} unit=" mg" />
                <Tooltip contentStyle={tooltipStyle} />
                <ShadedZone y1={1500} y2={goals.sodiumCeiling} fill="#10b981" fillOpacity={isDark ? 0.18 : 0.12} stroke="#10b981" strokeDasharray="2 2" />
                <ReferenceLine y={goals.sodiumCeiling} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ value: `Ceiling: ${goals.sodiumCeiling}mg`, fill: '#ef4444', fontSize: 10 }} />
                <Area type="monotone" dataKey="sodium" name="Sodium (mg)" stroke="#f43f5e" strokeWidth={2.5} fill="#f43f5e" fillOpacity={0.2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : microFocus === 'potassium' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisTickColor }} unit=" mg" />
                <Tooltip contentStyle={tooltipStyle} />
                <ShadedZone y1={goals.potassiumTarget} y2={goals.potassiumMax} fill="#0d9488" fillOpacity={isDark ? 0.18 : 0.12} stroke="#0d9488" strokeDasharray="2 2" />
                <ReferenceLine y={goals.potassiumTarget} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: `Target: ${goals.potassiumTarget}mg`, fill: '#0d9488', fontSize: 10 }} />
                <Area type="monotone" dataKey="potassium" name="Potassium (mg)" stroke="#0d9488" strokeWidth={2.5} fill="#0d9488" fillOpacity={0.2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis tick={{ fontSize: 11, fill: axisTickColor }} domain={[0, 'dataMax + 0.5']} />
                <Tooltip contentStyle={tooltipStyle} />
                <ShadedZone y1={0} y2={goals.sodiumPotassiumRatioMax} fill="#10b981" fillOpacity={isDark ? 0.18 : 0.12} />
                <ReferenceLine y={goals.sodiumPotassiumRatioMax} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: `Optimal Balance (≤ ${goals.sodiumPotassiumRatioMax})`, fill: '#10b981', fontSize: 10 }} />
                <Line type="monotone" dataKey="sodiumPotassiumRatio" name="Na:K Ratio" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Micro Footer Legend & Stats */}
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-rose-500 mr-1.5" /> Sodium: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{displaySodium}mg</strong>
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-teal-500 mr-1.5" /> Potassium: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{displayPotassium}mg</strong>
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-xs bg-indigo-500 mr-1.5" /> Na:K Ratio: <strong className="ml-1 text-zinc-800 dark:text-zinc-200">{avgNaKRatio}</strong>
            </span>
          </div>
          <span className="text-zinc-400">
            A lower Na:K ratio (&lt;1.0) reduces colonic osmotic distress and supports cardiovascular tone.
          </span>
        </div>
      </div>

      {/* Chart Row 3: FODMAP Exposure Categories & IBS Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* FODMAP Trigger Categories Frequency (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="mb-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Frequency & Cumulative Load of Consumed FODMAP Categories
              </h3>
              <InfoButton
                title="FODMAP Cumulative Exposure Load"
                content="Total cumulative severity score (0 to 5 per meal) across meals in the selected range, highlighting which specific fermentable carbohydrate categories (fructans, GOS, lactose, excess fructose, polyols) have the highest exposure."
              />
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fodmapFrequencyData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: axisTickColor }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: axisTickColor, fontWeight: 500 }} width={105} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: any) => [`${val} total load points`, 'Exposure Score']}
                />
                <Bar dataKey="loadScore" radius={[0, 4, 4, 0]}>
                  {fodmapFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* IBS Risk Level Distribution Donut (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
          <div className="mb-2">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                IBS Risk Level Distribution
              </h3>
              <InfoButton
                title="IBS Risk Distribution"
                content="Ratio of Low, Moderate, and High gut health risk meals logged within the selected timeframe, derived from portion size, FODMAP density, and known patient triggers."
              />
            </div>
          </div>

          <div className="h-52 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: any, name: any) => [`${val} meals`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100 font-mono">
                {activeGutLogs.length}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">Logged</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            {riskDistributionData.map((item) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                  {item.name}: <strong className="text-zinc-800 dark:text-zinc-200">{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Row 4: Fiber vs IBS Trigger Correlation */}
      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Fiber Intake vs. IBS Risk Frequency Correlation
            </h3>
            <InfoButton
              title="Fiber vs. IBS Risk Correlation"
              content="Evaluates whether high-fiber meals correlate with higher FODMAP risk (e.g. prebiotic inulin or beans) versus well-tolerated low-FODMAP soluble fiber (e.g. oats, quinoa, chia) that nourish the microbiome without triggering digestive symptoms."
            />
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fiberRiskCorrelationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="meal" tick={{ fontSize: 10, fill: axisTickColor }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: axisTickColor }} unit="g" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: any, name: string, props: any) => [
                  `${val}g Fiber (IBS Risk: ${props.payload.riskLevel})`,
                  'Fiber Content',
                ]}
              />
              <Bar dataKey="fiber" name="Fiber (g)" radius={[3, 3, 0, 0]}>
                {fiberRiskCorrelationData.map((entry, index) => (
                  <Cell
                    key={`fiber-cell-${index}`}
                    fill={
                      entry.riskLevel === 'High'
                        ? '#f43f5e'
                        : entry.riskLevel === 'Medium'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <span>Green = Low Risk Fiber source</span>
          <span>Amber = Moderate Risk Stacking</span>
          <span>Red = High-FODMAP Stacking (Inulin / Alliums / GOS)</span>
        </div>
      </div>

      {/* Daily Goals Configuration Modal */}
      <DailyGoalsModal
        isOpen={isDailyGoalsModalOpen}
        onClose={() => setIsDailyGoalsModalOpen(false)}
        userContext={userContext}
        onUpdateGoals={handleUpdateGoals}
      />
    </div>
  );
};
