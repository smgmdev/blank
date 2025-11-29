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

interface AppState {
  user: 'admin' | 'user' | null;
  sites: Site[];
  articles: Article[];
  login: (type: 'admin' | 'user') => void;
  logout: () => void;
  addSite: (site: Omit<Site, 'id' | 'isConnected'>) => void;
  connectSite: (siteId: string) => void;
  disconnectSite: (siteId: string) => void;
  addArticle: (article: Omit<Article, 'id' | 'publishedAt' | 'wpLink'>) => void;
  deleteArticle: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null, // Start logged out
  sites: [
    { id: '1', name: 'TechCrunch Clone', url: 'https://tech.blog', seoPlugin: 'rankmath', isConnected: false },
    { id: '2', name: 'Daily Recipes', url: 'https://yummy.food', seoPlugin: 'aioseo', isConnected: true },
    { id: '3', name: 'My Portfolio', url: 'https://me.dev', seoPlugin: 'none', isConnected: true },
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
