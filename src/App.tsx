import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { UploadNotes } from './components/UploadNotes';
import { LandingPage } from './components/LandingPage';
import { SplashAuthScreen } from './components/SplashAuthScreen';
import { NotesVaultLogo } from './components/NotesVaultLogo';
import { Note } from './types';
import { db, auth, loginWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { collection, onSnapshot, setDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

type TabType = 'landing' | 'browse' | 'upload';

interface CachedUser {
  uid?: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'browse' || hash === 'upload' || hash === 'landing') {
      return hash as TabType;
    }
    return 'browse';
  });

  const [notes, setNotes] = useState<Note[]>([]);
  
  // Read cached user from localStorage immediately on startup so returning users are known instantly
  const [user, setUser] = useState<User | CachedUser | null>(() => {
    try {
      const isAuth = localStorage.getItem('notesvault_is_authenticated');
      const cached = localStorage.getItem('notesvault_cached_user');
      if (isAuth === 'true' && cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error("Error reading cached user:", e);
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Track if initial 3s splash screen has finished for this session
  const [splashFinished, setSplashFinished] = useState<boolean>(() => {
    return sessionStorage.getItem('notesvault_splash_seen') === 'true';
  });

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('notesvault_is_authenticated', 'true');
        localStorage.setItem('notesvault_cached_user', JSON.stringify({
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        }));
      } else {
        // If Firebase confirms no user and localStorage doesn't have an authenticated flag
        const isAuth = localStorage.getItem('notesvault_is_authenticated');
        if (isAuth !== 'true') {
          setUser(null);
        }
      }
      setAuthLoading(false);
    });

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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeNotes();
    };
  }, []);

  const handleUploadClick = () => {
    navigateToTab('upload');
  };

  const handlePublish = async (newNoteData: Omit<Note, 'id' | 'reviews' | 'rating' | 'author' | 'thumbnailUrl' | 'isPdf' | 'sizeMB' | 'pages' | 'ownerId'>) => {
    if (!user) {
      return;
    }

    try {
      const noteId = Math.random().toString(36).substr(2, 9);
      const authorName = user.displayName || user.email?.split('@')[0] || 'Student';
      const initials = authorName.substring(0, 2).toUpperCase();

      const newNote: Omit<Note, 'id'> = {
        ...newNoteData,
        pages: Math.floor(Math.random() * 50) + 10,
        sizeMB: parseFloat((Math.random() * 15 + 1).toFixed(1)),
        rating: 5.0,
        reviews: 0,
        author: {
          name: authorName,
          initials: initials,
          badge: 'Verified Student',
          badgeStyle: 'bg-primary-container text-on-primary'
        },
        thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600',
        isPdf: true,
        ownerId: (user as User).uid || 'student',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'notes', noteId), newNote);
      navigateToTab('browse');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  const handleEnterApp = () => {
    sessionStorage.setItem('notesvault_splash_seen', 'true');
    setSplashFinished(true);
  };

  const handleGuestLogin = () => {
    const guestUser: CachedUser = {
      uid: `guest_${Date.now()}`,
      displayName: 'Student Guest',
      email: 'student@notesvault.school',
      photoURL: null,
    };
    setUser(guestUser);
    localStorage.setItem('notesvault_is_authenticated', 'true');
    localStorage.setItem('notesvault_cached_user', JSON.stringify(guestUser));
    sessionStorage.setItem('notesvault_splash_seen', 'true');
    setSplashFinished(true);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSplashFinished(false);
  };

  // 1. If auth is still checking and we have no cached user, show sleek loader
  if (authLoading && !user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <NotesVaultLogo size="lg" showText={true} />
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mt-4" />
        </div>
      </div>
    );
  }

  // 2. First-time visitor (NOT signed in): Show 3-second splash with Google Sign In option below logo
  if (!user) {
    return (
      <SplashAuthScreen
        onGoogleSignIn={async () => {
          const loggedInUser = await loginWithGoogle();
          if (loggedInUser) {
            setUser(loggedInUser);
            sessionStorage.setItem('notesvault_splash_seen', 'true');
            setSplashFinished(true);
          }
        }}
        onGuestSignIn={handleGuestLogin}
        user={null}
      />
    );
  }

  // 3. Returning user (ALREADY signed in): On app startup, show 3-second Welcome screen with logo,
  // but WITHOUT ANY SIGN-IN OPTION! Automatically transitions to notes library after 3s.
  if (!splashFinished) {
    return (
      <SplashAuthScreen
        onGoogleSignIn={async () => {}}
        user={user}
        onEnterApp={handleEnterApp}
      />
    );
  }

  // 4. Inside the application: All pages open cleanly, NO SIGN-IN OPTION ANYWHERE
  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface antialiased">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={(tab) => navigateToTab(tab)} 
        onBack={handleBack}
        user={user as User}
        onLogout={handleLogout}
      />
      
      <main className="flex-grow pt-16">
        {activeTab === 'landing' && (
          <LandingPage 
            onSelectRoute={(tab) => navigateToTab(tab)} 
            user={user as User}
          />
        )}
        {activeTab === 'browse' && (
          <Dashboard 
            notes={notes} 
            onUploadClick={handleUploadClick} 
            onBackToHome={() => navigateToTab('landing')}
          />
        )}
        {activeTab === 'upload' && (
          <UploadNotes 
            onPublish={handlePublish} 
            onCancel={handleBack} 
          />
        )}
      </main>

      <Footer onTabChange={(tab) => navigateToTab(tab)} />
    </div>
  );
}
