import { useRef, useState, useEffect, useCallback } from 'react';
import shipIdleSprite from '@/assets/ship-idle.png';
import shipThrustSprite from '@/assets/ship-thrust.png';
import ship2IdleSprite from '@/assets/ship2-idle.png';
import ship2ThrustSprite from '@/assets/ship2-thrust.png';
import ship3IdleSprite from '@/assets/ship3-idle.png';
import ship3ThrustSprite from '@/assets/ship3-thrust.png';
import meteorSprite from '@/assets/meteor1.png';
import planet2Sprite from '@/assets/planet2.png';
import blackholeSprite from '@/assets/blackhole3.png';
import debrisSprite from '@/assets/debris4.png';
import scrapSprite from '@/assets/debris_scrap.png';
import starSprite from '@/assets/star.png';
import starUpgradeSprite from '@/assets/star_upgrade.png';
import starUpgrade2Sprite from '@/assets/star_upgrade2.png';
import healthWrenchSprite from '@/assets/health_wrench.png';
import unlimitedAmmoSprite from '@/assets/unlimited_ammo.png';
import { RendererImages } from '../game/Renderer';

export const useImageLoader = () => {
  const shipIdleImg = useRef<HTMLImageElement>(null!);
  const shipThrustImg = useRef<HTMLImageElement>(null!);
  const ship2IdleImg = useRef<HTMLImageElement>(null!);
  const ship2ThrustImg = useRef<HTMLImageElement>(null!);
  const ship3IdleImg = useRef<HTMLImageElement>(null!);
  const ship3ThrustImg = useRef<HTMLImageElement>(null!);
  const meteorImg = useRef<HTMLImageElement>(null!);
  const planet2Img = useRef<HTMLImageElement>(null!);
  const blackholeImg = useRef<HTMLImageElement>(null!);
  const debrisImg = useRef<HTMLImageElement>(null!);
  const scrapImg = useRef<HTMLImageElement>(null!);
  const starImg = useRef<HTMLImageElement>(null!);
  const starUpgradeImg = useRef<HTMLImageElement>(null!);
  const starUpgrade2Img = useRef<HTMLImageElement>(null!);
  const healthWrenchImg = useRef<HTMLImageElement>(null!);
  const unlimitedAmmoImg = useRef<HTMLImageElement>(null!);

  useEffect(() => {
    const loadImage = (src: string, ref: React.MutableRefObject<HTMLImageElement>) => {
      const img = new Image();
      img.src = src;
      ref.current = img;
    };

    loadImage(shipIdleSprite, shipIdleImg);
    loadImage(shipThrustSprite, shipThrustImg);
    loadImage(ship2IdleSprite, ship2IdleImg);
    loadImage(ship2ThrustSprite, ship2ThrustImg);
    loadImage(ship3IdleSprite, ship3IdleImg);
    loadImage(ship3ThrustSprite, ship3ThrustImg);
    loadImage(meteorSprite, meteorImg);
    loadImage(planet2Sprite, planet2Img);
    loadImage(blackholeSprite, blackholeImg);
    loadImage(debrisSprite, debrisImg);
    loadImage(scrapSprite, scrapImg);
    loadImage(starSprite, starImg);
    loadImage(starUpgradeSprite, starUpgradeImg);
    loadImage(starUpgrade2Sprite, starUpgrade2Img);
    loadImage(healthWrenchSprite, healthWrenchImg);
    loadImage(unlimitedAmmoSprite, unlimitedAmmoImg);
  }, []);

  const getImages = useCallback((): RendererImages => ({
    shipIdle: shipIdleImg.current,
    shipThrust: shipThrustImg.current,
    ship2Idle: ship2IdleImg.current,
    ship2Thrust: ship2ThrustImg.current,
    ship3Idle: ship3IdleImg.current,
    ship3Thrust: ship3ThrustImg.current,
    meteor: meteorImg.current,
    planet2: planet2Img.current,
    blackhole: blackholeImg.current,
    debris: debrisImg.current,
    scrap: scrapImg.current,
    star: starImg.current,
    starUpgrade: starUpgradeImg.current,
    starUpgrade2: starUpgrade2Img.current,
    healthWrench: healthWrenchImg.current,
    unlimitedAmmo: unlimitedAmmoImg.current,
  }), []);

  return {
    images: getImages(),
    getImages,
  };
};


