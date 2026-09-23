import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { UploadNotes, UploadNotePayload } from './components/UploadNotes';
import { LandingPage } from './components/LandingPage';
import { SplashAuthScreen } from './components/SplashAuthScreen';
import { Note } from './types';
import { auth, db, loginWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { storeLocalFile, fileToDataUrl } from './lib/fileStorage';
import { collection, onSnapshot, setDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

type TabType = 'landing' | 'browse' | 'upload';

export default function App() {
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'browse' || hash === 'upload' || hash === 'landing') {
      return hash as TabType;
    }
    return 'browse';
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [filterMyNotes, setFilterMyNotes] = useState<boolean>(false);

  // Sync authentication state across the application
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
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

  // Back button handler: takes user back one step or falls back to previous view
  const handleBack = () => {
    if (window.history.state?.tab) {
      window.history.back();
    } else {
      if (activeTab === 'upload') {
        navigateToTab('browse', false);
      } else if (activeTab === 'browse') {
        navigateToTab('landing', false);
      } else {
        window.history.back();
      }
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

  // Real-time Firestore sync
  useEffect(() => {
    const notesQuery = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const schoolCode = data.schoolCode || `NV${doc.id.slice(0, 4).toUpperCase()}`;
        const schoolName = data.schoolName || 'General School Repository';
        notesData.push({ id: doc.id, ...data, schoolCode, schoolName } as Note);
      });
      setNotes(notesData);
      setLoadingNotes(false);
    }, (error) => {
      console.warn("Firestore notes stream error:", error);
      setLoadingNotes(false);
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => {
      unsubscribeNotes();
    };
  }, []);

  const handleUploadClick = () => {
    navigateToTab('upload');
  };

  const handleOpenMyNotes = () => {
    setFilterMyNotes(true);
    navigateToTab('browse');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setFilterMyNotes(false);
      setHasEntered(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handlePublish = async (payload: UploadNotePayload) => {
    try {
      const noteId = Math.random().toString(36).substr(2, 9);
      const defaultAuthor = user?.displayName || user?.email?.split('@')[0] || 'Student Contributor';
      const author = payload.authorName?.trim() || defaultAuthor;
      const initials = author.substring(0, 2).toUpperCase() || 'ST';
      const uploadedFile = payload.file;

      let fileDataUrl: string | undefined;
      const fileName = uploadedFile ? uploadedFile.name : undefined;
      const fileType = uploadedFile ? (uploadedFile.type || 'application/pdf') : undefined;
      const isPdf = uploadedFile ? (uploadedFile.name.toLowerCase().endsWith('.pdf') || uploadedFile.type === 'application/pdf') : true;
      const sizeMB = uploadedFile ? parseFloat((uploadedFile.size / (1024 * 1024)).toFixed(2)) : parseFloat((Math.random() * 5 + 1.2).toFixed(1));

      if (uploadedFile) {
        // 1. Store full file in IndexedDB immediately for instant offline & client download
        await storeLocalFile(noteId, uploadedFile, uploadedFile.name, uploadedFile.type);
        
        // 2. Read as Data URL
        fileDataUrl = await fileToDataUrl(uploadedFile);
      }

      const newNote: Omit<Note, 'id'> = {
        title: payload.title,
        subject: payload.subject,
        department: payload.department || 'general',
        grade: payload.grade,
        schoolName: payload.schoolName || 'General School Repository',
        schoolCode: payload.schoolCode || `NOTE${Math.floor(100 + Math.random() * 900)}`,
        pages: Math.max(1, Math.round(sizeMB * 8) || 12),
        sizeMB,
        rating: 5.0,
        reviews: 0,
        author: {
          name: author,
          initials: initials,
          badge: user ? 'Verified Author' : 'Verified Student',
          badgeStyle: user ? 'bg-emerald-100 text-emerald-800' : 'bg-primary-container text-on-primary'
        },
        thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600',
        isPdf,
        ownerId: user ? user.uid : 'community_contributor',
        createdAt: serverTimestamp(),
        ...(fileName ? { fileName } : {}),
        ...(fileType ? { fileType } : {}),
        // If data URL is within Firestore's 800KB payload threshold, persist it to Firestore directly
        ...(fileDataUrl && fileDataUrl.length < 800000 ? { fileData: fileDataUrl } : {}),
      };

      await setDoc(doc(db, 'notes', noteId), newNote);
      navigateToTab('browse');
    } catch (error) {
      console.error("Publish error:", error);
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  // If user hasn't entered the app, show the dedicated First Start Page with Sign In system
  if (!hasEntered) {
    return (
      <SplashAuthScreen
        onGoogleSignIn={loginWithGoogle}
        onGuestSignIn={() => setHasEntered(true)}
        user={user}
        onEnterApp={() => setHasEntered(true)}
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
        onLogout={handleLogout}
        onFilterMyNotes={handleOpenMyNotes}
      />
      
      <main className="flex-grow pt-16">
        {activeTab === 'landing' && (
          <LandingPage 
            onSelectRoute={(tab) => navigateToTab(tab)} 
            user={user}
          />
        )}
        {activeTab === 'browse' && (
          <Dashboard 
            notes={notes} 
            onUploadClick={handleUploadClick} 
            onBackToHome={() => navigateToTab('landing')}
            user={user}
            initialFilterMyNotes={filterMyNotes}
          />
        )}
        {activeTab === 'upload' && (
          <UploadNotes 
            onPublish={handlePublish} 
            onCancel={handleBack} 
            user={user}
          />
        )}
      </main>

      <Footer onTabChange={(tab) => navigateToTab(tab)} />
    </div>
  );
}
