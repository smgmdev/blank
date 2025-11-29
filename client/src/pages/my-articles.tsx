import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
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
import { FileText, ExternalLink, Trash2, Edit, Globe, PenTool } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function MyArticles() {
  const { toast } = useToast();
  const userId = localStorage.getItem('userId');
  const [articles, setArticles] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, Record<number, string>>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real articles and sites
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const [articlesRes, sitesRes] = await Promise.all([
          fetch(`/api/articles`),
          fetch(`/api/sites`)
        ]);
        
        if (articlesRes.ok && sitesRes.ok) {
          const allArticles = await articlesRes.json();
          const allSites = await sitesRes.json();
          setSites(allSites);
          
          // Filter to only this user's articles
          const userArticles = allArticles.filter((a: any) => a.userId === userId);
          
          // Fetch category names for each site
          const newCategoryMap: Record<string, Record<number, string>> = {};
          for (const site of allSites) {
            try {
              const catRes = await fetch(`/api/sites/${site.id}/categories?userId=${userId}`);
              if (catRes.ok) {
                const categories = await catRes.json();
                newCategoryMap[site.id] = {};
                categories.forEach((cat: any) => {
                  newCategoryMap[site.id][cat.id] = cat.name;
                });
              }
            } catch (e) {
              console.error(`Failed to fetch categories for site ${site.id}:`, e);
            }
          }
          setCategoryMap(newCategoryMap);
          
          // Fetch WordPress links for published articles
          const articlesWithLinks = await Promise.all(userArticles.map(async (article: any) => {
            if (article.status === 'published') {
              try {
                const publishRes = await fetch(`/api/articles/${article.id}/publishing`);
                if (publishRes.ok) {
                  const pubData = await publishRes.json();
                  return { ...article, wpLink: pubData.wpLink };
                }
              } catch (e) {
                // Silently fail - wpLink will be undefined
              }
            }
            return article;
          }));
          
          setArticles(articlesWithLinks);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load articles" });
      }
      setIsLoading(false);
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
        const res = await fetch(`/api/articles/${selectedArticleId}`, {
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
    try {
      const [articlesRes, sitesRes] = await Promise.all([
        fetch(`/api/articles`),
        fetch(`/api/sites`)
      ]);
      
      if (articlesRes.ok && sitesRes.ok) {
        const allArticles = await articlesRes.json();
        const allSites = await sitesRes.json();
        const userArticles = allArticles.filter((a: any) => a.userId === userId);
        
        const articlesWithLinks = await Promise.all(userArticles.map(async (article: any) => {
          if (article.status === 'published' && article.siteId) {
            try {
              const site = allSites.find((s: any) => s.id === article.siteId);
              const publishRes = await fetch(`/api/articles/${article.id}/publishing`);
              if (publishRes.ok) {
                const pubData = await publishRes.json();
                return { ...article, wpLink: pubData.wpLink, exists: true };
              } else if (publishRes.status === 404) {
                // Article doesn't exist on WordPress anymore - mark for deletion
                return { ...article, exists: false };
              }
            } catch (e) {
              // Silently fail but keep article
            }
          }
          return { ...article, exists: true };
        }));
        
        // Filter out deleted articles and update
        const activeArticles = articlesWithLinks.filter(a => a.exists !== false);
        const deletedCount = articlesWithLinks.length - activeArticles.length;
        
        setArticles(activeArticles);
        setSites(allSites);
        
        if (deletedCount > 0) {
          toast({
            title: "Synced",
            description: `Articles synced with WordPress. ${deletedCount} deleted article(s) removed.`
          });
        } else {
          toast({
            title: "Synced",
            description: "Articles are up to date with WordPress."
          });
        }
      }
    } catch (error) {
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
        // If it's a number ID, look it up in the map
        if (typeof catId === 'number') {
          return siteCategories[catId] || `Category ${catId}`;
        }
        // If it's already an object with name, use it
        if (typeof catId === 'object' && catId.name) return catId.name;
        // Otherwise convert to string
        return String(catId);
      });
    };
    
    return (
      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 sm:p-4">
          {/* Featured Image on Left */}
          {article.featuredImageUrl && (
            <div className="w-full sm:w-40 h-40 flex-shrink-0 bg-muted overflow-hidden rounded-t sm:rounded-lg">
              <img 
                src={article.featuredImageUrl} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Content */}
          <div className={`flex-1 min-w-0 ${article.featuredImageUrl ? 'p-4 sm:p-0' : 'p-4'}`}>
            <h3 className="font-semibold text-base break-words">{article.title}</h3>
            
            {/* Meta Description - 2 lines max */}
            {article.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}
              </p>
            )}
            
            {/* Category & Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {getCategoryNames().map((catName: string) => (
                <Badge key={catName} variant="outline" className="text-xs">{catName}</Badge>
              ))}
              {Array.isArray(article.tags) && article.tags.slice(0, 3).map((tag: any) => (
                <Badge key={tag} variant="secondary" className="text-xs text-muted-foreground">{tag}</Badge>
              ))}
              {Array.isArray(article.tags) && article.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs text-muted-foreground">+{article.tags.length - 3}</Badge>
              )}
            </div>
            
            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>{site?.name || 'Unknown Site'}</span>
              </div>
              <span>{format(new Date(article.publishedAt || new Date()), "MMM d, yyyy · h:mm a zzz")}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0 p-4 sm:p-0 border-t sm:border-t-0">
            {article.wpLink && (
              <Button variant="ghost" size="icon" asChild title="View on WordPress" className="h-8 w-8">
                <a href={article.wpLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                </a>
              </Button>
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Manage your published content across all connected sites.</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            {isRefreshing ? "Syncing..." : "Refresh & Sync"}
          </Button>
          <Link href="/editor">
            <Button className="w-full sm:w-auto">
              <PenTool className="w-4 h-4 mr-2" />
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
      ) : articles.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-lg">No articles yet</h3>
            <p className="text-muted-foreground text-sm">Start writing your first article to see it here.</p>
          </div>
          <Link href="/editor">
            <Button variant="outline" size="sm">
              Write Your First Article
            </Button>
          </Link>
        </div>
      ) : (
        <Tabs defaultValue="published" className="w-full">
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
              <div className="text-center py-8 text-muted-foreground">
                <p>No published articles yet.</p>
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
              <div className="text-center py-8 text-muted-foreground">
                <p>No draft articles yet.</p>
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
