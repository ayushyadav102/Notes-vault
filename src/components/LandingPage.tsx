import React from 'react';
import { User } from 'firebase/auth';

interface LandingPageProps {
  onSelectRoute: (route: 'browse' | 'upload') => void;
  user: User | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRoute }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-64px)] relative overflow-hidden bg-surface py-space-xl">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="relative z-10 text-center mb-space-xl px-margin">
        <div className="inline-flex items-center gap-space-xs bg-surface-container-lowest shadow-sm rounded-full px-space-md py-space-xs mb-space-md border border-outline-variant/30">
          <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse"></span>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">
            Academic Notes Repository
          </span>
        </div>
        <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight mb-space-sm max-w-2xl mx-auto font-bold">
          Welcome to NotesVault
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
          Find verified school notes, study guides & exam prep for Classes 5 to 12. Stored securely in real-time cloud database.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-margin grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {/* Browse Library Card */}
        <div className="relative flex flex-col items-center text-center bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-outline-variant/20 hover:border-primary/40">
          <div className="w-20 h-20 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center mb-space-lg shadow-sm">
            <span className="material-symbols-outlined text-[40px]">menu_book</span>
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold tracking-wide uppercase mb-2">
            Student Archive
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-xs">
            Browse & Download Notes
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            Explore categorized notes by Class (5th to 12th), read summaries, and download study PDFs.
          </p>

          <div className="mt-auto w-full">
            <button
              onClick={() => onSelectRoute('browse')}
              className="w-full flex items-center justify-center gap-space-xs font-label-md text-label-md text-on-primary bg-primary hover:bg-primary/90 py-3 rounded-xl shadow-sm cursor-pointer transition-all border-none font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span>Open Library</span>
            </button>
          </div>
        </div>

        {/* Upload Notes Card */}
        <div className="relative flex flex-col items-center text-center bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-outline-variant/20 hover:border-primary/40">
          <div className="w-20 h-20 rounded-2xl bg-primary-container text-primary flex items-center justify-center mb-space-lg shadow-sm">
            <span className="material-symbols-outlined text-[40px]">cloud_upload</span>
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary text-[11px] font-bold tracking-wide uppercase mb-2">
            Contribute
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-xs">
            Upload & Share Notes
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            Share your handwritten class notes, formula summaries, and question banks directly to the database.
          </p>

          <div className="mt-auto w-full">
            <button
              onClick={() => onSelectRoute('upload')}
              className="w-full flex items-center justify-center gap-space-xs font-label-md text-label-md text-on-primary bg-primary-container hover:bg-primary py-3 rounded-xl shadow-sm cursor-pointer transition-all border-none font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Study Material</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
