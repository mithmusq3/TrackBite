import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { NutritionLogEntry, GutHealthLogEntry } from '../types';
import { INITIAL_NUTRITION_LOGS, INITIAL_GUT_HEALTH_LOGS } from '../data/seedLogs';

// Collections
const USERS_COLLECTION = 'users';
const NUTRITION_COLLECTION = 'nutrition_logs';
const GUT_COLLECTION = 'gut_health_logs';

export interface UserAccountData {
  id: string;
  displayName: string;
  email?: string;
  photoURL?: string;
}

/**
 * Register or update the authenticated user profile in Firestore
 */
export async function syncUserProfile(user: UserAccountData): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(
      userRef,
      {
        id: user.id,
        displayName: user.displayName,
        email: user.email || '',
        photoURL: user.photoURL || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Sync user profile notice:', err);
  }
}

/**
 * Seed initial starter logs for a new user account if they have no existing logs in Firestore.
 */
export async function seedUserLogsIfEmpty(userId: string): Promise<void> {
  try {
    const nutCol = collection(db, NUTRITION_COLLECTION);
    const q = query(nutCol, where('userId', '==', userId));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log(`[Firestore] Initializing starter plate history for user ${userId}...`);
      const starterNutrition = INITIAL_NUTRITION_LOGS.slice(0, 5);
      const starterGut = INITIAL_GUT_HEALTH_LOGS.slice(0, 5);

      for (let i = 0; i < starterNutrition.length; i++) {
        const n: NutritionLogEntry = {
          ...starterNutrition[i],
          id: `${userId}-nut-${i + 1}`,
          userId,
        };
        const g: GutHealthLogEntry = {
          ...starterGut[i],
          id: `${userId}-gut-${i + 1}`,
          mealReferenceId: `${userId}-nut-${i + 1}`,
          userId,
        };

        await setDoc(doc(db, NUTRITION_COLLECTION, n.id), n);
        await setDoc(doc(db, GUT_COLLECTION, g.id), g);
      }
    }
  } catch (err) {
    console.warn('Starter log initialization note:', err);
  }
}

/**
 * Subscribe in real time to database logs belonging strictly to the authenticated user.
 * Invokes onData whenever records are inserted, modified, or deleted.
 */
export function subscribeToUserLogs(
  userId: string,
  onData: (nutrition: NutritionLogEntry[], gutHealth: GutHealthLogEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let latestNutrition: NutritionLogEntry[] = [];
  let latestGut: GutHealthLogEntry[] = [];
  let isSubscribed = true;

  const notify = () => {
    if (!isSubscribed) return;
    const sortedNutrition = [...latestNutrition].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const sortedGut = [...latestGut].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    onData(sortedNutrition, sortedGut);
  };

  // 1. Subscribe to nutrition_logs strictly for this authenticated userId
  const nutQuery = query(collection(db, NUTRITION_COLLECTION), where('userId', '==', userId));
  const unsubNutrition = onSnapshot(
    nutQuery,
    (snapshot) => {
      latestNutrition = snapshot.docs.map((d) => d.data() as NutritionLogEntry);
      notify();
    },
    (error) => {
      console.warn(`Firestore Nutrition listener notice for user ${userId}:`, error.message);
      if (onError) onError(error);
    }
  );

  // 2. Subscribe to gut_health_logs strictly for this authenticated userId
  const gutQuery = query(collection(db, GUT_COLLECTION), where('userId', '==', userId));
  const unsubGut = onSnapshot(
    gutQuery,
    (snapshot) => {
      latestGut = snapshot.docs.map((d) => d.data() as GutHealthLogEntry);
      notify();
    },
    (error) => {
      console.warn(`Firestore Gut Health listener notice for user ${userId}:`, error.message);
      if (onError) onError(error);
    }
  );

  return () => {
    isSubscribed = false;
    unsubNutrition();
    unsubGut();
  };
}

/**
 * Save a new meal log to Firestore database under the authenticated userId.
 */
export async function saveMealToDatabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry,
  userId: string
): Promise<void> {
  const nutritionDoc: NutritionLogEntry = {
    ...nutrition,
    userId,
  };

  const gutDoc: GutHealthLogEntry = {
    ...gutHealth,
    userId,
    mealReferenceId: nutrition.id,
  };

  try {
    await setDoc(doc(db, NUTRITION_COLLECTION, nutrition.id), nutritionDoc);
    await setDoc(doc(db, GUT_COLLECTION, gutHealth.id), gutDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${NUTRITION_COLLECTION}/${nutrition.id}`);
  }
}

/**
 * Update an existing meal log in Firestore database.
 */
export async function updateMealInDatabase(
  nutrition: NutritionLogEntry,
  gutHealth: GutHealthLogEntry | undefined,
  userId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, NUTRITION_COLLECTION, nutrition.id), {
      ...nutrition,
      userId,
    } as any);

    if (gutHealth) {
      await setDoc(
        doc(db, GUT_COLLECTION, gutHealth.id),
        {
          ...gutHealth,
          userId,
          mealReferenceId: nutrition.id,
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${NUTRITION_COLLECTION}/${nutrition.id}`);
  }
}

/**
 * Delete a meal log and its matching gut health entry from Firestore.
 */
export async function deleteMealFromDatabase(id: string, _userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, NUTRITION_COLLECTION, id));
    // Also remove associated gut record
    const gutQuery = query(collection(db, GUT_COLLECTION), where('mealReferenceId', '==', id));
    const gutSnap = await getDocs(gutQuery);
    for (const gDoc of gutSnap.docs) {
      await deleteDoc(gDoc.ref);
    }
    await deleteDoc(doc(db, GUT_COLLECTION, id)).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${NUTRITION_COLLECTION}/${id}`);
  }
}

