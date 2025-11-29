import { create } from 'zustand';

export type SeoPlugin = 'aioseo' | 'rankmath' | 'yoast' | 'none';

export interface Site {
  id: string;
  name: string;
  url: string;
  seoPlugin: SeoPlugin;
  isConnected: boolean; // For the current user
}

export interface Article {
  title: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
}

interface AppState {
  user: 'admin' | 'user' | null;
  sites: Site[];
  login: (type: 'admin' | 'user') => void;
  logout: () => void;
  addSite: (site: Omit<Site, 'id' | 'isConnected'>) => void;
  connectSite: (siteId: string) => void;
  disconnectSite: (siteId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null, // Start logged out
  sites: [
    { id: '1', name: 'TechCrunch Clone', url: 'https://tech.blog', seoPlugin: 'rankmath', isConnected: false },
    { id: '2', name: 'Daily Recipes', url: 'https://yummy.food', seoPlugin: 'aioseo', isConnected: true },
    { id: '3', name: 'My Portfolio', url: 'https://me.dev', seoPlugin: 'none', isConnected: true },
  ],
  login: (type) => set({ user: type }),
  logout: () => set({ user: null }),
  addSite: (site) => set((state) => ({
    sites: [...state.sites, { ...site, id: Math.random().toString(36).substr(2, 9), isConnected: false }]
  })),
  connectSite: (siteId) => set((state) => ({
    sites: state.sites.map(s => s.id === siteId ? { ...s, isConnected: true } : s)
  })),
  disconnectSite: (siteId) => set((state) => ({
    sites: state.sites.map(s => s.id === siteId ? { ...s, isConnected: false } : s)
  })),
}));
