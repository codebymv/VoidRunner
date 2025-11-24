import { useRef, useState, useEffect, useCallback } from 'react';
import shipIdleSprite from '@/assets/ship-idle.webp';
import shipThrustSprite from '@/assets/ship-thrust.webp';
import ship2IdleSprite from '@/assets/ship2-idle.webp';
import ship2ThrustSprite from '@/assets/ship2-thrust.webp';
import ship3IdleSprite from '@/assets/ship3-idle.webp';
import ship3ThrustSprite from '@/assets/ship3-thrust.webp';
import meteorSprite from '@/assets/meteor1.webp';
import planet2Sprite from '@/assets/planet2.webp';
import blackholeSprite from '@/assets/blackhole3.webp';
import debrisSprite from '@/assets/debris4.webp';
import scrapSprite from '@/assets/debris_scrap.webp';
import starSprite from '@/assets/star.webp';
import starUpgradeSprite from '@/assets/star_upgrade.webp';
import starUpgrade2Sprite from '@/assets/star_upgrade2.webp';
import healthWrenchSprite from '@/assets/health_wrench.webp';
import unlimitedAmmoSprite from '@/assets/unlimited_ammo.webp';
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


