export interface UserProfile {
  uid: string;
  username: string;
  usernameLower?: string;
  email: string | null;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  role: 'user' | 'admin';
  createdAt: number;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  createdBy?: string;
  createdAt: number;
  members: string[];
  lastMessageText?: string;
  lastMessageAt?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: number;
  type: 'text' | 'call_log' | 'system';
}

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  status: 'dialing' | 'ringing' | 'connected' | 'ended';
  type: 'voice' | 'video';
  createdAt: number;
  signalData?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface FeatureToggles {
  voiceCalls: boolean;
  groupCreation: boolean;
  anonymousMode: boolean;
  themeSelection: boolean;
}

export interface AppConfig {
  announcements: Announcement[];
  featureToggles: FeatureToggles;
  creatorCustomText: string;
  themeAccent: string; // e.g. 'emerald', 'indigo', 'rose', 'violet', 'amber'
}

export interface WindowInstance {
  id: string;
  title: string;
  icon?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  type: 'chat' | 'console' | 'profile' | 'calls' | 'settings' | 'new_chat' | 'new_group';
  chatData?: Chat | null;
}

