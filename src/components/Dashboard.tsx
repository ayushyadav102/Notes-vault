import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Note, StudentUser } from '../types';
import { getLocalFile, triggerUniversalDownload, storeLocalFile, fileToDataUrl, deleteLocalFile, saveFileToFirestoreChunks, getFileFromFirestoreChunks, deleteFileChunksFromFirestore, generateSubjectStudyPdf } from '../lib/fileStorage';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, deleteDoc, updateDoc, serverTimestamp, collection, addDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { 
  EducationLevel, 
  EDUCATION_CATEGORIES, 
  SCHOOL_CLASSES, 
  COLLEGE_SEMESTERS, 
  COACHING_STREAMS,
  getAcademicLevelLabel
} from '../lib/educationLevels';

interface DashboardProps {
  notes: Note[];
  onUploadClick: () => void;
  onBackToHome?: () => void;
  user: User | null;
  student?: StudentUser | null;
  initialFilterMyNotes?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  notes, 
  onUploadClick, 
  onBackToHome,
  user,
  student,
  initialFilterMyNotes = false,
}) => {
  const [educationCategory, setEducationCategory] = useState<'all' | EducationLevel>('all');
  const [activeLevel, setActiveLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewNote, setPreviewNote] = useState<Note | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'mine' | 'bookmarks'>(initialFilterMyNotes ? 'mine' : 'all');

  // Bookmarks synced with user profile and localStorage
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('notesvault_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (initialFilterMyNotes) {
      setViewFilter('mine');
    }
  }, [initialFilterMyNotes]);

  // Sync user bookmarks from Firestore 'users' collection
  useEffect(() => {
    if (!user) return;
    const loadBookmarks = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && Array.isArray(userSnap.data()?.bookmarks)) {
          setBookmarks(userSnap.data().bookmarks);
          localStorage.setItem('notesvault_bookmarks', JSON.stringify(userSnap.data().bookmarks));
        }
      } catch (err) {
        console.warn("Could not load bookmarks from Firestore:", err);
      }
    };
    loadBookmarks();
  }, [user]);

  const toggleBookmark = async (noteId: string) => {
    const isSaved = bookmarks.includes(noteId);
    const updated = isSaved ? bookmarks.filter(id => id !== noteId) : [...bookmarks, noteId];
    setBookmarks(updated);
    localStorage.setItem('notesvault_bookmarks', JSON.stringify(updated));

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          bookmarks: isSaved ? arrayRemove(noteId) : arrayUnion(noteId)
        });
      } catch (err) {
        console.warn("Could not update bookmark in Firestore:", err);
      }
    }
  };

  // Edit Note State
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editSchoolName, setEditSchoolName] = useState<string>('');
  const [editSchoolCode, setEditSchoolCode] = useState<string>('');
  const [editEducationLevel, setEditEducationLevel] = useState<EducationLevel>('school');
  const [editSchoolClassInput, setEditSchoolClassInput] = useState<string>('10');
  const [editCollegeSemInput, setEditCollegeSemInput] = useState<string>('1');
  const [editCoachingStreamInput, setEditCoachingStreamInput] = useState<string>('JEE / NEET');
  const [editAuthorName, setEditAuthorName] = useState<string>('');
  const [editNewFile, setEditNewFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Delete Note State
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const generateAutoId = (name: string): string => {
    if (!name.trim()) return `NOTE${Math.floor(100 + Math.random() * 900)}`;
    const words = name.trim().split(/\s+/).filter(Boolean);
    let code = '';
    if (words.length === 1) {
      code = words[0].slice(0, 3).toUpperCase();
    } else {
      code = words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
    }
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${code}${randomNum}`;
  };

  const handleStartEdit = (note: Note) => {
    if (!isMyNote(note)) {
      setDownloadFeedback({
        message: 'You can only edit notes uploaded by you.',
        type: 'error'
      });
      setTimeout(() => setDownloadFeedback(null), 3500);
      return;
    }
    setEditingNote(note);
    setEditTitle(note.title);
    setEditSubject(note.subject);
    setEditSchoolName(note.schoolName || '');
    setEditSchoolCode(note.schoolCode || '');
    const edLevel = note.educationLevel || (note.semester ? 'college' : (note.coachingStream ? 'coaching' : 'school'));
    setEditEducationLevel(edLevel);
    
    // Class / Sem / Coaching typeable defaults
    const initialClass = note.academicLevelLabel 
      ? note.academicLevelLabel.replace(/^Class\s*/i, '')
      : String(note.grade || 10);
    setEditSchoolClassInput(initialClass);

    const initialSem = note.semester
      ? String(note.semester)
      : (note.academicLevelLabel ? note.academicLevelLabel.replace(/^Semester\s*/i, '').replace(/^Sem\s*/i, '') : String(note.grade && note.grade <= 8 ? note.grade : 1));
    setEditCollegeSemInput(initialSem);

    setEditCoachingStreamInput(note.coachingStream || note.academicLevelLabel || 'JEE / NEET');
    setEditAuthorName(note.author?.name || '');
    setEditNewFile(null);
  };

  const handleDeleteNote = async (note: Note) => {
    if (!isMyNote(note)) {
      setDownloadFeedback({
        message: 'You cannot delete notes uploaded by other students.',
        type: 'error'
      });
      setTimeout(() => setDownloadFeedback(null), 3500);
      setDeletingNote(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'notes', note.id));
      await deleteFileChunksFromFirestore(db, note.id);
      await deleteLocalFile(note.id);
      setDeletingNote(null);
      if (previewNote?.id === note.id) {
        setPreviewNote(null);
      }
      setDownloadFeedback({
        message: `Note "${note.title}" has been permanently deleted from Firebase!`,
        type: 'success'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    } catch (error) {
      console.error("Delete note error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'notes');
      setDownloadFeedback({
        message: 'Failed to delete note. Please try again.',
        type: 'error'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;
    setIsSavingEdit(true);

    try {
      const noteRef = doc(db, 'notes', editingNote.id);
      const newAuthorName = editAuthorName.trim() || editingNote.author?.name || 'Student Contributor';
      const initials = newAuthorName.substring(0, 2).toUpperCase() || 'ST';

      let levelLabel = '';
      let finalGrade = 10;
      let finalSemester: number | null = null;
      let finalCoachingStream: string | null = null;

      if (editEducationLevel === 'college') {
        const typedSem = editCollegeSemInput.trim();
        const numSem = parseInt(typedSem.replace(/\D/g, ''), 10);
        finalSemester = !isNaN(numSem) ? numSem : null;
        finalGrade = finalSemester || 1;
        levelLabel = typedSem ? (typedSem.toLowerCase().includes('sem') ? typedSem : `Semester ${typedSem}`) : 'College';
      } else if (editEducationLevel === 'coaching') {
        const typedStream = editCoachingStreamInput.trim() || 'Competitive Coaching';
        finalCoachingStream = typedStream;
        finalGrade = 0;
        levelLabel = typedStream;
      } else {
        const typedClass = editSchoolClassInput.trim();
        const numClass = parseInt(typedClass.replace(/\D/g, ''), 10);
        finalGrade = !isNaN(numClass) ? numClass : 10;
        levelLabel = typedClass ? (typedClass.toLowerCase().includes('class') ? typedClass : `Class ${typedClass}`) : 'School';
      }

      let updatePayload: Record<string, any> = {
        title: editTitle.trim() || editingNote.title,
        subject: editSubject.trim() || editingNote.subject,
        educationLevel: editEducationLevel,
        grade: finalGrade,
        semester: finalSemester,
        coachingStream: finalCoachingStream,
        academicLevelLabel: levelLabel,
        schoolName: editSchoolName.trim() || editingNote.schoolName || (editEducationLevel === 'college' ? 'University / College Archive' : 'General Study Repository'),
        schoolCode: (editSchoolCode.trim() || editingNote.schoolCode || 'NOTE101').toUpperCase(),
        author: {
          ...editingNote.author,
          name: newAuthorName,
          initials: initials,
          badge: `${levelLabel} Contributor`,
        },
        updatedAt: serverTimestamp(),
      };

      if (editNewFile) {
        // Store into local IndexedDB for fast local retrieval
        await storeLocalFile(editingNote.id, editNewFile, editNewFile.name, editNewFile.type);

        // Convert to data url for direct Firebase cloud storage
        const dataUrl = await fileToDataUrl(editNewFile);
        const isPdf = editNewFile.name.toLowerCase().endsWith('.pdf') || editNewFile.type === 'application/pdf';
        const sizeMB = parseFloat((editNewFile.size / (1024 * 1024)).toFixed(2));
        const pages = Math.max(1, Math.round(sizeMB * 8) || editingNote.pages || 12);

        // Save chunks to Firestore
        let totalChunks = 0;
        try {
          totalChunks = await saveFileToFirestoreChunks(db, editingNote.id, dataUrl);
        } catch (chunkErr) {
          console.warn("Could not save file chunks to Firestore:", chunkErr);
        }

        updatePayload = {
          ...updatePayload,
          fileName: editNewFile.name,
          fileType: editNewFile.type || 'application/pdf',
          isPdf,
          sizeMB,
          pages,
          hasChunks: totalChunks > 0,
          totalChunks,
          ...(dataUrl.length < 600000 ? { fileData: dataUrl } : {}),
        };
      }

      // Clean any residual undefined values before updating Firestore
      const cleanUpdatePayload = Object.fromEntries(
        Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(noteRef, cleanUpdatePayload);

      setDownloadFeedback({
        message: `Note "${updatePayload.title}" updated successfully in Firebase!`,
        type: 'success'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);

      if (previewNote && previewNote.id === editingNote.id) {
        setPreviewNote({
          ...previewNote,
          ...updatePayload,
        } as Note);
      }

      setEditingNote(null);
      setEditNewFile(null);
    } catch (error) {
      console.error("Save edit error:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'notes');
      setDownloadFeedback({
        message: 'Failed to update note. Please try again.',
        type: 'error'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [myUploadedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('notesvault_my_uploaded_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isMyNote = (note: Note) => {
    if (student) {
      if (note.ownerId === student.id || note.ownerId === student.studentId) return true;
    }
    if (user && note.ownerId === user.uid) return true;
    return myUploadedIds.includes(note.id);
  };

  // IMPORTANT: Edit & Delete options are ONLY shown when viewing inside "My Uploaded Notes" (viewFilter === 'mine')
  // External viewers cannot edit or delete other users' notes.
  const canManageNote = (note?: Note | null): boolean => {
    if (!note) return false;
    if (viewFilter !== 'mine') return false; // Strictly hidden in general views
    return isMyNote(note);
  };

  const myNotesCount = notes.filter(isMyNote).length;
  const bookmarkedNotesCount = notes.filter(n => bookmarks.includes(n.id)).length;

  const filteredNotes = notes.filter(n => {
    if (viewFilter === 'mine' && !isMyNote(n)) {
      return false;
    }
    if (viewFilter === 'bookmarks' && !bookmarks.includes(n.id)) {
      return false;
    }

    const noteEduLevel = n.educationLevel || (n.semester ? 'college' : (n.coachingStream ? 'coaching' : 'school'));
    if (educationCategory !== 'all' && noteEduLevel !== educationCategory) {
      return false;
    }

    if (activeLevel !== 'all') {
      if (activeLevel.startsWith('class-')) {
        const targetGrade = parseInt(activeLevel.replace('class-', ''), 10);
        if (n.grade !== targetGrade || noteEduLevel === 'college') return false;
      } else if (activeLevel.startsWith('sem-')) {
        const targetSem = parseInt(activeLevel.replace('sem-', ''), 10);
        const noteSem = n.semester || (noteEduLevel === 'college' ? n.grade : undefined);
        if (noteSem !== targetSem) return false;
      } else {
        const streamText = `${n.coachingStream || ''} ${n.academicLevelLabel || ''} ${n.department || ''}`.toLowerCase();
        if (!streamText.includes(activeLevel.toLowerCase())) return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      n.title.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      (n.schoolName && n.schoolName.toLowerCase().includes(q)) ||
      (n.schoolCode && n.schoolCode.toLowerCase().includes(q)) ||
      (n.id && n.id.toLowerCase().includes(q)) ||
      (n.academicLevelLabel && n.academicLevelLabel.toLowerCase().includes(q)) ||
      (n.coachingStream && n.coachingStream.toLowerCase().includes(q)) ||
      (n.semester && `sem ${n.semester}`.includes(q)) ||
      (n.semester && `semester ${n.semester}`.includes(q)) ||
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
        message: 'Please enter the Unique ID (e.g. BJS101) or School Name in the search box.',
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
        message: `No note found matching ID "${query}". Please verify the Unique ID.`,
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

  const recordDownload = async (note: Note, uniqueCode: string) => {
    try {
      await addDoc(collection(db, 'downloads'), {
        noteId: note.id,
        noteTitle: note.title,
        schoolCode: uniqueCode,
        grade: note.grade,
        subject: note.subject,
        userId: user ? user.uid : 'student',
        userEmail: user ? user.email : '',
        userName: user ? (user.displayName || user.email?.split('@')[0] || 'Student') : 'Student',
        downloadedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'notes', note.id), {
        downloadsCount: increment(1)
      });
    } catch (err) {
      console.warn("Could not log download to Firestore:", err);
    }
  };

  const handleDownload = async (note: Note) => {
    try {
      const uniqueCode = note.schoolCode || `NV-${note.id.slice(0, 6).toUpperCase()}`;
      const schoolName = note.schoolName || 'General School Archive';

      // Log download to Firestore 'downloads' collection
      recordDownload(note, uniqueCode);

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

      // 2. Check if note has real fileData synced directly from cloud (Firestore)
      if (note.fileData) {
        const ext = note.fileName ? note.fileName.split('.').pop() : (note.isPdf ? 'pdf' : 'pdf');
        const finalName = note.fileName || `${uniqueCode}_${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
        
        triggerUniversalDownload(
          note.fileData,
          finalName,
          note.fileType || 'application/pdf'
        );

        // Cache in local IndexedDB for future instant downloads
        try {
          await storeLocalFile(note.id, new Blob([note.fileData], { type: note.fileType || 'application/pdf' }), finalName, note.fileType || 'application/pdf');
        } catch {}

        setDownloadFeedback({
          message: `Direct Download started for "${finalName}"!`,
          type: 'success'
        });
        setTimeout(() => setDownloadFeedback(null), 4000);
        return;
      }

      // 3. Check Firestore chunks for actual uploaded file
      setDownloadFeedback({
        message: `Retrieving uploaded file for "${note.title}"...`,
        type: 'info'
      });

      const cloudDataUrl = await getFileFromFirestoreChunks(db, note.id);
      if (cloudDataUrl) {
        const ext = note.fileName ? note.fileName.split('.').pop() : (note.isPdf ? 'pdf' : 'pdf');
        const finalName = note.fileName || `${uniqueCode}_${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
        const fileType = note.fileType || 'application/pdf';

        triggerUniversalDownload(cloudDataUrl, finalName, fileType);

        // Cache into local IndexedDB for subsequent instant access
        try {
          const parts = cloudDataUrl.split(',');
          const binary = atob(parts[1]);
          const arr = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
          const cachedBlob = new Blob([arr], { type: fileType });
          await storeLocalFile(note.id, cachedBlob, finalName, fileType);
        } catch {}

        setDownloadFeedback({
          message: `Download complete for "${finalName}"!`,
          type: 'success'
        });
        setTimeout(() => setDownloadFeedback(null), 4000);
        return;
      }

      // 4. For academic archive / curated seed notes: Generate official subject-specific study PDF
      const pdfBlob = generateSubjectStudyPdf(note);
      const safeTitle = note.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${uniqueCode}_${safeTitle}.pdf`;
      triggerUniversalDownload(pdfBlob, filename, 'application/pdf');

      setDownloadFeedback({
        message: `Official Study PDF downloaded for "${filename}"!`,
        type: 'success'
      });
      setTimeout(() => setDownloadFeedback(null), 4000);
    } catch (err) {
      console.error("Download error:", err);
      setDownloadFeedback({
        message: 'Error starting download. Please try again.',
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
                  Enter note Unique ID (e.g. <span className="font-mono font-bold text-blue-700 bg-blue-100/90 px-1 py-0.5 rounded">BJS101</span>) or School Name to search &amp; download instantly.
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg active:scale-95 cursor-pointer border-none transition-all"
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
                      {getAcademicLevelLabel(topMatch)} • {topMatch.subject}
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
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 cursor-pointer border border-slate-300 shadow-2xs transition-colors"
                >
                  View Info
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(topMatch)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer border-none shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Switcher: All Notes vs My Notes vs Bookmarks */}
        <div className="flex items-center justify-between gap-3 mb-space-md flex-wrap">
          <div className="inline-flex p-1 bg-slate-200/80 border border-slate-300/80 rounded-2xl shadow-inner gap-1">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
                viewFilter === 'all' 
                  ? 'bg-gradient-to-r from-slate-900 to-blue-950 text-white shadow-md' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60 bg-transparent'
              }`}
            >
              All Notes ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('mine')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                viewFilter === 'mine' 
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60 bg-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span>My Uploads ({myNotesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('bookmarks')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 ${
                viewFilter === 'bookmarks' 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60 bg-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bookmark</span>
              <span>Saved Bookmarks ({bookmarkedNotesCount})</span>
            </button>
          </div>
        </div>

        {/* Informative banner when viewing "My Uploaded Notes" */}
        {viewFilter === 'mine' && (
          <div className="mb-space-md p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm text-blue-900 font-medium">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-blue-700 text-[22px]">verified_user</span>
              <span>
                <strong>My Uploads Panel:</strong> These are notes uploaded by your account. You can <strong>Edit</strong> or <strong>Delete</strong> your notes here. These options are hidden from other users.
              </span>
            </div>
            <button
              type="button"
              onClick={onUploadClick}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg shrink-0 cursor-pointer border-none shadow-2xs text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Upload New Note</span>
            </button>
          </div>
        )}

        {/* Category & Academic Level Filter Controls */}
        <div className="flex flex-col gap-3 mb-space-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">layers</span>
              <span className="font-title-md text-title-md text-on-surface">Browse by Category &amp; Level</span>
            </div>
            <span className="font-caption text-caption text-outline">Filter school classes, college semesters, or coaching</span>
          </div>

          {/* Primary Category Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => { setEducationCategory('all'); setActiveLevel('all'); }}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all border ${
                educationCategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 shadow-2xs'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">apps</span>
              <span>All Categories</span>
            </button>

            {EDUCATION_CATEGORIES.map(cat => {
              const isActive = educationCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setEducationCategory(cat.id); setActiveLevel('all'); }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-blue-50/70 border-slate-200 shadow-2xs'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
                  <span>{cat.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-level Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {educationCategory === 'all' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveLevel('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    activeLevel === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  All Levels
                </button>
                {[9, 10, 11, 12].map(g => (
                  <button
                    key={`class-${g}`}
                    type="button"
                    onClick={() => setActiveLevel(`class-${g}`)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                      activeLevel === `class-${g}`
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    Class {g}
                  </button>
                ))}
                {[1, 2, 3, 4].map(s => (
                  <button
                    key={`sem-${s}`}
                    type="button"
                    onClick={() => setActiveLevel(`sem-${s}`)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                      activeLevel === `sem-${s}`
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                    }`}
                  >
                    Sem {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveLevel('JEE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                    activeLevel === 'JEE'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 border-amber-200'
                  }`}
                >
                  JEE / NEET
                </button>
              </>
            )}

            {educationCategory === 'school' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveLevel('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    activeLevel === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  All School Classes
                </button>
                {SCHOOL_CLASSES.map(g => (
                  <button
                    key={`class-${g}`}
                    type="button"
                    onClick={() => setActiveLevel(`class-${g}`)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                      activeLevel === `class-${g}`
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    Class {g}
                  </button>
                ))}
              </>
            )}

            {educationCategory === 'college' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveLevel('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    activeLevel === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  All Semesters (1-8)
                </button>
                {COLLEGE_SEMESTERS.map(s => (
                  <button
                    key={`sem-${s}`}
                    type="button"
                    onClick={() => setActiveLevel(`sem-${s}`)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                      activeLevel === `sem-${s}`
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-indigo-50 border-slate-200'
                    }`}
                  >
                    Semester {s}
                  </button>
                ))}
              </>
            )}

            {educationCategory === 'coaching' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveLevel('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    activeLevel === 'all'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  All Coaching Exams
                </button>
                {COACHING_STREAMS.map(stream => (
                  <button
                    key={stream}
                    type="button"
                    onClick={() => setActiveLevel(stream)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap ${
                      activeLevel === stream
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-amber-50 border-slate-200'
                    }`}
                  >
                    {stream}
                  </button>
                ))}
              </>
            )}
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
              <h3 className="font-title-lg text-title-lg text-on-surface mb-space-xs">
                {viewFilter === 'mine' ? 'You have not uploaded any notes yet' : 'No notes found'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-space-lg">
                {viewFilter === 'mine'
                  ? 'Notes you upload will appear here. Upload your first note now!'
                  : searchQuery 
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
                  className="bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md py-space-sm px-space-lg rounded-lg flex items-center justify-center gap-space-xs transition-colors cursor-pointer border-none font-bold"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Upload a Note</span>
                </button>
              )}
            </div>
          )}

          {filteredNotes.map(note => (
            <article key={note.id} className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-outline-variant/20 relative">
              <div>
                <div className="flex items-center justify-between mb-space-sm gap-2">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold px-space-sm py-0.5 rounded-full">
                      {getAcademicLevelLabel(note)}
                    </span>
                    <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium px-space-sm py-0.5 rounded-full">
                      {note.subject}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* My Note Badge */}
                    {user && note.ownerId === user.uid && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs" title="Created by your account">
                        <span className="material-symbols-outlined text-[12px] text-emerald-700">person</span>
                        <span>My Note</span>
                      </span>
                    )}

                    {/* Unique ID Badge */}
                    {note.schoolCode && (
                      <span className="bg-blue-100 text-blue-900 border border-blue-200/90 font-mono text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs tracking-wider" title="Unique School & Note Identifier">
                        <span className="material-symbols-outlined text-[12px] text-blue-700">tag</span>
                        <span>{note.schoolCode}</span>
                      </span>
                    )}

                    {/* Bookmark / Save Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(note.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                        bookmarks.includes(note.id)
                          ? 'bg-amber-50 text-amber-600 border-amber-300'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200/60 bg-white'
                      }`}
                      title={bookmarks.includes(note.id) ? "Remove from bookmarks" : "Save to bookmarks"}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {bookmarks.includes(note.id) ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>

                    {/* Quick Edit & Delete Action Buttons: ONLY visible inside "My Uploads" for student's own notes */}
                    {canManageNote(note) && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(note);
                          }}
                          className="p-1.5 rounded-lg text-blue-700 hover:text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-300 bg-blue-50"
                          title="Edit Note Details or PDF"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingNote(note);
                          }}
                          className="p-1.5 rounded-lg text-rose-700 hover:text-rose-900 hover:bg-rose-100 transition-colors cursor-pointer border border-rose-300 bg-rose-50"
                          title="Delete My Note"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
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
              
              <div className="pt-space-md mt-auto bg-slate-50/60 -mx-space-lg -mb-space-lg p-space-md rounded-b-2xl border-t border-slate-200/80">
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={() => setPreviewNote(note)}
                    className="bg-white hover:bg-blue-50/70 text-slate-800 hover:text-blue-700 font-bold text-xs sm:text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 shadow-2xs hover:border-blue-400 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[17px] text-blue-600">visibility</span>
                    <span>View Info</span>
                  </button>
                  <button 
                    onClick={() => handleDownload(note)}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-extrabold text-xs sm:text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all cursor-pointer group border-none active:scale-95"
                    title="Download Note PDF / Document"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* VIEW INFO MODAL */}
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
              title="Close"
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
                  <span className="text-outline block mb-0.5 font-medium">Academic Level</span>
                  <span className="font-semibold text-on-surface text-sm">{getAcademicLevelLabel(previewNote)}</span>
                </div>
                <div>
                  <span className="text-outline block mb-0.5 font-medium">Author / Contributor</span>
                  <span className="font-semibold text-on-surface text-sm">{previewNote.author.name}</span>
                </div>
                <div>
                  <span className="text-outline block mb-0.5 font-medium">Document File</span>
                  <span className="font-semibold text-slate-800 text-xs truncate block" title={previewNote.fileName || 'note.pdf'}>
                    {previewNote.fileName || 'Academic Note.pdf'} ({previewNote.sizeMB} MB)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons in Info Modal */}
            <div className="flex items-center justify-between pt-space-md mt-space-sm border-t border-outline-variant/20 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleBookmark(previewNote.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    bookmarks.includes(previewNote.id)
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                  }`}
                  title={bookmarks.includes(previewNote.id) ? "Remove Bookmark" : "Save Bookmark"}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {bookmarks.includes(previewNote.id) ? 'bookmark' : 'bookmark_border'}
                  </span>
                  <span>{bookmarks.includes(previewNote.id) ? 'Saved' : 'Save'}</span>
                </button>

                {/* Edit & Delete in View Info modal ONLY if viewing from My Uploads and is owner */}
                {canManageNote(previewNote) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const noteToEdit = previewNote;
                        setPreviewNote(null);
                        handleStartEdit(noteToEdit);
                      }}
                      className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                      title="Edit Note Details or PDF"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const noteToDelete = previewNote;
                        setPreviewNote(null);
                        setDeletingNote(noteToDelete);
                      }}
                      className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                      title="Delete Note"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setPreviewNote(null)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-colors border border-slate-300 shadow-2xs"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleDownload(previewNote)}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/25 hover:shadow-lg transition-all cursor-pointer border-none active:scale-95"
                >
                  <span className="material-symbols-outlined text-[19px]">download</span>
                  <span>Download File</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingNote && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeletingNote(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Delete Note from Firebase?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Are you sure you want to permanently delete <span className="font-semibold text-slate-900">"{deletingNote.title}"</span> ({deletingNote.schoolCode || 'Note'}) and its PDF file?
              </p>
              <p className="text-xs text-rose-600 font-medium mt-1.5">
                This note will be permanently removed from Firebase database and storage.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingNote(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteNote(deletingNote)}
                className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md shadow-rose-500/25 hover:shadow-lg transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
              >
                <span className={`material-symbols-outlined text-[18px] ${isDeleting ? 'animate-spin' : ''}`}>
                  {isDeleting ? 'sync' : 'delete'}
                </span>
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete from Firebase'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT NOTE & PDF MODAL */}
      {editingNote && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => !isSavingEdit && setEditingNote(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 flex flex-col gap-4 my-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">edit_document</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Edit Note & PDF File
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update note details or replace document directly in Firebase
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditingNote(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">
                  Note Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  placeholder="e.g. Chapter 4: Carbon and Its Compounds"
                />
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  placeholder="e.g. Science, Mathematics, English"
                />
              </div>

              {/* School Name & Unique ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    School / College Name
                  </label>
                  <input
                    type="text"
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                    placeholder="e.g. Delhi Public School"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Unique Note ID
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditSchoolCode(generateAutoId(editSchoolName || 'NOTE'))}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 border-none bg-transparent cursor-pointer"
                    >
                      + Generate ID
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editSchoolCode}
                    onChange={(e) => setEditSchoolCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all font-mono font-bold tracking-wider"
                    placeholder="e.g. DPS101"
                  />
                </div>
              </div>

              {/* Academic Category Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Academic Category: <span className="text-blue-700 font-extrabold capitalize">{editEducationLevel}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EDUCATION_CATEGORIES.map(cat => {
                    const isSelected = editEducationLevel === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setEditEducationLevel(cat.id)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Level: School Class / College Semester / Coaching Stream */}
              {editEducationLevel === 'school' && (
                <div className="flex flex-col gap-1.5 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">edit_note</span>
                      <span>Type School Class / Standard:</span>
                    </label>
                    <span className="text-[11px] font-bold text-blue-700">Class: {editSchoolClassInput || 'N/A'}</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editSchoolClassInput}
                    onChange={(e) => setEditSchoolClassInput(e.target.value)}
                    placeholder="e.g. Class 10, 12th PCM, 9th Standard"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-blue-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {SCHOOL_CLASSES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditSchoolClassInput(String(g))}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border cursor-pointer transition-all ${
                          editSchoolClassInput === String(g) || editSchoolClassInput === `Class ${g}`
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Class {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editEducationLevel === 'college' && (
                <div className="flex flex-col gap-1.5 p-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">edit_note</span>
                      <span>Type College Semester & Branch:</span>
                    </label>
                    <span className="text-[11px] font-bold text-indigo-700">Sem: {editCollegeSemInput || 'N/A'}</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editCollegeSemInput}
                    onChange={(e) => setEditCollegeSemInput(e.target.value)}
                    placeholder="e.g. Sem 4 B.Tech CSE, 3rd Sem BCA"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-indigo-300 rounded-lg focus:border-indigo-600 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {COLLEGE_SEMESTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditCollegeSemInput(String(s))}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border cursor-pointer transition-all ${
                          editCollegeSemInput === String(s) || editCollegeSemInput === `Sem ${s}` || editCollegeSemInput === `Semester ${s}`
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Sem {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editEducationLevel === 'coaching' && (
                <div className="flex flex-col gap-1.5 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">edit_note</span>
                      <span>Type Exam / Coaching Subject:</span>
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 line-clamp-1 max-w-[160px]">{editCoachingStreamInput || 'N/A'}</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editCoachingStreamInput}
                    onChange={(e) => setEditCoachingStreamInput(e.target.value)}
                    placeholder="e.g. JEE Advanced Physics, NEET Biology, UPSC"
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-amber-300 rounded-lg focus:border-amber-600 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {COACHING_STREAMS.slice(0, 5).map(stream => (
                      <button
                        key={stream}
                        type="button"
                        onClick={() => setEditCoachingStreamInput(stream)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border cursor-pointer transition-all ${
                          editCoachingStreamInput === stream
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {stream}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Author / Contributor Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">
                  Author / Contributor Name
                </label>
                <input
                  type="text"
                  value={editAuthorName}
                  onChange={(e) => setEditAuthorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
                  placeholder="e.g. Ayush Ahir, Rahul Sharma"
                />
              </div>

              {/* Replace or Update PDF File */}
              <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-blue-600">attachment</span>
                    <span>Replace PDF / Document</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Optional</span>
                </div>

                <div className="text-xs text-slate-600">
                  Current Document: <span className="font-semibold text-slate-800">{editingNote.fileName || `${editingNote.schoolCode || 'Note'}.pdf`}</span> ({editingNote.sizeMB} MB)
                </div>

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditNewFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>{editNewFile ? 'Change Selected File' : 'Choose New PDF / File'}</span>
                  </button>

                  {editNewFile && (
                    <span className="text-xs font-semibold text-emerald-700 truncate max-w-[200px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>{editNewFile.name} ({(editNewFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  If you do not select a new file, the current PDF file will be preserved in Firebase.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 mt-1">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 shadow-md shadow-blue-500/25 hover:shadow-lg transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isSavingEdit ? 'animate-spin' : ''}`}>
                    {isSavingEdit ? 'sync' : 'save'}
                  </span>
                  <span>{isSavingEdit ? 'Updating Firebase...' : 'Save to Firebase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
