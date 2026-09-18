import React from 'react';

interface NotesVaultLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const NotesVaultLogo: React.FC<NotesVaultLogoProps> = ({
  size = 'lg',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { shield: 38, textSize: 'text-sm', subTextSize: 'text-xs', gap: 'gap-2' },
    md: { shield: 64, textSize: 'text-xl', subTextSize: 'text-lg', gap: 'gap-2.5' },
    lg: { shield: 110, textSize: 'text-3xl', subTextSize: 'text-3xl', gap: 'gap-4' },
    xl: { shield: 150, textSize: 'text-4xl', subTextSize: 'text-4xl', gap: 'gap-5' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${currentSize.gap} ${className}`}>
      {/* Precision Vector Shield matching the uploaded design */}
      <svg
        width={currentSize.shield}
        height={currentSize.shield * 1.16}
        viewBox="0 0 200 232"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-md transition-transform hover:scale-102"
      >
        <defs>
          {/* Shield gradient matching deep navy & steel blue */}
          <linearGradient id="shieldBorderGrad" x1="20" y1="10" x2="180" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#25598d" />
            <stop offset="50%" stopColor="#143c68" />
            <stop offset="100%" stopColor="#0a2240" />
          </linearGradient>
          <linearGradient id="shieldFillGrad" x1="100" y1="20" x2="100" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#164373" />
            <stop offset="100%" stopColor="#0b2444" />
          </linearGradient>
        </defs>

        {/* Outer Shield Border */}
        <path
          d="M100 12 L168 34 C172 78 174 122 154 162 C138 194 112 216 100 224 C88 216 62 194 46 162 C26 122 28 78 32 34 Z"
          fill="url(#shieldBorderGrad)"
        />

        {/* Inner Shield Cavity */}
        <path
          d="M100 22 L158 41 C162 80 163 118 145 154 C131 182 109 202 100 210 C91 202 69 182 55 154 C37 118 38 80 42 41 Z"
          fill="url(#shieldFillGrad)"
        />

        {/* Top Keyhole Silhouette */}
        {/* Keyhole Head */}
        <circle cx="100" cy="62" r="9.5" fill="#FFFFFF" />
        {/* Keyhole Slot */}
        <polygon points="95.5,67 104.5,67 107,81 93,81" fill="#FFFFFF" />

        {/* Horizontal Book Pages Lines (right of keyhole) */}
        <line x1="117" y1="54" x2="137" y2="54" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <line x1="117" y1="63" x2="137" y2="63" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        <line x1="117" y1="72" x2="137" y2="72" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />

        {/* Angled roof/line connecting to shield right corner */}
        <path d="M100 44 L138 52" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />

        {/* Stylized Bold 'N' Monogram */}
        {/* Left Vertical Column */}
        <path
          d="M62 76 L74 76 L74 158 L62 158 Z"
          fill="#FFFFFF"
        />

        {/* Diagonal Stroke of N */}
        <path
          d="M74 78 L126 156 L138 156 L74 78 Z"
          fill="#FFFFFF"
        />

        {/* Right Vertical Column of N */}
        <path
          d="M126 78 L138 78 L138 158 L126 158 Z"
          fill="#FFFFFF"
        />

        {/* Bottom Connecting Base Accent */}
        <path
          d="M62 158 L100 186 L138 158"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Typography: NOTES VAULT in two bold stacked lines */}
      {showText && (
        <div className="flex flex-col items-center tracking-wider select-none leading-none">
          <span
            className={`${currentSize.textSize} font-black text-[#0b2545] font-sans tracking-[0.18em] uppercase`}
            style={{ letterSpacing: '0.18em' }}
          >
            NOTES
          </span>
          <span
            className={`${currentSize.subTextSize} font-black text-[#0b2545] font-sans tracking-[0.24em] uppercase mt-1`}
            style={{ letterSpacing: '0.24em' }}
          >
            VAULT
          </span>
        </div>
      )}
    </div>
  );
};
