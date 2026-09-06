import React from 'react';
import { ShieldCheck, SlidersHorizontal, Sparkles, Sun, Moon, Database } from 'lucide-react';
import { User } from 'firebase/auth';
import { SupabaseConfig, UserPersonalToleranceContext } from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HeaderProps {
  supabaseConfig: SupabaseConfig;
  userContext: UserPersonalToleranceContext;
  onOpenNotebookGrounding: () => void;
  onOpenSupabaseModal: () => void;
  totalLogs: number;
  currentUser: User | null;
  onAuthChange: (user: User | null) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  supabaseConfig,
  userContext,
  onOpenNotebookGrounding,
  onOpenSupabaseModal,
  totalLogs,
  currentUser,
  onAuthChange,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  TrackMyPlate
                </h1>
                <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden md:block">
                Clinical FODMAP Analysis • Private Cloud Health Records • Research Grounded
              </p>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Dark / Light Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 min-h-[36px] min-w-[36px]"
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400 sm:mr-1.5" />
                  <span className="hidden sm:inline text-zinc-200">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-zinc-600 sm:mr-1.5" />
                  <span className="hidden sm:inline text-zinc-700">Dark</span>
                </>
              )}
            </button>

            {/* Clinical Profile & Grounding Pill */}
            <button
              id="header-grounding-btn"
              onClick={onOpenNotebookGrounding}
              className="inline-flex items-center px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700 shrink-0 min-h-[36px]"
              title={`Clinical Grounding & Profile: ${userContext.subtype}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:mr-1.5 text-zinc-500 dark:text-zinc-400" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 hidden xs:inline sm:mr-1 truncate max-w-[80px] sm:max-w-none">
                {userContext.subtype}
              </span>
              <span className="hidden lg:inline text-zinc-500 dark:text-zinc-400">Rules</span>
            </button>

            {/* Supabase PostgreSQL Database Button */}
            <button
              id="header-supabase-btn"
              onClick={onOpenSupabaseModal}
              className={`inline-flex items-center px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border shrink-0 min-h-[36px] ${
                supabaseConfig.connected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40'
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
              title="Supabase PostgreSQL status & settings"
            >
              <Database className="w-3.5 h-3.5 sm:mr-1.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline text-zinc-600 dark:text-zinc-400 mr-1">SQL:</span>
              <span className="font-semibold hidden xs:inline">
                {supabaseConfig.connected ? 'Connected' : 'Supabase'}
              </span>
              {supabaseConfig.connected && (
                <span className="xs:hidden w-2 h-2 rounded-full bg-emerald-500 ml-1" />
              )}
            </button>

            {/* Total Records Counter (Shown when signed in) */}
            {currentUser && (
              <div className="hidden md:flex items-center px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 mr-1">{totalLogs}</span> meals
              </div>
            )}

            {/* Google Sign In Button */}
            <GoogleSignInButton
              currentUser={currentUser}
              onAuthChange={onAuthChange}
              compact
            />
          </div>
        </div>
      </div>
    </header>
  );
};
