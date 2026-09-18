import React from 'react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'landing' | 'browse' | 'upload';
  onTabChange: (tab: 'landing' | 'browse' | 'upload') => void;
  user?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, user, onLogin, onLogout }) => {
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-lg">
          <a
            className="flex items-center gap-space-sm group text-decoration-none cursor-pointer"
            onClick={(e) => { e.preventDefault(); onTabChange('landing'); }}
          >
            <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-primary text-[20px]">menu_book</span>
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md text-on-surface tracking-tight leading-none group-hover:text-primary transition-colors">NotesVault</span>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-space-xs p-1">
            <button
              className={`font-label-md text-label-md px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-surface-container-low text-primary font-title-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => onTabChange('browse')}
            >
              Browse
            </button>
            <button
              className={`font-label-md text-label-md px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-surface-container-low text-primary font-title-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => onTabChange('upload')}
            >
              Upload
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-space-md">
          {user ? (
            <div className="flex items-center gap-space-sm">
              <span className="hidden md:inline-block font-label-sm text-label-sm text-on-surface-variant">
                {user.displayName?.split(' ')[0] || 'User'}
              </span>
              <button
                className="hidden lg:inline-flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md px-space-md py-space-sm rounded-lg shadow-xs transition-all cursor-pointer"
                onClick={onLogout}
              >
                <span>Logout</span>
              </button>
              <button
                className="inline-flex items-center gap-space-xs bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md px-space-md py-space-sm rounded-lg shadow-sm transition-all cursor-pointer"
                onClick={() => onTabChange('upload')}
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-space-xs bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md px-space-md py-space-sm rounded-lg shadow-sm transition-all cursor-pointer"
              onClick={onLogin}
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
