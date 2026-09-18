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
    sm: { width: 56, textSize: 'text-xs', subTextSize: 'text-[10px]', gap: 'gap-1.5' },
    md: { width: 140, textSize: 'text-xl', subTextSize: 'text-lg', gap: 'gap-2.5' },
    lg: { width: 220, textSize: 'text-3xl', subTextSize: 'text-3xl', gap: 'gap-3.5' },
    xl: { width: 310, textSize: 'text-4xl sm:text-5xl', subTextSize: 'text-4xl sm:text-5xl', gap: 'gap-5' },
  };

  const currentSize = sizeMap[size];

  // Ruled lines for notebook pages (Y positions from 60 to 186)
  const lineYs = [
    62, 70, 78, 86, 94, 102, 110, 118, 126, 134, 142, 150, 158, 166, 174, 182
  ];

  // Generate 36 ticks for circular combination vault dial on the left page
  const dialTicks = Array.from({ length: 36 }).map((_, i) => {
    const angle = (i * 10 * Math.PI) / 180;
    const isMajor = i % 3 === 0;
    const r1 = isMajor ? 21 : 23;
    const r2 = 27;
    const cx = 124;
    const cy = 122;
    const x1 = cx + r1 * Math.cos(angle);
    const y1 = cy + r1 * Math.sin(angle);
    const x2 = cx + r2 * Math.cos(angle);
    const y2 = cy + r2 * Math.sin(angle);
    return (
      <line
        key={`tick-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#7a90a6"
        strokeWidth={isMajor ? 1.4 : 0.8}
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className={`flex flex-col items-center justify-center text-center ${currentSize.gap} ${className}`}>
      {/* Precision Vector Emblem: Open Ledger with Vault Dial on Left Page & Shield Monogram on Right Page */}
      <svg
        width={currentSize.width}
        height={currentSize.width * 0.62}
        viewBox="0 0 400 248"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_12px_24px_rgba(10,30,54,0.12)] transition-transform hover:scale-[1.02]"
      >
        <defs>
          {/* Cover gradient: deep rich midnight navy */}
          <linearGradient id="coverGradient" x1="20" y1="30" x2="380" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0a1d35" />
            <stop offset="50%" stopColor="#0e2644" />
            <stop offset="100%" stopColor="#08172b" />
          </linearGradient>

          {/* Left Page Soft Paper Shading */}
          <linearGradient id="leftPageGradient" x1="40" y1="120" x2="200" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f4f7fb" />
            <stop offset="15%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e4ecf4" />
          </linearGradient>

          {/* Right Page Soft Paper Shading */}
          <linearGradient id="rightPageGradient" x1="200" y1="120" x2="360" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e4ecf4" />
            <stop offset="15%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f4f7fb" />
          </linearGradient>

          {/* Spine Gutter Shadow */}
          <linearGradient id="gutterShadow" x1="190" y1="120" x2="210" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0a1d35" stopOpacity="0" />
            <stop offset="48%" stopColor="#0a1d35" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#0a1d35" stopOpacity="0.4" />
            <stop offset="52%" stopColor="#0a1d35" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0a1d35" stopOpacity="0" />
          </linearGradient>

          {/* Gold bookmark ribbon stitch gradient */}
          <linearGradient id="goldRibbon" x1="195" y1="202" x2="205" y2="216" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e5be5a" />
            <stop offset="50%" stopColor="#c59828" />
            <stop offset="100%" stopColor="#9a7114" />
          </linearGradient>
        </defs>

        {/* Outer Hardcover Base & Trim */}
        {/* Left Hardcover */}
        <path
          d="M 28 42 L 198 38 L 198 214 L 26 210 Z"
          fill="url(#coverGradient)"
        />
        {/* Right Hardcover */}
        <path
          d="M 202 38 L 372 42 L 374 210 L 202 214 Z"
          fill="url(#coverGradient)"
        />

        {/* Stacked Paper Edges (Book thickness on left & right sides) */}
        {/* Left Stacked Edges */}
        <path d="M 28 46 L 36 50 L 36 202 L 28 206 Z" fill="#cfdbe7" />
        <line x1="30" y1="48" x2="30" y2="205" stroke="#9bb1c6" strokeWidth="0.8" />
        <line x1="33" y1="49" x2="33" y2="203" stroke="#b4c7d9" strokeWidth="0.8" />

        {/* Right Stacked Edges */}
        <path d="M 372 46 L 364 50 L 364 202 L 372 206 Z" fill="#cfdbe7" />
        <line x1="370" y1="48" x2="370" y2="205" stroke="#9bb1c6" strokeWidth="0.8" />
        <line x1="367" y1="49" x2="367" y2="203" stroke="#b4c7d9" strokeWidth="0.8" />

        {/* Left Page Surface (Curved open leaf) */}
        <path
          d="M 200 44 C 160 38 75 42 36 50 L 36 200 C 75 194 160 196 200 204 Z"
          fill="url(#leftPageGradient)"
          stroke="#9fb4c7"
          strokeWidth="1.2"
        />

        {/* Right Page Surface (Curved open leaf) */}
        <path
          d="M 200 44 C 240 38 325 42 364 50 L 364 200 C 325 194 240 196 200 204 Z"
          fill="url(#rightPageGradient)"
          stroke="#9fb4c7"
          strokeWidth="1.2"
        />

        {/* Horizontal Ruled Notebook Lines - Left Page */}
        {lineYs.map((y) => (
          <path
            key={`left-line-${y}`}
            d={`M 48 ${y} C 85 ${y - 2} 155 ${y - 1} 190 ${y + 1}`}
            stroke="#9ab0c5"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
        ))}

        {/* Horizontal Ruled Notebook Lines - Right Page */}
        {lineYs.map((y) => (
          <path
            key={`right-line-${y}`}
            d={`M 210 ${y + 1} C 245 ${y - 1} 315 ${y - 2} 352 ${y}`}
            stroke="#9ab0c5"
            strokeWidth="1.15"
            strokeLinecap="round"
          />
        ))}

        {/* LEFT PAGE WATERMARK: Circular Vault Combination Dial */}
        <g opacity="0.88">
          {/* Outer Ring */}
          <circle cx="124" cy="122" r="34" stroke="#7a90a6" strokeWidth="2.4" fill="#e8edf3" fillOpacity="0.45" />
          
          {/* Intermediate Dial Ring with Tick Marks */}
          <circle cx="124" cy="122" r="27" stroke="#7a90a6" strokeWidth="1.2" fill="none" />
          <circle cx="124" cy="122" r="20" stroke="#7a90a6" strokeWidth="1" fill="none" />
          {dialTicks}

          {/* Inner Shaded Dial Wheel */}
          <circle cx="124" cy="122" r="16" stroke="#7a90a6" strokeWidth="1.8" fill="#d2dce6" />
          
          {/* Center Knob */}
          <circle cx="124" cy="122" r="8.5" stroke="#688096" strokeWidth="1.6" fill="#b1c2d3" />
          <circle cx="124" cy="122" r="3" fill="#50677c" />
        </g>

        {/* RIGHT PAGE WATERMARK: Vault Shield with 'N' & Keyhole */}
        <g opacity="0.88">
          {/* Shield Outline */}
          <path
            d="M 276 90 L 306 101 C 308 124 309 146 298 165 C 290 178 281 187 276 191 C 271 187 262 178 254 165 C 243 146 244 124 246 101 Z"
            stroke="#7a90a6"
            strokeWidth="2.4"
            fill="#e8edf3"
            fillOpacity="0.45"
          />

          {/* Keyhole Silhouette at top center of shield */}
          <circle cx="276" cy="111" r="4.2" fill="#7a90a6" />
          <polygon points="274,113 278,113 279,121 273,121" fill="#7a90a6" />

          {/* Top Right Book Pages Lines inside shield */}
          <line x1="284" y1="108" x2="296" y2="108" stroke="#7a90a6" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="284" y1="113" x2="296" y2="113" stroke="#7a90a6" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="284" y1="118" x2="296" y2="118" stroke="#7a90a6" strokeWidth="1.6" strokeLinecap="round" />

          {/* Stylized 'N' Monogram */}
          {/* Left Vertical Bar */}
          <path d="M 261 123 L 267 123 L 267 165 L 261 165 Z" fill="#7a90a6" />
          {/* Diagonal Stroke */}
          <path d="M 267 123 L 285 165 L 291 165 L 267 123 Z" fill="#7a90a6" />
          {/* Right Vertical Bar */}
          <path d="M 285 123 L 291 123 L 291 165 L 285 165 Z" fill="#7a90a6" />
        </g>

        {/* Center Spine Crease & Shadow Gutter */}
        <rect x="194" y="40" width="12" height="166" fill="url(#gutterShadow)" />
        <line x1="200" y1="44" x2="200" y2="204" stroke="#7c92a6" strokeWidth="1.2" />

        {/* Gold Bottom Spine Ribbon Stitch Accent */}
        <path
          d="M 195 204 L 205 204 L 206 215 L 194 215 Z"
          fill="url(#goldRibbon)"
          stroke="#8c6812"
          strokeWidth="0.8"
        />
        <circle cx="200" cy="209" r="1.2" fill="#fff3cf" />
      </svg>

      {/* Typography: NOTES VAULT matching the exact styling in the uploaded design */}
      {showText && (
        <div className="flex flex-col items-center select-none text-center leading-none">
          <span
            className={`${currentSize.textSize} font-black text-[#0a1e36] font-sans tracking-[0.20em] uppercase`}
            style={{ letterSpacing: '0.20em' }}
          >
            NOTES
          </span>
          <span
            className={`${currentSize.subTextSize} font-black text-[#0a1e36] font-sans tracking-[0.26em] uppercase mt-1 sm:mt-1.5`}
            style={{ letterSpacing: '0.26em' }}
          >
            VAULT
          </span>
        </div>
      )}
    </div>
  );
};
