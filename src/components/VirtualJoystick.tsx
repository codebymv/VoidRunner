import React from 'react';
import { Joystick } from 'react-joystick-component';

interface VirtualJoystickProps {
  onMove: (input: { x: number; y: number }) => void;
  isVisible: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, isVisible }) => {
  console.log('🎯 VirtualJoystick render - isVisible:', isVisible);
  if (!isVisible) {
    console.log('❌ VirtualJoystick not visible, returning null');
    return null;
  }
  console.log('✅ VirtualJoystick is visible, rendering component');

  const handleMove = (event: any) => {
    // Convert the joystick output to our expected format
    // The library provides x and y values between -1 and 1
    console.log('🕹️ Joystick raw event - x:', event.x, 'y:', event.y, 'distance:', event.distance);
    const input = {
      x: event.x || 0,
      y: -(event.y || 0) // Invert Y axis to match game expectations (up = negative)
    };
    console.log('🎮 Sending processed input - x:', input.x, 'y:', input.y);
    onMove(input);
  };

  const handleStop = () => {
    // When joystick is released, return to center (0, 0)
    onMove({ x: 0, y: 0 });
  };

  return (
    <div className="fixed bottom-1 left-1 z-50">
      <Joystick
        size={120}
        stickSize={70}
        baseColor="rgba(59, 130, 246, 0.3)"
        stickColor="rgba(59, 130, 246, 0.8)"
        throttle={16} // ~60fps
        move={handleMove}
        stop={handleStop}
        start={() => {}} // Optional start callback
      />
    </div>
  );
};