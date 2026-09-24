import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Note, StudentUser, EducationLevel } from '../types';
import { 
  EDUCATION_CATEGORIES, 
  SCHOOL_CLASSES, 
  COLLEGE_SEMESTERS, 
  COACHING_STREAMS 
} from '../lib/educationLevels';

export interface UploadNotePayload {
  title: string;
  subject: string;
  department: string;
  educationLevel?: EducationLevel;
  grade: number;
  semester?: number;
  coachingStream?: string;
  academicLevelLabel?: string;
  schoolName: string;
  schoolCode: string;
  authorName?: string;
  file?: File | null;
}

interface UploadNotesProps {
  onPublish: (payload: UploadNotePayload) => Promise<void> | void;
  onCancel: () => void;
  user?: User | null;
  student?: StudentUser | null;
}

export const UploadNotes: React.FC<UploadNotesProps> = ({ 
  onPublish, 
  onCancel,
  user,
  student,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [authorName, setAuthorName] = useState(() => {
    return student?.name || user?.displayName || user?.email?.split('@')[0] || '';
  });
  const [schoolName, setSchoolName] = useState(() => student?.schoolName || '');
  const [schoolCode, setSchoolCode] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(() => {
    return student?.educationLevel || 'school';
  });
  const [schoolClassInput, setSchoolClassInput] = useState<string>(() => String(student?.grade || 10));
  const [collegeSemInput, setCollegeSemInput] = useState<string>(() => String(student?.semester || 1));
  const [coachingStreamInput, setCoachingStreamInput] = useState<string>(() => student?.coachingStream || 'JEE / NEET');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schoolClassInputRef = useRef<HTMLInputElement>(null);
  const collegeSemInputRef = useRef<HTMLInputElement>(null);
  const coachingStreamInputRef = useRef<HTMLInputElement>(null);

  const handleSelectCategory = (catId: EducationLevel) => {
    setEducationLevel(catId);
    setTimeout(() => {
      if (catId === 'school' && schoolClassInputRef.current) {
        schoolClassInputRef.current.focus();
        schoolClassInputRef.current.select();
      } else if (catId === 'college' && collegeSemInputRef.current) {
        collegeSemInputRef.current.focus();
        collegeSemInputRef.current.select();
      } else if (catId === 'coaching' && coachingStreamInputRef.current) {
        coachingStreamInputRef.current.focus();
        coachingStreamInputRef.current.select();
      }
    }, 50);
  };

  // Auto-sync student details when student or user state is ready
  useEffect(() => {
    if (student) {
      if (!authorName) setAuthorName(student.name);
      if (!schoolName && student.schoolName) setSchoolName(student.schoolName);
      if (student.educationLevel) setEducationLevel(student.educationLevel);
      if (student.grade) setSchoolClassInput(String(student.grade));
      if (student.semester) setCollegeSemInput(String(student.semester));
      if (student.coachingStream) setCoachingStreamInput(student.coachingStream);
      if (student.academicLevelLabel) {
        if (student.educationLevel === 'school') setSchoolClassInput(student.academicLevelLabel.replace(/^Class\s*/i, ''));
        if (student.educationLevel === 'college') setCollegeSemInput(student.academicLevelLabel.replace(/^Semester\s*/i, '').replace(/^Sem\s*/i, ''));
        if (student.educationLevel === 'coaching') setCoachingStreamInput(student.academicLevelLabel);
      }
    } else if (user && !authorName) {
      setAuthorName(user.displayName || user.email?.split('@')[0] || '');
    }
  }, [student, user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !file) return;
    
    setIsUploading(true);
    try {
      // Fallback schoolCode if left empty
      const finalCode = schoolCode.trim() || (schoolName ? generateAutoId(schoolName) : 'NOTE101');
      const defaultInstName = educationLevel === 'college' 
        ? 'University / College Archive' 
        : (educationLevel === 'coaching' ? 'Competitive Exam Archive' : 'School Study Repository');
      const finalSchoolName = schoolName.trim() || defaultInstName;

      let academicLevelLabel = '';
      let finalGrade = 10;
      let finalSemester: number | undefined = undefined;
      let finalCoachingStream: string | undefined = undefined;

      if (educationLevel === 'college') {
        const typedSem = collegeSemInput.trim();
        const numSem = parseInt(typedSem.replace(/\D/g, ''), 10);
        finalSemester = !isNaN(numSem) ? numSem : undefined;
        finalGrade = finalSemester || 1;
        academicLevelLabel = typedSem ? (typedSem.toLowerCase().includes('sem') ? typedSem : `Semester ${typedSem}`) : 'College';
      } else if (educationLevel === 'coaching') {
        const typedStream = coachingStreamInput.trim() || 'Competitive Coaching';
        finalCoachingStream = typedStream;
        finalGrade = 0;
        academicLevelLabel = typedStream;
      } else {
        const typedClass = schoolClassInput.trim();
        const numClass = parseInt(typedClass.replace(/\D/g, ''), 10);
        finalGrade = !isNaN(numClass) ? numClass : 10;
        academicLevelLabel = typedClass ? (typedClass.toLowerCase().includes('class') ? typedClass : `Class ${typedClass}`) : 'School';
      }

      await onPublish({
        title,
        subject,
        department: educationLevel,
        educationLevel,
        grade: finalGrade,
        semester: finalSemester,
        coachingStream: finalCoachingStream,
        academicLevelLabel,
        schoolName: finalSchoolName,
        schoolCode: finalCode.toUpperCase(),
        authorName: authorName.trim() || 'Student Contributor',
        file,
      });
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden bg-surface py-space-xl">
        <div className="max-w-3xl mx-auto px-margin">
          <div className="mb-space-lg flex items-center justify-between">
            <button onClick={onCancel} className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors group cursor-pointer bg-transparent border-none">
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              <span>Back</span>
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/20">
            <div className="mb-space-lg">
               <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">Upload Notes</h1>
               <p className="font-body-md text-body-md text-on-surface-variant mt-1">Share your study materials and handwritten notes with the school community.</p>

               {/* Auth Status Banner */}
               {user && (
                 <div className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                   <div className="flex items-center gap-2.5">
                     {user.photoURL ? (
                       <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-emerald-300" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                         {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                       </div>
                     )}
                     <div>
                       <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                         <span>Signed in as {user.displayName || user.email}</span>
                         <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                       </div>
                       <div className="text-[11px] text-emerald-700">This note will be linked to your student account.</div>
                     </div>
                   </div>
                 </div>
               )}
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

              {/* School / College / Coaching Academy Name */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="school-name">
                  {educationLevel === 'college' 
                    ? 'College / University Name' 
                    : (educationLevel === 'coaching' ? 'Coaching Institute / Academy Name' : 'School / Board Name')} <span className="text-error">*</span>
                </label>
                <input 
                  id="school-name" 
                  required 
                  maxLength={100}
                  value={schoolName}
                  onChange={(e) => handleSchoolNameChange(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none border border-outline-variant/30 focus:border-primary shadow-sm transition-all" 
                  placeholder={
                    educationLevel === 'college'
                      ? 'e.g., MIT, IIT Bombay, Delhi University, Anna University, VIT'
                      : (educationLevel === 'coaching'
                        ? 'e.g., Allen Career Institute, Drishti IAS, Resonance, Physics Wallah'
                        : "e.g., DPS R.K. Puram, St. Xavier's High School, Kendriya Vidyalaya")
                  } 
                  type="text" 
                />
              </div>

              {/* Unique School / Note ID */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="school-code">
                    {educationLevel === 'college' ? 'Course / Subject Code' : (educationLevel === 'coaching' ? 'Batch / Exam Code' : 'School / Note Code')} <span className="text-error">*</span>
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
                  placeholder={educationLevel === 'college' ? 'e.g., CS301, ME402' : 'e.g., BJS101, STX102'} 
                  type="text" 
                />
              </div>

              {/* Author / Contributor Name */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="author-name">
                  Author / Contributor Name <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                </label>
                <input 
                  id="author-name" 
                  maxLength={50}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline/70 px-space-md py-space-sm rounded-lg focus:bg-surface-container-lowest focus:outline-none border border-outline-variant/30 focus:border-primary shadow-sm transition-all" 
                  placeholder="e.g., Ayush Ahir, Rahul Sharma (Default: Student Contributor)" 
                  type="text" 
                />
              </div>

              {/* Education Category Selection (School, College Semester 1-8, Coaching) */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface font-bold">
                    Target Education Category <span className="text-error">*</span>
                  </label>
                  <span className="text-xs text-slate-500">School, College or Coaching</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {EDUCATION_CATEGORIES.map(cat => {
                    const isSelected = educationLevel === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`p-3 rounded-xl text-left transition-all cursor-pointer border flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                            {cat.icon}
                          </span>
                          <span className={`text-xs font-black ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                            {cat.shortLabel}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {cat.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Level / Semester / Stream Typeable Input based on Category */}
              {educationLevel === 'school' && (
                <div className="flex flex-col gap-space-xs p-4 bg-blue-50/40 rounded-xl border border-blue-200/80">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5" htmlFor="school-class-input">
                      <span className="material-symbols-outlined text-[18px] text-blue-600">edit_note</span>
                      <span>Type School Class / Standard <span className="text-error">*</span></span>
                    </label>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-300">
                      Class: {schoolClassInput || 'Not specified'}
                    </span>
                  </div>
                  <input
                    ref={schoolClassInputRef}
                    id="school-class-input"
                    type="text"
                    required
                    value={schoolClassInput}
                    onChange={(e) => setSchoolClassInput(e.target.value)}
                    placeholder="Type your class (e.g., Class 10, 12th PCM, 9th Standard, Class 11 Biology)"
                    className="w-full bg-white text-on-surface font-body-md text-body-md px-3.5 py-2.5 rounded-lg border-2 border-blue-300 focus:border-blue-600 focus:outline-none shadow-xs transition-all font-semibold"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">Quick suggestions:</span>
                    {SCHOOL_CLASSES.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSchoolClassInput(String(g))}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                          schoolClassInput === String(g) || schoolClassInput === `Class ${g}`
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                        }`}
                      >
                        Class {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {educationLevel === 'college' && (
                <div className="flex flex-col gap-space-xs p-4 bg-indigo-50/40 rounded-xl border border-indigo-200/80">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5" htmlFor="college-sem-input">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600">edit_note</span>
                      <span>Type College Semester & Degree Course <span className="text-error">*</span></span>
                    </label>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/90 px-2.5 py-0.5 rounded-full border border-indigo-300">
                      Semester: {collegeSemInput || 'Not specified'}
                    </span>
                  </div>
                  <input
                    ref={collegeSemInputRef}
                    id="college-sem-input"
                    type="text"
                    required
                    value={collegeSemInput}
                    onChange={(e) => setCollegeSemInput(e.target.value)}
                    placeholder="Type your semester / branch (e.g., Sem 4 B.Tech CSE, 3rd Sem BCA, 5th Sem B.Com)"
                    className="w-full bg-white text-on-surface font-body-md text-body-md px-3.5 py-2.5 rounded-lg border-2 border-indigo-300 focus:border-indigo-600 focus:outline-none shadow-xs transition-all font-semibold"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">Quick suggestions:</span>
                    {COLLEGE_SEMESTERS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCollegeSemInput(String(s))}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                          collegeSemInput === String(s) || collegeSemInput === `Sem ${s}` || collegeSemInput === `Semester ${s}`
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                        }`}
                      >
                        Sem {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {educationLevel === 'coaching' && (
                <div className="flex flex-col gap-space-xs p-4 bg-amber-50/40 rounded-xl border border-amber-200/80">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5" htmlFor="coaching-stream-input">
                      <span className="material-symbols-outlined text-[18px] text-amber-600">edit_note</span>
                      <span>Type Coaching Exam / Target Subject <span className="text-error">*</span></span>
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 line-clamp-1 max-w-[200px]">
                      {coachingStreamInput || 'Not specified'}
                    </span>
                  </div>
                  <input
                    ref={coachingStreamInputRef}
                    id="coaching-stream-input"
                    type="text"
                    required
                    value={coachingStreamInput}
                    onChange={(e) => setCoachingStreamInput(e.target.value)}
                    placeholder="Type exam or coaching subject (e.g., JEE Advanced Physics, NEET Biology, UPSC Prelims, SSC CGL Maths)"
                    className="w-full bg-white text-on-surface font-body-md text-body-md px-3.5 py-2.5 rounded-lg border-2 border-amber-300 focus:border-amber-600 focus:outline-none shadow-xs transition-all font-semibold"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">Quick suggestions:</span>
                    {COACHING_STREAMS.slice(0, 5).map(stream => (
                      <button
                        key={stream}
                        type="button"
                        onClick={() => setCoachingStreamInput(stream)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                          coachingStreamInput === stream
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        {stream}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm text-slate-700 bg-white hover:bg-slate-100 transition-colors text-center cursor-pointer border border-slate-300 shadow-2xs" 
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={!file || isUploading}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-none active:scale-95" 
                    type="submit"
                  >
                    <span className={`material-symbols-outlined text-[19px] ${isUploading ? 'animate-spin' : ''}`}>
                      {isUploading ? 'sync' : 'cloud_upload'}
                    </span>
                    <span>{isUploading ? 'Uploading & Saving File...' : 'Publish Note'}</span>
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
