import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { UploadNotes } from './components/UploadNotes';
import { LandingPage } from './components/LandingPage';
import { Note } from './types';
import { db, auth, loginWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { collection, onSnapshot, setDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'browse' | 'upload'>('landing');
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const notesQuery = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const notesData: Note[] = [];
      snapshot.forEach((doc) => {
        notesData.push({ id: doc.id, ...doc.data() } as Note);
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

  const handlePublish = async (newNoteData: Omit<Note, 'id' | 'reviews' | 'rating' | 'author' | 'thumbnailUrl' | 'isPdf' | 'sizeMB' | 'pages'>) => {
    if (!user) {
      alert("Please log in to upload notes!");
      return;
    }

    try {
      const noteId = Math.random().toString(36).substr(2, 9);
      const newNote = {
        ...newNoteData,
        pages: Math.floor(Math.random() * 50) + 10,
        sizeMB: parseFloat((Math.random() * 15 + 1).toFixed(1)),
        rating: 5.0,
        reviews: 0,
        author: {
          name: user.displayName || 'Student',
          initials: (user.displayName || 'St').substring(0, 2).toUpperCase(),
          badge: 'Contributor',
          badgeStyle: 'bg-tertiary-fixed text-on-tertiary-fixed'
        },
        thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600',
        isPdf: true,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'notes', noteId), newNote);
      setActiveTab('browse');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notes');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface antialiased">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        user={user}
        onLogin={loginWithGoogle}
        onLogout={logout}
      />
      
      <main className="flex-grow pt-16">
        {activeTab === 'landing' && <LandingPage onSelectRoute={setActiveTab} />}
        {activeTab === 'browse' && <Dashboard notes={notes} onUploadClick={() => setActiveTab('upload')} />}
        {activeTab === 'upload' && <UploadNotes onPublish={handlePublish} onCancel={() => setActiveTab('browse')} />}
      </main>

      <Footer onTabChange={setActiveTab} />
    </div>
  );
}
