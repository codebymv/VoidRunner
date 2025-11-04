interface ControlsCardProps {
  isMobile: boolean;
}

export const ControlsCard = ({ isMobile }: ControlsCardProps) => {
  return (
    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground text-left bg-muted/30 p-3 sm:p-4 rounded-lg">
      {isMobile ? (
        <>
          <p>🕹️ <strong>Virtual joystick</strong> to move</p>
          <p>⭐ Collect stars & scrap for points</p>
          <p>💚 Collect wrenches for health</p>
          <p>🪐 Avoid obstacles</p>
        </>
      ) : (
        <>
          <p>🚀 <strong>WASD</strong> or <strong>Arrow Keys</strong> to thrust</p>
          <p>🔫 <strong>Space</strong> to shoot</p>
          <p>⏸️ <strong>Escape</strong> to pause</p>
          <p>⭐ Collect stars & scrap for points</p>
          <p>💚 Collect wrenches for health</p>
          <p>🪐 Avoid obstacles</p>
        </>
      )}
    </div>
  );
};

