import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { getLocalFile, triggerUniversalDownload } from '../lib/fileStorage';

interface DashboardProps {
  notes: Note[];
  onUploadClick: () => void;
  onBackToHome?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ notes, onUploadClick, onBackToHome }) => {
  const [activeClass, setActiveClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const classesList = ['all', 'class-5', 'class-6', 'class-7', 'class-8', 'class-9', 'class-10', 'class-11', 'class-12'];

  const filteredNotes = notes.filter(n => {
    const matchesClass = activeClass === 'all' || `class-${n.grade}` === activeClass;
    if (!matchesClass) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      n.title.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      (n.schoolName && n.schoolName.toLowerCase().includes(q)) ||
      (n.schoolCode && n.schoolCode.toLowerCase().includes(q)) ||
      (n.id && n.id.toLowerCase().includes(q)) ||
      n.author.name.toLowerCase().includes(q)
    );
  });

  // Check for exact Unique ID match across all notes
  const exactMatchedNote = searchQuery.trim() 
    ? notes.find(n => 
        (n.schoolCode && n.schoolCode.trim().toLowerCase() === searchQuery.trim().toLowerCase()) ||
        n.id.trim().toLowerCase() === searchQuery.trim().toLowerCase()
      )
    : null;

  const topMatch = exactMatchedNote || (searchQuery.trim() && filteredNotes.length > 0 ? filteredNotes[0] : null);

  const handleDirectDownload = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setDownloadFeedback({
        message: 'Kripya note ki Unique ID (jaise BJS101) ya School Name search box me likhein!',
        type: 'info'
      });
      setTimeout(() => setDownloadFeedback(null), 3500);
      return;
    }

    if (topMatch) {
      handleDownload(topMatch);
      setDownloadFeedback({
        message: `Direct Download started for "${topMatch.title}" (ID: ${topMatch.schoolCode || topMatch.id})!`,
        type: 'success'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    } else {
      setDownloadFeedback({
        message: `ID "${query}" ke sath koi note nahi mila. Kripya Unique ID check karein.`,
        type: 'error'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewNote) {
        setPreviewNote(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewNote]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (note: Note) => {
    try {
      const uniqueCode = note.schoolCode || `NV-${note.id.slice(0, 6).toUpperCase()}`;
      const schoolName = note.schoolName || 'General School Archive';

      // 1. Check local device IndexedDB storage for the actual uploaded file
      const localStored = await getLocalFile(note.id);
      if (localStored && localStored.blob) {
        const ext = localStored.fileName.split('.').pop() || (note.isPdf ? 'pdf' : 'pdf');
        const finalName = localStored.fileName || `${uniqueCode}_${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
        
        triggerUniversalDownload(
          localStored.blob,
          finalName,
          localStored.fileType || 'application/pdf'
        );

        setDownloadFeedback({
          message: `Direct Download started for "${finalName}"!`,
          type: 'success'
        });
        setTimeout(() => setDownloadFeedback(null), 4000);
        return;
      }

      // 2. Check if note has real fileData synced from cloud (Firestore)
      if (note.fileData) {
        const ext = note.fileName ? note.fileName.split('.').pop() : (note.isPdf ? 'pdf' : 'pdf');
        const finalName = note.fileName || `${uniqueCode}_${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
        
        triggerUniversalDownload(
          note.fileData,
          finalName,
          note.fileType || 'application/pdf'
        );

        setDownloadFeedback({
          message: `Direct Download started for "${finalName}"!`,
          type: 'success'
        });
        setTimeout(() => setDownloadFeedback(null), 4000);
        return;
      }

      // 3. Fallback for sample / seed notes: Generate formatted academic text document
      const content = `=====================================================
NOTESVAULT - ACADEMIC STUDY NOTES ARCHIVE
=====================================================
Title:        ${note.title}
School / Org: ${schoolName}
Unique ID:    ${uniqueCode}
Subject:      ${note.subject}
Class/Grade:  Class ${note.grade}
Author:       ${note.author.name}
Verified:     Yes (School Archive Document)
=====================================================

STUDY NOTES & SUMMARY:
-----------------------------------------------------
${note.title}

These notes are officially archived from: ${schoolName}
Unique Reference ID: ${uniqueCode}

[Study Material & Academic Content]
=====================================================`;

      const safeTitle = note.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${uniqueCode}_${safeTitle}.txt`;
      triggerUniversalDownload(content, filename, 'text/plain;charset=utf-8');

      setDownloadFeedback({
        message: `Download started for "${filename}"!`,
        type: 'success'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    } catch (err) {
      console.error("Download error:", err);
      setDownloadFeedback({
        message: 'Download shuru karne me samasya aayi. Kripya punah koshish karein.',
        type: 'error'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-7xl mx-auto px-margin w-full py-space-xl">
        {/* Navigation Breadcrumb / Back button */}
        {onBackToHome && (
          <div className="mb-space-md">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-label-md text-label-md px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer border border-outline-variant/30"
              title="Go back to Home page"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* PROMINENT DIRECT SEARCH & DOWNLOAD BY UNIQUE ID SECTION */}
        <div className="mb-space-lg bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-4 sm:p-6 rounded-2xl border border-blue-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#164373] text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[20px]">search_check</span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0b2545] leading-tight">
                  Search & Direct Download by Unique ID
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Notes ki Unique ID (jaise <span className="font-mono font-bold text-blue-700 bg-blue-100/90 px-1 py-0.5 rounded">BJS101</span>) ya School Name dalke direct search & download karein.
                </p>
              </div>
            </div>
          </div>

          {/* Search Input Form with Direct Download Button */}
          <form onSubmit={handleDirectDownload} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600 text-[20px]">
                tag
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Unique ID (e.g. BJS101) or School Name..."
                className="w-full pl-10 pr-10 py-3 bg-white text-on-surface rounded-xl border border-blue-300 focus:border-[#164373] focus:ring-2 focus:ring-blue-100 focus:outline-none shadow-xs text-sm sm:text-base font-medium transition-all placeholder:text-slate-400 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer p-1"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#164373] hover:bg-[#0b2545] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer border-none"
                title="Search and directly download matched note"
              >
                <span className="material-symbols-outlined text-[19px]">download</span>
                <span>Direct Download</span>
              </button>
            </div>
          </form>

          {/* Toast / Notification feedback message */}
          {downloadFeedback && (
            <div className={`mt-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
              downloadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : downloadFeedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {downloadFeedback.type === 'success' ? 'check_circle' : downloadFeedback.type === 'error' ? 'error' : 'info'}
              </span>
              <span>{downloadFeedback.message}</span>
            </div>
          )}

          {/* Quick Matched Note Card when user has typed an ID / query */}
          {searchQuery.trim() && topMatch && (
            <div className="mt-3.5 p-3.5 bg-white rounded-xl border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">description</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {topMatch.schoolCode && (
                      <span className="bg-blue-600 text-white font-mono text-xs font-black px-2 py-0.5 rounded shadow-2xs tracking-wider">
                        {topMatch.schoolCode}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Class {topMatch.grade} • {topMatch.subject}
                    </span>
                    <span className="text-xs text-blue-900 font-semibold truncate">
                      {topMatch.schoolName || 'School Archive'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#0b2545] mt-1 truncate">
                    {topMatch.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setPreviewNote(topMatch)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-200 transition-colors"
                >
                  View Info
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(topMatch)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#164373] hover:bg-[#0b2545] text-white cursor-pointer border-none shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Class Filter & Controls */}
        <div className="flex flex-col gap-space-sm mb-space-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">layers</span>
              <span className="font-title-md text-title-md text-on-surface">Filter by Class</span>
            </div>
            <span className="font-caption text-caption text-outline">Click to view class notes</span>
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto pb-2 scrollbar-none">
            {classesList.map(cls => {
              const isActive = activeClass === cls;
              const label = cls === 'all' ? 'All Classes' : `Class ${cls.split('-')[1]}`;
              return (
                <button 
                  key={cls}
                  onClick={() => setActiveClass(cls)}
                  className={`px-space-md py-space-xs rounded-full font-label-md text-label-md flex items-center gap-space-xs whitespace-nowrap transition-all cursor-pointer ${
                    isActive ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm mb-space-md bg-surface-container-lowest p-space-sm rounded-xl shadow-xs">
          <span>
            Showing <strong className="text-on-surface">{filteredNotes.length}</strong> notes
            {searchQuery && <span> matching "<span className="text-primary font-semibold">{searchQuery}</span>"</span>}
          </span>
          <button 
            onClick={onUploadClick}
            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer border-none bg-transparent"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add New Note</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-space-xl">
          {filteredNotes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-space-4xl text-center bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-space-md">folder_open</span>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">No notes found</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-space-lg">
                {searchQuery 
                  ? `No study notes matched "${searchQuery}". Try searching by School Name, Unique ID (e.g. BJS101) or clearing filter.` 
                  : 'There are no notes available for this class yet.'}
              </p>
              {searchQuery ? (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md py-space-sm px-space-lg rounded-lg cursor-pointer border-none"
                >
                  Clear Search
                </button>
              ) : (
                <button 
                  onClick={onUploadClick}
                  className="bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md py-space-sm px-space-lg rounded-lg flex items-center justify-center gap-space-xs transition-colors cursor-pointer border-none"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Upload a Note</span>
                </button>
              )}
            </div>
          )}

          {filteredNotes.map(note => (
            <article key={note.id} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-outline-variant/20">
              <div>
                <div className="flex items-center justify-between mb-space-sm gap-2">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold px-space-sm py-0.5 rounded-full">
                      Class {note.grade}
                    </span>
                    <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium px-space-sm py-0.5 rounded-full">
                      {note.subject}
                    </span>
                  </div>

                  {/* Unique ID Badge */}
                  {note.schoolCode && (
                    <span className="bg-blue-100 text-blue-900 border border-blue-200/90 font-mono text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs tracking-wider" title="Unique School & Note Identifier">
                      <span className="material-symbols-outlined text-[12px] text-blue-700">tag</span>
                      <span>{note.schoolCode}</span>
                    </span>
                  )}
                </div>

                {/* School Name Tag */}
                <div className="flex items-center gap-1.5 text-xs text-blue-900 font-semibold mb-2.5 bg-blue-50/90 px-2.5 py-1 rounded-lg border border-blue-100/90 w-fit max-w-full">
                  <span className="material-symbols-outlined text-[15px] text-blue-700 shrink-0">school</span>
                  <span className="truncate">{note.schoolName || 'School Archive'}</span>
                </div>
                
                <h2 className="font-title-md text-title-md text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-space-xs">
                  {note.title}
                </h2>
                
                <div className="flex items-center gap-space-sm py-space-xs mb-space-md">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-label-sm text-label-sm font-bold">
                    {note.author.initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-1">
                      {note.author.name}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pt-space-md mt-auto bg-surface-container-low/30 -mx-space-lg -mb-space-lg p-space-md rounded-b-xl border-t border-outline-variant/20">
                <div className="grid grid-cols-2 gap-space-sm">
                  <button 
                    onClick={() => setPreviewNote(note)}
                    className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md py-2 px-space-sm rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer border-none"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View Info</span>
                  </button>
                  <button 
                    onClick={() => handleDownload(note)}
                    className="bg-[#164373] hover:bg-[#0b2545] text-white font-bold text-xs sm:text-sm py-2 px-space-sm rounded-lg flex items-center justify-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer group border-none active:scale-95"
                    title="Download Note PDF / TXT"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {previewNote && (
        <div 
          className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-space-md"
          onClick={() => setPreviewNote(null)}
        >
          <div 
            className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-2xl flex flex-col gap-space-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewNote(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer border-none"
              title="Close (वापस जाएं)"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            
            <div className="flex flex-col gap-1 pr-8">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {previewNote.title}
              </h3>
            </div>
            
            {/* School & Unique Verification Badge Box */}
            <div className="bg-surface-container-low/60 rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">School / College</span>
                    <span className="font-bold text-on-surface text-sm sm:text-base truncate">
                      {previewNote.schoolName || 'General School Repository'}
                    </span>
                  </div>
                </div>

                {previewNote.schoolCode && (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/90 px-2.5 py-1.5 rounded-lg shrink-0">
                    <span className="font-mono font-black text-blue-900 text-xs sm:text-sm tracking-wider">
                      {previewNote.schoolCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(previewNote.schoolCode!)}
                      className="text-blue-700 hover:text-blue-900 p-0.5 rounded cursor-pointer border-none bg-transparent flex items-center transition-colors"
                      title="Copy Unique ID (e.g., BJS101)"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedId === previewNote.schoolCode ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-outline block mb-0.5 font-medium">Subject</span>
                  <span className="font-semibold text-on-surface text-sm">{previewNote.subject}</span>
                </div>
                <div>
                  <span className="text-outline block mb-0.5 font-medium">Class / Grade</span>
                  <span className="font-semibold text-on-surface text-sm">Class {previewNote.grade}</span>
                </div>
                <div>
                  <span className="text-outline block mb-0.5 font-medium">Author / Contributor</span>
                  <span className="font-semibold text-on-surface text-sm">{previewNote.author.name}</span>
                </div>
                <div>
                  <span className="text-outline block mb-0.5 font-medium">Verification Status</span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 text-xs">
                    <span className="material-symbols-outlined text-[15px]">verified</span>
                    <span>Verified Material</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end pt-space-md mt-space-sm border-t border-outline-variant/20">
              <div className="flex gap-space-sm">
                <button 
                  onClick={() => setPreviewNote(null)}
                  className="px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg cursor-pointer transition-colors border-none"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleDownload(previewNote)}
                  className="px-space-lg py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center gap-space-xs transition-colors cursor-pointer border-none font-bold"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Download File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
