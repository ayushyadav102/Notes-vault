import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const rawDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = (!rawDbId || rawDbId === '(default)') ? getFirestore(app) : getFirestore(app, rawDbId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Ensure local persistence is active across tabs and browser restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Auth persistence error:", err);
});

export const loginWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      // Store session indicator in localStorage for persistent recognition
      localStorage.setItem('notesvault_is_authenticated', 'true');
      localStorage.setItem('notesvault_cached_user', JSON.stringify({
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      }));
    }
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.warn("Login notice:", error?.message || error);
    
    if (error?.code === 'auth/unauthorized-domain') {
      const currentHost = window.location.hostname;
      const friendlyMsg = `Domain "${currentHost}" Firebase me authorized nahi hai. Kripya Firebase Console > Authentication > Settings > Authorized Domains me jaakar "${currentHost}" add karein.`;
      throw new Error(friendlyMsg);
    }
    
    throw new Error(error?.message || "Sign in failed. Please try again.");
  }
};

export const logout = async () => {
  // Clear persistent flags on explicit logout
  localStorage.removeItem('notesvault_is_authenticated');
  localStorage.removeItem('notesvault_cached_user');
  sessionStorage.removeItem('notesvault_splash_seen');
  await signOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('unavailable') || errorMessage.includes('offline') || errorMessage.includes('network')) {
    console.warn(`Firestore network warning during ${operationType} on ${path}:`, errorMessage);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (errorMessage.includes('Missing or insufficient permissions')) {
    throw new Error(JSON.stringify(errInfo));
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client check.");
    }
  }
}
testConnection();
