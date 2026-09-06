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
import { NotebookGroundingModal } from './components/NotebookGroundingModal';
import { SupabaseModal } from './components/SupabaseModal';
import {
  NutritionLogEntry,
  GutHealthLogEntry,
  FoodAnalysisResponse,
  NotebookGroundingRule,
  UserPersonalToleranceContext,
  SupabaseConfig,
} from './types';
import {
  DEFAULT_GROUNDING_RULES,
  DEFAULT_TOLERANCE_CONTEXT,
} from './lib/clinicalKnowledgeBase';
import { initAuth } from './lib/googleAuth';
import {
  syncUserProfile,
  seedUserLogsIfEmpty,
  subscribeToUserLogs,
  saveMealToDatabase,
  updateMealInDatabase,
  deleteMealFromDatabase,
} from './lib/databaseService';
import {
  getInitialSupabaseConfig,
  syncMealToSupabase,
  deleteMealFromSupabase,
} from './lib/supabaseClient';

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

  // Clinical grounding & context states (seeded from uploaded NotebookLM clinical library)
  const [groundingRules, setGroundingRules] = useState<NotebookGroundingRule[]>(() => {
    const saved = localStorage.getItem('ibs_grounding_rules_v3');
    return saved ? JSON.parse(saved) : DEFAULT_GROUNDING_RULES;
  });

  const [userContext, setUserContext] = useState<UserPersonalToleranceContext>(() => {
    const saved = localStorage.getItem('ibs_user_context_v3');
    return saved ? JSON.parse(saved) : DEFAULT_TOLERANCE_CONTEXT;
  });

  // Supabase PostgreSQL integration state
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    return getInitialSupabaseConfig();
  });

  // Modal open states
  const [isNotebookModalOpen, setIsNotebookModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
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
        }
      },
      () => {
        setCurrentUser(null);
        setNutritionLogs([]);
        setGutHealthLogs([]);
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
      return;
    }

    let isMounted = true;
    const userId = currentUser.uid;

    // Seed database with starter plate history if user is logging in for the first time
    seedUserLogsIfEmpty(userId);

    // Live subscription to Firestore scoped strictly to request.auth.uid == userId
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

    return () => {
      isMounted = false;
      unsubscribe();
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
      showToast(`Connected as ${user.displayName || user.email}`);
    } else {
      setNutritionLogs([]);
      setGutHealthLogs([]);
      showToast('Signed out successfully.');
    }
  };

  // Save rules & context to local storage
  const handleUpdateRules = (newRules: NotebookGroundingRule[]) => {
    setGroundingRules(newRules);
    localStorage.setItem('ibs_grounding_rules_v3', JSON.stringify(newRules));
    showToast('Clinical grounding rules updated.');
  };

  const handleUpdateUserContext = (newContext: UserPersonalToleranceContext) => {
    setUserContext(newContext);
    localStorage.setItem('ibs_user_context_v3', JSON.stringify(newContext));
    showToast(`Patient tolerance profile updated (${newContext.subtype}).`);
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

    // Save to Firestore Database strictly for this authenticated user
    try {
      await saveMealToDatabase(nutrition, gutHealth, currentUser.uid);
    } catch (dbErr) {
      console.warn('Firestore database save warning:', dbErr);
    }

    // Persist to local server store backup
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nutrition, gutHealth }),
      });
    } catch (err) {
      console.error('Failed to persist log to server backup:', err);
    }

    // If Supabase PostgreSQL is connected with autoSync enabled, push live to database!
    if (supabaseConfig.connected && supabaseConfig.autoSync) {
      try {
        const synced = await syncMealToSupabase(nutrition, gutHealth, supabaseConfig);
        if (synced) {
          showToast(`Logged "${nutrition.meal}" to Supabase PostgreSQL & private database.`);
          return;
        }
      } catch (sbErr) {
        console.warn('Live Supabase sync error:', sbErr);
      }
    }

    showToast(`Logged "${nutrition.meal}" to your private database.`);
  };

  // Delete log entry
  const handleDeleteLog = async (id: string) => {
    if (!currentUser) return;

    setNutritionLogs((prev) => prev.filter((n) => n.id !== id));
    setGutHealthLogs((prev) =>
      prev.filter((g) => g.id !== id && g.mealReferenceId !== id)
    );

    // Delete from Firestore Database
    try {
      await deleteMealFromDatabase(id, currentUser.uid);
    } catch (dbErr) {
      console.warn('Firestore delete warning:', dbErr);
    }

    // Delete from Supabase PostgreSQL if connected
    if (supabaseConfig.connected) {
      deleteMealFromSupabase(id, supabaseConfig).catch((err) =>
        console.warn('Failed to delete meal from Supabase:', err)
      );
    }

    // Backup delete on server
    try {
      await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      showToast('Record removed from private database.');
    } catch (err) {
      console.error('Failed to delete on server backup:', err);
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

    // Update in Firestore Database
    try {
      await updateMealInDatabase(updatedNutrition, updatedGutHealth, currentUser.uid);
    } catch (dbErr) {
      console.warn('Firestore update warning:', dbErr);
    }

    // Update in Supabase PostgreSQL if connected
    if (supabaseConfig.connected && updatedGutHealth) {
      syncMealToSupabase(updatedNutrition, updatedGutHealth, supabaseConfig).catch((err) =>
        console.warn('Failed to update meal on Supabase:', err)
      );
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
        supabaseConfig={supabaseConfig}
        userContext={userContext}
        onOpenNotebookGrounding={() => setIsNotebookModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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
        <div className={activeView === 'analyzer' ? 'block' : 'hidden'}>
          <MultimodalFoodAnalyzer
            onAddLog={handleAddLog}
            groundingRules={groundingRules}
            userContext={userContext}
            onOpenNotebookModal={() => setIsNotebookModalOpen(true)}
          />
        </div>

        {/* VIEW 2: DATABASE WORKSHEETS LOG */}
        {activeView === 'logs' && (
          <DualSheetsLogView
            nutritionLogs={nutritionLogs}
            gutHealthLogs={gutHealthLogs}
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
              TrackMyPlate Engine
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span>Clinical Grounding (Mayer 2023, Holtmann 2016, StatPearls 2026)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              id="footer-grounding-btn"
              onClick={() => setIsNotebookModalOpen(true)}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
            >
              Grounding Rules ({groundingRules.filter((r) => r.enabled).length} active)
            </button>
            <button
              id="footer-supabase-btn"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              Supabase PostgreSQL
            </button>
            <div className="flex items-center space-x-1.5 text-zinc-500">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Private Live DB Active</span>
            </div>
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
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        config={supabaseConfig}
        onUpdateConfig={setSupabaseConfig}
        nutritionLogs={nutritionLogs}
        gutHealthLogs={gutHealthLogs}
        onImportLogsFromSupabase={(importedNutrition, importedGut) => {
          setNutritionLogs(importedNutrition);
          setGutHealthLogs(importedGut);
          showToast(`Imported ${importedNutrition.length} meals from Supabase PostgreSQL!`);
        }}
      />
    </div>
  );
}
