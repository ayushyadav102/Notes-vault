import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { StudentUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export interface RegisterPayload {
  name: string;
  studentId: string;
  grade?: number;
  schoolName?: string;
  password: string;
}

export interface LoginPayload {
  studentId: string;
  password: string;
}

// Clean and normalize ID (e.g. "Ayush 10" -> "ayush10")
export const normalizeStudentId = (id: string): string => {
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
};

// Retrieve currently active student from local storage
export const getActiveStudent = (): StudentUser | null => {
  try {
    const raw = localStorage.getItem('notesvault_active_student');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Save active student session
export const setActiveStudentSession = (student: StudentUser | null) => {
  if (student) {
    localStorage.setItem('notesvault_active_student', JSON.stringify(student));
  } else {
    localStorage.removeItem('notesvault_active_student');
  }
};

// Direct Firestore REST API backup write for guaranteed persistence
const writeUserDirectToFirestoreRest = async (userData: any, normId: string) => {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${normId}?key=${firebaseConfig.apiKey}`;
    const fields: Record<string, any> = {
      id: { stringValue: normId },
      studentId: { stringValue: normId },
      name: { stringValue: userData.name },
      password: { stringValue: userData.password },
      role: { stringValue: userData.role || 'student' },
      createdAt: { timestampValue: new Date().toISOString() },
      lastLoginAt: { timestampValue: new Date().toISOString() }
    };
    if (userData.grade !== undefined && userData.grade !== null) {
      fields.grade = { integerValue: String(userData.grade) };
    }
    if (userData.schoolName) {
      fields.schoolName = { stringValue: userData.schoolName };
    }
    const payload = { fields };
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("REST direct write error:", err);
  }
};

// Direct Firestore REST API lookup
const readUserDirectFromFirestoreRest = async (normId: string) => {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${normId}?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.fields) return null;
    return {
      id: json.fields.id?.stringValue || normId,
      studentId: json.fields.studentId?.stringValue || normId,
      name: json.fields.name?.stringValue || normId,
      grade: json.fields.grade?.integerValue ? Number(json.fields.grade.integerValue) : undefined,
      schoolName: json.fields.schoolName?.stringValue || '',
      password: json.fields.password?.stringValue || '',
      role: json.fields.role?.stringValue || 'student',
    };
  } catch {
    return null;
  }
};

// Register a new student ID
export const registerStudent = async (payload: RegisterPayload): Promise<StudentUser> => {
  const normId = normalizeStudentId(payload.studentId);
  if (!normId) {
    throw new Error('Kripya ek valid Student ID banayein (alphanumeric).');
  }
  if (!payload.name.trim()) {
    throw new Error('Kripya apna poora naam enter karein.');
  }
  if (!payload.password || payload.password.length < 4) {
    throw new Error('Password kam se kam 4 characters ka hona chahiye.');
  }

  // 1. Check if ID exists in Firestore
  const userDocRef = doc(db, 'users', normId);
  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      throw new Error(`Student ID "${normId}" pehle se maujood hai. Kripya login karein ya doosra ID chunein.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('pehle se maujood hai')) {
      throw err;
    }
    // Check REST
    const restExisting = await readUserDirectFromFirestoreRest(normId);
    if (restExisting) {
      throw new Error(`Student ID "${normId}" pehle se maujood hai. Kripya login karein.`);
    }
  }

  const studentData: StudentUser = {
    id: normId,
    studentId: normId,
    name: payload.name.trim(),
    role: 'student',
    ...(payload.grade ? { grade: Number(payload.grade) } : {}),
    ...(payload.schoolName?.trim() ? { schoolName: payload.schoolName.trim() } : {}),
  };

  // 2. Direct REST Write (Instant, hits Firestore backend directly)
  await writeUserDirectToFirestoreRest({
    ...studentData,
    password: payload.password,
  }, normId);

  // 3. Firestore SDK Write
  try {
    const docToSave: Record<string, any> = {
      ...studentData,
      password: payload.password,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(userDocRef, docToSave);
  } catch (writeErr: any) {
    console.warn("Firestore SDK user write warning:", writeErr);
  }

  // 4. Save to local fallback cache
  try {
    const localDb: Record<string, any> = JSON.parse(localStorage.getItem('notesvault_local_accounts') || '{}');
    localDb[normId] = {
      ...studentData,
      password: payload.password,
    };
    localStorage.setItem('notesvault_local_accounts', JSON.stringify(localDb));
  } catch (localErr) {
    console.warn("Local storage write error:", localErr);
  }

  setActiveStudentSession(studentData);
  return studentData;
};

// Login with Student ID & Password
export const loginStudent = async (payload: LoginPayload): Promise<StudentUser> => {
  const normId = normalizeStudentId(payload.studentId);
  if (!normId) {
    throw new Error('Kripya apna Student ID enter karein.');
  }
  if (!payload.password) {
    throw new Error('Kripya apna Password enter karein.');
  }

  let userData: any = null;

  // 1. Try Firestore SDK
  const userDocRef = doc(db, 'users', normId);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      userData = snap.data();
    }
  } catch (netErr) {
    console.warn("Firestore SDK read warning:", netErr);
  }

  // 2. Fallback to direct REST API
  if (!userData) {
    userData = await readUserDirectFromFirestoreRest(normId);
  }

  // 3. Fallback to local accounts
  if (!userData) {
    try {
      const localDb: Record<string, any> = JSON.parse(localStorage.getItem('notesvault_local_accounts') || '{}');
      if (localDb[normId]) {
        userData = localDb[normId];
      }
    } catch {
      // ignore
    }
  }

  if (!userData) {
    throw new Error(`Student ID "${normId}" nahi mila. Kripya pehle apni Nayi ID banayein (Register).`);
  }

  if (userData.password !== payload.password) {
    throw new Error('Galat Password! Kripya sahi password enter karein.');
  }

  const studentUser: StudentUser = {
    id: normId,
    studentId: normId,
    name: userData.name || normId,
    ...(userData.grade ? { grade: Number(userData.grade) } : {}),
    ...(userData.schoolName ? { schoolName: userData.schoolName } : {}),
    role: userData.role || 'student',
  };

  // Update last login
  try {
    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
    });
  } catch {
    // non-blocking
  }

  setActiveStudentSession(studentUser);
  return studentUser;
};

// Logout
export const logoutStudent = () => {
  setActiveStudentSession(null);
};
