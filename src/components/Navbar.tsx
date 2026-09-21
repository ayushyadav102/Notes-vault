import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { NotesVaultLogo } from './NotesVaultLogo';

interface NavbarProps {
  activeTab: 'landing' | 'browse' | 'upload';
  onTabChange: (tab: 'landing' | 'browse' | 'upload') => void;
  onBack: () => void;
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onBack,
  user,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-b border-slate-200/80">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left Side: Back Button & Logo */}
        <div className="flex items-center gap-3">
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
            className="flex items-center gap-2.5 group cursor-pointer select-none"
            onClick={(e) => { e.preventDefault(); onTabChange('landing'); }}
            title="Return to Home"
          >
            <div className="w-12 h-8 sm:w-14 sm:h-9 flex items-center justify-center">
              <NotesVaultLogo size="sm" showText={false} />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg text-[#0b2545] tracking-tight leading-none group-hover:text-blue-700 transition-colors font-black">
                NOTESVAULT
              </span>
              <span className="text-[10px] text-slate-500 font-medium">School Notes Archive</span>
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

        {/* Right Side: Profile Icon with Dropdown Menu */}
        <div className="flex items-center gap-2.5">
          {user && (
            <div className="relative" ref={profileRef}>
              {/* Profile Avatar Button */}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Open profile & logout menu"
                aria-label="User profile menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={userName}
                    className="w-8 h-8 sm:w-8 sm:h-8 rounded-full object-cover border border-white shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#164373] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {userInitial}
                  </div>
                )}
                {/* Subtle dropdown arrow indicator */}
                <span className="material-symbols-outlined text-[16px] text-slate-600 mr-0.5">
                  {profileOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Profile Popup Dropdown Card */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Details Header */}
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={userName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#164373] text-white flex items-center justify-center font-bold text-sm">
                        {userInitial}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {userName}
                      </span>
                      <span className="text-xs text-slate-500 truncate" title={user.email || ''}>
                        {user.email || 'Student Account'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Navigation Items for Mobile */}
                  <div className="py-1 md:hidden border-b border-slate-100">
                    <button
                      onClick={() => {
                        onTabChange('browse');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-500">menu_book</span>
                      <span>Browse Library</span>
                    </button>
                    <button
                      onClick={() => {
                        onTabChange('upload');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-500">upload_file</span>
                      <span>Upload Notes</span>
                    </button>
                  </div>

                  {/* Logout Button inside Profile Dropdown */}
                  <div className="pt-1 px-2">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      <span>Logout Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
