import { useCallback } from 'react';
import { priorityToast } from '@/utils/toastPriority';
import { getStarValue } from '@/utils/gameHelpers';

interface GameHelpersCallbacks {
  onDeath: () => void;
  onHighScore: (score: number) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  setShield: React.Dispatch<React.SetStateAction<number>>;
  setGameState: React.Dispatch<React.SetStateAction<"menu" | "playing" | "paused" | "gameover">>;
  setGameOverMessage: React.Dispatch<React.SetStateAction<string>>;
  setShowGameOverDialog: React.Dispatch<React.SetStateAction<boolean>>;
  playSound: (sound: string) => Promise<void>;
  playMenuOpen: () => Promise<void>;
  playCaptainSpeech: () => Promise<void>;
  finalizeSession: (score: number, startTime: number) => any[];
  showAchievements: (achievements: any[]) => void;
  setNewlyUnlockedAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  highScore: number;
  score: number;
  gameStartTime: number;
  shield: number;
  health: number;
}

export const useGameHelpers = (callbacks: GameHelpersCallbacks) => {
  const { 
    onDeath,
    onHighScore,
    setScore,
    setHealth,
    setShield,
    setGameState,
    setGameOverMessage,
    setShowGameOverDialog,
    playSound,
    playMenuOpen,
    playCaptainSpeech,
    finalizeSession,
    showAchievements,
    setNewlyUnlockedAchievements,
    highScore,
    score,
    gameStartTime,
    shield,
    health,
  } = callbacks;

  const takeDamage = useCallback((damageAmount: number) => {
    playSound('shipHit').catch(console.error);
    
    const handleDeath = () => {
      setTimeout(() => {
        const captainGameOverQuotes = [
          "... (hits cigar) That guy was epic.",
          "... (coughs) That guy played by his own rules.",
          "... (shaking head) Truly built different..",
          "... (single tear) A legend cooked too soon",
        ];
        const randomQuote = captainGameOverQuotes[Math.floor(Math.random() * captainGameOverQuotes.length)];
        setGameOverMessage(randomQuote);
        setShowGameOverDialog(true);
        playCaptainSpeech();
      }, 1700);
      
      setGameState("gameover");
      playMenuOpen().catch(console.error);
      playSound('gameOver').catch(console.error);
      
      const newlyUnlocked = finalizeSession(score, gameStartTime);
      if (newlyUnlocked.length > 0) {
        setNewlyUnlockedAchievements(newlyUnlocked);
        showAchievements(newlyUnlocked);
      } else {
        setNewlyUnlockedAchievements([]);
      }
      
      if (score > highScore) {
        onHighScore(score);
        priorityToast("New High Score!", 0, {
          duration: 4000,
          className: "bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold font-sans"
        });
      }
      
      onDeath();
    };

    if (shield > 0) {
      setShield(prev => {
        const remainingShield = prev - damageAmount;
        if (remainingShield < 0) {
          setHealth(prevHealth => {
            const newHealth = prevHealth + remainingShield;
            if (newHealth <= 0) {
              handleDeath();
            }
            return Math.max(0, newHealth);
          });
          return 0;
        }
        return remainingShield;
      });
    } else {
      setHealth(prev => {
        const newHealth = prev - damageAmount;
        if (newHealth <= 0) {
          handleDeath();
        }
        return Math.max(0, newHealth);
      });
    }
  }, [shield, score, gameStartTime, highScore, playSound, playMenuOpen, playCaptainSpeech, finalizeSession, showAchievements, setNewlyUnlockedAchievements, setGameState, setGameOverMessage, setShowGameOverDialog, onDeath, onHighScore]);

  return {
    getStarValue,
    takeDamage,
  };
};


import { getStarValue } from '@/utils/gameHelpers';

interface GameHelpersCallbacks {
  onDeath: () => void;
  onHighScore: (score: number) => void;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  setShield: React.Dispatch<React.SetStateAction<number>>;
  setGameState: React.Dispatch<React.SetStateAction<"menu" | "playing" | "paused" | "gameover">>;
  setGameOverMessage: React.Dispatch<React.SetStateAction<string>>;
  setShowGameOverDialog: React.Dispatch<React.SetStateAction<boolean>>;
  playSound: (sound: string) => Promise<void>;
  playMenuOpen: () => Promise<void>;
  playCaptainSpeech: () => Promise<void>;
  finalizeSession: (score: number, startTime: number) => any[];
  showAchievements: (achievements: any[]) => void;
  setNewlyUnlockedAchievements: React.Dispatch<React.SetStateAction<any[]>>;
  highScore: number;
  score: number;
  gameStartTime: number;
  shield: number;
  health: number;
}

export const useGameHelpers = (callbacks: GameHelpersCallbacks) => {
  const { 
    onDeath,
    onHighScore,
    setScore,
    setHealth,
    setShield,
    setGameState,
    setGameOverMessage,
    setShowGameOverDialog,
    playSound,
    playMenuOpen,
    playCaptainSpeech,
    finalizeSession,
    showAchievements,
    setNewlyUnlockedAchievements,
    highScore,
    score,
    gameStartTime,
    shield,
    health,
  } = callbacks;

  const takeDamage = useCallback((damageAmount: number) => {
    playSound('shipHit').catch(console.error);
    
    const handleDeath = () => {
      setTimeout(() => {
        const captainGameOverQuotes = [
          "... (hits cigar) That guy was epic.",
          "... (coughs) That guy played by his own rules.",
          "... (shaking head) Truly built different..",
          "... (single tear) A legend cooked too soon",
        ];
        const randomQuote = captainGameOverQuotes[Math.floor(Math.random() * captainGameOverQuotes.length)];
        setGameOverMessage(randomQuote);
        setShowGameOverDialog(true);
        playCaptainSpeech();
      }, 1700);
      
      setGameState("gameover");
      playMenuOpen().catch(console.error);
      playSound('gameOver').catch(console.error);
      
      const newlyUnlocked = finalizeSession(score, gameStartTime);
      if (newlyUnlocked.length > 0) {
        setNewlyUnlockedAchievements(newlyUnlocked);
        showAchievements(newlyUnlocked);
      } else {
        setNewlyUnlockedAchievements([]);
      }
      
      if (score > highScore) {
        onHighScore(score);
        priorityToast("New High Score!", 0, {
          duration: 4000,
          className: "bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold font-sans"
        });
      }
      
      onDeath();
    };

    if (shield > 0) {
      setShield(prev => {
        const remainingShield = prev - damageAmount;
        if (remainingShield < 0) {
          setHealth(prevHealth => {
            const newHealth = prevHealth + remainingShield;
            if (newHealth <= 0) {
              handleDeath();
            }
            return Math.max(0, newHealth);
          });
          return 0;
        }
        return remainingShield;
      });
    } else {
      setHealth(prev => {
        const newHealth = prev - damageAmount;
        if (newHealth <= 0) {
          handleDeath();
        }
        return Math.max(0, newHealth);
      });
    }
  }, [shield, score, gameStartTime, highScore, playSound, playMenuOpen, playCaptainSpeech, finalizeSession, showAchievements, setNewlyUnlockedAchievements, setGameState, setGameOverMessage, setShowGameOverDialog, onDeath, onHighScore]);

  return {
    getStarValue,
    takeDamage,
  };
};




