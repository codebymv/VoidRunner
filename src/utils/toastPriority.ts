import { toast } from "sonner";

interface PriorityToast {
  message: string;
  points: number;
  duration: number;
  className: string;
  timestamp: number;
}

class ToastPriorityManager {
  private pendingToasts: PriorityToast[] = [];
  private currentToast: PriorityToast | null = null;
  private toastTimeout: NodeJS.Timeout | null = null;
  private readonly maxQueueSize = 5; // Limit queue size to prevent memory issues
  private readonly minPointsToShow = 15; // Don't show toasts below this threshold when queue is full

  // Priority levels based on point values
  private getPriority(points: number): number {
    if (points >= 500) return 1; // Black hole collapse, high-value stars
    if (points >= 100) return 2; // Meteor collisions, black hole mergers, level 2+ stars
    if (points >= 50) return 3;  // Level 1 stars, high near-miss
    if (points >= 25) return 4;  // Scrap collection, medium scoring events
    return 5; // Low scoring events (debris bounces, etc.)
  }

  public showToast(message: string, points: number, duration: number, className: string): void {
    const newToast: PriorityToast = {
      message,
      points,
      duration,
      className,
      timestamp: Date.now()
    };

    // If queue is getting full, only accept higher priority toasts
    if (this.pendingToasts.length >= this.maxQueueSize) {
      if (points < this.minPointsToShow) {
        return; // Ignore low-value toasts when queue is full
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
    toast.dismiss(); // Dismiss current toast
    this.currentToast = null;
    this.showNextToast();
  }

  private showNextToast(): void {
    if (this.pendingToasts.length === 0) {
      this.currentToast = null;
      return;
    }

    const nextToast = this.pendingToasts.shift()!;
    this.currentToast = nextToast;

    // Show the toast
    toast(nextToast.message, {
      duration: nextToast.duration,
      className: nextToast.className
    });

    // Set timeout to show next toast
    this.toastTimeout = setTimeout(() => {
      this.currentToast = null;
      this.showNextToast();
    }, nextToast.duration);
  }

  // Method to clear all pending toasts (useful for game reset)
  public clearQueue(): void {
    this.pendingToasts = [];
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    this.currentToast = null;
    toast.dismiss();
  }

  // Get queue status for debugging
  public getQueueStatus(): { pending: number, current: string | null, priorities: number[] } {
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
export function priorityToast(message: string, points: number, options: { duration: number, className: string }) {
  toastManager.showToast(message, points, options.duration, options.className);
}