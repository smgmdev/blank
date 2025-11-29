import { create } from 'zustand';

export type SeoPlugin = 'aioseo' | 'rankmath' | 'yoast' | 'none';

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
  login: (type: 'admin' | 'user') => void;
  logout: () => void;
  initializeFromStorage: () => void;
  addSite: (site: Omit<Site, 'id' | 'isConnected' | 'authCode'>, authCode: string) => void;
  connectSite: (siteId: string) => void;
  disconnectSite: (siteId: string) => void;
  addArticle: (article: Omit<Article, 'id' | 'publishedAt' | 'wpLink'>) => void;
  deleteArticle: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null, // Start logged out
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
    localStorage.removeItem('userSession');
    set({ user: null });
  },
  initializeFromStorage: () => set((state) => {
    const session = localStorage.getItem('userSession');
    if (session) {
      try {
        const { user, expiryDate } = JSON.parse(session);
        const now = new Date();
        const expiry = new Date(expiryDate);
        // Check if session is still valid
        if (now < expiry && user) {
          return { user };
        } else {
          localStorage.removeItem('userSession');
          return { user: null };
        }
      } catch (e) {
        localStorage.removeItem('userSession');
        return { user: null };
      }
    }
    return { user: null };
  }),
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
}));
