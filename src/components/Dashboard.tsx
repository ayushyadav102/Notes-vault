import React, { useState } from 'react';
import { Note } from '../types';

interface DashboardProps {
  notes: Note[];
  onUploadClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ notes, onUploadClick }) => {
  const [activeClass, setActiveClass] = useState<string>('all');
  const [previewNote, setPreviewNote] = useState<Note | null>(null);

  const classesList = ['all', 'class-5', 'class-6', 'class-7', 'class-8', 'class-9', 'class-10', 'class-11', 'class-12'];

  const filteredNotes = activeClass === 'all' 
    ? notes 
    : notes.filter(n => `class-${n.grade}` === activeClass);

  const handleDownload = (note: Note) => {
    // Generate a dummy text file to act as the "download" file
    const content = `Title: ${note.title}\nSubject: ${note.subject}\nClass: ${note.grade}\n\nThis is a placeholder for the local storage downloaded notes.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="max-w-7xl mx-auto px-margin w-full py-space-xl">
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

        <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm mb-space-md bg-surface-container-lowest p-space-sm rounded-xl shadow-xs">
          <span>Showing <strong className="text-on-surface">{filteredNotes.length}</strong> items</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-space-xl">
          {filteredNotes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-space-4xl text-center bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-space-md">folder_open</span>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">No notes found</h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-space-lg">
                There are no notes available for this class yet.
              </p>
              <button 
                onClick={onUploadClick}
                className="bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md py-space-sm px-space-lg rounded-lg flex items-center justify-center gap-space-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Upload a Note</span>
              </button>
            </div>
          )}

          {filteredNotes.map(note => (
            <article key={note.id} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-space-xs">
                    <span className="bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold px-space-sm py-0.5 rounded-full">
                      Class {note.grade}
                    </span>
                    <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium px-space-sm py-0.5 rounded-full">
                      {note.subject}
                    </span>
                  </div>
                </div>
                
                <h2 className="font-title-md text-title-md text-on-surface font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-space-xs">
                  {note.title}
                </h2>
                
                <div className="flex items-center gap-space-sm py-space-xs mb-space-md">
                  <div className={`w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-label-sm text-label-sm font-bold`}>
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
                    className="bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md py-2 px-space-sm rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View Info</span>
                  </button>
                  <button 
                    onClick={() => handleDownload(note)}
                    className="bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md py-2 px-space-sm rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer group"
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
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-space-md">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-2xl flex flex-col gap-space-md relative">
            <button 
              onClick={() => setPreviewNote(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold pr-8">
              {previewNote.title}
            </h3>
            
            <div className="flex flex-col gap-space-xs font-body-sm text-on-surface-variant">
               <p><strong>Subject:</strong> {previewNote.subject}</p>
               <p><strong>Class:</strong> {previewNote.grade}</p>
               <p><strong>Author:</strong> {previewNote.author.name}</p>
            </div>
            
            <div className="flex items-center justify-end pt-space-md mt-space-sm border-t border-outline-variant/20">
              <div className="flex gap-space-sm">
                <button 
                  onClick={() => setPreviewNote(null)}
                  className="px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleDownload(previewNote)}
                  className="px-space-lg py-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center gap-space-xs transition-colors cursor-pointer"
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
