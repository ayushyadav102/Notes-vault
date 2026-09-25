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

  const formatNoteDate = (timestamp: any): string => {
    if (!timestamp) return 'Recently';
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      if (typeof timestamp.toMillis === 'function') {
        return new Date(timestamp.toMillis()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      }
    } catch {}
    return 'Recently';
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
    if (viewFilter === 'mine') {
      return isMyNote(n);
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
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4 font-sans">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-slate-500"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Home</span>
            </button>
          )}
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-bold">Download Notes Dashboard</span>
        </div>

        {/* Top Header Card (White Box) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer border border-slate-200 shadow-2xs shrink-0"
                title="Go back to Home page"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                  Download Notes
                </h1>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-sans">
                  {notes.length} Available Notes
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
                Search notes by Unique ID, filter by class or semester, and download verified study PDFs.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onUploadClick}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer border-none active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Upload Notes</span>
          </button>
        </div>

        {/* Blue Gradient Sub-banner Box */}
        {viewFilter !== 'mine' && (
          <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
                  <span className="material-symbols-outlined text-[26px]">school</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px] tracking-wider uppercase backdrop-blur-xs">
                      Academic Portal
                    </span>
                    <span className="text-white/80 text-xs font-semibold">
                      School &amp; College Archive
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1 font-sans">
                    Verified Study Material &amp; PDF Vault
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5 font-sans leading-relaxed">
                    Search with Unique ID (e.g. <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">DPS1001</span>), filter by School Classes 5th–12th or Semesters, and download instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onUploadClick}
                  className="px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border-none active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Upload Notes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If viewing My Uploads: Show dedicated clean panel */}
        {viewFilter === 'mine' ? (
          <div className="mb-6 p-5 sm:p-6 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                <span className="material-symbols-outlined text-[26px]">folder_shared</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">
                    My Uploaded Notes
                  </h2>
                  <span className="px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-2xs">
                    {myNotesCount} {myNotesCount === 1 ? 'Note' : 'Notes'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-sans">
                  Total {myNotesCount} self-uploaded notes in your account. You can edit details, download, or delete them.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewFilter('all')}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to All Notes</span>
              </button>
              <button
                type="button"
                onClick={onUploadClick}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer transition-all border-none"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Upload New Note</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar Container */}
            <div className="mb-6 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
              <form onSubmit={handleDirectDownload} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, subject, school, or Unique ID (e.g. DPS1001)..."
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm sm:text-base font-sans transition-all placeholder:text-slate-400"
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

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg active:scale-95 cursor-pointer border-none transition-all shrink-0"
                  title="Search and directly download matched note"
                >
                  <span className="material-symbols-outlined text-[19px]">file_download</span>
                  <span>Direct Download PDF</span>
                </button>
              </form>

              {/* Feedback toast message */}
              {downloadFeedback && (
                <div className={`mt-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 font-sans animate-in fade-in duration-200 ${
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

              {/* Matched Note Card when user has typed an ID / query */}
              {searchQuery.trim() && topMatch && (
                <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {topMatch.schoolCode && (
                          <span className="bg-blue-600 text-white font-mono text-xs font-bold px-2 py-0.5 rounded shadow-2xs">
                            {topMatch.schoolCode}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {getAcademicLevelLabel(topMatch)} • {topMatch.subject}
                        </span>
                        <span className="text-xs text-blue-900 font-semibold truncate">
                          {topMatch.schoolName || 'School Archive'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1 truncate font-sans">
                        {topMatch.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setPreviewNote(topMatch)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 cursor-pointer border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px] text-blue-600">visibility</span>
                      <span>View Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(topMatch)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer border-none shadow-sm shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      <span>Download PDF</span>
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
              className="px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none flex items-center gap-1.5 text-slate-700 hover:text-slate-900 hover:bg-white/60 bg-transparent"
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
      </>
    )}

        {viewFilter === 'mine' ? (
          <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm mb-space-md bg-blue-50/80 p-3 rounded-xl border border-blue-200">
            <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="material-symbols-outlined text-blue-700 text-[18px]">verified</span>
              <span>Total self-uploaded notes: <strong className="text-blue-700">{filteredNotes.length}</strong></span>
            </span>
            <button 
              onClick={onUploadClick}
              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold text-xs cursor-pointer border-none bg-transparent"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Upload New Note</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-700 mb-space-md bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs sm:text-sm font-semibold">
              Showing <strong className="text-slate-950 font-black">{filteredNotes.length}</strong> {filteredNotes.length === 1 ? 'note' : 'notes'}
              {searchQuery && <span> matching "<span className="text-blue-700 font-bold">{searchQuery}</span>"</span>}
            </span>
            <button 
              onClick={onUploadClick}
              className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-800 font-bold text-xs sm:text-sm cursor-pointer border-none bg-transparent"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>Upload Note</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-space-xl">
          {filteredNotes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-14 px-6 text-center bg-white rounded-3xl shadow-xs border border-slate-200/90 my-2 max-w-lg mx-auto w-full">
              {/* Detailed folder icon with small circular blue star badge */}
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-[48px]">folder</span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs border-2 border-white">
                  <span className="material-symbols-outlined text-[13px] font-bold">star</span>
                </div>
              </div>

              <h3 className="font-sans text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                {viewFilter === 'mine' ? 'No Uploaded Notes Yet' : 'No Notes Found'}
              </h3>
              <p className="font-sans text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                {viewFilter === 'mine'
                  ? 'Notes you upload will appear here. Upload your first note now!'
                  : searchQuery 
                  ? `No study notes matched "${searchQuery}". Try adjusting your search query, Unique ID or clearing filters.` 
                  : 'There are no study notes available for this category or class yet.'}
              </p>
              {searchQuery ? (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-6 rounded-xl cursor-pointer border-none transition-colors font-sans"
                >
                  Clear Search
                </button>
              ) : (
                <button 
                  onClick={onUploadClick}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer border-none active:scale-95 font-sans"
                >
                  <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                  <span>Upload Notes</span>
                </button>
              )}
            </div>
          )}

          {filteredNotes.map(note => {
            const isMine = isMyNote(note);
            const isBookmarked = bookmarks.includes(note.id);
            const showOwnerActions = canManageNote(note);

            return (
              <article 
                key={note.id} 
                className="bg-white rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between border border-slate-200 hover:border-blue-400 relative group"
              >
                <div>
                  {/* Top Badges Row: Level, Subject, ID, Bookmark */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-2xs font-sans">
                        {getAcademicLevelLabel(note)}
                      </span>
                      <span className="bg-slate-100 text-slate-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-slate-200 font-sans">
                        {note.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {/* Self-uploaded indicator */}
                      {isMine && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-sans text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-2xs" title="Uploaded by you">
                          <span className="material-symbols-outlined text-[12px] text-emerald-700">person</span>
                          <span>My Note</span>
                        </span>
                      )}

                      {/* Unique Note ID Badge */}
                      {note.schoolCode && (
                        <span 
                          className="bg-blue-50 text-blue-900 border border-blue-200/90 font-mono text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs tracking-wider cursor-pointer hover:bg-blue-100 transition-colors" 
                          title="Unique Note ID (Click to copy)"
                          onClick={() => handleCopyCode(note.schoolCode!)}
                        >
                          <span className="material-symbols-outlined text-[13px] text-blue-700">tag</span>
                          <span>{note.schoolCode}</span>
                          {copiedId === note.schoolCode ? (
                            <span className="material-symbols-outlined text-[12px] text-emerald-600">check</span>
                          ) : null}
                        </span>
                      )}

                      {/* Bookmark button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(note.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                          isBookmarked
                            ? 'bg-amber-50 text-amber-600 border-amber-300'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200/80 bg-white'
                        }`}
                        title={isBookmarked ? "Remove from saved" : "Save bookmark"}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isBookmarked ? 'bookmark' : 'bookmark_border'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* School / Institution Name Badge */}
                  <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold mb-2.5 bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100/90 w-fit max-w-full font-sans">
                    <span className="material-symbols-outlined text-[15px] text-blue-700 shrink-0">school</span>
                    <span className="truncate">{note.schoolName || 'General School Repository'}</span>
                  </div>

                  {/* Note Title */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-2 font-sans group-hover:text-blue-600 transition-colors">
                    {note.title}
                  </h3>

                  {/* File Name & Size */}
                  {note.fileName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2 font-mono truncate" title={note.fileName}>
                      <span className="material-symbols-outlined text-[15px] text-slate-500 shrink-0">attach_file</span>
                      <span className="truncate font-semibold">{note.fileName}</span>
                      {note.sizeMB ? <span className="text-slate-400 font-normal">({note.sizeMB} MB)</span> : null}
                    </div>
                  )}

                  {/* Upload Date & Contributor Row */}
                  <div className="mt-3 p-2.5 bg-slate-50/90 border border-slate-200/90 rounded-xl flex items-center justify-between text-xs font-sans">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate max-w-[50%]">
                      <span className="material-symbols-outlined text-[15px] text-slate-500 shrink-0">person</span>
                      <span className="truncate" title={note.author?.name || 'Contributor'}>
                        {note.author?.name || 'Contributor'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-slate-800 font-mono text-[11px] shrink-0">
                      <span className="material-symbols-outlined text-[14px] text-blue-600">calendar_month</span>
                      <span>{formatNoteDate(note.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  {/* If user owns note, show Edit & Delete directly */}
                  {showOwnerActions && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/25 cursor-pointer border-none transition-all active:scale-95 font-sans"
                        title="Edit this note's details or file"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Edit Note</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingNote(note)}
                        className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-300 cursor-pointer transition-all active:scale-95 font-sans"
                        title="Delete this note"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Delete Note</span>
                      </button>
                    </div>
                  )}

                  {/* Primary Download & View Info Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewNote(note)}
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 shadow-2xs hover:border-blue-400 cursor-pointer transition-all active:scale-95 font-sans"
                    >
                      <span className="material-symbols-outlined text-[16px] text-blue-600">visibility</span>
                      <span>View Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(note)}
                      className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 hover:shadow-lg transition-all cursor-pointer border-none active:scale-95 font-sans"
                      title="Download study note PDF"
                    >
                      <span className="material-symbols-outlined text-[17px]">file_download</span>
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Three Bottom Feature Cards */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[26px]">tag</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 font-sans">Direct ID Download</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                Enter any unique note code (e.g. <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">DPS1001</span>) in the search bar to find and download original PDF notes immediately.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[26px]">verified</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 font-sans">Verified Academic Material</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                Access curriculum-aligned study notes across CBSE &amp; State School Classes 5th to 12th, College semesters, and competitive coaching.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all flex flex-col gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 font-sans">100% Free &amp; Open Vault</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                Contribute handwritten notes, share solutions with fellow students across the country, and manage your uploaded files anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW INFO MODAL */}
      {previewNote && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewNote(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 flex flex-col gap-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewNote(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border-none"
              title="Close"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            
            <div className="flex flex-col gap-1 pr-10">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md w-fit border border-blue-200 font-sans">
                Note Details
              </span>
              <h3 className="font-sans text-xl sm:text-2xl text-slate-900 font-bold mt-1 leading-snug">
                {previewNote.title}
              </h3>
            </div>
            
            {/* School & Unique Verification Badge Box */}
            <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <span className="material-symbols-outlined text-[22px]">school</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Institution / School</span>
                    <span className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                      {previewNote.schoolName || 'General School Repository'}
                    </span>
                  </div>
                </div>

                {previewNote.schoolCode && (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-xl shrink-0">
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
                  <span className="text-slate-500 block mb-0.5 font-bold uppercase text-[10px]">Subject</span>
                  <span className="font-extrabold text-slate-900 text-sm">{previewNote.subject}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold uppercase text-[10px]">Academic Level</span>
                  <span className="font-extrabold text-blue-700 text-sm">{getAcademicLevelLabel(previewNote)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold uppercase text-[10px]">Author / Contributor</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">{previewNote.author.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-bold uppercase text-[10px]">Uploaded On</span>
                  <span className="font-bold text-slate-800 font-mono text-xs sm:text-sm">{formatNoteDate(previewNote.createdAt)}</span>
                </div>
              </div>

              {previewNote.fileName && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-700">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">attach_file</span>
                  <span className="font-mono font-bold truncate flex-1">{previewNote.fileName}</span>
                  {previewNote.sizeMB ? <span className="text-slate-500 font-normal shrink-0">({previewNote.sizeMB} MB)</span> : null}
                </div>
              )}
            </div>
            
            {/* Action Buttons in Info Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleBookmark(previewNote.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    bookmarks.includes(previewNote.id)
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-200'
                  }`}
                  title={bookmarks.includes(previewNote.id) ? "Remove Bookmark" : "Save Bookmark"}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {bookmarks.includes(previewNote.id) ? 'bookmark' : 'bookmark_border'}
                  </span>
                  <span>{bookmarks.includes(previewNote.id) ? 'Saved' : 'Save'}</span>
                </button>

                {/* Edit & Delete in View Info modal ONLY if owner */}
                {canManageNote(previewNote) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const noteToEdit = previewNote;
                        setPreviewNote(null);
                        handleStartEdit(noteToEdit);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                      title="Edit Note Details or PDF"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const noteToDelete = previewNote;
                        setPreviewNote(null);
                        setDeletingNote(noteToDelete);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
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
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/25 hover:shadow-lg transition-all cursor-pointer border-none active:scale-95"
                >
                  <span className="material-symbols-outlined text-[19px]">file_download</span>
                  <span>Download PDF</span>
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
