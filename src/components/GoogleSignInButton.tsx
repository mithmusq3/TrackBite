import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../lib/googleAuth';
import { LogOut, CheckCircle2, RefreshCw } from 'lucide-react';

interface GoogleSignInButtonProps {
  currentUser: User | null;
  onAuthChange: (user: User | null) => void;
  compact?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  currentUser,
  onAuthChange,
  compact = false,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const user = await googleSignIn();
      if (user) {
        onAuthChange(user);
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setAuthError(err.message || 'Authentication was interrupted.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onAuthChange(null);
      setShowDropdown(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  if (currentUser) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 transition-colors text-xs font-semibold shadow-2xs"
          title={`Connected as ${currentUser.email}`}
        >
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="User"
              className="w-5 h-5 rounded-full object-cover border border-emerald-400"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
              {currentUser.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <span className="hidden sm:inline max-w-[110px] truncate">
            {currentUser.displayName || currentUser.email?.split('@')[0]}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
              <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                {currentUser.displayName || 'Google Account'}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{currentUser.email}</p>
              <div className="mt-1 flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                Live Database Active
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2 transition-colors font-medium mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Official Material "Sign in with Google" button
  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleSignIn}
        disabled={isLoggingIn}
        type="button"
        className={`inline-flex items-center space-x-1.5 sm:space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-1.5 transition-all text-xs font-semibold shadow-2xs hover:shadow-xs active:bg-slate-100 min-h-[36px] ${
          isLoggingIn ? 'opacity-70 cursor-wait' : ''
        }`}
        title="Sign in with Google for multi-user database access"
      >
        {isLoggingIn ? (
          <RefreshCw className="w-4 h-4 animate-spin text-slate-500 shrink-0" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span className="truncate">
          {isLoggingIn ? 'Connecting...' : compact ? (
            <>
              <span className="hidden xs:inline">Google</span>
              <span className="xs:hidden">Login</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Sign in with Google</span>
              <span className="sm:hidden">Sign In</span>
            </>
          )}
        </span>
      </button>

      {authError && (
        <span className="text-[10px] text-rose-600 mt-1 max-w-[180px] text-right truncate">
          {authError}
        </span>
      )}
    </div>
  );
};
