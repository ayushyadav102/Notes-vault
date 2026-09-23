import React from 'react';
import { User } from 'firebase/auth';

interface LandingPageProps {
  onSelectRoute: (route: 'browse' | 'upload') => void;
  user: User | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRoute, user }) => {
  const userName = user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-64px)] relative overflow-hidden bg-slate-50/60 py-10 sm:py-16">
      {/* Background ambient gradient blurs */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-blue-100/50 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-0"></div>

      {/* Header Banner */}
      <div className="relative z-10 text-center mb-8 px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 bg-white shadow-xs rounded-full px-4 py-1.5 mb-4 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block animate-pulse"></span>
          <span className="text-xs text-blue-800 uppercase tracking-wider font-bold">
            Academic Notes Repository
          </span>
        </div>

        {user ? (
          <div className="mb-3 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold animate-in fade-in">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
            <span>Welcome, {userName}!</span>
          </div>
        ) : null}

        <h1 className="text-3xl sm:text-4xl md:text-5xl text-[#0b2545] tracking-tight mb-3 max-w-2xl mx-auto font-black">
          Welcome to NotesVault
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          Find verified school notes, study guides & exam prep for Classes 5 to 12. Stored securely in real-time cloud database.
        </p>
      </div>

      {/* 2 Primary Action Cards */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Browse Library Card */}
        <div className="relative flex flex-col items-center text-center bg-white p-7 sm:p-9 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/90 hover:border-blue-400 group">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-5 shadow-xs group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[38px] sm:text-[42px]">menu_book</span>
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold tracking-wide uppercase mb-3 border border-indigo-100">
            Student Archive
          </div>
          <h2 className="text-xl sm:text-2xl text-[#0b2545] font-bold mb-2">
            Browse & Download Notes
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed">
            Explore categorized notes by Class (5th to 12th), read summaries, and download study PDFs.
          </p>

          <div className="mt-auto w-full">
            <button
              onClick={() => onSelectRoute('browse')}
              className="w-full flex items-center justify-center gap-2 text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 active:scale-[0.98] py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 cursor-pointer transition-all border-none font-black text-sm sm:text-base"
            >
              <span className="material-symbols-outlined text-[22px]">travel_explore</span>
              <span>Open Library</span>
            </button>
          </div>
        </div>

        {/* Upload Notes Card - Beautiful Blueish Styling */}
        <div className="relative flex flex-col items-center text-center bg-white p-7 sm:p-9 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/90 hover:border-blue-500 group">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-5 shadow-xs group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[38px] sm:text-[42px]">cloud_upload</span>
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold tracking-wide uppercase mb-3 border border-blue-100">
            Contribute
          </div>
          <h2 className="text-xl sm:text-2xl text-[#0b2545] font-bold mb-2">
            Upload & Share Notes
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6 leading-relaxed">
            Share your handwritten class notes, formula summaries, and question banks directly to the database.
          </p>

          <div className="mt-auto w-full">
            {/* Rich Blueish Action Button */}
            <button
              onClick={() => onSelectRoute('upload')}
              className="w-full flex items-center justify-center gap-2 text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 active:scale-[0.98] py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 cursor-pointer transition-all border-none font-black text-sm sm:text-base"
            >
              <span className="material-symbols-outlined text-[22px]">upload_file</span>
              <span>Upload Study Material</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
