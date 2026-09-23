import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { NotesVaultLogo } from './NotesVaultLogo';

interface NavbarProps {
  activeTab: 'landing' | 'browse' | 'upload';
  onTabChange: (tab: 'landing' | 'browse' | 'upload') => void;
  onBack: () => void;
  user?: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onBack,
}) => {
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

        {/* Right Side: Quick Action Button & Navigation */}
        <div className="flex items-center gap-2">
          {activeTab !== 'browse' && (
            <button
              onClick={() => onTabChange('browse')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-slate-200"
            >
              <span className="material-symbols-outlined text-[17px]">search</span>
              <span className="hidden xs:inline">Search Notes</span>
            </button>
          )}

          {activeTab !== 'upload' && (
            <button
              onClick={() => onTabChange('upload')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-[#164373] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer border-none active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px]">cloud_upload</span>
              <span>Upload Notes</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
