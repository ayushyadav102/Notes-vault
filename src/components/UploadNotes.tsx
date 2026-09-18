import React, { useState, useRef } from 'react';
import { Note } from '../types';

interface UploadNotesProps {
  onPublish: (note: Omit<Note, 'id' | 'reviews' | 'rating' | 'author' | 'thumbnailUrl' | 'isPdf' | 'sizeMB' | 'pages'>) => void;
  onCancel: () => void;
}

export const UploadNotes: React.FC<UploadNotesProps> = ({ onPublish, onCancel }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<number>(5);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradesList = [5, 6, 7, 8, 9, 10, 11, 12];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !grade) return;
    
    onPublish({
      title,
      subject,
      department: 'general',
      grade,
    });
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden bg-surface py-space-xl">
        <div className="max-w-3xl mx-auto px-margin">
          <div className="mb-space-lg flex items-center justify-between">
            <button onClick={onCancel} className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors group cursor-pointer bg-transparent border-none">
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              <span>Back to Library</span>
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm">
            <div className="mb-space-lg">
               <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Upload Notes</h1>
               <p className="font-body-md text-body-md text-on-surface-variant mt-1">Share your study materials with the school.</p>
            </div>

            <form className="flex flex-col gap-space-lg" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="note-title">
                  Note Title <span className="text-error">*</span>
                </label>
                <input 
                  id="note-title" 
                  required 
                  maxLength={90}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none shadow-sm transition-all" 
                  placeholder="e.g., Mathematics Formula Sheet" 
                  type="text" 
                />
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="subject-name">
                  Subject / Course <span className="text-error">*</span>
                </label>
                <input 
                  id="subject-name" 
                  required 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none shadow-sm transition-all" 
                  placeholder="e.g., Math" 
                  type="text" 
                />
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface">
                  Class <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-space-xs">
                  {gradesList.map(g => (
                    <button 
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`py-space-xs px-space-xs rounded-lg text-center font-label-md text-label-md transition-all cursor-pointer ${
                        grade === g 
                          ? 'bg-primary-container text-on-primary shadow-sm' 
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      Class {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface">
                  Document File <span className="text-error">*</span>
                </label>
                <div 
                  className="group relative bg-surface-container-lowest rounded-xl p-space-xl flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden" 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="absolute inset-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low/50 -z-0"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary mb-space-sm group-hover:scale-105 transition-transform shadow-sm">
                      <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                    </div>
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                      Drag & drop your file here or <span className="text-primary underline underline-offset-4">browse</span>
                    </h3>
                  </div>
                  <input 
                    className="sr-only" 
                    ref={fileInputRef} 
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFile(e.target.files[0]);
                      }
                      e.target.value = '';
                    }} 
                    type="file" 
                  />
                </div>
                
                {file && (
                  <div className="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between shadow-sm mt-space-xs">
                    <div className="flex items-center gap-space-md min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center flex-shrink-0 font-label-sm text-label-sm font-bold shadow-sm uppercase">
                        {file.name.split('.').pop()?.slice(0, 3) || 'DOC'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-md text-title-md text-on-surface font-semibold truncate max-w-[280px] sm:max-w-md">{file.name}</span>
                        <span className="font-caption text-caption text-on-surface-variant mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-error-container text-error flex items-center justify-center transition-colors cursor-pointer" 
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-end gap-space-md mt-space-md">
                <div className="flex items-center gap-space-sm w-full sm:w-auto">
                  <button 
                    onClick={onCancel}
                    className="w-full sm:w-auto px-space-lg py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors text-center cursor-pointer" 
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!file}
                    className="w-full sm:w-auto px-space-xl py-space-sm rounded-lg font-label-md text-label-md text-on-primary bg-primary-container hover:bg-primary shadow-sm hover:shadow transition-all flex items-center justify-center gap-space-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    <span>Publish</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
