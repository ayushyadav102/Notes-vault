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

// Validation function: Username must be email format like ayush@123gmail.com
export const isValidEmailId = (id: string): boolean => {
  if (!id) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(id.trim());
};

// Validation function: Password must contain letters, '@', and numbers (e.g. ayush@123)
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasAtSymbol = password.includes('@');
  const hasNumbers = /[0-9]/.test(password);

  if (!hasLetters) {
    return { valid: false, message: "Password must contain letters (e.g., ayush@123)." };
  }
  if (!hasAtSymbol) {
    return { valid: false, message: "Password must contain the '@' symbol (e.g., ayush@123)." };
  }
  if (!hasNumbers) {
    return { valid: false, message: "Password must contain numbers (e.g., ayush@123)." };
  }
  return { valid: true };
};

// Clean and normalize ID to lowercase trimmed string
export const normalizeStudentId = (id: string): string => {
  return id.trim().toLowerCase();
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
    const encodedId = encodeURIComponent(normId);
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${encodedId}?key=${firebaseConfig.apiKey}`;
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
    const encodedId = encodeURIComponent(normId);
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${encodedId}?key=${firebaseConfig.apiKey}`;
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
  if (!payload.name.trim()) {
    throw new Error('Please enter your full name.');
  }

  const rawId = payload.studentId.trim();
  if (!isValidEmailId(rawId)) {
    throw new Error('User ID must be a valid email format (e.g., ayush@123gmail.com).');
  }

  const pwdCheck = isValidPassword(payload.password);
  if (!pwdCheck.valid) {
    throw new Error(pwdCheck.message || "Password must contain letters, '@', and numbers (e.g., ayush@123).");
  }

  const normId = normalizeStudentId(rawId);

  // 1. Check if ID exists in Firestore
  const userDocRef = doc(db, 'users', normId);
  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      throw new Error(`User ID "${normId}" already exists. Please log in or choose another ID.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      throw err;
    }
    // Check REST
    const restExisting = await readUserDirectFromFirestoreRest(normId);
    if (restExisting) {
      throw new Error(`User ID "${normId}" already exists. Please log in.`);
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
    throw new Error('Please enter your User ID.');
  }
  if (!payload.password) {
    throw new Error('Please enter your password.');
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
    throw new Error(`User ID "${normId}" not found. Please create an account first (Register).`);
  }

  if (userData.password !== payload.password) {
    throw new Error('Incorrect password! Please check and try again.');
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
