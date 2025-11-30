import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ExternalLink, Trash2, Edit, Globe, PenTool, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function MyArticles() {
  const { toast } = useToast();
  const [location] = useLocation();
  const userId = localStorage.getItem('userId');
  const [articles, setArticles] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Record<number, string>>>({});
  const [tagMap, setTagMap] = useState<Record<string, Record<number, string>>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('published');
  const [loadingLinks, setLoadingLinks] = useState<Record<string, boolean>>({});

  // Update tab when location changes - this handles both initial load and URL param changes
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab') || 'published';
    setActiveTab(tab);
  }, [location]);

  // Fetch real articles and sites - SHOW IMMEDIATELY, fetch WordPress links in background
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        // Always fetch fresh articles
        const articlesRes = await fetch(`/api/content?type=articles`, { headers: { "x-user-id": userId } });
        
        if (articlesRes.ok) {
          const allArticles = await articlesRes.json();
          
          // Always fetch fresh site auth status from database (not cache)
          const sitesRes = await fetch(`/api/sites?action=user-sites&userId=${userId}`);
          let allSites: any[] = [];
          if (sitesRes.ok) {
            allSites = await sitesRes.json();
            setSites(allSites);
            localStorage.setItem(`sites_${userId}`, JSON.stringify(allSites));
          }
          
          // Filter to only this user's articles
          const userArticles = allArticles.filter((a: any) => a.userId === userId);
          
          // Check localStorage for cached wpLinks first
          const articlesWithCachedLinks = userArticles.map((a: any) => {
            const cachedLink = localStorage.getItem(`wpLink_${a.id}`);
            return cachedLink ? { ...a, wpLink: cachedLink } : a;
          });
          
          // SHOW ARTICLES IMMEDIATELY with cached wpLinks
          setArticles(articlesWithCachedLinks);
          setIsLoading(false);
          
          // BACKGROUND: Fetch categories for sites with articles (more efficient than all sites)
          const sitesWithArticles = new Set(userArticles.map(a => a.siteId));
          const loadCategoriesForSites = async () => {
            const newCategoryMap: Record<string, Record<number, string>> = {};
            for (const siteId of sitesWithArticles) {
              try {
                const catRes = await fetch(`/api/content?type=categories&userId=${userId}&siteId=${siteId}`, { cache: 'no-store' });
                if (catRes.ok) {
                  const categories = await catRes.json();
                  newCategoryMap[siteId] = {};
                  categories.forEach((cat: any) => {
                    newCategoryMap[siteId][cat.id] = cat.name;
                  });
                }
              } catch (e) {
                console.error(`Failed to fetch categories for site ${siteId}:`, e);
              }
            }
            if (Object.keys(newCategoryMap).length > 0) {
              setCategoryMap(newCategoryMap);
            }
            setIsCategoriesLoading(false);
          };
          loadCategoriesForSites();
          
          // BACKGROUND: Fetch WordPress links for published articles ONLY if there are any
          const publishedArticles = articlesWithCachedLinks.filter((a: any) => a.status === 'published' && !a.wpLink);
          if (publishedArticles.length > 0) {
            const fetchLinksInBackground = async () => {
              const updatedArticles = [...articlesWithCachedLinks];
              for (let i = 0; i < publishedArticles.length; i += 2) {
                const batch = publishedArticles.slice(i, i + 2);
                const results = await Promise.all(batch.map(async (article: any) => {
                  try {
                    const publishRes = await fetch(`/api/content?type=publishing&articleId=${article.id}&siteId=${article.siteId}`);
                    if (publishRes.ok) {
                      const pubData = await publishRes.json();
                      return { ...article, wpLink: pubData.wpLink };
                    }
                  } catch (e) {
                    // Silently fail
                  }
                  return article;
                }));
                // Update articles with new wpLink data
                results.forEach(result => {
                  const idx = updatedArticles.findIndex(a => a.id === result.id);
                  if (idx >= 0) updatedArticles[idx] = result;
                });
                setArticles([...updatedArticles]);
              }
            };
            // Don't wait - run in background
            fetchLinksInBackground();
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load articles" });
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleDeleteClick = (id: string) => {
    setSelectedArticleId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedArticleId) {
      try {
        const res = await fetch(`/api/content?type=articles&articleId=${selectedArticleId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setArticles(articles.filter(a => a.id !== selectedArticleId));
          toast({
            title: "Article Deleted",
            description: "The article has been removed from the list and WordPress.",
          });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete article" });
      }
      setDeleteDialogOpen(false);
      setSelectedArticleId(null);
    }
  };

  const handleEdit = (articleId: string) => {
    // Navigate to editor with article ID
    window.location.href = `/editor/${articleId}`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSyncStatus("Syncing with WordPress...");
    setSyncError(null);
    try {
      const syncRes = await fetch(`/api/sync-articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: true })
      });
      
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        // Filter articles excluding deleted ones
        const userArticles = syncData.articles
          .filter((a: any) => a.userId === userId)
          .filter((a: any) => !syncData.deletedIds || !syncData.deletedIds.includes(a.id));
        
        console.log("Sync deleted IDs:", syncData.deletedIds);
        
        // Update articles immediately (don't re-fetch categories)
        setArticles(userArticles);
        setSyncStatus(null);
        
        // Toast notification
        if (syncData.deletedCount > 0) {
          toast({
            title: "Synced",
            description: `Articles synced with WordPress. ${syncData.deletedCount} deleted article(s) removed.`
          });
        } else {
          toast({
            title: "Synced",
            description: "Articles are up to date with WordPress."
          });
        }
      } else {
        setSyncError("Failed to sync: " + syncRes.statusText);
      }
    } catch (error: any) {
      setSyncError("Error: " + (error.message || "Failed to sync articles"));
      toast({ variant: "destructive", title: "Error", description: "Failed to sync articles" });
    }
    setIsRefreshing(false);
  };

  const publishedArticles = articles
    .filter(a => a.status === 'published')
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  const draftArticles = articles
    .filter(a => a.status === 'draft')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const ArticleCard = ({ article }: { article: any }) => {
    const site = sites.find(s => s.id === article.siteId);
    
    // Get category names from the categoryMap
    const getCategoryNames = () => {
      if (!Array.isArray(article.categories) || !site) return [];
      const siteCategories = categoryMap[site.id] || {};
      return article.categories.map((catId: any) => {
        if (typeof catId === 'number') {
          return siteCategories[catId] || null;
        }
        if (typeof catId === 'object' && catId.name) return catId.name;
        return String(catId);
      }).filter(Boolean);
    };
    
    // Get tag names from article tags or tagMap
    const getTagNames = () => {
      if (!Array.isArray(article.tags) || !site) return [];
      const siteTags = tagMap[site.id] || {};
      
      return article.tags.map((tag: any) => {
        // New format: tag is an object {id, name}
        if (typeof tag === 'object' && tag.id) {
          return {
            id: tag.id,
            name: tag.name || siteTags[tag.id] || `Tag ${tag.id}`
          };
        }
        // Old format: tag is just an ID number
        if (typeof tag === 'number') {
          return {
            id: tag,
            name: siteTags[tag] || `Tag ${tag}`
          };
        }
        // String tag name - use as ID and name
        if (typeof tag === 'string') {
          return {
            id: tag,
            name: tag
          };
        }
        return null;
      }).filter(Boolean);
    };
    
    // Check if ANY categories are still loading for this article
    const hasMissingCategories = () => {
      if (isCategoriesLoading || !Array.isArray(article.categories) || !site) return true;
      const siteCategories = categoryMap[site.id] || {};
      return article.categories.some((catId: any) => 
        typeof catId === 'number' && !siteCategories[catId]
      );
    };
    
    return (
      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        {/* Mobile: Image + Title on left, actions on right */}
        <div className="p-3 sm:p-4 flex flex-row sm:flex-col gap-3">
          <div className="flex gap-3 flex-1 min-w-0">
            {/* Featured Image - Compact */}
            {article.featuredImageUrl && (
              <div className="w-16 h-16 sm:w-32 sm:h-32 flex-shrink-0 bg-muted overflow-hidden rounded" data-testid={`img-article-${article.id}`}>
                <img 
                  src={article.featuredImageUrl} 
                  alt={article.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("Image load failed for:", article.featuredImageUrl);
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            
            {/* Title + Meta - Compact */}
            <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base break-words">{article.title}</h3>
            
            {/* Meta Description - 2 lines max */}
            {article.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}
              </p>
            )}
            
            {/* Category & Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {isCategoriesLoading || hasMissingCategories() ? (
                <>
                  <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                </>
              ) : (
                <>
                  {getCategoryNames().map((catName: string) => (
                    <Badge key={catName} variant="outline" className="text-xs">{catName}</Badge>
                  ))}
                </>
              )}
              {isCategoriesLoading ? (
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                  ))}
                </div>
              ) : getTagNames().slice(0, 3).map((tag: any) => (
                <Badge key={`tag-${tag.id}`} variant="secondary" className="text-xs text-muted-foreground" data-testid={`tag-badge-${tag.id}`}>{tag.name}</Badge>
              ))}
              {!isCategoriesLoading && getTagNames().length > 3 && (
                <Badge variant="secondary" className="text-xs text-muted-foreground" data-testid="tag-badge-more">+{getTagNames().length - 3}</Badge>
              )}
            </div>
            
            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>{site?.name || 'Unknown Site'}</span>
              </div>
              <span>{format(new Date(article.status === 'draft' ? article.createdAt : article.publishedAt), "MMM d, yyyy · h:mm a zzz")}</span>
            </div>
          </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-1 flex-shrink-0 p-4 sm:p-0 border-t sm:border-t-0 sm:border-t-0">
            <div className="flex gap-2 flex-wrap">
              {article.status === 'published' && (
                <>
                  {loadingLinks[article.id] ? (
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  ) : (
                    <Button variant="outline" size="sm" asChild title="View Article" className="h-8 text-xs hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 whitespace-nowrap" disabled={!article.wpLink}>
                      <a href={article.wpLink || '#'} target={article.wpLink ? '_blank' : undefined} rel={article.wpLink ? 'noopener noreferrer' : undefined}>
                        View Article
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="icon" title="Edit Article" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(article.id)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={() => handleDeleteClick(article.id)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Manage your published content across all connected sites.</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <div className="flex-1 sm:flex-auto">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="w-full sm:w-auto hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshing ? "Syncing..." : "Refresh & Sync"}
            </Button>
            {syncStatus && (
              <p className="text-xs text-muted-foreground mt-2">{syncStatus}</p>
            )}
            {syncError && (
              <p className="text-xs text-destructive mt-2">{syncError}</p>
            )}
          </div>
          <Link href="/editor">
            <Button className="w-full sm:w-auto hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
              Write New Article
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="border border-dashed rounded-lg p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">Loading articles...</p>
        </div>
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="published" className="flex items-center gap-2">
                Published <Badge variant="secondary" className="ml-2">{publishedArticles.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="drafts" className="flex items-center gap-2">
                Drafts <Badge variant="secondary" className="ml-2">{draftArticles.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="published" className="space-y-4">
              {publishedArticles.length === 0 ? (
                <div className="border border-dashed rounded-lg p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">No published articles yet</h3>
                    <p className="text-muted-foreground text-sm">Write and publish your first article to see it here.</p>
                  </div>
                  <Link href="/editor">
                    <Button variant="outline" size="sm">
                      Write Your First Article
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {publishedArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="drafts" className="space-y-4">
              {draftArticles.length === 0 ? (
                <div className="border border-dashed rounded-lg p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">No draft articles yet</h3>
                    <p className="text-muted-foreground text-sm">Start writing your first article to save it as a draft.</p>
                  </div>
                  <Link href="/editor">
                    <Button variant="outline" size="sm">
                      Write Your First Article
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {draftArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="animate-fade-in w-full sm:max-w-md flex flex-col">
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this article? This action will remove it from your list and WordPress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              No, Keep It
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
            >
              Yes, Delete Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
