import React, { useState, useRef } from 'react';
import { Note } from '../types';

interface UploadNotesProps {
  onPublish: (note: Omit<Note, 'id' | 'reviews' | 'rating' | 'author' | 'thumbnailUrl' | 'isPdf' | 'sizeMB' | 'pages' | 'ownerId'>) => void;
  onCancel: () => void;
}

export const UploadNotes: React.FC<UploadNotesProps> = ({ onPublish, onCancel }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
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

  const generateAutoId = (name: string) => {
    const clean = name.trim();
    if (!clean) {
      return `NOTE${Math.floor(100 + Math.random() * 900)}`;
    }
    const words = clean.split(/\s+/);
    let prefix = '';
    if (words.length >= 2) {
      prefix = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
    } else {
      prefix = words[0].slice(0, 3).toUpperCase();
    }
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}${num}`;
  };

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    // If schoolCode is currently empty or resembles a default code, auto-update it
    if (!schoolCode || /^[A-Z]{2,4}\d{3}$/.test(schoolCode)) {
      const words = val.trim().split(/\s+/);
      if (words[0] && words[0].length >= 2) {
        const prefix = words.length >= 2 
          ? words.map(w => w[0]).join('').slice(0, 4).toUpperCase() 
          : words[0].slice(0, 3).toUpperCase();
        setSchoolCode(`${prefix}101`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !grade) return;
    
    // Fallback schoolCode if left empty
    const finalCode = schoolCode.trim() || (schoolName ? generateAutoId(schoolName) : 'NOTE101');
    const finalSchoolName = schoolName.trim() || 'General School Repository';

    onPublish({
      title,
      subject,
      department: 'general',
      grade,
      schoolName: finalSchoolName,
      schoolCode: finalCode.toUpperCase(),
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

          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/20">
            <div className="mb-space-lg">
               <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Upload Notes</h1>
               <p className="font-body-md text-body-md text-on-surface-variant mt-1">Share your study materials and handwritten notes with the school community.</p>
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
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none border border-outline-variant/30 focus:border-primary shadow-sm transition-all" 
                  placeholder="e.g., Mathematics Formula Sheet & Key Concepts" 
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
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none border border-outline-variant/30 focus:border-primary shadow-sm transition-all" 
                  placeholder="e.g., Science, Mathematics, History" 
                  type="text" 
                />
              </div>

              {/* School / College Name */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="school-name">
                  School / College Name <span className="text-error">*</span>
                </label>
                <input 
                  id="school-name" 
                  required 
                  maxLength={100}
                  value={schoolName}
                  onChange={(e) => handleSchoolNameChange(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none border border-outline-variant/30 focus:border-primary shadow-sm transition-all" 
                  placeholder="e.g., BJS School, St. Xavier's High School" 
                  type="text" 
                />
              </div>

              {/* Unique School / Note ID */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="school-code">
                    Unique School / Note ID <span className="text-error">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSchoolCode(generateAutoId(schoolName))}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                    title="Auto generate code like BJS101"
                  >
                    <span className="material-symbols-outlined text-[15px]">autorenew</span>
                    <span>Auto ID</span>
                  </button>
                </div>
                <input 
                  id="school-code" 
                  required 
                  maxLength={20}
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none border border-outline-variant/30 focus:border-primary shadow-sm transition-all uppercase" 
                  placeholder="e.g., BJS101, STX102" 
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
                          ? 'bg-[#164373] text-white font-bold shadow-sm' 
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
                      className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-error-container text-error flex items-center justify-center transition-colors cursor-pointer border-none" 
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
                    className="w-full sm:w-auto px-space-lg py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-center cursor-pointer border-none" 
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!file}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-[#164373] disabled:bg-blue-200 disabled:text-blue-800 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border-none active:scale-95" 
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-[19px]">cloud_upload</span>
                    <span>Publish Note</span>
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
