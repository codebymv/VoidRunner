import { useEffect, useRef } from 'react';
import { useMobile } from '@/hooks/useMobile';

interface GameInputCallbacks {
  onEscape?: () => void;
  onToggleJoystick?: () => void;
  onToggleMute?: () => void;
}

interface UseGameInputReturn {
  keys: React.MutableRefObject<Record<string, boolean>>;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
  handleResize: (canvas: HTMLCanvasElement, starField: any) => void;
}

export const useGameInput = (
  gameState: "menu" | "playing" | "paused" | "gameover",
  callbacks: GameInputCallbacks
): UseGameInputReturn => {
  const { isMobile } = useMobile();
  const keys = useRef<Record<string, boolean>>({});
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle special keys first
      if (e.key === 'j' || e.key === 'J') {
        callbacks.onToggleJoystick?.();
        return;
      }
      
      if (e.key === 'm' || e.key === 'M') {
        callbacks.onToggleMute?.();
        return;
      }
      
      if (e.key === "Escape" && gameState === "playing") {
        e.preventDefault();
        callbacks.onEscape?.();
        return;
      }
      
      // Handle regular keys
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameState, callbacks]);

  const handleResize = (canvas: HTMLCanvasElement, starField: any) => {
    canvas.width = window.innerWidth * 0.9;
    if (isMobile) {
      canvas.height = window.innerHeight * 0.70;
    } else {
      canvas.height = window.innerHeight * 0.9;
    }
    
    if (starField) {
      starField.resize(canvas.width, canvas.height);
    }
  };

  return {
    keys,
    mouse,
    handleResize,
  };
};



interface GameInputCallbacks {
  onEscape?: () => void;
  onToggleJoystick?: () => void;
  onToggleMute?: () => void;
}

interface UseGameInputReturn {
  keys: React.MutableRefObject<Record<string, boolean>>;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
  handleResize: (canvas: HTMLCanvasElement, starField: any) => void;
}

export const useGameInput = (
  gameState: "menu" | "playing" | "paused" | "gameover",
  callbacks: GameInputCallbacks
): UseGameInputReturn => {
  const { isMobile } = useMobile();
  const keys = useRef<Record<string, boolean>>({});
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle special keys first
      if (e.key === 'j' || e.key === 'J') {
        callbacks.onToggleJoystick?.();
        return;
      }
      
      if (e.key === 'm' || e.key === 'M') {
        callbacks.onToggleMute?.();
        return;
      }
      
      if (e.key === "Escape" && gameState === "playing") {
        e.preventDefault();
        callbacks.onEscape?.();
        return;
      }
      
      // Handle regular keys
      keys.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameState, callbacks]);

  const handleResize = (canvas: HTMLCanvasElement, starField: any) => {
    canvas.width = window.innerWidth * 0.9;
    if (isMobile) {
      canvas.height = window.innerHeight * 0.70;
    } else {
      canvas.height = window.innerHeight * 0.9;
    }
    
    if (starField) {
      starField.resize(canvas.width, canvas.height);
    }
  };

  return {
    keys,
    mouse,
    handleResize,
  };
};




