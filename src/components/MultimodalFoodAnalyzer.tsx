import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  Flame,
  ArrowRight,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { FoodAnalysisResponse, NotebookGroundingRule, UserPersonalToleranceContext, NutritionLogEntry, GutHealthLogEntry } from '../types';
import { EditLogModal } from './EditLogModal';
import { InfoButton } from './InfoButton';

interface MultimodalFoodAnalyzerProps {
  onAddLog: (response: FoodAnalysisResponse) => void;
  groundingRules: NotebookGroundingRule[];
  userContext: UserPersonalToleranceContext;
  onOpenNotebookModal: () => void;
}

export const MultimodalFoodAnalyzer: React.FC<MultimodalFoodAnalyzerProps> = ({
  onAddLog,
  groundingRules,
  userContext,
  onOpenNotebookModal,
}) => {
  const [textInput, setTextInput] = useState(() => {
    try {
      return sessionStorage.getItem('ibs_analyzer_text') || '';
    } catch {
      return '';
    }
  });
  const [mealCategory, setMealCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>(() => {
    try {
      const saved = sessionStorage.getItem('ibs_analyzer_meal_cat');
      if (saved === 'Breakfast' || saved === 'Lunch' || saved === 'Dinner' || saved === 'Snack') return saved;
    } catch {}
    return 'Lunch';
  });
  const [imagePreview, setImagePreview] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('ibs_analyzer_image') || null;
    } catch {
      return null;
    }
  });
  const [imageMimeType, setImageMimeType] = useState<string>(() => {
    try {
      return sessionStorage.getItem('ibs_analyzer_mime') || 'image/jpeg';
    } catch {
      return 'image/jpeg';
    }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResponse | null>(() => {
    try {
      const saved = sessionStorage.getItem('ibs_analyzer_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(() => {
    try {
      return sessionStorage.getItem('ibs_analyzer_is_saved') === 'true';
    } catch {
      return false;
    }
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManuallyEdited, setIsManuallyEdited] = useState(() => {
    try {
      return sessionStorage.getItem('ibs_analyzer_is_edited') === 'true';
    } catch {
      return false;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state to sessionStorage so results persist across browser reloads or tab switches
  useEffect(() => {
    try {
      if (textInput) {
        sessionStorage.setItem('ibs_analyzer_text', textInput);
      } else {
        sessionStorage.removeItem('ibs_analyzer_text');
      }
    } catch {}
  }, [textInput]);

  useEffect(() => {
    try {
      sessionStorage.setItem('ibs_analyzer_meal_cat', mealCategory);
    } catch {}
  }, [mealCategory]);

  useEffect(() => {
    try {
      if (imagePreview) {
        try {
          sessionStorage.setItem('ibs_analyzer_image', imagePreview);
          sessionStorage.setItem('ibs_analyzer_mime', imageMimeType);
        } catch (e) {
          console.warn('Image preview exceeds sessionStorage limit, skipping cache:', e);
        }
      } else {
        sessionStorage.removeItem('ibs_analyzer_image');
        sessionStorage.removeItem('ibs_analyzer_mime');
      }
    } catch {}
  }, [imagePreview, imageMimeType]);

  useEffect(() => {
    try {
      if (analysisResult) {
        sessionStorage.setItem('ibs_analyzer_result', JSON.stringify(analysisResult));
      } else {
        sessionStorage.removeItem('ibs_analyzer_result');
      }
    } catch {}
  }, [analysisResult]);

  useEffect(() => {
    try {
      sessionStorage.setItem('ibs_analyzer_is_saved', isSaved ? 'true' : 'false');
    } catch {}
  }, [isSaved]);

  useEffect(() => {
    try {
      sessionStorage.setItem('ibs_analyzer_is_edited', isManuallyEdited ? 'true' : 'false');
    } catch {}
  }, [isManuallyEdited]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!textInput.trim() && !imagePreview) {
      setErrorMessage('Please either describe your meal in words or upload a photo.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    setIsSaved(false);
    setIsManuallyEdited(false);

    try {
      setAnalysisStep('Initiating Gemini 3.8 Flash multimodal parsing...');
      await new Promise((r) => setTimeout(r, 200));

      setAnalysisStep('Evaluating macronutrients, fiber & portion estimates...');
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textDescription: `[Meal Timing: ${mealCategory}] ${textInput.trim()}`,
          imageBase64: imagePreview,
          imageMimeType,
          customRules: groundingRules,
          userTolerance: userContext,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze meal.');
      }

      setAnalysisStep('Correlating with Monash FODMAP criteria & patient tolerance...');
      const data: FoodAnalysisResponse = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  const handleCommitLog = () => {
    if (!analysisResult) return;
    onAddLog(analysisResult);
    setIsSaved(true);
  };

  const handleDiscardAnalysis = () => {
    setAnalysisResult(null);
    setIsSaved(false);
    setIsManuallyEdited(false);
    try {
      sessionStorage.removeItem('ibs_analyzer_result');
      sessionStorage.removeItem('ibs_analyzer_is_saved');
      sessionStorage.removeItem('ibs_analyzer_is_edited');
    } catch {}
  };

  const handleStartNewAnalysis = () => {
    setAnalysisResult(null);
    setIsSaved(false);
    setIsManuallyEdited(false);
    setTextInput('');
    handleClearImage();
    try {
      sessionStorage.removeItem('ibs_analyzer_result');
      sessionStorage.removeItem('ibs_analyzer_is_saved');
      sessionStorage.removeItem('ibs_analyzer_is_edited');
      sessionStorage.removeItem('ibs_analyzer_text');
      sessionStorage.removeItem('ibs_analyzer_image');
      sessionStorage.removeItem('ibs_analyzer_mime');
    } catch {}
  };

  const handleSaveModalEdits = (
    updatedNutrition: NutritionLogEntry,
    updatedGutHealth?: GutHealthLogEntry
  ) => {
    if (!analysisResult) return;
    setAnalysisResult({
      ...analysisResult,
      nutrition: updatedNutrition,
      gutHealth: updatedGutHealth || analysisResult.gutHealth,
    });
    setIsManuallyEdited(true);
  };

  const getRiskBadge = (risk: 'Low' | 'Medium' | 'High') => {
    switch (risk) {
      case 'Low':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            Low IBS Risk
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            Moderate Risk
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
            High IBS Risk
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden transition-colors">
      {/* Header Banner */}
      <div className="px-5 py-4 sm:px-6 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Multimodal Input
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                Grounded to {userContext.subtype} Profile
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Analyze Meal & Clinical IBS Impact
              </h2>
              <InfoButton
                title="Multimodal Meal Analysis"
                content="Upload a plate photo or describe your meal. Gemini extracts nutritional facts, estimates portions, and evaluates FODMAP triggers grounded against your clinical tolerance profile."
              />
            </div>
          </div>

          <button
            id="analyzer-grounding-rules-btn"
            onClick={onOpenNotebookModal}
            className="self-start sm:self-auto text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg font-medium flex items-center transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-zinc-500 dark:text-zinc-400" />
            Grounding Rules ({groundingRules.filter((r) => r.enabled).length} active)
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Multimodal Input Form: Photo & Description */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Photo Upload Zone (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Food Photo (Optional)
            </label>

            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-zinc-900 group aspect-4/3 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Meal Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 p-2">
                  <button
                    onClick={handleClearImage}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs min-h-[36px]"
                  >
                    Remove Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-white text-zinc-800 text-xs font-semibold hover:bg-zinc-100 transition-colors shadow-2xs min-h-[36px]"
                  >
                    Change
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-white text-[11px] font-medium flex items-center pointer-events-none">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 mr-1" /> Photo Ready
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center">
                <div
                  id="photo-upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-lg p-4 sm:p-5 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex flex-col items-center justify-center min-h-[130px]"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-2">
                    <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Snap photo or upload plate
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Tap to use camera or select image
                  </p>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Text Description & Timing (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Meal Description & Ingredients
                </label>
                {/* Meal Timing Selector */}
                <div className="flex items-center space-x-1">
                  {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMealCategory(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors min-h-[28px] ${
                        mealCategory === cat
                          ? 'bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="meal-description-textarea"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="E.g., 200g grilled salmon fillet with 1 cup cooked quinoa, steamed carrots, and baby spinach dressed with olive oil and fresh lemon juice."
                rows={4}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-base sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all leading-relaxed"
              />
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span>Enter ingredients and portions for precise macro parsing.</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Gemini 3.8 Flash Multimodal</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {errorMessage.includes('high demand') || errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')
                    ? 'AI Server High Demand (Temporary)'
                    : 'Notice'}
                </p>
                <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs self-end sm:self-center shrink-0 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>Retry Analysis</span>
            </button>
          </div>
        )}

        {/* Action Button & Disclaimer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-400 flex items-center">
            <Info className="w-3.5 h-3.5 mr-1 text-zinc-400 shrink-0" />
            Structured JSON output • Dual worksheets compliant
          </div>

          <button
            id="run-analysis-btn"
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!textInput.trim() && !imagePreview)}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 transition-all ${
              isAnalyzing || (!textInput.trim() && !imagePreview)
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border border-zinc-200 dark:border-zinc-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze Meal & FODMAP Impact</span>
              </>
            )}
          </button>
        </div>

        {/* ANALYSIS IN-PROGRESS STEP TICKER */}
        {isAnalyzing && (
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-center animate-pulse">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Processing with Gemini
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{analysisStep}</p>
              </div>
            </div>
          </div>
        )}

        {/* ANALYSIS RESULT CARD */}
        {analysisResult && (
          <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-800/40 p-5 space-y-5">
            {/* Top Bar: Meal Name + Risk Badge + Portion & Confidence */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-200/80 dark:border-zinc-700">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {analysisResult.nutrition.meal}
                  </h3>
                  {isManuallyEdited && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      User Verified
                    </span>
                  )}
                  {analysisResult.nutrition.isEstimated && !isManuallyEdited && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      title="Portions or ingredients were estimated based on photo / context"
                    >
                      Estimated
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Portion: <span className="font-medium text-zinc-700 dark:text-zinc-300">{analysisResult.nutrition.portion}</span> •{' '}
                  Confidence: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{analysisResult.nutrition.confidence}%</span>
                </p>
              </div>

              <div>{getRiskBadge(analysisResult.gutHealth.ibsRiskLevel)}</div>
            </div>

            {/* 1. Macronutrient & Calorie Metrics Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Parsed Macronutrients & Calories
                </h4>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center font-medium"
                >
                  <Edit3 className="w-3 h-3 mr-1" /> Edit Values
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-center">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center justify-center">
                    <Flame className="w-3 h-3 text-amber-500 mr-1" /> Calories
                  </span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    {analysisResult.nutrition.calories}
                  </span>
                  <span className="text-[10px] text-zinc-400">kcal</span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-center">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Protein</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    {analysisResult.nutrition.protein}g
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {Math.round((analysisResult.nutrition.protein * 4 * 100) / (analysisResult.nutrition.calories || 1))}% cal
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-center">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Carbohydrates</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    {analysisResult.nutrition.carbs}g
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {Math.round((analysisResult.nutrition.carbs * 4 * 100) / (analysisResult.nutrition.calories || 1))}% cal
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-center">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Fats</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    {analysisResult.nutrition.fat}g
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {Math.round((analysisResult.nutrition.fat * 9 * 100) / (analysisResult.nutrition.calories || 1))}% cal
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Fiber</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
                    {analysisResult.nutrition.fiber}g
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {Math.round((analysisResult.nutrition.fiber / userContext.dailyFiberGoal) * 100)}% goal
                  </span>
                </div>
              </div>
            </div>

            {/* Micronutrients Row */}
            <div className="px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Micronutrients:</span>
              <span>Sodium: <strong className="text-zinc-800 dark:text-zinc-200">{analysisResult.nutrition.sodium}mg</strong></span>
              <span>Potassium: <strong className="text-zinc-800 dark:text-zinc-200">{analysisResult.nutrition.potassium}mg</strong></span>
              {analysisResult.nutrition.keyVitamins.length > 0 && (
                <span>
                  Vitamins: <strong className="text-zinc-800 dark:text-zinc-200">{analysisResult.nutrition.keyVitamins.join(', ')}</strong>
                </span>
              )}
            </div>

            {/* 2. FODMAP & Gut Health Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Triggers & Category Concentrations */}
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                    Identified Triggers & Compounds
                  </h4>
                  {analysisResult.gutHealth.identifiedTriggers.length === 0 ? (
                    <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
                      No significant high-FODMAP triggers identified in this meal.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {analysisResult.gutHealth.identifiedTriggers.map((trig, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                          {trig}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      FODMAP Load Distribution
                    </h4>
                    <InfoButton
                      size="xs"
                      title="FODMAP Classification"
                      content="Categorizes fermentable oligosaccharides, disaccharides, monosaccharides, and polyols into None (0), Moderate (1), or High (2) clinical load levels for this meal."
                    />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 text-center">
                    {(
                      [
                        { key: 'fructans', label: 'Fructans' },
                        { key: 'lactose', label: 'Lactose' },
                        { key: 'excess_fructose', label: 'Fructose' },
                        { key: 'polyols', label: 'Polyols' },
                        { key: 'gos', label: 'GOS' },
                      ] as const
                    ).map(({ key, label }) => {
                      const load = analysisResult.gutHealth.fodmapCategories[key] || 0;
                      return (
                        <div
                          key={key}
                          className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700"
                        >
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate">
                            {label}
                          </span>
                          <span
                            className={`text-xs font-bold mt-0.5 block ${
                              load === 0
                                ? 'text-zinc-400'
                                : load === 1
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {load === 0 ? 'None' : load === 1 ? 'Mod' : 'High'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Predictive Reaction & AI Swap Recommendation */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                    Predictive Digestive Reaction
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                    {analysisResult.gutHealth.predictiveDigestiveReaction}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700">
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                    Clinical Recommendation & Swaps
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">
                    {analysisResult.gutHealth.aiRecommendation}
                  </p>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                  Grounding: {analysisResult.gutHealth.groundingReference}
                </p>
              </div>
            </div>

            {/* Bottom Actions: Commit to Database Worksheets */}
            <div className="pt-3.5 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Will be written to <strong className="text-zinc-700 dark:text-zinc-300">Nutrition_Log</strong> and <strong className="text-zinc-700 dark:text-zinc-300">Gut_Health_Log</strong> database worksheets.
              </span>

              <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                {isSaved ? (
                  <button
                    id="new-analysis-btn"
                    onClick={handleStartNewAnalysis}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-700 dark:hover:bg-zinc-600 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Analyze Next Meal</span>
                  </button>
                ) : (
                  <button
                    id="discard-analysis-btn"
                    onClick={handleDiscardAnalysis}
                    className="px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[40px]"
                  >
                    Discard
                  </button>
                )}

                <button
                  id="edit-analysis-btn"
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center space-x-1.5 min-h-[40px]"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Edit Values</span>
                </button>

                <button
                  id="commit-to-sheets-btn"
                  onClick={handleCommitLog}
                  disabled={isSaved}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all min-h-[40px] ${
                    isSaved
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Saved to Database Worksheets</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Commit to Database Worksheets</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Result Modal */}
      {analysisResult && (
        <EditLogModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          nutritionEntry={analysisResult.nutrition}
          gutHealthEntry={analysisResult.gutHealth}
          onSave={handleSaveModalEdits}
        />
      )}
    </div>
  );
};
