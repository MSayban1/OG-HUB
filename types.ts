
export interface Game {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  bannerUrl: string;
  category: string;
  gameUrl: string;
  htmlContent?: string; // For raw HTML games
  isExternal: boolean;
  isFeatured?: boolean; // To tag games for home screen
  isNew?: boolean; // New: To tag new releases
  isTrending?: boolean; // New: To tag trending games
  enabled: boolean;
  playCount: number;
  likes: number;
  dislikes: number;
  createdAt: number;
}

export interface HomeBanner {
  id: string;
  url: string;
  timestamp: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  totalPlayTime: number; // in seconds
  totalGamesPlayed: number;
  lastPlayedAt?: number;
  createdAt: number;
  profilePicture?: string; // Base64 string
}

export interface SupportTicket {
  id: string;
  uid: string;
  username: string;
  email: string;
  profilePicture?: string;
  problemType: string;
  description: string;
  status: 'open' | 'resolved';
  timestamp: number;
}

export interface RecentlyPlayed {
  gameId: string;
  timestamp: number;
}

export interface Favorite {
  gameId: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  uid: string;
  username: string;
  text: string;
  timestamp: any;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
}

export interface BlockedUser {
  blockedUntil: number;
  reason: string;
}
