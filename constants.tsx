
import React from 'react';

export const APP_NAME = "OG HUB";
export const TAGLINE = "Your Online Games Universe";
export const LOGO_URL = "https://i.postimg.cc/FfRvY23V/oghub.png";

export const CATEGORIES = [
  { id: 'action', name: 'Action', icon: 'fa-fire' },
  { id: 'arcade', name: 'Arcade', icon: 'fa-gamepad' },
  { id: 'puzzle', name: 'Puzzle', icon: 'fa-puzzle-piece' },
  { id: 'racing', name: 'Racing', icon: 'fa-car' },
  { id: 'sports', name: 'Sports', icon: 'fa-volleyball' },
  { id: 'strategy', name: 'Strategy', icon: 'fa-chess' }
];

export const INITIAL_GAMES: any[] = [
  {
    id: 'sample-1',
    name: 'Neon Rider',
    description: 'Race through neon streets in this high-speed arcade game.',
    iconUrl: 'https://picsum.photos/seed/neon/200',
    bannerUrl: 'https://picsum.photos/seed/neon-banner/800/400',
    category: 'racing',
    gameUrl: 'https://play.google.com/intl/en_us/about/play-pass/', // Just a placeholder
    isExternal: true,
    enabled: true,
    playCount: 124,
    createdAt: Date.now()
  }
];
