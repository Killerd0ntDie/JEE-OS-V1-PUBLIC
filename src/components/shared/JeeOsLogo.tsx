import React from 'react';

interface JeeOsLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const JeeOsLogo: React.FC<JeeOsLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shrink-0 shadow-lg shadow-indigo-600/30 border border-indigo-400/30 overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/50 ${sizeClasses[size]} ${className}`}>
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_60%)]" />
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 rounded-xl opacity-20 blur-sm group-hover:opacity-40 transition duration-500" />
      
      {/* Futuristic Vector Geometry */}
      <svg className="w-5 h-5 relative z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-40" />
        <path d="M12 6L6 9.5V14.5L12 18L18 14.5V9.5L12 6Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14.5 9V13.5C14.5 14.8807 13.3807 16 12 16C10.6193 16 9.5 14.8807 9.5 13.5V13" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="14.5" cy="8" r="1.25" fill="#38BDF8" className="animate-pulse" />
      </svg>
    </div>
  );
};
