import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Activity, MessageSquare } from 'lucide-react';
import { User } from 'firebase/auth';
import { saveSymptomToDatabase } from '../lib/databaseService';

const SYMPTOM_CHOICES = [
  'Bloating',
  'Cramps / Discomfort',
  'Diarrhea',
  'Constipation',
  'Incomplete Emptying',
  'Excessive Gas',
  'Acid Reflux',
  'Nausea'
];

interface SymptomLoggerProps {
  currentUser: User | null;
}

export const SymptomLogger: React.FC<SymptomLoggerProps> = ({ currentUser }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const handleLogSymptom = async () => {
    if (!currentUser) return;
    if (selectedSymptoms.length === 0 && !notes.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      await saveSymptomToDatabase({
        timestamp: new Date().toISOString(),
        symptoms: selectedSymptoms,
        notes: notes.trim(),
      }, currentUser.uid);

      setSelectedSymptoms([]);
      setNotes('');
      setSuccessMsg('Symptom logged successfully.');
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (error) {
      console.error('Error logging symptom:', error);
      alert('Failed to log symptom. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-5 transition-colors">
        <div className="flex items-center space-x-2 text-zinc-500 dark:text-zinc-400">
          <Activity className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Quick Symptom Logger</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-2">Sign in to log and track your digestive symptoms.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-5 transition-colors">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-rose-500" />
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Quick Symptom Logger</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block">
            How are you feeling? (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_CHOICES.map(symptom => {
              const isSelected = selectedSymptoms.includes(symptom);
              return (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                    isSelected
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-rose-500/50'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {symptom}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center space-x-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Additional Notes (Optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., Felt very bloated right after lunch..."
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-colors resize-none h-20"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-medium h-5">
            {successMsg && (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 fade-in zoom-in animate-in">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {successMsg}
              </span>
            )}
          </div>
          <button
            onClick={handleLogSymptom}
            disabled={isSubmitting || (selectedSymptoms.length === 0 && !notes.trim())}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center space-x-1.5"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Log Symptom</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
