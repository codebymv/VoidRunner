import { toast } from "sonner";
import React from "react";

interface PriorityToast {
  message: string | React.ReactNode;
  points: number;
  duration: number;
  className: string;
  position?: string;
  onDismiss?: () => void;
  timestamp: number;
  comboInfo?: {
    combo: number;
    multiplier: number;
    basePoints: number;
  };
}

// Helper function to format toast message with combo info
export function formatToastWithCombo(
  baseMessage: string,
  basePoints: number,
  combo: number,
  multiplier: number,
  isHighScore: boolean = false
): React.ReactNode {
  const finalPoints = Math.floor(basePoints * multiplier);
  
  if (combo > 0 && multiplier > 1) {
    // Use blue-to-yellow gradient matching score color scheme
    // If it's a high score (yellow text), use yellow for combo badge too
    let comboBadgeClass: string;
    if (isHighScore) {
      // High score - use darker yellow gradient for better text readability
      comboBadgeClass = 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white';
    } else if (multiplier >= 2.5) {
      // High multiplier - darker yellow gradient for readability
      comboBadgeClass = 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-white';
    } else if (multiplier >= 2.0) {
      // Medium-high multiplier - blue to yellow transition
      comboBadgeClass = 'bg-gradient-to-r from-blue-400 to-yellow-500 text-white';
    } else if (multiplier >= 1.5) {
      // Medium multiplier - blue gradient
      comboBadgeClass = 'bg-gradient-to-r from-blue-500 to-blue-400 text-white';
    } else {
      // Low multiplier - darker blue
      comboBadgeClass = 'bg-gradient-to-r from-blue-600 to-blue-500 text-white';
    }
    
    return (
      <div className="flex flex-col gap-1.5">
        <div className="font-bold">{baseMessage}</div>
        <div className="flex items-center gap-2 text-xs mt-0.5">
          <span className={`${comboBadgeClass} px-2 py-0.5 rounded font-bold shadow-md glow-blue`}>
            {combo}x COMBO
          </span>
          <span className="opacity-80 text-xs">
            {basePoints} × {multiplier.toFixed(1)} = <span className="font-bold">{finalPoints}</span>
          </span>
        </div>
      </div>
    );
  }
  
  return baseMessage;
}

class ToastPriorityManager {
  private pendingToasts: PriorityToast[] = [];
  private currentToast: PriorityToast | null = null;
  private currentToastId: string | number | null = null; // Store current toast ID
  private toastTimeout: NodeJS.Timeout | null = null;
  private readonly maxQueueSize = 5; // Limit queue size to prevent memory issues
  private minPointsToShow = 15; // Dynamic threshold - increases as game progresses

  // Priority levels based on point values
  private getPriority(points: number): number {
    if (points >= 500) return 1; // Black hole collapse, high-value stars
    if (points >= 100) return 2; // Meteor collisions, black hole mergers, level 2+ stars
    if (points >= 50) return 3;  // Level 1 stars, high near-miss
    if (points >= 25) return 4;  // Scrap collection, medium scoring events
    return 5; // Low scoring events (debris bounces, etc.)
  }

  public showToast(message: string | React.ReactNode, points: number, duration: number, className: string, position?: string, onDismiss?: () => void, comboInfo?: { combo: number; multiplier: number; basePoints: number }): void {
    // Filter out toasts below the dynamic threshold
    if (points < this.minPointsToShow) {
      return; // Ignore low-value toasts based on game progression
    }
    
    const newToast: PriorityToast = {
      message,
      points,
      duration,
      className,
      position,
      onDismiss,
      timestamp: Date.now(),
      comboInfo
    };

    // If queue is getting full, only accept higher priority toasts
    if (this.pendingToasts.length >= this.maxQueueSize) {
      if (points < this.minPointsToShow * 1.5) {
        return; // Ignore low-value toasts when queue is full (even stricter)
      }
      
      // Remove the lowest priority toast from queue
      const lowestPriorityIndex = this.findLowestPriorityIndex();
      if (this.getPriority(points) < this.getPriority(this.pendingToasts[lowestPriorityIndex].points)) {
        this.pendingToasts.splice(lowestPriorityIndex, 1);
      } else {
        return; // New toast isn't high enough priority
      }
    }

    // Add to queue
    this.pendingToasts.push(newToast);
    
    // Sort queue by priority (higher priority = lower number = shown first)
    this.pendingToasts.sort((a, b) => {
      const priorityDiff = this.getPriority(a.points) - this.getPriority(b.points);
      if (priorityDiff !== 0) return priorityDiff;
      // If same priority, show higher points first
      return b.points - a.points;
    });

    // Defer toast operations to avoid React warnings about updating during render
    setTimeout(() => {
      // If no toast is currently showing, start showing toasts
      if (!this.currentToast) {
        this.showNextToast();
      } else {
        // If current toast is lower priority than the new highest priority toast, interrupt it
        const highestPriorityToast = this.pendingToasts[0];
        if (this.getPriority(highestPriorityToast.points) < this.getPriority(this.currentToast.points)) {
          this.interruptCurrentToast();
        }
      }
    }, 0);
  }

