import React, { useRef, useEffect, useState, useCallback } from 'react';

interface JoystickData {
  x: number; // -1 to 1
  y: number; // -1 to 1
  distance: number; // 0 to 1
  angle: number; // 0 to 2π
}

interface VirtualJoystickProps {
  onMove: (data: JoystickData) => void;
  onStart?: () => void;
  onEnd?: () => void;
  size?: number;
  knobSize?: number;
  className?: string;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onStart,
  onEnd,
  size,
  knobSize,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [centerPosition, setCenterPosition] = useState({ x: 0, y: 0 });

  // Responsive sizing based on screen width
  const getResponsiveSize = () => {
    if (size !== undefined) return size;
    return window.innerWidth <= 375 ? 80 : window.innerWidth <= 480 ? 100 : 120;
  };

  const getResponsiveKnobSize = () => {
    if (knobSize !== undefined) return knobSize;
    return window.innerWidth <= 375 ? 25 : window.innerWidth <= 480 ? 32 : 40;
  };

  const [responsiveSize, setResponsiveSize] = useState(getResponsiveSize());
  const [responsiveKnobSize, setResponsiveKnobSize] = useState(getResponsiveKnobSize());

  const maxDistance = (responsiveSize - responsiveKnobSize) / 2;

  const updateCenterPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCenterPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
  }, []);

  const updateResponsiveSizes = useCallback(() => {
    setResponsiveSize(getResponsiveSize());
    setResponsiveKnobSize(getResponsiveKnobSize());
  }, [size, knobSize]);

  useEffect(() => {
    updateCenterPosition();
    updateResponsiveSizes();
    
    const handleResize = () => {
      updateCenterPosition();
      updateResponsiveSizes();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCenterPosition, updateResponsiveSizes]);

  const calculateJoystickData = useCallback((x: number, y: number): JoystickData => {
    const distance = Math.min(Math.sqrt(x * x + y * y), maxDistance);
    const angle = Math.atan2(y, x);
    
    return {
      x: distance > 0 ? (x / maxDistance) : 0,
      y: distance > 0 ? (y / maxDistance) : 0,
      distance: distance / maxDistance,
      angle: angle
    };
  }, [maxDistance]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - centerPosition.x;
    const deltaY = clientY - centerPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    let newX = deltaX;
    let newY = deltaY;

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      newX = Math.cos(angle) * maxDistance;
      newY = Math.sin(angle) * maxDistance;
    }

    setKnobPosition({ x: newX, y: newY });
    onMove(calculateJoystickData(newX, newY));
  }, [isDragging, centerPosition, maxDistance, onMove, calculateJoystickData]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    updateCenterPosition();
    onStart?.();
    handleMove(clientX, clientY);
  }, [handleMove, onStart, updateCenterPosition]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setKnobPosition({ x: 0, y: 0 });
    onMove({ x: 0, y: 0, distance: 0, angle: 0 });
    onEnd?.();
  }, [onMove, onEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (isDragging && e.touches[0]) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  }, [handleEnd]);

  // Mouse events (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${className}`}
      style={{
        width: responsiveSize,
        height: responsiveSize,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Joystick Base */}
      <div
        className="absolute inset-0 rounded-full border-2 border-white/30 bg-black/20 backdrop-blur-sm"
        style={{
          width: responsiveSize,
          height: responsiveSize,
        }}
      />
      
      {/* Joystick Knob */}
      <div
        className={`absolute rounded-full border-2 transition-all duration-75 ${
          isDragging 
            ? 'border-blue-400 bg-blue-500/80 shadow-lg shadow-blue-500/50' 
            : 'border-white/50 bg-white/30'
        }`}
        style={{
          width: responsiveKnobSize,
          height: responsiveKnobSize,
          left: responsiveSize / 2 - responsiveKnobSize / 2 + knobPosition.x,
          top: responsiveSize / 2 - responsiveKnobSize / 2 + knobPosition.y,
        }}
      />
      
      {/* Center Dot */}
      <div
        className="absolute w-2 h-2 bg-white/60 rounded-full"
        style={{
          left: responsiveSize / 2 - 4,
          top: responsiveSize / 2 - 4,
        }}
      />
    </div>
  );
};