import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { SupabaseConfig, NutritionLogEntry, GutHealthLogEntry } from '../types';
import {
  SUPABASE_SQL_SCHEMA,
  testSupabaseConnection,
  saveSupabaseConfig,
  syncAllLogsToSupabase,
  fetchAllLogsFromSupabase
} from '../lib/supabaseClient';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SupabaseConfig;
  onUpdateConfig: (config: SupabaseConfig) => void;
  nutritionLogs: NutritionLogEntry[];
  gutHealthLogs: GutHealthLogEntry[];
  onImportLogsFromSupabase: (
    nutrition: NutritionLogEntry[],
    gutHealth: GutHealthLogEntry[]
  ) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  nutritionLogs,
  gutHealthLogs,
  onImportLogsFromSupabase,
}) => {
  const [activeTab, setActiveTab] = useState<'connect' | 'schema' | 'guide'>('connect');
  const [url, setUrl] = useState(config.url || '');
  const [anonKey, setAnonKey] = useState(config.anonKey || '');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [copiedSchema, setCopiedSchema] = useState(false);

  if (!isOpen) return null;

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    } catch (err) {
      console.error('Failed to copy schema:', err);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const testConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      connected: false,
      autoSync,
    };

    const result = await testSupabaseConnection(testConfig);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      const updated: SupabaseConfig = {
        ...testConfig,
        connected: true,
        lastSyncedAt: new Date().toISOString(),
      };
      saveSupabaseConfig(updated);
      onUpdateConfig(updated);
    }
  };

  const handleSaveSettings = () => {
    const updated: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      connected: testResult?.success || Boolean(url.trim() && anonKey.trim()),
      autoSync,
      lastSyncedAt: config.lastSyncedAt,
    };
    saveSupabaseConfig(updated);
    onUpdateConfig(updated);
    onClose();
  };

  const handlePushAllLogs = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const targetConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      connected: true,
      autoSync,
    };

    const res = await syncAllLogsToSupabase(nutritionLogs, gutHealthLogs, targetConfig);
    setSyncing(false);
    if (res.error) {
      setSyncStatus(`Sync failed: ${res.error}`);
    } else {
      setSyncStatus(`Successfully uploaded ${res.count} meals into Supabase PostgreSQL!`);
      const updated = {
        ...targetConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      saveSupabaseConfig(updated);
      onUpdateConfig(updated);
    }
  };

  const handlePullAllLogs = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const targetConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      connected: true,
      autoSync,
    };

    const res = await fetchAllLogsFromSupabase(targetConfig);
    setSyncing(false);
    if (res && res.nutrition.length > 0) {
      onImportLogsFromSupabase(res.nutrition, res.gutHealth);
      setSyncStatus(`Pulled ${res.nutrition.length} records from Supabase!`);
    } else if (res && res.nutrition.length === 0) {
      setSyncStatus('Supabase database is connected but has 0 records yet.');
    } else {
      setSyncStatus('Could not pull records. Please check tables or connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[94vh] transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Supabase PostgreSQL Integration
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    config.connected
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {config.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Fast, relational SQL storage with automated migrations & live sync
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

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-800/60 px-4 sm:px-5 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'connect'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t-2 border-emerald-500 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Connection & Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t-2 border-emerald-500 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Onboarding Guide (3 Steps)</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center space-x-1.5 ${
              activeTab === 'schema'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t-2 border-emerald-500 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-teal-500" />
            <span>SQL Schema Script</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: CONNECTION & SYNC */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start space-x-2.5">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed">
                  <span className="font-semibold">Why Supabase?</span> PostgreSQL removes Google
                  Sheets API rate limits, guarantees atomic data types, and allows deep SQL queries
                  over your meal nutrition and IBS flare-up timelines.
                </div>
              </div>

              {/* URL & Key Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklmnop.supabase.co"
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-base sm:text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Found in Supabase Dashboard → Project Settings → API → Project URL
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Supabase Anon / Public API Key
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 p-2.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-mono text-base sm:text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Found in Supabase Dashboard → Project Settings → API → Project API keys (anon, public)
                  </p>
                </div>

                {/* Auto-Sync Checkbox */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="supabase-auto-sync"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <label
                    htmlFor="supabase-auto-sync"
                    className="text-zinc-700 dark:text-zinc-300 font-medium text-xs cursor-pointer select-none"
                  >
                    Auto-sync every newly analyzed meal to PostgreSQL in real-time
                  </label>
                </div>
              </div>

              {/* Test Connection Button & Status */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !url.trim() || !anonKey.trim()}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 min-h-[38px]"
                >
                  {testing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{testing ? 'Testing Database Connection...' : 'Test Connection'}</span>
                </button>

                {url.trim() && (
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center justify-center space-x-1 text-xs"
                  >
                    <span>Open Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl flex items-start space-x-2 text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Migration & Sync Actions */}
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-2">
                  Database Synchronization ({nutritionLogs.length} local meals)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handlePushAllLogs}
                    disabled={syncing || !url.trim() || !anonKey.trim()}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <UploadCloud className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                        Upload Local Meals to Supabase
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Bulk-migrates all current meal logs into your PostgreSQL database.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullAllLogs}
                    disabled={syncing || !url.trim() || !anonKey.trim()}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 text-left transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <DownloadCloud className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                        Pull Remote Meals from Supabase
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Imports any meals stored in PostgreSQL down to this browser session.
                    </p>
                  </button>
                </div>

                {syncStatus && (
                  <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    {syncStatus}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ONBOARDING GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                  <span className="font-semibold">Quick 3-Step Setup:</span> Setting up a free
                  Supabase database takes under 2 minutes. Follow these simple steps to configure
                  your dashboard.
                </div>
              </div>

              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <span>Create a Free Supabase Project</span>
                  </span>
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] hover:underline"
                  >
                    <span>Visit supabase.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  Sign in to Supabase, click <strong>"New Project"</strong>, name it{' '}
                  <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-[11px]">
                    TrackMyPlate
                  </code>
                  , set a database password, and pick a nearby region (e.g. US East or West).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <span>Execute the SQL Schema Script</span>
                  </span>
                  <button
                    onClick={handleCopySchema}
                    className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] hover:underline"
                  >
                    {copiedSchema ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SQL Script</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  In your Supabase project left sidebar, click <strong>SQL Editor</strong>, click{' '}
                  <strong>New query</strong>, paste the script from the <em>SQL Schema Script</em> tab,
                  and click <strong>Run</strong>. This creates the <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-[11px]">nutrition_logs</code> and <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-[11px]">gut_health_logs</code> tables with indexes.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    3
                  </span>
                  <span>Copy API Credentials into TrackMyPlate</span>
                </span>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  In Supabase, click <strong>Project Settings (gear icon) → API</strong>. Copy the{' '}
                  <strong>Project URL</strong> and the <strong>anon public key</strong>. Paste them into
                  the <em>Connection & Sync</em> tab of this dialog and click <strong>Test Connection</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA SCRIPT */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs">
                  Copy and run this in Supabase SQL Editor:
                </span>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
                >
                  {copiedSchema ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Schema</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-72 border border-zinc-800 leading-relaxed select-all">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                This script enables UUID generation, creates tables with precision numbers for macros
                (protein, carbs, fat, fiber) and micros (sodium, potassium), and sets up PostgreSQL
                Row Level Security (RLS) policies.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold min-h-[38px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-xs min-h-[38px]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save & Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
