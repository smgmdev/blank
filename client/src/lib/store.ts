import { create } from 'zustand';

export type SeoPlugin = 'aioseo' | 'rankmath' | 'yoast' | 'none';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  fullName: string;
  companyName?: string;
  createdAt: string;
}

export interface PublishingProfile {
  userId: string;
  displayName: string;
  profilePicture?: string;
}

export interface Site {
  id: string;
  name: string;
  url: string;
  seoPlugin: SeoPlugin;
  authCode: string; // API authentication code
  isConnected: boolean; // For the current user
}

export interface Article {
  id: string;
  siteId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: 'published' | 'draft';
  publishedAt: string;
  wpLink?: string; // Mock link to WP
}

// Demo credentials - accept both email and username
export const DEMO_CREDENTIALS = {
  user: { 
    emails: ['demo@writer.com', 'writer'],
    password: 'password' 
  },
  admin: { 
    emails: ['admin@system.com', 'admin'],
    password: 'password' 
  }
};

interface AppState {
  user: 'admin' | 'user' | null;
  sites: Site[];
  articles: Article[];
  users: User[];
  publishingProfile: PublishingProfile | null;
  isPublishing: boolean;
  login: (type: 'admin' | 'user') => void;
  logout: () => void;
  initializeFromStorage: () => void;
  loadPublishingProfileFromAPI: (userId: string) => Promise<void>;
  addSite: (site: Omit<Site, 'id' | 'isConnected' | 'authCode'>, authCode: string) => void;
  connectSite: (siteId: string) => void;
  disconnectSite: (siteId: string) => void;
  addArticle: (article: Omit<Article, 'id' | 'publishedAt' | 'wpLink'>) => void;
  deleteArticle: (id: string) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  deleteUser: (id: string) => void;
  updatePublishingProfile: (profile: PublishingProfile) => void;
  setIsPublishing: (isPublishing: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null, // Start logged out
  isPublishing: false,
  users: [
    {
      id: '1',
      username: 'writer',
      email: 'demo@writer.com',
      password: 'password',
      fullName: 'John Smith',
      companyName: 'Tech Media',
      createdAt: new Date().toISOString()
    }
  ],
  publishingProfile: {
    userId: '1',
    displayName: 'John Smith',
    profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
  },
  sites: [
    { id: '1', name: 'TechCrunch Clone', url: 'https://tech.blog', seoPlugin: 'rankmath', authCode: 'demo-auth-123', isConnected: false },
    { id: '2', name: 'Daily Recipes', url: 'https://yummy.food', seoPlugin: 'aioseo', authCode: 'demo-auth-456', isConnected: true },
    { id: '3', name: 'My Portfolio', url: 'https://me.dev', seoPlugin: 'none', authCode: 'demo-auth-789', isConnected: true },
  ],
  articles: [
    {
      id: '101',
      siteId: '2',
      title: 'Top 10 Vegan Breakfasts',
      content: 'Lorem ipsum...',
      category: 'Vegan',
      tags: ['Healthy', 'Morning'],
      status: 'published',
      publishedAt: new Date().toISOString(),
      wpLink: 'https://yummy.food/top-10-vegan-breakfasts'
    }
  ],
  login: (type) => {
    // Store session with 7-day expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('userSession', JSON.stringify({
      user: type,
      expiryDate: expiryDate.toISOString()
    }));
    set({ user: type });
  },
  logout: () => {
    // Clear all session data
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userSession'); // Old key, cleanup
    set({ user: null });
  },
  initializeFromStorage: () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole) {
      useStore.setState({ user: userRole as 'admin' | 'user' });
    }
  },
  addSite: (site, authCode) => set((state) => ({
    sites: [...state.sites, { ...site, authCode, id: Math.random().toString(36).substr(2, 9), isConnected: false }]
  })),
  connectSite: (siteId) => set((state) => ({
    sites: state.sites.map(s => s.id === siteId ? { ...s, isConnected: true } : s)
  })),
  disconnectSite: (siteId) => set((state) => ({
    sites: state.sites.map(s => s.id === siteId ? { ...s, isConnected: false } : s)
  })),
  addArticle: (article) => set((state) => {
    const site = state.sites.find(s => s.id === article.siteId);
    const slug = article.title.toLowerCase().replace(/ /g, '-');
    return {
      articles: [
        {
          ...article,
          id: Math.random().toString(36).substr(2, 9),
          publishedAt: new Date().toISOString(),
          wpLink: site ? `${site.url}/${slug}` : '#'
        },
        ...state.articles
      ]
    };
  }),
  deleteArticle: (id) => set((state) => ({
    articles: state.articles.filter(a => a.id !== id)
  })),
  addUser: (user) => set((state) => ({
    users: [...state.users, { ...user, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() }]
  })),
  deleteUser: (id) => set((state) => ({
    users: state.users.filter(u => u.id !== id)
  })),
  updatePublishingProfile: (profile) => set({ publishingProfile: profile }),
  setIsPublishing: (isPublishing) => set({ isPublishing }),
  loadPublishingProfileFromAPI: async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        if (user.displayName || user.profilePicture) {
          useStore.setState({
            publishingProfile: {
              userId,
              displayName: user.displayName || 'Content Creator',
              profilePicture: user.profilePicture
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load publishing profile:', error);
    }
  }
}));
