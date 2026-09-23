import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { NotesVaultLogo } from './NotesVaultLogo';

interface NavbarProps {
  activeTab: 'landing' | 'browse' | 'upload';
  onTabChange: (tab: 'landing' | 'browse' | 'upload') => void;
  onBack: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
  onFilterMyNotes?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onBack,
  user,
  onLogout,
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

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-b border-slate-200/80">
      <div className="h-16 max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Side: Back Button & Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeTab !== 'landing' && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer border border-slate-200 text-xs font-semibold"
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
              className="hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-slate-200"
            >
              <span className="material-symbols-outlined text-[17px]">search</span>
              <span>Search</span>
            </button>
          )}

          {activeTab !== 'upload' && (
            <button
              onClick={() => onTabChange('upload')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-[#164373] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer border-none active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px]">cloud_upload</span>
              <span className="hidden sm:inline">Upload</span>
              <span className="sm:hidden">Post</span>
            </button>
          )}

          {/* User Authentication Status / Profile Menu */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
                title="Account Settings"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={userName}
                    className="w-7 h-7 rounded-full object-cover border border-white shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {userInitial}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                  {userName}
                </span>
                <span className="material-symbols-outlined text-[16px] text-slate-500">
                  {menuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Profile Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={userName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
                        {userInitial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold mt-0.5">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>Google Verified</span>
                      </span>
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
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-none bg-transparent"
                    >
                      <span className="material-symbols-outlined text-[17px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

