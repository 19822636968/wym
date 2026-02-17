import React from 'react';
import { Heart, Target, Zap, Activity, LogOut, Trophy } from 'lucide-react';
import { COLORS } from '../constants';

interface HUDProps {
  isPlaying: boolean;
  score: number;
  highScore: number;
  lives: number;
  powerLevel: number;
  onStartGame: () => void;
  onExitGame: () => void;
  showCriticalHit: boolean;
}

const HUD: React.FC<HUDProps> = ({ 
  isPlaying, 
  score,
  highScore,
  lives, 
  powerLevel, 
  onStartGame,
  onExitGame,
  showCriticalHit
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-8 scanlines">
      
      {/* --- TOP HEADER --- */}
      <div className="flex justify-between items-start w-full">
        <div className="flex gap-4">
             {/* Left: Score */}
            <div className="bg-black/40 border border-cyan-500/50 backdrop-blur-sm p-4 rounded-br-2xl clip-path-polygon">
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Target size={18} />
                <span className="font-cyber text-xs tracking-widest opacity-80">SCORE DATA</span>
            </div>
            <div className="text-4xl font-mono text-white font-bold tracking-widest drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {score.toString().padStart(6, '0')}
            </div>
            </div>

            {/* ABORT BUTTON */}
            {isPlaying && (
                <button 
                    onClick={onExitGame}
                    className="pointer-events-auto h-12 px-4 bg-red-900/20 border border-red-500/50 text-red-400 font-cyber text-xs tracking-widest hover:bg-red-500/20 hover:text-red-200 transition-all flex items-center gap-2"
                >
                    <LogOut size={16} />
                    ABORT MISSION
                </button>
            )}
        </div>

        {/* Center: Power Level */}
        <div className="flex flex-col items-center w-1/3">
           <div className="flex justify-between w-full text-cyan-500 text-xs font-cyber mb-1">
              <span>SYS.NORMAL</span>
              <span>POWER LEVEL: MAX</span>
           </div>
           <div className="w-full h-4 bg-gray-900 border border-cyan-800 rounded-sm relative overflow-hidden skew-x-[-20deg]">
              {/* Animated Bar */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                style={{ width: `${powerLevel}%`, transition: 'width 0.2s ease-out' }}
              ></div>
              <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] opacity-50"></div>
           </div>
        </div>

        {/* Right: System Status */}
        <div className="text-right">
             <div className="text-pink-500 font-cyber text-sm tracking-widest animate-pulse">
                SYSTEM ONLINE
             </div>
             <div className="text-cyan-500/50 text-xs font-mono mt-1">
                LATENCY: 12ms<br/>
                FPS: 60
             </div>
        </div>
      </div>

      {/* --- CENTER OVERLAY (Start Screen) --- */}
      {!isPlaying && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
           <h1 className="text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 font-cyber tracking-tighter drop-shadow-[0_0_25px_rgba(0,243,255,0.8)] mb-2">
             NEON STRIKE
           </h1>
           <div className="text-cyan-400 font-mono tracking-[1em] text-sm mb-8 opacity-80">
              TACTICAL SHOOTER SIMULATION
           </div>
           
           {/* HIGH SCORE */}
           <div className="mb-12 flex items-center justify-center gap-3 text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              <Trophy size={24} />
              <span className="font-cyber font-bold text-xl tracking-widest">
                  HIGH SCORE: {highScore.toString().padStart(6, '0')}
              </span>
           </div>

           <button 
             onClick={onStartGame}
             className="group relative px-12 py-4 bg-transparent border border-cyan-500/50 text-cyan-400 font-cyber font-bold tracking-widest hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-white transition-all duration-300 overflow-hidden"
             onMouseEnter={() => import('../services/audioService').then(m => m.audioService.playSound(import('../types').then(t => t.SoundType.UI_HOVER) as any))}
             onMouseDown={() => import('../services/audioService').then(m => m.audioService.playSound(import('../types').then(t => t.SoundType.UI_CLICK) as any))}
           >
             <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 group-hover:h-full transition-all duration-300"></div>
             <div className="absolute top-0 right-0 w-1 h-full bg-cyan-500 group-hover:h-full transition-all duration-300"></div>
             <span className="relative z-10 flex items-center gap-3">
               <Zap size={20} className="animate-pulse" />
               START MISSION
             </span>
             {/* Background sweep */}
             <div className="absolute inset-0 bg-cyan-400/20 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
           </button>
        </div>
      )}

      {/* --- CRITICAL HIT POPUP --- */}
      {showCriticalHit && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full text-center pointer-events-none animate-bounce">
            <div className="text-yellow-400 font-black text-4xl font-cyber drop-shadow-[0_0_10px_rgba(255,230,0,0.8)] border-2 border-yellow-400 px-4 py-1 bg-black/50 skew-x-[-10deg]">
                CRITICAL HIT
            </div>
        </div>
      )}

      {/* --- BOTTOM HUD --- */}
      <div className="flex justify-between items-end w-full">
         {/* Left: Lives */}
         <div className="flex flex-col gap-2">
            <div className="text-cyan-500/80 font-cyber text-xs tracking-widest">LIFE SUPPORT</div>
            <div className="flex gap-2">
               {[...Array(3)].map((_, i) => (
                 <Heart 
                   key={i} 
                   size={32} 
                   fill={i < lives ? COLORS.danger : 'none'} 
                   className={`${i < lives ? 'text-red-500 drop-shadow-[0_0_8px_rgba(255,42,42,0.8)]' : 'text-gray-800'}`}
                 />
               ))}
            </div>
         </div>

         {/* Center: Decorative Reticle Lines */}
         <div className="flex-grow flex justify-center items-end px-12 opacity-30">
             <div className="w-full h-px bg-cyan-500 relative">
                 <div className="absolute left-0 bottom-0 w-2 h-4 bg-cyan-500"></div>
                 <div className="absolute right-0 bottom-0 w-2 h-4 bg-cyan-500"></div>
                 <div className="absolute left-1/2 bottom-0 w-12 h-2 bg-cyan-500 transform -translate-x-1/2"></div>
             </div>
         </div>

         {/* Right: Weapon Status */}
         <div className="text-right">
             <div className="flex items-center gap-2 justify-end text-cyan-400 mb-1">
                 <Activity size={16} />
                 <span className="font-cyber text-xs">WEAPON: LASER_V2</span>
             </div>
             <div className="text-2xl font-mono text-white/90">
                READY
             </div>
         </div>
      </div>
    </div>
  );
};

export default HUD;