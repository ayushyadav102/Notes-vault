import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { StudentUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export interface RegisterPayload {
  name: string;
  studentId: string;
  educationLevel?: 'school' | 'college' | 'coaching';
  grade?: number;
  semester?: number;
  coachingStream?: string;
  academicLevelLabel?: string;
  schoolName?: string;
  password: string;
}

export interface LoginPayload {
  studentId: string;
  password: string;
}

// Validation function: Username can be email or email-like or handle format
export const isValidEmailId = (id: string): boolean => {
  if (!id) return false;
  const trimmed = id.trim();
  // Support email format (user@domain.com) or alphanumeric handle with @ or .
  return trimmed.length >= 3 && /^[a-zA-Z0-9._%+-]+(@[a-zA-Z0-9.-]+)?$/.test(trimmed);
};

// Validation function: Password length and basic check
export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (!password || password.length < 4) {
    return { valid: false, message: 'Password must be at least 4 characters long.' };
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

// Auto-sync any existing local accounts to server so mobile-created IDs reach server
export const syncLocalAccountsToServer = async () => {
  try {
    const localDb: Record<string, any> = JSON.parse(localStorage.getItem('notesvault_local_accounts') || '{}');
    for (const [normId, account] of Object.entries(localDb)) {
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: account.name,
            studentId: normId,
            password: account.password,
            educationLevel: account.educationLevel,
            grade: account.grade,
            semester: account.semester,
            coachingStream: account.coachingStream,
            academicLevelLabel: account.academicLevelLabel,
            schoolName: account.schoolName,
          })
        });
      } catch {
        // silent
      }
    }
  } catch {
    // silent
  }
};

// Trigger sync on load
if (typeof window !== 'undefined') {
  syncLocalAccountsToServer();
}

// Register a new student ID
export const registerStudent = async (payload: RegisterPayload): Promise<StudentUser> => {
  if (!payload.name.trim()) {
    throw new Error('Please enter your full name.');
  }

  const rawId = payload.studentId.trim();
  if (!isValidEmailId(rawId)) {
    throw new Error('User ID must be valid (e.g., ayush@123gmail.com or ayush@123).');
  }

  const pwdCheck = isValidPassword(payload.password);
  if (!pwdCheck.valid) {
    throw new Error(pwdCheck.message || 'Password must be at least 4 characters long.');
  }

  const normId = normalizeStudentId(rawId);

  const studentData: StudentUser = {
    id: normId,
    studentId: normId,
    name: payload.name.trim(),
    role: 'student',
    ...(payload.educationLevel ? { educationLevel: payload.educationLevel } : {}),
    ...(payload.grade ? { grade: Number(payload.grade) } : {}),
    ...(payload.semester ? { semester: Number(payload.semester) } : {}),
    ...(payload.coachingStream ? { coachingStream: payload.coachingStream } : {}),
    ...(payload.academicLevelLabel ? { academicLevelLabel: payload.academicLevelLabel } : {}),
    ...(payload.schoolName?.trim() ? { schoolName: payload.schoolName.trim() } : {}),
  };

  // 1. Centralized Server Database Registration (Guaranteed cross-device: Mobile -> PC)
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...studentData,
        password: payload.password,
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        studentData.name = data.user.name || studentData.name;
      }
    }
  } catch (serverErr) {
    console.warn("Central server register notice:", serverErr);
  }

  // 2. Also save to local fallback cache on current device
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

  // 3. Optional Firestore SDK write
  try {
    const userDocRef = doc(db, 'users', normId);
    await setDoc(userDocRef, {
      ...studentData,
      password: payload.password,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } catch (writeErr: any) {
    // Non-blocking
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

  let studentUser: StudentUser | null = null;
  let serverErrorMessage: string | null = null;

  // 1. Primary: Central Server API (Cross-Device Database)
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: normId,
        password: payload.password,
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        studentUser = {
          id: data.user.id || normId,
          studentId: data.user.studentId || normId,
          name: data.user.name || normId,
          educationLevel: data.user.educationLevel,
          grade: data.user.grade,
          semester: data.user.semester,
          coachingStream: data.user.coachingStream,
          academicLevelLabel: data.user.academicLevelLabel,
          schoolName: data.user.schoolName,
          role: data.user.role || 'student',
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      serverErrorMessage = errData.error || null;
      if (res.status === 401) {
        throw new Error(errData.error || 'Incorrect password! Please check and try again.');
      }
    }
  } catch (serverErr: any) {
    if (serverErr.message && serverErr.message.includes('Incorrect password')) {
      throw serverErr;
    }
    console.warn("Server login fallback:", serverErr);
  }

  // 2. Secondary: Firestore SDK check
  if (!studentUser) {
    try {
      const userDocRef = doc(db, 'users', normId);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const userData = snap.data();
        if (userData.password === payload.password) {
          studentUser = {
            id: normId,
            studentId: normId,
            name: userData.name || normId,
            educationLevel: userData.educationLevel,
            grade: userData.grade ? Number(userData.grade) : undefined,
            semester: userData.semester ? Number(userData.semester) : undefined,
            coachingStream: userData.coachingStream,
            academicLevelLabel: userData.academicLevelLabel,
            schoolName: userData.schoolName,
            role: userData.role || 'student',
          };
        } else {
          throw new Error('Incorrect password! Please check and try again.');
        }
      }
    } catch (fbErr: any) {
      if (fbErr.message && fbErr.message.includes('Incorrect password')) {
        throw fbErr;
      }
    }
  }

  // 3. Tertiary: Local accounts fallback
  if (!studentUser) {
    try {
      const localDb: Record<string, any> = JSON.parse(localStorage.getItem('notesvault_local_accounts') || '{}');
      const localUser = localDb[normId] || Object.values(localDb).find((u: any) => 
        u.studentId === normId || u.id === normId || (u.studentId && normId.startsWith(u.studentId.split('@')[0]))
      );
      if (localUser) {
        if (localUser.password === payload.password) {
          studentUser = {
            id: localUser.id || normId,
            studentId: localUser.studentId || normId,
            name: localUser.name || normId,
            educationLevel: localUser.educationLevel,
            grade: localUser.grade ? Number(localUser.grade) : undefined,
            semester: localUser.semester ? Number(localUser.semester) : undefined,
            coachingStream: localUser.coachingStream,
            academicLevelLabel: localUser.academicLevelLabel,
            schoolName: localUser.schoolName,
            role: localUser.role || 'student',
          };
          // Sync it back to server so other devices get it too!
          fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...localUser, password: payload.password })
          }).catch(() => {});
        } else {
          throw new Error('Incorrect password! Please check and try again.');
        }
      }
    } catch (localErr: any) {
      if (localErr.message && localErr.message.includes('Incorrect password')) {
        throw localErr;
      }
    }
  }

  if (!studentUser) {
    if (serverErrorMessage) {
      throw new Error(serverErrorMessage);
    }
    throw new Error(`User ID "${normId}" not found. Please click "Register" to create your account first.`);
  }

  setActiveStudentSession(studentUser);
  return studentUser;
};

// Logout
export const logoutStudent = () => {
  setActiveStudentSession(null);
};
