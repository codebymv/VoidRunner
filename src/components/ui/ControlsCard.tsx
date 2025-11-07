interface ControlsCardProps {
  isMobile: boolean;
  filter?: string | null;
}

export const ControlsCard = ({ isMobile, filter }: ControlsCardProps) => {
  // If filter is set, only show matching line
  const shouldShow = (key: string) => !filter || key === filter;
  
  return (
    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground text-left bg-muted/30 p-3 sm:p-4 rounded-lg">
      {isMobile ? (
        <>
          {shouldShow('joystick') && <p>🕹️ <strong>Virtual joystick</strong> to move</p>}
          {shouldShow('collect') && <p>⭐ Collect stars & scrap for points</p>}
          {shouldShow('health') && <p>💚 Collect wrenches for health</p>}
          {shouldShow('obstacles') && <p>🪐 Avoid obstacles</p>}
        </>
      ) : (
        <>
          {shouldShow('move') && <p>🚀 <strong>WASD</strong> or <strong>Arrow Keys</strong> to thrust</p>}
          {shouldShow('shoot') && <p>🔫 <strong>Space</strong> to shoot</p>}
          {shouldShow('pause') && <p>⏸️ <strong>Escape</strong> to pause</p>}
          {shouldShow('collect') && <p>⭐ Collect stars & scrap for points</p>}
          {shouldShow('health') && <p>💚 Collect wrenches for health</p>}
          {shouldShow('obstacles') && <p>🪐 Avoid obstacles</p>}
        </>
      )}
    </div>
  );
};



