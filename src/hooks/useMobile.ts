import { useState, useEffect } from 'react';

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      // Enable mobile mode if:
      // 1. It's a mobile device (user agent)
      // 2. It has touch capabilities AND small screen
      // 3. OR just small screen (for desktop testing at mobile widths)
      setIsMobile(isMobileDevice || (isTouchDevice && isSmallScreen) || isSmallScreen);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const handleResize = () => {
      checkMobile();
    };

    const handleOrientationChange = () => {
      // Delay to allow orientation change to complete
      setTimeout(checkMobile, 100);
    };

    checkMobile();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return { isMobile, isLandscape };
};