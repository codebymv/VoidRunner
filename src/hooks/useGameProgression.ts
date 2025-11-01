import { useRef, useState, useCallback } from 'react';
import { StatsManager, SessionStats } from '../game/StatsManager';
import { AchievementSystem } from '../game/AchievementSystem';
import { ComboSystem } from '../game/ComboSystem';

export const useGameProgression = () => {
  const statsManagerRef = useRef<StatsManager>(new StatsManager());
  const achievementSystemRef = useRef<AchievementSystem>(new AchievementSystem());
  const comboSystemRef = useRef<ComboSystem>(new ComboSystem());
  const sessionStatsRef = useRef<SessionStats>({
    starsCollected: 0,
    nearMisses: 0,
    scrapCollected: 0,
    obstaclesDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    maxCombo: 0,
    score: 0,
  });
  
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    starsCollected: 0,
    nearMisses: 0,
    scrapCollected: 0,
    obstaclesDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    maxCombo: 0,
    score: 0,
  });

  const resetSession = useCallback(() => {
    const resetStats = {
      starsCollected: 0,
      nearMisses: 0,
      scrapCollected: 0,
      obstaclesDestroyed: 0,
      survivalTime: 0,
      distanceTraveled: 0,
      maxCombo: 0,
      score: 0,
    };
    sessionStatsRef.current = resetStats;
    setSessionStats(resetStats);
    comboSystemRef.current.reset();
  }, []);

  const recordStarCollected = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, starsCollected: prev.starsCollected + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(1);
  }, []);

  const recordNearMiss = useCallback((points: number) => {
    setSessionStats(prev => {
      const updated = { ...prev, nearMisses: prev.nearMisses + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(2); // Near misses give more combo
  }, []);

  const recordScrapCollected = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, scrapCollected: prev.scrapCollected + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(1);
  }, []);

  const recordObstacleDestroyed = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, obstaclesDestroyed: prev.obstaclesDestroyed + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(3); // Obstacle destruction gives high combo
  }, []);

  const updateSessionStats = useCallback((updates: Partial<SessionStats> | ((prev: SessionStats) => Partial<SessionStats>)) => {
    if (typeof updates === 'function') {
      setSessionStats(prev => {
        const updated = { ...prev, ...updates(prev) };
        sessionStatsRef.current = updated;
        return updated;
      });
    } else {
      setSessionStats(prev => {
        const updated = { ...prev, ...updates };
        sessionStatsRef.current = updated;
        return updated;
      });
    }
  }, []);

  const finalizeSession = useCallback((finalScore: number, gameStartTime: number): Achievement[] => {
    const finalStats: SessionStats = {
      ...sessionStatsRef.current,
      score: finalScore,
      survivalTime: Date.now() - gameStartTime,
      maxCombo: comboSystemRef.current.getMaxCombo(),
    };

    // Record session
    statsManagerRef.current.recordSession(finalStats);

    // Check achievements
    const stats = statsManagerRef.current.getStats();
    const newlyUnlocked = achievementSystemRef.current.checkAchievements(stats, finalStats);

    return newlyUnlocked;
  }, []);

  const updateCombo = useCallback((currentTime: number = Date.now()) => {
    comboSystemRef.current.update(currentTime);
  }, []);

  const getComboMultiplier = useCallback((baseScore: number): number => {
    return comboSystemRef.current.applyMultiplier(baseScore);
  }, []);

  return {
    statsManager: statsManagerRef.current,
    achievementSystem: achievementSystemRef.current,
    comboSystem: comboSystemRef.current,
    sessionStats,
    resetSession,
    recordStarCollected,
    recordNearMiss,
    recordScrapCollected,
    recordObstacleDestroyed,
    updateSessionStats,
    finalizeSession,
    updateCombo,
    getComboMultiplier,
  };
};


import { AchievementSystem } from '../game/AchievementSystem';
import { ComboSystem } from '../game/ComboSystem';

export const useGameProgression = () => {
  const statsManagerRef = useRef<StatsManager>(new StatsManager());
  const achievementSystemRef = useRef<AchievementSystem>(new AchievementSystem());
  const comboSystemRef = useRef<ComboSystem>(new ComboSystem());
  const sessionStatsRef = useRef<SessionStats>({
    starsCollected: 0,
    nearMisses: 0,
    scrapCollected: 0,
    obstaclesDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    maxCombo: 0,
    score: 0,
  });
  
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    starsCollected: 0,
    nearMisses: 0,
    scrapCollected: 0,
    obstaclesDestroyed: 0,
    survivalTime: 0,
    distanceTraveled: 0,
    maxCombo: 0,
    score: 0,
  });

  const resetSession = useCallback(() => {
    const resetStats = {
      starsCollected: 0,
      nearMisses: 0,
      scrapCollected: 0,
      obstaclesDestroyed: 0,
      survivalTime: 0,
      distanceTraveled: 0,
      maxCombo: 0,
      score: 0,
    };
    sessionStatsRef.current = resetStats;
    setSessionStats(resetStats);
    comboSystemRef.current.reset();
  }, []);

  const recordStarCollected = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, starsCollected: prev.starsCollected + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(1);
  }, []);

  const recordNearMiss = useCallback((points: number) => {
    setSessionStats(prev => {
      const updated = { ...prev, nearMisses: prev.nearMisses + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(2); // Near misses give more combo
  }, []);

  const recordScrapCollected = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, scrapCollected: prev.scrapCollected + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(1);
  }, []);

  const recordObstacleDestroyed = useCallback(() => {
    setSessionStats(prev => {
      const updated = { ...prev, obstaclesDestroyed: prev.obstaclesDestroyed + 1 };
      sessionStatsRef.current = updated;
      return updated;
    });
    comboSystemRef.current.addCombo(3); // Obstacle destruction gives high combo
  }, []);

  const updateSessionStats = useCallback((updates: Partial<SessionStats> | ((prev: SessionStats) => Partial<SessionStats>)) => {
    if (typeof updates === 'function') {
      setSessionStats(prev => {
        const updated = { ...prev, ...updates(prev) };
        sessionStatsRef.current = updated;
        return updated;
      });
    } else {
      setSessionStats(prev => {
        const updated = { ...prev, ...updates };
        sessionStatsRef.current = updated;
        return updated;
      });
    }
  }, []);

  const finalizeSession = useCallback((finalScore: number, gameStartTime: number): Achievement[] => {
    const finalStats: SessionStats = {
      ...sessionStatsRef.current,
      score: finalScore,
      survivalTime: Date.now() - gameStartTime,
      maxCombo: comboSystemRef.current.getMaxCombo(),
    };

    // Record session
    statsManagerRef.current.recordSession(finalStats);

    // Check achievements
    const stats = statsManagerRef.current.getStats();
    const newlyUnlocked = achievementSystemRef.current.checkAchievements(stats, finalStats);

    return newlyUnlocked;
  }, []);

  const updateCombo = useCallback((currentTime: number = Date.now()) => {
    comboSystemRef.current.update(currentTime);
  }, []);

  const getComboMultiplier = useCallback((baseScore: number): number => {
    return comboSystemRef.current.applyMultiplier(baseScore);
  }, []);

  return {
    statsManager: statsManagerRef.current,
    achievementSystem: achievementSystemRef.current,
    comboSystem: comboSystemRef.current,
    sessionStats,
    resetSession,
    recordStarCollected,
    recordNearMiss,
    recordScrapCollected,
    recordObstacleDestroyed,
    updateSessionStats,
    finalizeSession,
    updateCombo,
    getComboMultiplier,
  };
};




