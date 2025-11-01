import { useEffect, useCallback, useState } from 'react';
import { audioManager, GameState } from '../audio/AudioManager';

export const useAudio = () => {
  const [isThemePlaying, setIsThemePlaying] = useState(false);
  const [currentGameState, setCurrentGameState] = useState<GameState>(GameState.MENU);
  const [masterVolume, setMasterVolumeState] = useState(1);
  const [isMuted, setIsMutedState] = useState(false);

  // Update local state when audio manager state changes
  useEffect(() => {
    const updateState = () => {
      setIsThemePlaying(audioManager.isThemeMusicPlaying());
      setCurrentGameState(audioManager.getCurrentGameState());
      setMasterVolumeState(audioManager.getMasterVolume());
      setIsMutedState(audioManager.isMutedState());
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

  const toggleMute = useCallback(() => {
    const newMutedState = audioManager.toggleMute();
    setIsMutedState(newMutedState);
    return newMutedState;
  }, []);

  const setMute = useCallback((muted: boolean) => {
    audioManager.setMute(muted);
    setIsMutedState(audioManager.isMutedState());
  }, []);

  const playSound = useCallback(async (soundName: string) => {
    await audioManager.playSound(soundName);
  }, []);

  return {
    // State
    isThemePlaying,
    currentGameState,
    masterVolume,
    isMuted,
    
    // Theme music controls
    startThemeMusic,
    stopThemeMusic,
    pauseThemeMusic,
    resumeThemeMusic,
    
    // Game state management
    setGameState,
    
    // Volume controls
    setMasterVolume,
    
    // Mute controls
    toggleMute,
    setMute,
    
    // Sound effects
    playSound,
    playMenuOpen: async () => {
      console.log('🎵 useAudio playMenuOpen called');
      await audioManager.playMenuOpen();
    },
    playMenuClose: async () => {
      console.log('🎵 useAudio playMenuClose called');
      await audioManager.playMenuClose();
    },
    
    // Game states enum for convenience
    GameState
  };
};