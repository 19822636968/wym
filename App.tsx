import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import { audioService } from './services/audioService';
import { SoundType } from './types';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [powerLevel, setPowerLevel] = useState(100);
  const [criticalHitVisible, setCriticalHitVisible] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Load high score on mount
  useEffect(() => {
    const saved = localStorage.getItem('neonStrikeHighScore');
    if (saved) {
        setHighScore(parseInt(saved, 10));
    }
  }, []);

  const saveHighScore = useCallback((currentScore: number) => {
      if (currentScore > highScore) {
          setHighScore(currentScore);
          localStorage.setItem('neonStrikeHighScore', currentScore.toString());
      }
  }, [highScore]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setLives(3);
    setPowerLevel(100);
    audioService.startBGM();
    audioService.playSound(SoundType.UI_CLICK);
  };

  const handleExitGame = useCallback(() => {
    setIsPlaying(false);
    audioService.stopBGM();
    audioService.playSound(SoundType.UI_CLICK);
    saveHighScore(score);
  }, [score, saveHighScore]);

  const handleTargetDestroyed = useCallback((points: number) => {
    // Increase score
    setScore(prev => prev + points);
    
    // Show Critical Hit text occasionally for flair
    if (Math.random() > 0.8) {
        setCriticalHitVisible(true);
        setTimeout(() => setCriticalHitVisible(false), 800);
    }

    // Power level fluctuation visual
    setPowerLevel(prev => Math.max(50, prev - 10));
    setTimeout(() => setPowerLevel(100), 500);
  }, []);

  const handlePlayerHit = useCallback((damage: number) => {
     setLives(prev => {
         const newLives = prev - damage;
         if (newLives <= 0) {
             // Game Over Logic
             setIsPlaying(false);
             audioService.stopBGM();
             alert(`GAME OVER\nFINAL SCORE: ${score}`);
             saveHighScore(score);
             return 3; // Reset for next visuals
         }
         return newLives;
     });
  }, [score, saveHighScore]);

  // Ambient sound initialization (optional, browsers block auto-play)
  useEffect(() => {
    const initAudio = () => {
      // Just to warm up the context
      audioService.playSound(SoundType.UI_HOVER); 
      window.removeEventListener('click', initAudio);
    };
    window.addEventListener('click', initAudio);
    return () => window.removeEventListener('click', initAudio);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden cursor-crosshair select-none">
      <GameCanvas 
        isPlaying={isPlaying}
        score={score}
        onTargetDestroyed={handleTargetDestroyed}
        onPlayerHit={handlePlayerHit}
      />
      <HUD 
        isPlaying={isPlaying}
        score={score}
        lives={lives}
        highScore={highScore}
        powerLevel={powerLevel}
        onStartGame={startGame}
        onExitGame={handleExitGame}
        showCriticalHit={criticalHitVisible}
      />
      
      {/* Decorative Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
    </div>
  );
};

export default App;