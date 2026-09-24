import React from 'react';
import { User } from 'firebase/auth';
import { StudentUser } from '../types';

interface LandingPageProps {
  onSelectRoute: (route: 'browse' | 'upload') => void;
  user: User | null;
  student?: StudentUser | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRoute, user, student }) => {
  const studentName = student?.name || user?.displayName || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-64px)] relative overflow-hidden bg-slate-50/70 py-10 sm:py-16">
      {/* Background ambient gradient blurs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Header Banner - Step 2 Welcome */}
      <div className="relative z-10 text-center mb-8 sm:mb-12 px-4 sm:px-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white shadow-xs rounded-full px-4 py-1.5 mb-4 border border-blue-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span className="text-xs text-blue-900 uppercase tracking-wider font-extrabold">
            NotesVault Academic Portal
          </span>
        </div>

        {/* User identification badge */}
        <div className="mb-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-800 text-xs sm:text-sm font-semibold">
          <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Logged In As</span>
            <span className="text-blue-950 font-extrabold">{studentName}</span>
            {student?.studentId && (
              <span className="ml-2 font-mono text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-200">
                ID: {student.studentId}
              </span>
            )}
            {student?.grade && (
              <span className="ml-1 text-[11px] text-slate-500 font-medium">
                • Class {student.grade}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl text-[#0b2545] tracking-tight mb-3 font-black">
          Welcome to NotesVault
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          What would you like to do today? Select an option below to get started:
        </p>
      </div>

      {/* 2 Big Primary Options: Download Notes & Upload Notes */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        
        {/* BIG OPTION 1: Download Notes */}
        <div 
          onClick={() => onSelectRoute('browse')}
          className="relative flex flex-col items-center text-center bg-white p-8 sm:p-10 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-blue-100 hover:border-blue-600 group cursor-pointer hover:-translate-y-1"
        >
          {/* Top highlight pill */}
          <div className="inline-block px-3.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black tracking-wider uppercase mb-5 border border-blue-200">
            Option 1 • Browse &amp; Search
          </div>

          {/* Large Vibrant Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[44px] sm:text-[50px]">download</span>
          </div>

          <h2 className="text-2xl sm:text-3xl text-[#0b2545] font-black mb-3">
            Download Notes
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed max-w-xs">
            Search notes by Unique ID (e.g. <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">BJS101</span>), filter by Class (5th to 12th), and download actual study PDFs.
          </p>

          <div className="mt-auto w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoute('browse');
              }}
              className="w-full flex items-center justify-center gap-2.5 text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 active:scale-[0.98] py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 cursor-pointer transition-all border-none font-black text-base sm:text-lg"
            >
              <span className="material-symbols-outlined text-[24px]">download</span>
              <span>Download Notes</span>
            </button>
          </div>
        </div>

        {/* BIG OPTION 2: Upload Notes */}
        <div 
          onClick={() => onSelectRoute('upload')}
          className="relative flex flex-col items-center text-center bg-white p-8 sm:p-10 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-indigo-100 hover:border-indigo-600 group cursor-pointer hover:-translate-y-1"
        >
          {/* Top highlight pill */}
          <div className="inline-block px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-black tracking-wider uppercase mb-5 border border-indigo-200">
            Option 2 • Contribute Material
          </div>

          {/* Large Vibrant Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[44px] sm:text-[50px]">cloud_upload</span>
          </div>

          <h2 className="text-2xl sm:text-3xl text-[#0b2545] font-black mb-3">
            Upload Notes
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed max-w-xs">
            Upload your handwritten class notes, textbook guides, and question banks directly to the vault with your custom Unique ID.
          </p>

          <div className="mt-auto w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRoute('upload');
              }}
              className="w-full flex items-center justify-center gap-2.5 text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-700 hover:via-blue-700 hover:to-sky-700 active:scale-[0.98] py-4 px-6 rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer transition-all border-none font-black text-base sm:text-lg"
            >
              <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
              <span>Upload Notes</span>
            </button>
          </div>
        </div>

      </div>

      {/* Helpful bottom guidance */}
      <div className="relative z-10 mt-10 text-center text-xs text-slate-500 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-blue-600">info</span>
        <span>You can switch between Download and Upload at any time using the navigation bar above.</span>
      </div>
    </div>
  );
};
