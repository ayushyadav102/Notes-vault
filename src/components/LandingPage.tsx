import React from 'react';

interface LandingPageProps {
  onSelectRoute: (route: 'browse' | 'upload') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRoute }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-64px)] relative overflow-hidden bg-surface py-space-xl">
      {/* Background Accents */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-fixed/20 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-secondary-fixed/20 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="relative z-10 text-center mb-space-xl px-margin">
        <div className="inline-flex items-center gap-space-xs bg-surface-container-lowest shadow-sm rounded-full px-space-md py-space-xs mb-space-md">
          <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse"></span>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">School Archive Portal</span>
        </div>
        <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight mb-space-sm max-w-2xl mx-auto">
          Welcome to NotesVault
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
          The dependable academic repository for school study. Choose your path below.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-margin grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {/* Browse Card */}
        <button
          onClick={() => onSelectRoute('browse')}
          className="group relative flex flex-col items-center text-center bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-transparent hover:border-primary/20 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-20 h-20 rounded-2xl bg-primary-container text-primary flex items-center justify-center mb-space-lg group-hover:scale-105 transition-transform shadow-sm">
            <span className="material-symbols-outlined text-[40px]">library_books</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-xs group-hover:text-primary transition-colors">Find Notes</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            Browse our extensive catalog of verified lecture slides, study guides, and exam papers for Classes 5 to 12.
          </p>
          <div className="mt-auto flex items-center gap-space-xs font-label-md text-label-md text-on-primary bg-primary px-space-lg py-space-sm rounded-lg shadow-sm">
            <span>Explore Library</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </button>

        {/* Upload Card */}
        <button
          onClick={() => onSelectRoute('upload')}
          className="group relative flex flex-col items-center text-center bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-transparent hover:border-secondary/20 cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-secondary-fixed/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-20 h-20 rounded-2xl bg-secondary-container text-secondary flex items-center justify-center mb-space-lg group-hover:scale-105 transition-transform shadow-sm">
            <span className="material-symbols-outlined text-[40px]">cloud_upload</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-xs group-hover:text-secondary transition-colors">Share Notes</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
            Contribute to the school archive. Upload your study materials and earn academic badges.
          </p>
          <div className="mt-auto flex items-center gap-space-xs font-label-md text-label-md text-on-secondary bg-secondary px-space-lg py-space-sm rounded-lg shadow-sm">
            <span>Upload Files</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </button>
      </div>
    </div>
  );
};
