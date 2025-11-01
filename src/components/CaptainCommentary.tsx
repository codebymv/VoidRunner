import React from 'react';
import talk1 from '../assets/talk1.png';

interface CaptainCommentaryProps {
  message: string;
}

export const CaptainCommentary: React.FC<CaptainCommentaryProps> = ({ message }) => {
  return (
    <div className="flex items-center gap-3 p-2">
      {/* Captain Headshot */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <img 
          src={talk1} 
          alt="Captain" 
          className="w-full h-full object-cover rounded-lg border-2 border-slate-500/50"
        />
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400/20 to-purple-400/20 pointer-events-none" />
      </div>

      {/* Message Content */}
      <div className="flex-1">
        <div className="text-xs font-bold text-blue-300 mb-1 font-sans">
          Captain
        </div>
        <div className="text-white text-sm leading-tight break-words font-sans">
          {message}
        </div>
      </div>
    </div>
  );
};