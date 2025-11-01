import gunIcon from '@/assets/gun_icon.png';

interface AmmoBarProps {
  ammo: number;
  maxAmmo?: number;
  isRecharging?: boolean;
  hasWeapon?: boolean;
  isUnlimitedAmmo?: boolean;
  size?: 'mobile' | 'desktop';
}

export const AmmoBar = ({ 
  ammo, 
  maxAmmo = 100, 
  isRecharging = false,
  hasWeapon = false,
  isUnlimitedAmmo = false,
  size = 'mobile' 
}: AmmoBarProps) => {
  const iconSize = size === 'mobile' ? 'w-4 sm:w-5 h-4 sm:h-5' : 'w-6 h-6';
  const barWidth = size === 'mobile' ? 'w-16 sm:w-20' : 'w-32';
  const barHeight = size === 'mobile' ? 'h-2 sm:h-2.5' : 'h-3';
  const gap = size === 'mobile' ? 'gap-1 sm:gap-2' : 'gap-2';

  const ammoPercentage = Math.max(0, (ammo / maxAmmo) * 100);
  const canShoot = hasWeapon && (ammo > 0 || isUnlimitedAmmo);

  return (
    <div className={`flex items-center ${gap}`}>
      <img 
        src={gunIcon} 
        alt="Weapon" 
        className={`${iconSize} drop-shadow-lg transition-opacity duration-300 ${canShoot ? 'opacity-100' : 'opacity-30'}`}
        style={{ 
          filter: canShoot 
            ? isUnlimitedAmmo
              ? 'drop-shadow(0 0 8px #fbbf24) brightness(1.3)' // Gold glow for unlimited
              : 'drop-shadow(0 0 4px #60a5fa)' // Light blue glow
            : 'drop-shadow(0 0 2px #64748b)' 
        }} 
      />
      <div className={`relative ${barWidth} ${barHeight} bg-black/50 rounded-full border transition-all duration-300 ${canShoot ? (isUnlimitedAmmo ? 'border-yellow-500/50' : 'border-cyan-500/50') : 'border-gray-500/30'}`}>
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
            isUnlimitedAmmo ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 
            isRecharging ? 'bg-cyan-400' : 
            'bg-cyan-500'
          }`}
          style={{
            width: isUnlimitedAmmo ? '100%' : `${ammoPercentage}%`,
            boxShadow: canShoot 
              ? isUnlimitedAmmo 
                ? `0 0 ${size === 'mobile' ? '10px' : '12px'} #fbbf24`
                : `0 0 ${size === 'mobile' ? '8px' : '10px'} #60a5fa`
              : 'none',
            animation: isRecharging ? 'pulse 1s ease-in-out infinite' : 'none'
          }}
        />
      </div>
    </div>
  );
};


