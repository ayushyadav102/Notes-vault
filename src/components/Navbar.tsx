import React from 'react';
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
  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/20">
      <div className="h-16 max-w-7xl mx-auto px-margin flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          {/* Dedicated Back button when not on Home */}
          {activeTab !== 'landing' && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 font-label-md text-label-md px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer border border-outline-variant/30 text-xs font-semibold"
              title="Go Back (पीछे जाएं)"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Logo with matching NotesVault Shield */}
          <a
            className="flex items-center gap-space-sm group text-decoration-none cursor-pointer"
            onClick={(e) => { e.preventDefault(); onTabChange('landing'); }}
            title="Return to Home"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <NotesVaultLogo size="sm" showText={false} />
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md text-[#0b2545] tracking-tight leading-none group-hover:text-primary transition-colors font-black">
                NOTESVAULT
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium">School Notes Archive</span>
            </div>
          </a>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-space-xs p-1">
            <button
              className={`font-label-md text-label-md px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                activeTab === 'landing'
                  ? 'bg-surface-container-low text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => onTabChange('landing')}
            >
              Home
            </button>
            <button
              className={`font-label-md text-label-md px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-surface-container-low text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => onTabChange('browse')}
            >
              Browse Library
            </button>
            <button
              className={`font-label-md text-label-md px-space-md py-space-sm rounded-lg transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-surface-container-low text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
              onClick={() => onTabChange('upload')}
            >
              Upload Notes
            </button>
          </nav>
        </div>

        {/* User profile & Logout (NO sign-in button here once logged in) */}
        <div className="flex items-center gap-space-sm">
          {user && (
            <div className="flex items-center gap-space-sm">
              <div className="flex items-center gap-2 bg-surface-container-low py-1 px-3 rounded-full border border-outline-variant/30">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-[11px] font-bold">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-label-sm text-label-sm text-on-surface font-semibold max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
              </div>

              <button
                onClick={() => onTabChange('upload')}
                className="hidden sm:inline-flex items-center gap-1.5 font-label-md text-label-md px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary shadow-sm transition-all cursor-pointer font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>Upload</span>
              </button>

              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1 font-label-md text-label-md px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-all cursor-pointer shadow-xs font-medium"
                title="Log out of account"
              >
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