  private findLowestPriorityIndex(): number {
    let lowestIndex = 0;
    let lowestPriority = this.getPriority(this.pendingToasts[0].points);
    
    for (let i = 1; i < this.pendingToasts.length; i++) {
      const priority = this.getPriority(this.pendingToasts[i].points);
      if (priority > lowestPriority || 
          (priority === lowestPriority && this.pendingToasts[i].points < this.pendingToasts[lowestIndex].points)) {
        lowestIndex = i;
        lowestPriority = priority;
      }
    }
    
    return lowestIndex;
  }

  private interruptCurrentToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    
    // Call onDismiss callback if current toast has one
    if (this.currentToast && this.currentToast.onDismiss) {
      this.currentToast.onDismiss();
    }
    
    // Defer toast dismissal to avoid React warnings about updating during render
    setTimeout(() => {
      // Only dismiss the specific toast ID, not all toasts
      if (this.currentToastId) {
        toast.dismiss(this.currentToastId);
      }
      this.currentToast = null;
      this.currentToastId = null;
      this.showNextToast();
    }, 0);
  }

  private showNextToast(): void {
    if (this.pendingToasts.length === 0) {
      this.currentToast = null;
      this.currentToastId = null;
      return;
    }

    const nextToast = this.pendingToasts.shift()!;
    this.currentToast = nextToast;
    
    // Generate unique ID for this toast
    const toastId = `toast-${nextToast.timestamp}-${nextToast.points}`;
    this.currentToastId = toastId;

    // Show the toast - defer to ensure we're not in a render cycle
    setTimeout(() => {
      const toastOptions: any = {
        duration: nextToast.duration,
        className: nextToast.className,
        position: nextToast.position || 'top-right' // Default to top-right for score toasts
      };
      
      toast(nextToast.message, {
        ...toastOptions,
        id: toastId, // Use the stored ID
      });

      // Set timeout to show next toast
      this.toastTimeout = setTimeout(() => {
        // Call onDismiss callback if provided
        if (nextToast.onDismiss) {
          nextToast.onDismiss();
        }
        this.currentToast = null;
        this.currentToastId = null;
        this.showNextToast();
      }, nextToast.duration);
    }, 0);
  }

  // Method to clear all pending toasts (useful for game reset)
  public clearQueue(): void {
    this.pendingToasts = [];
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    
    // Only dismiss the current score toast, not all toasts (preserves achievement toasts)
    if (this.currentToastId) {
      toast.dismiss(this.currentToastId);
    }
    
    this.currentToast = null;
    this.currentToastId = null;
  }

  // Update minimum points threshold based on game score
  public updateThreshold(score: number): void {
    if (score < 1000) {
      this.minPointsToShow = 15; // Early game: Show most toasts (debris bounces, etc.)
    } else if (score < 2500) {
      this.minPointsToShow = 25; // Mid game: Hide debris bounces, show scrap collection+
    } else if (score < 5000) {
      this.minPointsToShow = 50; // Late game: Only stars and significant events
    } else {
      this.minPointsToShow = 100; // Very late game: Only major events (meteors, black holes, high-value stars)
    }
  }
  
  // Get current threshold
  public getThreshold(): number {
    return this.minPointsToShow;
  }

  // Get queue status for debugging
  public getQueueStatus(): { pending: number, current: string | React.ReactNode | null, priorities: number[] } {
    return {
      pending: this.pendingToasts.length,
      current: this.currentToast?.message || null,
      priorities: this.pendingToasts.map(t => this.getPriority(t.points))
    };
  }
}

// Export singleton instance
export const toastManager = new ToastPriorityManager();

// Convenience function that matches the original toast API
export function priorityToast(
  message: string | React.ReactNode, 
  points: number, 
  options: { 
    duration: number, 
    className: string, 
    position?: string, 
    onDismiss?: () => void,
    comboInfo?: { combo: number; multiplier: number; basePoints: number }
  }
) {
  // Defer the entire toast operation to avoid React warnings
  setTimeout(() => {
    toastManager.showToast(message, points, options.duration, options.className, options.position, options.onDismiss, options.comboInfo);
  }, 0);
}
