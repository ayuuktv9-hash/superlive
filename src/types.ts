import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  coins: number;
  followersCount: number;
  followingCount: number;
  isLive: boolean;
  role?: 'user' | 'admin';
}

export interface Stream {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  title: string;
  category?: string;
  viewersCount: number;
  createdAt: Timestamp;
  status: 'live' | 'ended';
}

export interface Message {
  id: string;
  streamId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'gift';
  giftName?: string;
  createdAt: Timestamp;
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
}

export const GIFTS: Gift[] = [
  { id: 'rose', name: 'Rosa', icon: '🌹', price: 10 },
  { id: 'heart', name: 'Corazón', icon: '❤️', price: 50 },
  { id: 'diamond', name: 'Diamante', icon: '💎', price: 100 },
  { id: 'crown', name: 'Corona', icon: '👑', price: 500 },
  { id: 'rocket', name: 'Cohete', icon: '🚀', price: 1000 },
  { id: 'unicorn', name: 'Unicornio', icon: '🦄', price: 2000 },
];
