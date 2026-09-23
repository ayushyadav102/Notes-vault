import React, { useState } from 'react';
import { NotesVaultLogo } from './NotesVaultLogo';

interface CachedUser {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

interface SplashAuthScreenProps {
  onGoogleSignIn: () => Promise<unknown>;
  onGuestSignIn?: () => void;
  user?: CachedUser | null;
  onEnterApp: () => void;
  isLoading?: boolean;
}

export const SplashAuthScreen: React.FC<SplashAuthScreenProps> = ({
  onGoogleSignIn,
  onGuestSignIn,
  user = null,
  onEnterApp,
  isLoading = false,
}) => {
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      const res = await onGoogleSignIn();
      if (res) {
        onEnterApp();
      }
    } catch (err: unknown) {
      console.error('Google Sign In failed:', err);
      const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setErrorMsg(message);
    } finally {
      setSigningIn(false);
    }
  };

  const userName = user?.displayName || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] px-4 select-none relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-slate-200/60 blur-3xl pointer-events-none" />

      {/* Main Center Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-[0_20px_50px_rgba(15,37,68,0.08)] p-8 sm:p-10 flex flex-col items-center text-center transition-all duration-500 z-10">
        
        {/* NotesVault Logo */}
        <div className="mb-6 transform transition-transform duration-700 hover:scale-105">
          <NotesVaultLogo size="xl" showText={true} />
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mb-6">
          Access verified school notes, PDF study guides, and previous exam materials for Classes 5 to 12.
        </p>

        {/* Dynamic Section: If already logged in, show Welcome & Enter button */}
        {user ? (
          <div className="w-full space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 text-left">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={userName}
                  className="w-11 h-11 rounded-full object-cover border border-slate-300 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#164373] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-slate-500 font-medium">Signed In as</span>
                <span className="text-sm font-bold text-[#0b2545] truncate">
                  {userName}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                  <span>Ready to explore</span>
                </span>
              </div>
            </div>

            {/* Direct Enter Button */}
            <button
              type="button"
              onClick={onEnterApp}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white bg-[#164373] hover:bg-[#0b2545] shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.99] border-none"
            >
              <span>Continue to Notes Library</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        ) : (
          /* First time visitor / Logged out: Primary Google Sign In Button */
          <div className="w-full space-y-3.5">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={signingIn || isLoading}
              className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-sm cursor-pointer border ${
                signingIn || isLoading
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400 hover:shadow active:scale-[0.99]'
              }`}
            >
              {/* Google G Logo */}
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>

              <span>
                {signingIn ? 'Connecting to Google...' : 'Sign In with Google'}
              </span>
            </button>

            {/* Continue as Student / Guest Button */}
            {onGuestSignIn && !errorMsg && (
              <>
                <div className="flex items-center gap-2 my-1">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-[11px] text-slate-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={onGuestSignIn}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-[#164373] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[18px]">school</span>
                  <span>Continue as Student (Direct Access)</span>
                </button>
              </>
            )}

            {errorMsg && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 font-medium text-left leading-relaxed shadow-xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span className="material-symbols-outlined text-[18px] text-amber-700">lock</span>
                  <span>Domain Authorization Required</span>
                </div>
                <p className="text-slate-700 text-xs">{errorMsg}</p>

                {window.location.hostname !== 'localhost' && (
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-800 truncate select-all">
                      {window.location.hostname}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.hostname);
                        alert(`Copied "${window.location.hostname}"! Ab Firebase Console me add karein.`);
                      }}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded border border-blue-200 cursor-pointer flex-shrink-0"
                    >
                      Copy Domain
                    </button>
                  </div>
                )}

                <div className="pt-1 flex flex-col gap-2">
                  <a
                    href="https://console.firebase.google.com/project/notes-vault-b1141/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs text-center transition-all"
                  >
                    <span>Open Firebase Settings</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>

                  {onGuestSignIn && (
                    <button
                      type="button"
                      onClick={onGuestSignIn}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-[#164373] text-white font-bold text-xs shadow-xs cursor-pointer border-none transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">school</span>
                      <span>Continue as Guest (Bina Sign In ke)</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {onGuestSignIn && !errorMsg && (
              <button
                type="button"
                onClick={onGuestSignIn}
                className="w-full text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer bg-transparent border-none py-1.5 transition-colors"
              >
                Or Continue as Guest
              </button>
            )}

            <p className="text-xs text-slate-500 mt-2">
              Sign in once with Google to upload, edit, and access all class notes.
            </p>
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="mt-8 text-xs text-slate-500">
        NotesVault • Verified School & College Notes Archive
      </div>
    </div>
  );
};

