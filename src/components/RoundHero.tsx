import React from 'react';
import { Sparkles, Image, Zap, Code2, MapPin, Flame, Trophy } from 'lucide-react';
import { ROUNDS_INFO } from '../data/mockData';
import { RoundNumber } from '../types';
import { sound } from '../utils/audio';

interface RoundHeroProps {
  activeRound: RoundNumber;
  onSelectRound: (round: RoundNumber) => void;
  timerSecondsRemaining?: number;
}

export const RoundHero: React.FC<RoundHeroProps> = ({
  activeRound,
  onSelectRound
}) => {
  const getRoundBg = (id: RoundNumber, isSelected: boolean) => {
    if (isSelected) return 'bg-[#FFFFFF] border-4 border-black shadow-[10px_10px_0_#000]';
    switch (id) {
      case 1:
        return 'bg-[#FFFFFF] border-4 border-black shadow-[6px_6px_0_#000]';
      case 2:
        return 'bg-[#00E5FF] border-4 border-black shadow-[6px_6px_0_#000]';
      case 3:
        return 'bg-[#00C853] border-4 border-black shadow-[6px_6px_0_#000]';
    }
  };

  return (
    <div className="bg-[#FFD600] border-b-4 border-black pt-10 sm:pt-14 pb-10 sm:pb-14 relative overflow-hidden">
      
      {/* Background Subtle Retro Scanlines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Loot Drop Style Hero Badge */}
        <div className="inline-flex items-center space-x-2 bg-black text-white px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-widest border-3 border-black shadow-[4px_4px_0_#000] mb-5 sm:mb-6">
          <Flame className="w-4 h-4 text-[#FFD600] fill-[#FFD600]" />
          <span>⚡ 3-ROUND AI CHALLENGE · ₹100 REGISTRATION</span>
        </div>

        {/* Big Chunky Hero Title (Loot Drop Style) */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight text-black leading-[0.92] mb-4 sm:mb-5 font-heading">
          PROMPT WARS<br/>
          <span className="text-black bg-white px-3 sm:px-5 border-4 border-black shadow-[6px_6px_0_#000] inline-block mt-1 sm:mt-2 transform -rotate-1">
            BATTLE OF MINDS
          </span>
        </h1>

        {/* Hero Subtitle with Inline Stat Boxes */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg font-bold text-black leading-relaxed mb-6">
          Where prompt engineering sprints meet real-time{' '}
          <span className="inline-block bg-[#FF4081] text-white border-2 border-black px-2 py-0.5 shadow-[2px_2px_0_#000] transform rotate-2 font-mono">NLP FORENSICS</span>.<br />
          <span className="text-[#FF4081] font-black uppercase text-base sm:text-xl underline decoration-3 decoration-black">
            Loot the leaderboard.
          </span>
        </p>

        {/* Live Arena Ticker Pill */}
        <a
          href={`#round-${activeRound}`}
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(`round-${activeRound}`) || document.getElementById('submission-portal');
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="inline-flex items-center space-x-2 bg-white border-2 border-black px-3.5 py-1 text-xs font-mono font-bold uppercase shadow-[3px_3px_0_#000] mb-8 hover:bg-[#FFD600] transition-colors cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] border border-black animate-ping"></span>
          <span>LIVE ARENA: ROUND 0{activeRound} COMPETITION ↓</span>
        </a>

        {/* 3 Rounds Interactive Cards Grid (Loot Drop Hero Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto text-left">
          {([1, 2, 3] as RoundNumber[]).map((roundId) => {
            const info = ROUNDS_INFO[roundId];
            const isSelected = activeRound === roundId;

            return (
              <a
                key={roundId}
                href={`#round-${roundId}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectRound(roundId);
                  sound.playBeep(650 + roundId * 50, 0.04);
                  if (window.location.hash !== `#round-${roundId}`) {
                    window.history.pushState(null, '', `#round-${roundId}`);
                  }
                  const target = document.getElementById(`round-${roundId}`) || document.getElementById('submission-portal');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`block p-5 cursor-pointer no-underline transition-all group ${getRoundBg(roundId, isSelected)} ${
                  roundId === 1 ? 'md:transform md:-rotate-1' : roundId === 2 ? 'md:transform md:rotate-1' : 'md:transform md:-rotate-1'
                } hover:transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0_#000]`}
              >
                {/* Header Strip */}
                <div className="flex items-center justify-between border-b-3 border-black pb-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-xs uppercase bg-black text-white px-2 py-0.5 border border-black">
                      R0{roundId}
                    </span>
                    <span className="font-heading font-black text-sm uppercase text-black">
                      {info.subtitle}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="bg-[#FF4081] text-white border-2 border-black font-mono font-bold text-[10px] px-2 py-0.5 shadow-[2px_2px_0_#000] uppercase inline-flex items-center space-x-1">
                      <span>ACTIVE</span>
                      <span>↓</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase font-bold text-black border border-black px-1.5 py-0.5 bg-white group-hover:bg-[#FFD600] inline-flex items-center space-x-1">
                      <span>ENTER</span>
                      <span>↓</span>
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-black text-lg sm:text-xl uppercase text-black mb-2 leading-tight group-hover:underline">
                  {info.title}
                </h3>

                <p className="text-xs font-medium text-black line-clamp-2 mb-4 leading-relaxed">
                  {info.description}
                </p>

                {/* Footer Strip */}
                <div className="border-t-3 border-black pt-2.5 flex items-center justify-between text-xs font-mono font-bold text-black">
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-black" />
                    <span>ROUND 0{roundId}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[11px] font-black uppercase text-black group-hover:text-[#FF4081] underline decoration-2">
                    <span>GO TO ARENA ↓</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </div>
  );
};
