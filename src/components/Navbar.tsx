import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { NotesVaultLogo } from './NotesVaultLogo';
import { StudentUser } from '../types';

interface NavbarProps {
  activeTab: 'landing' | 'browse' | 'upload';
  onTabChange: (tab: 'landing' | 'browse' | 'upload') => void;
  onBack: () => void;
  user: User | null;
  student?: StudentUser | null;
  onLogout: () => Promise<void>;
  onStudentLogout?: () => void;
  onOpenLogin?: () => void;
  onFilterMyNotes?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onBack,
  user,
  student,
  onLogout,
  onStudentLogout,
  onOpenLogin,
  onFilterMyNotes,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const displayName = student?.name || user?.displayName || user?.email?.split('@')[0] || 'Student';
  const displayInitial = displayName.charAt(0).toUpperCase();
  const studentGrade = student?.grade ? `Class ${student.grade}` : '';
  const studentSchool = student?.schoolName || '';

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-b border-slate-200/80">
      <div className="h-16 max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Side: Back Button & Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeTab !== 'landing' && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 transition-all cursor-pointer border border-slate-300 text-xs font-bold shadow-2xs active:scale-95"
              title="Go Back"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Logo with Open Book Emblem */}
          <a
            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer select-none"
            onClick={(e) => { e.preventDefault(); onTabChange('landing'); }}
            title="Return to Home"
          >
            <div className="w-10 h-7 sm:w-14 sm:h-9 flex items-center justify-center">
              <NotesVaultLogo size="sm" showText={false} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-lg text-[#0b2545] tracking-tight leading-none group-hover:text-blue-700 transition-colors font-black">
                NOTESVAULT
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">School Notes Archive</span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'landing'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              onClick={() => onTabChange('landing')}
            >
              Home
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              onClick={() => onTabChange('browse')}
            >
              Browse Library
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              onClick={() => onTabChange('upload')}
            >
              Upload Notes
            </button>
          </nav>
        </div>

        {/* Right Side: Quick Actions & Authentication */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {activeTab !== 'browse' && (
            <button
              onClick={() => onTabChange('browse')}
              className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-blue-200/90 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[17px]">search</span>
              <span>Search</span>
            </button>
          )}

          {activeTab !== 'upload' && (
            <button
              onClick={() => onTabChange('upload')}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-blue-500/25 hover:shadow-lg transition-all cursor-pointer border-none active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span className="hidden sm:inline">Upload</span>
              <span className="sm:hidden">Post</span>
            </button>
          )}

          {/* Student / User Authentication Status / Profile Menu */}
          {(student || user) ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-400 transition-all cursor-pointer shadow-2xs"
                title="Student Profile"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0b2545] to-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  {displayInitial}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[110px] truncate leading-tight">
                    {displayName}
                  </span>
                  {studentGrade && (
                    <span className="text-[9px] font-semibold text-blue-700 hidden sm:inline leading-none">
                      {studentGrade}
                    </span>
                  )}
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-500">
                  {menuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Profile Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0b2545] to-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      {displayInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      {student && (
                        <p className="text-[11px] font-mono text-blue-700 truncate font-semibold">
                          @{student.studentId}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 truncate">
                        {studentSchool || 'NotesVault Scholar'}
                      </p>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (onFilterMyNotes) {
                          onFilterMyNotes();
                        } else {
                          onTabChange('browse');
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <span className="material-symbols-outlined text-[17px] text-blue-600">collections_bookmark</span>
                      <span>My Uploaded Notes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onTabChange('upload');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <span className="material-symbols-outlined text-[17px] text-indigo-600">add_circle</span>
                      <span>Upload New Note</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (onStudentLogout) {
                          onStudentLogout();
                        } else {
                          onLogout();
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      <span>Log Out (ID Badlein)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-900 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span>Login / Register</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

