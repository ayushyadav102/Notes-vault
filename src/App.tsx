import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { UploadNotes, UploadNotePayload } from './components/UploadNotes';
import { LandingPage } from './components/LandingPage';
import { StudentAuthScreen } from './components/StudentAuthScreen';
import { Note, StudentUser } from './types';
import { INITIAL_NOTES, INITIAL_CLASSES } from './data';
import { auth, db, loginWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { getActiveStudent, logoutStudent } from './lib/studentAuth';
import { storeLocalFile, fileToDataUrl, saveFileToFirestoreChunks } from './lib/fileStorage';
import { collection, onSnapshot, setDoc, doc, serverTimestamp, query, orderBy, writeBatch, getDocs } from 'firebase/firestore';

type TabType = 'landing' | 'browse' | 'upload';

export default function App() {
  const [student, setStudent] = useState<StudentUser | null>(() => getActiveStudent());
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'browse' || hash === 'upload') {
      return hash as TabType;
    }
    // Always default to Step 2: Welcome to NotesVault
    return 'landing';
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [filterMyNotes, setFilterMyNotes] = useState<boolean>(false);

  const [authReady, setAuthReady] = useState<boolean>(false);

  // Background auth sync to ensure session readiness
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setAuthReady(true);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch {
          // Anonymous auth optional if not enabled in console
        } finally {
          setAuthReady(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync tab navigation with browser history stack
  const navigateToTab = (tab: TabType, pushToHistory = true) => {
    setActiveTab(tab);
    if (pushToHistory) {
      window.history.pushState({ tab }, '', `#${tab}`);
    }
  };

  // Back button handler: takes user back one step or falls back to Welcome page
  const handleBack = () => {
    if (activeTab === 'upload' || activeTab === 'browse') {
      navigateToTab('landing', true);
    } else if (window.history.state?.tab) {
      window.history.back();
    } else {
      navigateToTab('landing', false);
    }
  };

  useEffect(() => {
    // Save initial history entry
    window.history.replaceState({ tab: activeTab }, '', `#${activeTab}`);

    // Listen to browser Back / Forward events
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'browse' || hash === 'upload' || hash === 'landing') {
          setActiveTab(hash as TabType);
        } else {
          setActiveTab('browse');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Real-time Firestore sync with auto-seed for empty database & classes metadata
  useEffect(() => {
    if (!authReady || !user) {
      setNotes(INITIAL_NOTES);
      setLoadingNotes(false);
      return;
    }
    let isSeeding = false;

    // Ensure 'classes' collection is populated with curriculum metadata (cached)
    const seedClassesIfEmpty = async () => {
      if (localStorage.getItem('notesvault_classes_checked')) return;
      try {
        const classesSnap = await getDocs(collection(db, 'classes'));
        if (classesSnap.empty) {
          const batch = writeBatch(db);
          INITIAL_CLASSES.forEach((cls) => {
            const classDocRef = doc(db, 'classes', cls.id);
            batch.set(classDocRef, {
              ...cls,
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
        }
        localStorage.setItem('notesvault_classes_checked', 'true');
      } catch (err) {
        // Silent fallback - classes exist or offline
      }
    };
    seedClassesIfEmpty();

    const notesQuery = query(collection(db, 'notes'));
    const unsubscribeNotes = onSnapshot(notesQuery, async (snapshot) => {
      if (snapshot.empty && !isSeeding) {
        isSeeding = true;
        setNotes(INITIAL_NOTES);
        setLoadingNotes(false);
        try {
          const batch = writeBatch(db);
          INITIAL_NOTES.forEach((note) => {
            const docRef = doc(db, 'notes', note.id);
            batch.set(docRef, {
              ...note,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
          console.log("Successfully seeded initial verified notes to Firestore!");
        } catch (seedErr) {
          console.warn("Could not batch-seed notes to Firestore:", seedErr);
        }
        return;
      }

      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const schoolCode = data.schoolCode || `NV${doc.id.slice(0, 4).toUpperCase()}`;
        const schoolName = data.schoolName || 'General School Repository';
        notesData.push({ id: doc.id, ...data, schoolCode, schoolName } as Note);
      });

      // Sort in memory by recency or rating
      notesData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setNotes(notesData.length > 0 ? notesData : INITIAL_NOTES);
      setLoadingNotes(false);
    }, (error) => {
      console.warn("Firestore notes stream error:", error);
      setNotes(INITIAL_NOTES);
      setLoadingNotes(false);
      try {
        handleFirestoreError(error, OperationType.GET, 'notes');
      } catch (err) {
        console.warn("Firestore permission issue detected on notes collection:", err);
      }
    });

    return () => {
      unsubscribeNotes();
    };
  }, [authReady, user]);

  const handleUploadClick = () => {
    navigateToTab('upload');
  };

  const handleOpenMyNotes = () => {
    setFilterMyNotes(true);
    navigateToTab('browse');
  };

  const handleStudentLogout = () => {
    logoutStudent();
    setStudent(null);
    setFilterMyNotes(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      handleStudentLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handlePublish = async (payload: UploadNotePayload) => {
    try {
      const noteId = Math.random().toString(36).substr(2, 9);
      const defaultAuthor = student?.name || user?.displayName || user?.email?.split('@')[0] || 'Student Contributor';
      const author = payload.authorName?.trim() || defaultAuthor;
      const initials = author.substring(0, 2).toUpperCase() || 'ST';
      const uploadedFile = payload.file;

      let fileDataUrl: string | undefined;
      const fileName = uploadedFile ? uploadedFile.name : undefined;
      const fileType = uploadedFile ? (uploadedFile.type || 'application/pdf') : undefined;
      const isPdf = uploadedFile ? (uploadedFile.name.toLowerCase().endsWith('.pdf') || uploadedFile.type === 'application/pdf') : true;
      const sizeMB = uploadedFile ? parseFloat((uploadedFile.size / (1024 * 1024)).toFixed(2)) : parseFloat((Math.random() * 5 + 1.2).toFixed(1));

      let hasChunks = false;
      let totalChunks = 0;

      if (uploadedFile) {
        // 1. Store full file in IndexedDB immediately for instant offline & client download
        await storeLocalFile(noteId, uploadedFile, uploadedFile.name, uploadedFile.type);
        
        // 2. Read as Data URL
        fileDataUrl = await fileToDataUrl(uploadedFile);

        // 3. Save chunks to Firestore so any student across any device gets the real file
        try {
          totalChunks = await saveFileToFirestoreChunks(db, noteId, fileDataUrl);
          hasChunks = totalChunks > 0;
        } catch (chunkErr) {
          console.warn("Could not save file chunks to Firestore:", chunkErr);
        }
      }

      const levelBadge = payload.academicLevelLabel || 
        (payload.educationLevel === 'college' 
          ? `Semester ${payload.semester || payload.grade}` 
          : (payload.educationLevel === 'coaching' ? payload.coachingStream : `Class ${payload.grade}`));

      const newNote: Record<string, any> = {
        title: payload.title,
        subject: payload.subject,
        department: payload.department || payload.educationLevel || 'general',
        educationLevel: payload.educationLevel || 'school',
        grade: payload.grade,
        academicLevelLabel: levelBadge || (payload.educationLevel === 'college' ? 'College' : (payload.educationLevel === 'coaching' ? 'Coaching' : `Class ${payload.grade}`)),
        schoolName: payload.schoolName || student?.schoolName || (payload.educationLevel === 'college' ? 'University / College Archive' : 'General Study Repository'),
        schoolCode: payload.schoolCode || `NOTE${Math.floor(100 + Math.random() * 900)}`,
        pages: Math.max(1, Math.round(sizeMB * 8) || 12),
        sizeMB,
        rating: 5.0,
        reviews: 0,
        author: {
          name: author,
          initials: initials,
          badge: levelBadge 
            ? `${levelBadge} Contributor`
            : (student ? (student.academicLevelLabel ? `${student.academicLevelLabel} Student` : `Student`) : (user ? 'Verified Author' : 'Verified Contributor')),
          badgeStyle: payload.educationLevel === 'college' 
            ? 'bg-indigo-100 text-indigo-800' 
            : (payload.educationLevel === 'coaching' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800')
        },
        thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600',
        isPdf,
        ownerId: student ? student.id : (user ? user.uid : 'community_contributor'),
        createdAt: serverTimestamp(),
        hasChunks,
        totalChunks,
        ...(payload.semester !== undefined && payload.semester !== null ? { semester: payload.semester } : {}),
        ...(payload.coachingStream ? { coachingStream: payload.coachingStream } : {}),
        ...(fileName ? { fileName } : {}),
        ...(fileType ? { fileType } : {}),
        // If data URL is small, also store directly on note doc for rapid access
        ...(fileDataUrl && fileDataUrl.length < 600000 ? { fileData: fileDataUrl } : {}),
      };

      // Clean any residual undefined values before saving to Firestore
      const cleanNoteData = Object.fromEntries(
        Object.entries(newNote).filter(([_, v]) => v !== undefined)
      );

      await setDoc(doc(db, 'notes', noteId), cleanNoteData);
      try {
        const stored = JSON.parse(localStorage.getItem('notesvault_my_uploaded_ids') || '[]');
        if (!stored.includes(noteId)) {
          stored.push(noteId);
          localStorage.setItem('notesvault_my_uploaded_ids', JSON.stringify(stored));
        }
      } catch {
        // ignore
      }
      navigateToTab('browse');
    } catch (error) {
      console.error("Publish error:", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'notes');
      } catch (err) {
        console.warn("Firestore create note error:", err);
      }
    }
  };

  // If student is not logged in, always show the First Page (Register / Login)
  if (!student) {
    return (
      <StudentAuthScreen
        onAuthSuccess={(newStudent) => {
          setStudent(newStudent);
          setActiveTab('landing');
          window.history.replaceState({ tab: 'landing' }, '', '#landing');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface antialiased">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setFilterMyNotes(false);
          navigateToTab(tab);
        }} 
        onBack={handleBack}
        user={user}
        student={student}
        onLogout={handleLogout}
        onStudentLogout={handleStudentLogout}
        onFilterMyNotes={handleOpenMyNotes}
      />
      
      <main className="flex-grow pt-16">
        {activeTab === 'landing' && (
          <LandingPage 
            onSelectRoute={(tab) => navigateToTab(tab)} 
            user={user}
            student={student}
          />
        )}
        {activeTab === 'browse' && (
          <Dashboard 
            notes={notes} 
            onUploadClick={handleUploadClick} 
            onBackToHome={() => navigateToTab('landing')}
            user={user}
            student={student}
            initialFilterMyNotes={filterMyNotes}
          />
        )}
        {activeTab === 'upload' && (
          <UploadNotes 
            onPublish={handlePublish} 
            onCancel={handleBack} 
            user={user}
            student={student}
          />
        )}
      </main>

      <Footer onTabChange={(tab) => navigateToTab(tab)} />
    </div>
  );
}
