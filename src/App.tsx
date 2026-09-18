import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { UploadNotes } from './components/UploadNotes';
import { LandingPage } from './components/LandingPage';
import { INITIAL_NOTES } from './data';
import { Note } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'browse' | 'upload'>('landing');
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('notesvault_notes_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_NOTES;
  });

  useEffect(() => {
    localStorage.setItem('notesvault_notes_v2', JSON.stringify(notes));
  }, [notes]);

  const handlePublish = (newNoteData: Omit<Note, 'id' | 'reviews' | 'rating' | 'author' | 'thumbnailUrl' | 'isPdf' | 'sizeMB' | 'pages'>) => {
    const newNote: Note = {
      ...newNoteData,
      id: Math.random().toString(36).substr(2, 9),
      pages: Math.floor(Math.random() * 50) + 10,
      sizeMB: parseFloat((Math.random() * 15 + 1).toFixed(1)),
      rating: 5.0,
      reviews: 0,
      author: {
        name: 'You (Current User)',
        initials: 'YU',
        badge: 'New Contributor',
        badgeStyle: 'bg-tertiary-fixed text-on-tertiary-fixed'
      },
      thumbnailUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600',
      isPdf: true,
    };

    setNotes([newNote, ...notes]);
    setActiveTab('browse');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface font-body-md text-on-surface antialiased">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-grow pt-16">
        {activeTab === 'landing' && <LandingPage onSelectRoute={setActiveTab} />}
        {activeTab === 'browse' && <Dashboard notes={notes} onUploadClick={() => setActiveTab('upload')} />}
        {activeTab === 'upload' && <UploadNotes onPublish={handlePublish} onCancel={() => setActiveTab('browse')} />}
      </main>

      <Footer onTabChange={setActiveTab} />
    </div>
  );
}
