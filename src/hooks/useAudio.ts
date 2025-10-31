import { useEffect, useCallback, useState } from 'react';
import { audioManager, GameState } from '../audio/AudioManager';

export const useAudio = () => {
  const [isThemePlaying, setIsThemePlaying] = useState(false);
  const [currentGameState, setCurrentGameState] = useState<GameState>(GameState.MENU);
  const [masterVolume, setMasterVolumeState] = useState(1);

  // Update local state when audio manager state changes
  useEffect(() => {
    const updateState = () => {
      setIsThemePlaying(audioManager.isThemeMusicPlaying());
      setCurrentGameState(audioManager.getCurrentGameState());
      setMasterVolumeState(audioManager.getMasterVolume());
    };

    // Initial state update
    updateState();

    // Set up periodic state sync (optional, for real-time updates)
    const interval = setInterval(updateState, 1000);

    return () => clearInterval(interval);
  }, []);

  const startThemeMusic = useCallback(async () => {
    await audioManager.startThemeMusic();
    setIsThemePlaying(audioManager.isThemeMusicPlaying());
  }, []);

  const stopThemeMusic = useCallback(() => {
    audioManager.stopThemeMusic();
    setIsThemePlaying(audioManager.isThemeMusicPlaying());
  }, []);

  const pauseThemeMusic = useCallback(() => {
    audioManager.pauseThemeMusic();
    setIsThemePlaying(audioManager.isThemeMusicPlaying());
  }, []);

  const resumeThemeMusic = useCallback(() => {
    audioManager.resumeThemeMusic();
    setIsThemePlaying(audioManager.isThemeMusicPlaying());
  }, []);

  const setGameState = useCallback((newState: GameState) => {
    audioManager.setGameState(newState);
    setCurrentGameState(audioManager.getCurrentGameState());
    setIsThemePlaying(audioManager.isThemeMusicPlaying());
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    audioManager.setMasterVolume(volume);
    setMasterVolumeState(audioManager.getMasterVolume());
  }, []);

  const playSound = useCallback((soundName: string) => {
    audioManager.playSound(soundName);
  }, []);

  return {
    // State
    isThemePlaying,
    currentGameState,
    masterVolume,
    
    // Theme music controls
    startThemeMusic,
    stopThemeMusic,
    pauseThemeMusic,
    resumeThemeMusic,
    
    // Game state management
    setGameState,
    
    // Volume controls
    setMasterVolume,
    
    // Sound effects
    playSound,
    playMenuOpen: () => audioManager.playMenuOpen(),
    playMenuClose: () => audioManager.playMenuClose(),
    
    // Game states enum for convenience
    GameState
  };
};