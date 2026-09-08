import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Camera,
  FileSpreadsheet,
  BarChart2,
  ShieldCheck,
  Database
} from 'lucide-react';
import { Header } from './components/Header';
import { MultimodalFoodAnalyzer } from './components/MultimodalFoodAnalyzer';
import { DualSheetsLogView } from './components/DualSheetsLogView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SymptomLogger } from './components/SymptomLogger';
import { NotebookGroundingModal } from './components/NotebookGroundingModal';
import {
  NutritionLogEntry,
  GutHealthLogEntry,
  FoodAnalysisResponse,
  NotebookGroundingRule,
  UserPersonalToleranceContext,
  SymptomLogEntry
} from './types';
import {
  DEFAULT_GROUNDING_RULES,
  DEFAULT_TOLERANCE_CONTEXT,
} from './lib/clinicalKnowledgeBase';
import { initAuth } from './lib/googleAuth';
import {
  syncUserProfile,
  subscribeToUserLogs,
  subscribeToSymptomLogs,
  saveMealToDatabase,
  updateMealInDatabase,
  deleteMealFromDatabase,
  getUserPreferences,
  saveUserPreferences
} from './lib/databaseService';

export default function App() {
  const [activeView, setActiveView] = useState<'analyzer' | 'logs' | 'analytics'>('analyzer');

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('trackmyplate_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('trackmyplate_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core live data states (populated live from Firestore strictly for currentUser.uid)
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLogEntry[]>([]);
  const [gutHealthLogs, setGutHealthLogs] = useState<GutHealthLogEntry[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);

  // Clinical grounding & context states (seeded from uploaded NotebookLM clinical library)
  const [groundingRules, setGroundingRules] = useState<NotebookGroundingRule[]>(() => {
    const saved = localStorage.getItem('ibs_grounding_rules_v3');
    return saved ? JSON.parse(saved) : DEFAULT_GROUNDING_RULES;
  });

  const [userContext, setUserContext] = useState<UserPersonalToleranceContext>(() => {
    const saved = localStorage.getItem('ibs_user_context_v3');
    return saved ? JSON.parse(saved) : DEFAULT_TOLERANCE_CONTEXT;
  });

  // Modal open states
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
        if (user) {
          syncUserProfile({
            id: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'My Account',
            email: user.email || '',
            photoURL: user.photoURL || '',
          });
          
          getUserPreferences(user.uid).then((prefs) => {
            if (prefs.rules) {
              setGroundingRules(prefs.rules);
              localStorage.setItem('ibs_grounding_rules_v3', JSON.stringify(prefs.rules));
            }
            if (prefs.context) {
              setUserContext(prefs.context);
              localStorage.setItem('ibs_user_context_v3', JSON.stringify(prefs.context));
            }
          }).catch(err => console.error("Failed to load user preferences", err));
        }
      },
      () => {
        setCurrentUser(null);
        setNutritionLogs([]);
        setGutHealthLogs([]);
        setGroundingRules(DEFAULT_GROUNDING_RULES);
        setUserContext(DEFAULT_TOLERANCE_CONTEXT);
        localStorage.removeItem('ibs_grounding_rules_v3');
        localStorage.removeItem('ibs_user_context_v3');
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Real-time Database Subscription strictly for the authenticated user (currentUser.uid)
  useEffect(() => {
    if (!currentUser) {
      setNutritionLogs([]);
      setGutHealthLogs([]);
      setSymptomLogs([]);
      return;
    }

    let isMounted = true;
    const userId = currentUser.uid;

    // Live subscription to PostgreSQL via Backend API
    const unsubscribe = subscribeToUserLogs(
      userId,
      (nutrition, gutHealth) => {
        if (!isMounted) return;
        setNutritionLogs(nutrition);
        setGutHealthLogs(gutHealth);
      },
      (error) => {
        console.warn(`Firestore sync note for user ${userId}:`, error.message);
      }
    );

    // Live subscription to Supabase for Symptom Logs
    const unsubSymptoms = subscribeToSymptomLogs(
      userId,
      (logs) => {
        if (!isMounted) return;
        setSymptomLogs(logs);
      },
      (error) => {
        console.warn("Error fetching symptoms", error);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
      unsubSymptoms();
    };
  }, [currentUser?.uid]);

  // Handle auth change from Google login / logout buttons
  const handleAuthChange = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      syncUserProfile({
        id: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'My Account',
        email: user.email || '',
        photoURL: user.photoURL || '',
      });
      getUserPreferences(user.uid).then((prefs) => {
        if (prefs.rules) {
          setGroundingRules(prefs.rules);
          localStorage.setItem('ibs_grounding_rules_v3', JSON.stringify(prefs.rules));
        }
        if (prefs.context) {
          setUserContext(prefs.context);
          localStorage.setItem('ibs_user_context_v3', JSON.stringify(prefs.context));
        }
      }).catch(err => console.error("Failed to load user preferences", err));
      
      showToast(`Connected as ${user.displayName || user.email}`);
    } else {
      setNutritionLogs([]);
      setGutHealthLogs([]);
      setGroundingRules(DEFAULT_GROUNDING_RULES);
      setUserContext(DEFAULT_TOLERANCE_CONTEXT);
      localStorage.removeItem('ibs_grounding_rules_v3');
      localStorage.removeItem('ibs_user_context_v3');
      showToast('Signed out successfully.');
    }
  };

  // Save rules & context to local storage and DB
  const handleUpdateRules = (newRules: NotebookGroundingRule[]) => {
    setGroundingRules(newRules);
    localStorage.setItem('ibs_grounding_rules_v3', JSON.stringify(newRules));
    if (currentUser) {
      saveUserPreferences(currentUser.uid, newRules, userContext).catch(console.error);
    }
    showToast('Clinical grounding rules updated.');
  };

  const handleUpdateUserContext = (newContext: UserPersonalToleranceContext) => {
    setUserContext(newContext);
    localStorage.setItem('ibs_user_context_v3', JSON.stringify(newContext));
    if (currentUser) {
      saveUserPreferences(currentUser.uid, groundingRules, newContext).catch(console.error);
    }
    showToast(`Patient tolerance profile updated (${newContext.subtype}).`);
  };

  const handleSaveAll = (newRules: NotebookGroundingRule[], newContext: UserPersonalToleranceContext) => {
    setGroundingRules(newRules);
    setUserContext(newContext);
    localStorage.setItem('ibs_grounding_rules_v3', JSON.stringify(newRules));
    localStorage.setItem('ibs_user_context_v3', JSON.stringify(newContext));
    if (currentUser) {
      saveUserPreferences(currentUser.uid, newRules, newContext).catch(console.error);
    }
    showToast('Clinical grounding and profile updated.');
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Add meal log to both sheets / database collections
  const handleAddLog = async (response: FoodAnalysisResponse) => {
    const { nutrition, gutHealth } = response;

    if (!currentUser) {
      showToast('Please sign in with Google to save meal records to your private account.');
      return;
    }

    // Check duplicate
    const isDuplicate = nutritionLogs.some(
      (n) =>
        n.meal.toLowerCase() === nutrition.meal.toLowerCase() &&
        Math.abs(new Date(n.timestamp).getTime() - new Date(nutrition.timestamp).getTime()) < 30000
    );

    if (isDuplicate) {
      showToast('Notice: Identical meal logged within 30 seconds.');
      return;
    }

    // Optimistic local state update
    const updatedNutrition = [nutrition, ...nutritionLogs];
    const updatedGut = [gutHealth, ...gutHealthLogs];
    setNutritionLogs(updatedNutrition);
    setGutHealthLogs(updatedGut);

    // Save to Database strictly for this authenticated user
    try {
      await saveMealToDatabase(nutrition, gutHealth, currentUser.uid);
      showToast(`Logged "${nutrition.meal}"`);
    } catch (dbErr) {
      console.warn('Database save warning:', dbErr);
      showToast(`Error logging "${nutrition.meal}".`);
    }
  };

  // Delete log entry
  const handleDeleteLog = async (id: string) => {
    if (!currentUser) return;

    setNutritionLogs((prev) => prev.filter((n) => n.id !== id));
    setGutHealthLogs((prev) =>
      prev.filter((g) => g.id !== id && g.mealReferenceId !== id)
    );

    // Delete from Database
    try {
      await deleteMealFromDatabase(id, currentUser.uid);
      showToast('Record removed.');
    } catch (dbErr) {
      console.warn('Delete warning:', dbErr);
    }
  };

  // Update log entry
  const handleUpdateLog = async (
    updatedNutrition: NutritionLogEntry,
    updatedGutHealth?: GutHealthLogEntry
  ) => {
    if (!currentUser) return;

    setNutritionLogs((prev) =>
      prev.map((n) => (n.id === updatedNutrition.id ? updatedNutrition : n))
    );
    if (updatedGutHealth) {
      setGutHealthLogs((prev) =>
        prev.map((g) =>
          g.id === updatedGutHealth.id || g.mealReferenceId === updatedNutrition.id
            ? updatedGutHealth
            : g
        )
      );
    }

    // Update in Database
    try {
      await updateMealInDatabase(updatedNutrition, updatedGutHealth, currentUser.uid);
    } catch (dbErr) {
      console.warn('Database update warning:', dbErr);
    }

    // Backup update on server
    try {
      await fetch(`/api/logs/${updatedNutrition.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nutrition: updatedNutrition,
          gutHealth: updatedGutHealth,
        }),
      });
      showToast(`Updated "${updatedNutrition.meal}" in private database.`);
    } catch (err) {
      console.error('Failed to update on server backup:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 dark:bg-zinc-800 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center space-x-2 animate-fade-in border border-zinc-700 dark:border-zinc-600">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        userContext={userContext}
        onOpenNotebookGrounding={() => setIsNotebookModalOpen(true)}
        totalLogs={nutritionLogs.length}
        currentUser={currentUser}
        onAuthChange={handleAuthChange}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Navigation Sub-bar */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 transition-colors sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-6">
          <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar text-xs font-semibold">
            <button
              id="tab-analyzer-btn"
              onClick={() => setActiveView('analyzer')}
              className={`px-3 sm:px-3.5 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 min-h-[38px] flex-1 sm:flex-none ${
                activeView === 'analyzer'
                  ? 'bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800'
              }`}
            >
              <Camera className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="sm:hidden">Analyzer</span>
              <span className="hidden sm:inline">Multimodal Food Analyzer</span>
            </button>

            <button
              id="tab-logs-btn"
              onClick={() => setActiveView('logs')}
              className={`px-3 sm:px-3.5 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 min-h-[38px] flex-1 sm:flex-none ${
                activeView === 'logs'
                  ? 'bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="sm:hidden">Worksheets</span>
              <span className="hidden sm:inline">Database Worksheets</span>
              {currentUser && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    activeView === 'logs'
                      ? 'bg-zinc-800 dark:bg-emerald-700 text-zinc-200 dark:text-emerald-100'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {nutritionLogs.length}
                </span>
              )}
            </button>

            <button
              id="tab-analytics-btn"
              onClick={() => setActiveView('analytics')}
              className={`px-3 sm:px-3.5 py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 min-h-[38px] flex-1 sm:flex-none ${
                activeView === 'analytics'
                  ? 'bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800'
              }`}
            >
              <BarChart2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="sm:hidden">Analytics</span>
              <span className="hidden sm:inline">Interactive Analytics</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Container Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* VIEW 1: MULTIMODAL ANALYZER */}
        <div className={activeView === 'analyzer' ? 'flex flex-col space-y-4 sm:space-y-6' : 'hidden'}>
          <MultimodalFoodAnalyzer
            onAddLog={handleAddLog}
            groundingRules={groundingRules}
            userContext={userContext}
            onOpenNotebookModal={() => setIsNotebookModalOpen(true)}
            currentUser={currentUser}
          />
          <SymptomLogger currentUser={currentUser} />
        </div>

        {/* VIEW 2: DATABASE WORKSHEETS LOG */}
        {activeView === 'logs' && (
          <DualSheetsLogView
            nutritionLogs={nutritionLogs}
            gutHealthLogs={gutHealthLogs}
            symptomLogs={symptomLogs}
            onDeleteLog={handleDeleteLog}
            onUpdateLog={handleUpdateLog}
            currentUser={currentUser}
            onAuthChange={handleAuthChange}
          />
        )}

        {/* VIEW 3: ANALYTICS DASHBOARD */}
        {activeView === 'analytics' && (
          <AnalyticsDashboard
            nutritionLogs={nutritionLogs}
            gutHealthLogs={gutHealthLogs}
            userContext={userContext}
            onUpdateUserContext={handleUpdateUserContext}
            isDark={theme === 'dark'}
            currentUser={currentUser}
            onAuthChange={handleAuthChange}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 py-5 mt-auto transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              TrackMyPlate
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              id="footer-grounding-btn"
              onClick={() => setIsNotebookModalOpen(true)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
            >
              Grounding Rules
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NotebookGroundingModal
        isOpen={isNotebookModalOpen}
        onClose={() => setIsNotebookModalOpen(false)}
        groundingRules={groundingRules}
        onUpdateRules={handleUpdateRules}
        userContext={userContext}
        onUpdateUserContext={handleUpdateUserContext}
        onSaveAll={handleSaveAll}
      />
    </div>
  );
}
