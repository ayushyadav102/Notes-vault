import React from 'react';

interface FooterProps {
  onTabChange: (tab: 'landing' | 'browse' | 'upload') => void;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="w-full bg-surface-container-low mt-auto">
      <div className="max-w-7xl mx-auto px-margin py-space-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <p className="font-caption text-caption text-on-surface-variant">© 2024 NotesVault / School Archive.</p>
        </div>
      </div>
    </footer>
  );
};
