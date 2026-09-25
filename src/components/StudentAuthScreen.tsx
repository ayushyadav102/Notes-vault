import React, { useState } from 'react';
import { NotesVaultLogo } from './NotesVaultLogo';
import { registerStudent, loginStudent, isValidEmailId, isValidPassword } from '../lib/studentAuth';
import { StudentUser } from '../types';

interface StudentAuthScreenProps {
  onAuthSuccess: (student: StudentUser) => void;
}

export const StudentAuthScreen: React.FC<StudentAuthScreenProps> = ({
  onAuthSuccess,
}) => {
  // Check if device previously had an account to default to Login or Register
  const [mode, setMode] = useState<'register' | 'login'>(() => {
    const hasPreviousAccount = localStorage.getItem('notesvault_has_account');
    return hasPreviousAccount ? 'login' : 'register';
  });

  // Register Form Fields (Only Name, User ID, and Password as requested)
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login Form Fields
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time password requirement checks
  const hasLetters = /[a-zA-Z]/.test(regPassword);
  const hasAt = regPassword.includes('@');
  const hasNumbers = /[0-9]/.test(regPassword);
  const hasMinLength = regPassword.length >= 4;
  const isPasswordValid = hasMinLength;
  const isEmailValid = isValidEmailId(studentId);

  // Handle Register (Create Account)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }
    if (!studentId.trim()) {
      setErrorMessage('Please choose a Username / User ID in email format.');
      return;
    }
    if (!isValidEmailId(studentId.trim())) {
      setErrorMessage('User ID must be a valid email format (e.g., ayush@123gmail.com).');
      return;
    }
    const pwdCheck = isValidPassword(regPassword);
    if (!pwdCheck.valid) {
      setErrorMessage(pwdCheck.message || "Password must contain letters, '@', and numbers (e.g., ayush@123).");
      return;
    }

    setLoading(true);
    try {
      const student = await registerStudent({
        name: name.trim(),
        studentId: studentId.trim(),
        password: regPassword,
      });

      localStorage.setItem('notesvault_has_account', 'true');
      setSuccessMessage(`Account created successfully! Welcome, ${student.name}...`);
      setTimeout(() => {
        onAuthSuccess(student);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginId.trim()) {
      setErrorMessage('Please enter your User ID.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your Password.');
      return;
    }

    setLoading(true);
    try {
      const student = await loginStudent({
        studentId: loginId.trim(),
        password: loginPassword,
      });

      localStorage.setItem('notesvault_has_account', 'true');
      setSuccessMessage(`Welcome back, ${student.name}!`);
      setTimeout(() => {
        onAuthSuccess(student);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your User ID and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071324] via-[#0b1f3b] to-[#0f2d52] flex flex-col items-center justify-center p-3 sm:p-6 font-sans relative overflow-hidden">
      
      {/* Background Ambient Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-gradient-to-b from-blue-500/20 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-500/15 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600/15 blur-[100px] pointer-events-none rounded-full" />

      {/* Main Card Container */}
      <div className="w-full max-w-[430px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_30px_rgba(37,99,235,0.15)] border-2 border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Section with Deep Navy Gradient & Logo Emblem */}
        <div className="bg-gradient-to-b from-[#091b33] via-[#0d264a] to-[#12335f] px-6 pt-8 pb-7 text-white text-center relative overflow-hidden">
          {/* Subtle Geometric Dot Grid Pattern */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#93c5fd_1.2px,transparent_1.2px)] [background-size:16px_16px]"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {/* White pill box containing the emblem */}
            <div className="w-16 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/30 p-1.5 mb-3 ring-4 ring-white/15 transform hover:scale-105 transition-transform">
              <NotesVaultLogo size="sm" showText={false} />
            </div>

            <h1 className="text-2xl font-serif font-black tracking-[0.22em] text-white uppercase drop-shadow-md">
              NOTESVAULT
            </h1>
            <p className="text-xs text-blue-200 font-bold mt-1 tracking-normal flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Class 5 to 12 Verified Study Notes &amp; Exam Materials</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher: Register (Create Account) vs Log In */}
        <div className="px-5 pt-5 pb-1">
          <div className="p-1.5 bg-slate-100/90 rounded-2xl flex items-center gap-1.5 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 bg-transparent'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${mode === 'register' ? 'text-white' : 'text-blue-600'}`}>
                person_add
              </span>
              <span>Register</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 bg-transparent'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${mode === 'login' ? 'text-white' : 'text-indigo-600'}`}>
                login
              </span>
              <span>Log In</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 pt-3">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-xs text-rose-900 font-bold flex items-start gap-2.5 shadow-sm animate-in fade-in">
              <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0">error</span>
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
              <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">check_circle</span>
              <span className="leading-snug">{successMessage}</span>
            </div>
          )}

          {/* ================= MODE: REGISTER (CREATE USER ACCOUNT) ================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="text-left">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/90 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border border-blue-200/80">
                  <span className="material-symbols-outlined text-[14px]">stars</span>
                  CREATE ACCOUNT
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2 font-serif tracking-tight">
                  Create User Account
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Create your personal user profile to read &amp; download notes.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 text-left">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all shadow-2xs overflow-hidden">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[20px]">
                    person
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-11 pr-4 py-3 bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                </div>
              </div>

              {/* Username / User ID in Email Format */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 text-left">
                  User ID / Email ID <span className="text-rose-500">*</span>
                </label>
                <div className={`relative flex items-center bg-slate-50 border-2 ${studentId && !isEmailValid ? 'border-rose-400 focus-within:border-rose-600' : 'border-slate-200 focus-within:border-blue-600'} focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all shadow-2xs overflow-hidden`}>
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[20px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. ayush@123gmail.com"
                    className="w-full pl-11 pr-4 py-3 bg-transparent text-sm font-black text-slate-900 font-mono placeholder:text-slate-400 placeholder:font-normal focus:outline-none lowercase"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-left">
                  {studentId.trim().length === 0 ? (
                    <span className="text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-blue-600">info</span>
                      <span>Must be in email format (e.g. ayush@123gmail.com)</span>
                    </span>
                  ) : isEmailValid ? (
                    <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                      <span>Valid email ID format</span>
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      <span className="material-symbols-outlined text-[14px] text-rose-600">cancel</span>
                      <span>Must be valid email format (e.g. ayush@123gmail.com)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 text-left">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className={`relative flex items-center bg-slate-50 border-2 ${regPassword && !isPasswordValid ? 'border-amber-400 focus-within:border-blue-600' : 'border-slate-200 focus-within:border-blue-600'} focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all shadow-2xs overflow-hidden`}>
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[20px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="e.g. ayush@123"
                    className="w-full pl-11 pr-11 py-3 bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 cursor-pointer border-none bg-transparent p-1 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Real-time Password Requirements Checklist */}
                <div className="mt-2 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 text-[11px] space-y-1.5 text-left">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Password Requirements (e.g. ayush@123):</span>
                    {isPasswordValid && (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5 bg-emerald-100/90 px-1.5 py-0.5 rounded text-[10px]">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        <span>Valid</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 font-semibold">
                    <div className={`flex items-center gap-1.5 ${hasLetters ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {hasLetters ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Letters (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasAt ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {hasAt ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>'@' symbol</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumbers ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {hasNumbers ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Numbers (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Min 6 characters</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show password checkbox */}
              <div className="flex items-center text-xs text-slate-700 pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none font-bold">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer border-slate-300"
                  />
                  <span>Show password</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-extrabold text-sm tracking-wide rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account &amp; Continue</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs font-semibold text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-blue-700 font-black hover:underline cursor-pointer border-none bg-transparent p-0 ml-1"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ================= MODE: LOGIN (USER LOGIN) ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-left">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border border-emerald-200/80">
                  <span className="material-symbols-outlined text-[14px]">login</span>
                  RETURNING USER
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2 font-serif tracking-tight">
                  User Login
                </h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Enter your User ID and Password created on your Mobile or PC.
                </p>
                <div className="mt-2.5 p-2.5 bg-blue-50/80 border border-blue-200/90 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-blue-600 shrink-0">devices</span>
                  <span className="font-semibold leading-tight">
                    Any account created from Mobile is automatically synced and accessible here on PC!
                  </span>
                </div>
              </div>

              {/* User ID */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 text-left">
                  User ID / Email ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all shadow-2xs overflow-hidden">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[20px]">
                    mail
                  </span>
                  <input
                    type="text"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="e.g. ayush@123gmail.com"
                    className="w-full pl-11 pr-4 py-3 bg-transparent text-sm font-black text-slate-900 font-mono placeholder:text-slate-400 placeholder:font-normal focus:outline-none lowercase"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 text-left">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 rounded-2xl transition-all shadow-2xs overflow-hidden">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[20px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="e.g. ayush@123"
                    className="w-full pl-11 pr-11 py-3 bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-700 cursor-pointer border-none bg-transparent p-1 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember on this device note */}
              <div className="text-left flex items-center gap-1.5 text-slate-500">
                <span className="material-symbols-outlined text-[15px] text-blue-600">verified</span>
                <span className="text-xs font-semibold">
                  Remember this device for seamless access.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-extrabold text-sm tracking-wide rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Library</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs font-semibold text-slate-600">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                    }}
                    className="text-blue-700 font-black hover:underline cursor-pointer border-none bg-transparent p-0 ml-1"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Security / Info Badge */}
        <div className="py-3.5 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
          <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">verified_user</span>
          <span>NotesVault Secure User Archive</span>
        </div>
      </div>
    </div>
  );
};
