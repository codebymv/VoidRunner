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
      
      // Check for desktop simulation modes
      const urlParams = new URLSearchParams(window.location.search);
      const forceMobile = urlParams.get('mobile') === 'true' || urlParams.get('simulate') === 'mobile';
      
      // Check if browser dev tools are simulating mobile (common viewport sizes)
      const isDevToolsMobile = (
        window.innerWidth === 375 && window.innerHeight === 667 || // iPhone 6/7/8
        window.innerWidth === 414 && window.innerHeight === 896 || // iPhone XR
        window.innerWidth === 390 && window.innerHeight === 844 || // iPhone 12
        window.innerWidth === 360 && window.innerHeight === 640 || // Galaxy S5
        window.innerWidth === 412 && window.innerHeight === 915    // Pixel 7
      );
      
      // Enable mobile mode if:
      // 1. It's a mobile device (user agent)
      // 2. It has touch capabilities AND small screen
      // 3. Small screen (for desktop testing at mobile widths)
      // 4. Force mobile via URL parameter (?mobile=true or ?simulate=mobile)
      // 5. Common mobile viewport sizes (dev tools simulation)
      setIsMobile(
        isMobileDevice || 
        (isTouchDevice && isSmallScreen) || 
        isSmallScreen || 
        forceMobile || 
        isDevToolsMobile
      );
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