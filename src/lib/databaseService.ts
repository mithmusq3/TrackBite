import { NutritionLogEntry, GutHealthLogEntry } from '../types';

export interface UserAccountData {
  id: string;
  displayName: string;
  email?: string;
  photoURL?: string;
}

/**
 * Empty implementation as PostgreSQL does not require separate User Profiles for now.
 */
export async function syncUserProfile(user: UserAccountData): Promise<void> {
  // No-op for now unless requested to add a users table
}

/**
 * Empty implementation as we don't want to seed fake records into real user accounts.
 */
export async function seedUserLogsIfEmpty(userId: string): Promise<void> {
  // Purposely removed to prevent unrequested fake data
}

/**
 * Fetch database logs belonging strictly to the authenticated user via API.
 * Replaces Firestore real-time listener with a standard REST fetch.
 */
export function subscribeToUserLogs(
  userId: string,
  onData: (nutrition: NutritionLogEntry[], gutHealth: GutHealthLogEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  let isSubscribed = true;

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/logs?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      const data = await response.json();
      if (isSubscribed) {
        onData(data.nutrition || [], data.gutHealth || []);
      }
    } catch (err: any) {
      if (onError && isSubscribed) onError(err);
    }
  };

  fetchData();
  // We can poll every 10 seconds to simulate real-time, or just rely on manual re-fetches
  // after mutations (which we'll do by triggering callbacks in App.tsx)
  const intervalId = setInterval(fetchData, 10000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}

/**
 * Save a new meal log to PostgreSQL database under the authenticated userId.
 */
export async function saveMealToDatabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry,
  userId: string
): Promise<void> {
  const res = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nutrition, gutHealth, userId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save meal log.');
  }
}

/**
 * Update an existing meal log in PostgreSQL database.
 */
export async function updateMealInDatabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry | undefined,
  userId: string
): Promise<void> {
  const res = await fetch(`/api/logs/${nutrition.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nutrition, gutHealth, userId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update meal log.');
  }
}

/**
 * Delete a meal log and its matching gut health entry from PostgreSQL.
 */
export async function deleteMealFromDatabase(id: string, userId: string): Promise<void> {
  const res = await fetch(`/api/logs/${id}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete meal log.');
  }
}


