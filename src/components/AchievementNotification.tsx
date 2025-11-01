import { Achievement } from './AchievementSystem';
import { toast } from 'sonner';
import React, { useRef, useCallback, useEffect } from 'react';
import trophyImage from '@/assets/trophy.png';

// Hook to show achievement notifications
export const useAchievementNotifications = () => {
  const achievementQueueRef = useRef<Achievement[]>([]);
  const isShowingRef = useRef(false);
  const currentToastIdRef = useRef<string | number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNextAchievement = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // If queue is empty, reset showing state and return
    if (achievementQueueRef.current.length === 0) {
      isShowingRef.current = false;
      return;
    }

    // If already showing, don't start another sequence (shouldn't happen but safety check)
    if (isShowingRef.current) {
      return;
    }

    isShowingRef.current = true;
    const achievement = achievementQueueRef.current.shift()!;

    const toastMessage = (
      <div className="flex items-center gap-2">
        <img 
          src={trophyImage} 
          alt="Trophy" 
          className="w-6 h-6 object-contain flex-shrink-0"
        />
        <div className="flex flex-col gap-1">
          <div className="font-bold text-lg drop-shadow-lg">
            {achievement.name}
          </div>
          <div className="text-sm opacity-90">
            {achievement.description}
          </div>
        </div>
      </div>
    );
    
    // Use a unique toast ID for each achievement to prevent replacement
    const toastId = `achievement-toast-${Date.now()}-${Math.random()}`;
    currentToastIdRef.current = toastId;
    
    // Defer toast operation to avoid React warnings
    setTimeout(() => {
      // Show the toast with highlight effect (scale and glow) - no pulse animation to avoid blinking
      toast(toastMessage, {
        duration: Infinity, // Don't auto-dismiss - we'll handle timing manually
        className: 'bg-gradient-to-r from-yellow-500/95 to-orange-500/95 backdrop-blur-sm text-white font-bold border-2 border-yellow-300 shadow-2xl transform scale-105 transition-all duration-300',
        position: 'bottom-right',
        id: toastId,
      });
    }, 0);

    // After 2 seconds, dismiss and show the next achievement
    timeoutRef.current = setTimeout(() => {
      // Dismiss current toast
      if (currentToastIdRef.current) {
        setTimeout(() => {
          toast.dismiss(currentToastIdRef.current!);
          currentToastIdRef.current = null;
        }, 0);
      }
      
      // Wait before showing next (ensures clean transition and full visibility)
      timeoutRef.current = setTimeout(() => {
        isShowingRef.current = false;
        showNextAchievement();
      }, 400); // 400ms transition delay between achievements
    }, 2000); // Show each achievement for 2 seconds
  }, []);

  const showAchievements = useCallback((achievements: Achievement[]) => {
    if (achievements.length === 0) return;
    
    // Add achievements to queue
    achievementQueueRef.current.push(...achievements);
    
    // Start showing if not already showing
    if (!isShowingRef.current) {
      // Defer the initial call to avoid render phase issues
      setTimeout(() => {
        showNextAchievement();
      }, 0);
    }
  }, [showNextAchievement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (currentToastIdRef.current) {
        setTimeout(() => {
          toast.dismiss(currentToastIdRef.current!);
        }, 0);
      }
    };
  }, []);

  return {
    showAchievements,
  };
};
