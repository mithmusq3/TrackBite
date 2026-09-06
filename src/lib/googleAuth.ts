import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

// Basic Google Auth Provider for user identity and profile authentication
const authProvider = new GoogleAuthProvider();

let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Standard Google Sign In for user identity and database profile sync.
 */
export const googleSignIn = async (): Promise<User | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, authProvider);
    return result.user;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await signOut(auth);
};

