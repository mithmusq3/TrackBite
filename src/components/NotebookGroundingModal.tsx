import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Check,
  AlertCircle,
  Sparkles,
  Sliders,
  UserCheck,
  Plus,
  RefreshCw,
  Target
} from 'lucide-react';
import { NotebookGroundingRule, UserPersonalToleranceContext, DailyNutrientGoals } from '../types';
import { DEFAULT_GROUNDING_RULES, DEFAULT_TOLERANCE_CONTEXT, DEFAULT_DAILY_GOALS } from '../lib/clinicalKnowledgeBase';
import { InfoButton } from './InfoButton';

interface NotebookGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  groundingRules: NotebookGroundingRule[];
  onUpdateRules: (rules: NotebookGroundingRule[]) => void;
  userContext: UserPersonalToleranceContext;
  onUpdateUserContext: (ctx: UserPersonalToleranceContext) => void;
}

export const NotebookGroundingModal: React.FC<NotebookGroundingModalProps> = ({
  isOpen,
  onClose,
  groundingRules,
  onUpdateRules,
  userContext,
  onUpdateUserContext,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'profile' | 'prompt'>('rules');
  const [tempRules, setTempRules] = useState<NotebookGroundingRule[]>(groundingRules);
  const [tempContext, setTempContext] = useState<UserPersonalToleranceContext>(userContext);
  const [newTriggerInput, setNewTriggerInput] = useState('');
  const [newToleratedInput, setNewToleratedInput] = useState('');

  if (!isOpen) return null;

  const toggleRule = (id: string) => {
    setTempRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleAddTrigger = () => {
    if (!newTriggerInput.trim()) return;
    setTempContext((prev) => ({
      ...prev,
      knownSevereTriggers: [...prev.knownSevereTriggers, newTriggerInput.trim()],
    }));
    setNewTriggerInput('');
  };

  const handleRemoveTrigger = (index: number) => {
    setTempContext((prev) => ({
      ...prev,
      knownSevereTriggers: prev.knownSevereTriggers.filter((_, i) => i !== index),
    }));
  };

  const handleAddTolerated = () => {
    if (!newToleratedInput.trim()) return;
    setTempContext((prev) => ({
      ...prev,
      toleratedFoods: [...prev.toleratedFoods, newToleratedInput.trim()],
    }));
    setNewToleratedInput('');
  };

  const handleRemoveTolerated = (index: number) => {
    setTempContext((prev) => ({
      ...prev,
      toleratedFoods: prev.toleratedFoods.filter((_, i) => i !== index),
    }));
  };

  const handleSaveAndApply = () => {
    onUpdateRules(tempRules);
    onUpdateUserContext(tempContext);
    onClose();
  };

  const handleResetDefaults = () => {
    setTempRules(DEFAULT_GROUNDING_RULES);
    setTempContext(DEFAULT_TOLERANCE_CONTEXT);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Notebook Grounding & Clinical Context
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Grounding Rules
                </span>
                <InfoButton
                  title="Clinical Knowledge & Grounding"
                  content="Grounds Gemini Flash multimodal inference with evidence-based research rules, portion thresholds, and personalized patient tolerance profiles to prevent generic or unsafe advice."
                />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-5 pt-2 text-xs font-semibold space-x-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Clinical Research Rules ({tempRules.filter((r) => r.enabled).length}/{tempRules.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Patient Tolerance Profile ({tempContext.subtype})
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'prompt'
                ? 'border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Inspect Active Context Injection
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: CLINICAL RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                  Evidence-Based Research Rules
                </span>
                <InfoButton
                  title="Gastrointestinal Knowledge Base"
                  content="Simulates an external clinical gastrointestinal knowledge base. Enabled rules are injected directly into Gemini's system context window to guide portion thresholds and stacking logic."
                />
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                {tempRules.map((rule) => (
                  <div
                    key={rule.id}
                    onClick={() => toggleRule(rule.id)}
                    className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors flex items-start space-x-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => {}}
                      className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-zinc-300 dark:border-zinc-700"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{rule.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {rule.category}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">{rule.ruleText}</p>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block mt-1">
                        Source: {rule.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT TOLERANCE PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 flex items-start space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <p>
                  Personalize the inference engine to match your clinical IBS diagnosis and known physiological triggers.
                </p>
              </div>

              {/* Subtype & Fiber Goal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    IBS Clinical Subtype:
                  </label>
                  <select
                    value={tempContext.subtype}
                    onChange={(e: any) =>
                      setTempContext({ ...tempContext, subtype: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="Unspecified">Open Spectrum / Unspecified (Differential Evaluation)</option>
                    <option value="IBS-M">IBS-M (Mixed / Alternating Stool Habits)</option>
                    <option value="IBS-C">IBS-C (Constipation Predominant)</option>
                    <option value="IBS-D">IBS-D (Diarrhea Predominant)</option>
                    <option value="IBS-U">IBS-U (Unclassified DGBI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Daily Dietary Fiber Goal (g):
                  </label>
                  <input
                    type="number"
                    value={tempContext.dailyFiberGoal}
                    onChange={(e) =>
                      setTempContext({
                        ...tempContext,
                        dailyFiberGoal: Number(e.target.value) || 25,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Per-Day Macro & Micro Nutrient Targets (Optional) */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Per-Day Macro & Micro Targets (Optional)
                    </h4>
                    <InfoButton
                      size="xs"
                      title="Daily Goals Fallback"
                      content="If left blank or 0, analytics automatically falls back to clinical default maintenance corridors."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTempContext({
                        ...tempContext,
                        dailyGoals: {
                          calories: DEFAULT_DAILY_GOALS.calories,
                          protein: DEFAULT_DAILY_GOALS.protein,
                          carbs: DEFAULT_DAILY_GOALS.carbs,
                          fat: DEFAULT_DAILY_GOALS.fat,
                          sodiumCeiling: DEFAULT_DAILY_GOALS.sodiumCeiling,
                          potassiumTarget: DEFAULT_DAILY_GOALS.potassiumTarget,
                        },
                      });
                    }}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Use Clinical Defaults
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  If left blank or 0, analytics automatically falls back to clinical default maintenance corridors.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-300 font-medium mb-0.5">
                      Calories (kcal)
                    </label>
                    <input
                      type="number"
                      value={tempContext.dailyGoals?.calories || ''}
                      placeholder="2000 (default)"
                      onChange={(e) =>
                        setTempContext({
                          ...tempContext,
                          dailyGoals: {
                            ...(tempContext.dailyGoals || {}),
                            calories: Number(e.target.value) || undefined,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-300 font-medium mb-0.5">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      value={tempContext.dailyGoals?.protein || ''}
                      placeholder="70 (default)"
                      onChange={(e) =>
                        setTempContext({
                          ...tempContext,
                          dailyGoals: {
                            ...(tempContext.dailyGoals || {}),
                            protein: Number(e.target.value) || undefined,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-300 font-medium mb-0.5">
                      Net Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={tempContext.dailyGoals?.carbs || ''}
                      placeholder="200 (default)"
                      onChange={(e) =>
                        setTempContext({
                          ...tempContext,
                          dailyGoals: {
                            ...(tempContext.dailyGoals || {}),
                            carbs: Number(e.target.value) || undefined,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-300 font-medium mb-0.5">
                      Total Fats (g)
                    </label>
                    <input
                      type="number"
                      value={tempContext.dailyGoals?.fat || ''}
                      placeholder="60 (default)"
                      onChange={(e) =>
                        setTempContext({
                          ...tempContext,
                          dailyGoals: {
                            ...(tempContext.dailyGoals || {}),
                            fat: Number(e.target.value) || undefined,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-300 font-medium mb-0.5">
                      Sodium Max (mg)
                    </label>
                    <input
                      type="number"
                      value={tempContext.dailyGoals?.sodiumCeiling || ''}
                      placeholder="2300 (default)"
                      onChange={(e) =>
                        setTempContext({
                          ...tempContext,
                          dailyGoals: {
                            ...(tempContext.dailyGoals || {}),
                            sodiumCeiling: Number(e.target.value) || undefined,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-300 font-medium mb-0.5">
                      Potassium Min (mg)
                    </label>
                    <input
                      type="number"
                      value={tempContext.dailyGoals?.potassiumTarget || ''}
                      placeholder="2600 (default)"
                      onChange={(e) =>
                        setTempContext({
                          ...tempContext,
                          dailyGoals: {
                            ...(tempContext.dailyGoals || {}),
                            potassiumTarget: Number(e.target.value) || undefined,
                          },
                        })
                      }
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Known Severe Triggers */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Known Severe Triggers (Prompt will strictly flag these as High Risk):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tempContext.knownSevereTriggers.map((trig, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-medium"
                    >
                      {trig}
                      <button
                        type="button"
                        onClick={() => handleRemoveTrigger(idx)}
                        className="ml-1 text-rose-400 hover:text-rose-700 dark:hover:text-rose-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTriggerInput}
                    onChange={(e) => setNewTriggerInput(e.target.value)}
                    placeholder="Add trigger (e.g. Raw Garlic, Whey Protein)..."
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 p-2 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrigger();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTrigger}
                    className="px-3 py-2 rounded-lg bg-zinc-800 dark:bg-emerald-600 text-white font-semibold text-xs hover:bg-zinc-900 dark:hover:bg-emerald-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Confirmed Tolerated Foods */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Confirmed Tolerated Foods (Prevents false positive alarms):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tempContext.toleratedFoods.map((food, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-xs font-medium"
                    >
                      {food}
                      <button
                        type="button"
                        onClick={() => handleRemoveTolerated(idx)}
                        className="ml-1 text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newToleratedInput}
                    onChange={(e) => setNewToleratedInput(e.target.value)}
                    placeholder="Add tolerated food (e.g. Sourdough Spelt, Firm Tofu)..."
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 p-2 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTolerated();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTolerated}
                    className="px-3 py-2 rounded-lg bg-zinc-800 dark:bg-emerald-600 text-white font-semibold text-xs hover:bg-zinc-900 dark:hover:bg-emerald-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Custom Clinical Directives */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Dynamic Clinical Directives (Appended to System Prompt):
                </label>
                <textarea
                  rows={3}
                  value={tempContext.customClinicalNotes}
                  onChange={(e) =>
                    setTempContext({ ...tempContext, customClinicalNotes: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 p-3 text-xs leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: INSPECT ACTIVE CONTEXT INJECTION */}
          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                  Active System Prompt Context
                </span>
                <InfoButton
                  title="System Prompt Injection"
                  content="This is the exact formatted clinical context dynamically constructed and passed as the systemInstruction parameter to Gemini 3.8 Flash for each multimodal meal evaluation."
                />
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 dark:bg-zinc-950 text-zinc-200 font-mono text-[11px] leading-relaxed max-h-96 overflow-y-auto select-all border border-zinc-800">
                <pre className="whitespace-pre-wrap">
{`[SYSTEM INSTRUCTION: CLINICAL IBS GASTROINTESTINAL ENGINE]
GROUNDED KNOWLEDGE BASE (Active Rules: ${tempRules.filter((r) => r.enabled).length}):
${tempRules
  .filter((r) => r.enabled)
  .map((r, i) => `Rule #${i + 1}: ${r.title}\n${r.ruleText}`)
  .join('\n\n')}

PATIENT TOLERANCE PROFILE:
- Subtype: ${tempContext.subtype}
- Severe Triggers: ${tempContext.knownSevereTriggers.join(', ')}
- Tolerated: ${tempContext.toleratedFoods.join(', ')}
- Daily Fiber Target: ${tempContext.dailyFiberGoal}g
- Clinical Directives: ${tempContext.customClinicalNotes}`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
          >
            Reset to Monash Defaults
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Apply Grounding Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
