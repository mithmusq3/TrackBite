import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldCheck,
  Calendar,
  Sparkles,
  Edit3,
  Lock
} from 'lucide-react';
import { User } from 'firebase/auth';
import { NutritionLogEntry, GutHealthLogEntry } from '../types';
import { exportNutritionToCSV, exportGutHealthToCSV } from '../lib/exportUtils';
import { EditLogModal } from './EditLogModal';
import { InfoButton } from './InfoButton';
import { GoogleSignInButton } from './GoogleSignInButton';

interface DualSheetsLogViewProps {
  nutritionLogs: NutritionLogEntry[];
  gutHealthLogs: GutHealthLogEntry[];
  onDeleteLog: (id: string) => void;
  onUpdateLog: (updatedNutrition: NutritionLogEntry, updatedGutHealth?: GutHealthLogEntry) => void;
  currentUser: User | null;
  onAuthChange: (user: User | null) => void;
}

export const DualSheetsLogView: React.FC<DualSheetsLogViewProps> = ({
  nutritionLogs,
  gutHealthLogs,
  onDeleteLog,
  onUpdateLog,
  currentUser,
  onAuthChange,
}) => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'gutHealth'>('nutrition');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'Low' | 'Medium' | 'High'>('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Editing state
  const [editingNutrition, setEditingNutrition] = useState<NutritionLogEntry | null>(null);
  const [editingGutHealth, setEditingGutHealth] = useState<GutHealthLogEntry | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const handleStartEdit = (nutritionLog: NutritionLogEntry) => {
    const gut = gutHealthLogs.find(
      (g) => g.mealReferenceId === nutritionLog.id || g.id === nutritionLog.id
    );
    setEditingNutrition(nutritionLog);
    setEditingGutHealth(gut || null);
  };

  const handleStartEditFromGut = (gutLog: GutHealthLogEntry) => {
    const nut = nutritionLogs.find(
      (n) => n.id === gutLog.mealReferenceId || n.id === gutLog.id
    );
    if (nut) {
      setEditingNutrition(nut);
      setEditingGutHealth(gutLog);
    }
  };

  const handleSaveModal = (
    updatedNutrition: NutritionLogEntry,
    updatedGutHealth?: GutHealthLogEntry
  ) => {
    onUpdateLog(updatedNutrition, updatedGutHealth);
    setEditingNutrition(null);
    setEditingGutHealth(null);
  };

  // Filtered Nutrition logs
  const filteredNutrition = nutritionLogs.filter((n) => {
    const matchesSearch =
      n.meal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.notes && n.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      n.keyVitamins.some((v) => v.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (riskFilter !== 'ALL') {
      const gut = gutHealthLogs.find((g) => g.mealReferenceId === n.id || g.id === n.id);
      return gut?.ibsRiskLevel === riskFilter;
    }

    return true;
  });

  // Filtered Gut Health logs
  const filteredGutHealth = gutHealthLogs.filter((g) => {
    const matchesSearch =
      g.mealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.identifiedTriggers.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      g.predictiveDigestiveReaction.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.aiRecommendation.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (riskFilter !== 'ALL' && g.ibsRiskLevel !== riskFilter) return false;

    return true;
  });

  const getRiskBadge = (risk: 'Low' | 'Medium' | 'High') => {
    switch (risk) {
      case 'Low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Low
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" /> Moderate
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" /> High
          </span>
        );
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-8 sm:p-12 text-center transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Private Database Worksheets
        </h3>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
          Sign in with your Google Account to access your personal meal records. Your data is isolated, encrypted, and accessible only to you.
        </p>
        <div className="mt-6 flex justify-center">
          <GoogleSignInButton currentUser={currentUser} onAuthChange={onAuthChange} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden transition-colors">
      {/* Top Header Controls */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Database Worksheets
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Live DB
            </span>
            <InfoButton
              title="Database Worksheets"
              content="Directly queries and displays live Firestore database logs for your authenticated Google account. Edits, additions, and deletions persist across sessions in real time."
            />
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Account:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {currentUser.displayName || currentUser.email}
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
              Private to this account
            </span>
          </div>
        </div>

        {/* Tab switcher & export buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Worksheets Toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-semibold w-full xs:w-auto">
            <button
              id="sheet-tab-nutrition-btn"
              onClick={() => setActiveTab('nutrition')}
              className={`flex-1 xs:flex-none px-3 py-1.5 rounded-md transition-all flex items-center justify-center space-x-1.5 min-h-[32px] ${
                activeTab === 'nutrition'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className="sm:hidden">Nutrition</span>
              <span className="hidden sm:inline">Sheet 1: Nutrition_Log</span>
              <span className="px-1.5 py-0.2 rounded font-mono bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-[10px]">
                {nutritionLogs.length}
              </span>
            </button>
            <button
              id="sheet-tab-guthealth-btn"
              onClick={() => setActiveTab('gutHealth')}
              className={`flex-1 xs:flex-none px-3 py-1.5 rounded-md transition-all flex items-center justify-center space-x-1.5 min-h-[32px] ${
                activeTab === 'gutHealth'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span className="sm:hidden">Gut Health</span>
              <span className="hidden sm:inline">Sheet 2: Gut_Health_Log</span>
              <span className="px-1.5 py-0.2 rounded font-mono bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-200 text-[10px]">
                {gutHealthLogs.length}
              </span>
            </button>
          </div>

          {/* Export CSV button */}
          <button
            id="export-csv-btn"
            onClick={() => {
              if (activeTab === 'nutrition') exportNutritionToCSV(filteredNutrition);
              else exportGutHealthToCSV(filteredGutHealth);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center space-x-1 transition-colors min-h-[32px]"
            title="Download CSV for the active worksheet"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden xs:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 sm:px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search meal, trigger, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
          />
        </div>

        {/* Risk Level Filter Chips */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-medium mr-1 flex items-center text-[11px] shrink-0">
            <Filter className="w-3 h-3 mr-1" /> Risk:
          </span>
          {(['ALL', 'Low', 'Medium', 'High'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-2.5 py-1 rounded-md transition-colors text-[11px] font-medium shrink-0 min-h-[28px] ${
                riskFilter === lvl
                  ? 'bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white font-semibold'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Sheet 1: Nutrition_Log */}
      {activeTab === 'nutrition' && (
        <>
          {/* Mobile Card List (Visible on phones & small screens) */}
          <div className="block md:hidden divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {filteredNutrition.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs px-4">
                No nutrition logs matching your filter criteria.
              </div>
            ) : (
              filteredNutrition.map((log) => {
                const isExpanded = expandedRowId === log.id;
                const gut = gutHealthLogs.find(
                  (g) => g.mealReferenceId === log.id || g.id === log.id
                );
                const isDeleting = confirmDeleteId === log.id;

                return (
                  <div key={log.id} className="p-4 space-y-2.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* Header: Title, Portion & Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                          {log.meal}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span>{formatDate(log.timestamp)}</span>
                          {log.portion && (
                            <>
                              <span>•</span>
                              <span className="truncate">{log.portion}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {isDeleting ? (
                          <div className="flex items-center space-x-1 text-xs">
                            <button
                              onClick={() => {
                                onDeleteLog(log.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-white font-medium text-[11px]"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(log)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Edit parsed details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Macronutrient Chips */}
                    <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                      <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Cals</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs">{log.calories}</span>
                      </div>
                      <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Protein</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-xs">{log.protein}g</span>
                      </div>
                      <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Carbs</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-xs">{log.carbs}g</span>
                      </div>
                      <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">Fat</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-xs">{log.fat}g</span>
                      </div>
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Fiber</span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 font-mono text-xs">{log.fiber}g</span>
                      </div>
                    </div>

                    {/* Sub-info: Sodium/Potassium, Confidence, Gut Correlation */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
                      <div className="text-zinc-500 dark:text-zinc-400 font-mono">
                        Na: {log.sodium}mg • K: {log.potassium}mg
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {gut && getRiskBadge(gut.ibsRiskLevel)}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {log.confidence}% {log.isEstimated ? '(Est)' : ''}
                        </span>
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details on mobile */}
                    {isExpanded && (
                      <div className="p-3 mt-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2">
                        {log.keyVitamins.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Key Vitamins:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.keyVitamins.map((v, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-700 text-[10px] border border-zinc-200 dark:border-zinc-600">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.notes && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Clinical Notes:</span>
                            <p className="text-zinc-700 dark:text-zinc-300 text-xs mt-0.5 leading-relaxed">{log.notes}</p>
                          </div>
                        )}
                        {gut && gut.identifiedTriggers.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Identified Triggers:</span>
                            <p className="text-rose-600 dark:text-rose-400 text-xs mt-0.5 font-medium">{gut.identifiedTriggers.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (Visible on tablet & desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Meal & Portion</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Calories</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Protein</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Carbs</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Fat</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Fiber</th>
                  <th className="py-2.5 px-4 font-semibold">Micronutrients</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Confidence</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredNutrition.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-zinc-400">
                      No nutrition logs matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredNutrition.map((log) => {
                    const isExpanded = expandedRowId === log.id;
                    const gut = gutHealthLogs.find(
                      (g) => g.mealReferenceId === log.id || g.id === log.id
                    );
                    const isDeleting = confirmDeleteId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate">{log.meal}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{log.portion}</p>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                            {log.calories}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-700 dark:text-zinc-300 font-mono">
                            {log.protein}g
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-700 dark:text-zinc-300 font-mono">
                            {log.carbs}g
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-700 dark:text-zinc-300 font-mono">
                            {log.fat}g
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                            {log.fiber}g
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                            Na: {log.sodium}mg • K: {log.potassium}mg
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            >
                              {log.confidence}% {log.isEstimated ? '(Est)' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {isDeleting ? (
                              <div className="flex items-center justify-end space-x-1 text-[11px]">
                                <span className="text-rose-600 dark:text-rose-400 font-semibold mr-1">Delete?</span>
                                <button
                                  onClick={() => {
                                    onDeleteLog(log.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-medium hover:bg-rose-700"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-1">
                                {/* Edit Button */}
                                <button
                                  onClick={() => handleStartEdit(log)}
                                  className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                  title="Edit parsed details"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Toggle Details */}
                                <button
                                  onClick={() => toggleExpand(log.id)}
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                  title="Toggle details"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => setConfirmDeleteId(log.id)}
                                  className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Expanded View */}
                        {isExpanded && (
                          <tr className="bg-zinc-50/50 dark:bg-zinc-800/40">
                            <td colSpan={10} className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                                <div>
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">Key Vitamins:</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {log.keyVitamins.map((v, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-[11px]"
                                      >
                                        {v}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">Clinical Notes:</span>
                                  <p className="mt-1 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                    {log.notes || 'Recorded from multimodal inference.'}
                                  </p>
                                </div>

                                <div>
                                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">Gut Risk Correlation:</span>
                                  <div className="mt-1 flex items-center space-x-2">
                                    {gut ? getRiskBadge(gut.ibsRiskLevel) : <span className="text-zinc-400">N/A</span>}
                                    {gut && gut.identifiedTriggers.length > 0 && (
                                      <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                                        {gut.identifiedTriggers.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 2: Sheet 2: Gut_Health_Log */}
      {activeTab === 'gutHealth' && (
        <>
          {/* Mobile Card List (Gut Health) */}
          <div className="block md:hidden divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {filteredGutHealth.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs px-4">
                No gut health logs matching your filter criteria.
              </div>
            ) : (
              filteredGutHealth.map((log) => {
                const isDeleting = confirmDeleteId === log.id;
                return (
                  <div key={log.id} className="p-4 space-y-2.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                            {log.mealName}
                          </h4>
                          {getRiskBadge(log.ibsRiskLevel)}
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 block">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {isDeleting ? (
                          <div className="flex items-center space-x-1 text-xs">
                            <button
                              onClick={() => {
                                onDeleteLog(log.mealReferenceId || log.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-white font-medium text-[11px]"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditFromGut(log)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Edit parsed details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* FODMAP loads summary */}
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                        FODMAP Loads
                      </span>
                      <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px]">
                        <div><span className="text-[9px] text-zinc-400 block">Fruc</span>{log.fodmapCategories.fructans}</div>
                        <div><span className="text-[9px] text-zinc-400 block">Lact</span>{log.fodmapCategories.lactose}</div>
                        <div><span className="text-[9px] text-zinc-400 block">ExFru</span>{log.fodmapCategories.excess_fructose}</div>
                        <div><span className="text-[9px] text-zinc-400 block">Poly</span>{log.fodmapCategories.polyols}</div>
                        <div><span className="text-[9px] text-zinc-400 block">GOS</span>{log.fodmapCategories.gos}</div>
                      </div>
                    </div>

                    {/* Identified Triggers */}
                    {log.identifiedTriggers.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold mr-1">Triggers:</span>
                        {log.identifiedTriggers.map((t, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Predictive Reaction & Swap */}
                    <div className="text-xs space-y-1 pt-1 text-zinc-600 dark:text-zinc-300">
                      {log.predictiveDigestiveReaction && (
                        <p className="leading-relaxed">
                          <strong className="text-zinc-700 dark:text-zinc-200">Reaction: </strong>
                          {log.predictiveDigestiveReaction}
                        </p>
                      )}
                      {log.aiRecommendation && (
                        <p className="leading-relaxed text-emerald-800 dark:text-emerald-300">
                          <strong>Swap / Recommendation: </strong>
                          {log.aiRecommendation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (Gut Health) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200/80 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Meal Reference</th>
                  <th className="py-2.5 px-3 font-semibold">IBS Risk Level</th>
                  <th className="py-2.5 px-4 font-semibold">Identified Triggers</th>
                  <th className="py-2.5 px-3 font-semibold">FODMAP Loads (0-5)</th>
                  <th className="py-2.5 px-4 font-semibold">Predictive Digestive Reaction</th>
                  <th className="py-2.5 px-4 font-semibold">Clinical AI Swap</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredGutHealth.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-zinc-400">
                      No gut health logs matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGutHealth.map((log) => {
                    const isDeleting = confirmDeleteId === log.id;
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 max-w-xs">
                          {log.mealName}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{getRiskBadge(log.ibsRiskLevel)}</td>
                        <td className="py-3 px-4 max-w-xs">
                          {log.identifiedTriggers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.identifiedTriggers.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-medium"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">None flagged</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                          F:{log.fodmapCategories.fructans} L:{log.fodmapCategories.lactose} Fru:
                          {log.fodmapCategories.excess_fructose} P:{log.fodmapCategories.polyols} G:
                          {log.fodmapCategories.gos}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                          {log.predictiveDigestiveReaction}
                        </td>
                        <td className="py-3 px-4 max-w-xs text-zinc-800 dark:text-zinc-200 leading-relaxed text-[11px]">
                          {log.aiRecommendation}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isDeleting ? (
                            <div className="flex items-center justify-end space-x-1 text-[11px]">
                              <span className="text-rose-600 dark:text-rose-400 font-semibold mr-1">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteLog(log.mealReferenceId || log.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-medium hover:bg-rose-700"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleStartEditFromGut(log)}
                                className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                title="Edit parsed details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setConfirmDeleteId(log.id)}
                                className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Log Modal */}
      {editingNutrition && (
        <EditLogModal
          isOpen={Boolean(editingNutrition)}
          onClose={() => {
            setEditingNutrition(null);
            setEditingGutHealth(null);
          }}
          nutritionEntry={editingNutrition}
          gutHealthEntry={editingGutHealth}
          onSave={handleSaveModal}
        />
      )}
    </div>
  );
};
