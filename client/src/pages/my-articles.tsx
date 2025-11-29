import { useState } from "react";
import { useStore } from "@/lib/store";
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
import { FileText, ExternalLink, Trash2, Edit, Globe, PenTool } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function MyArticles() {
  const { articles, sites, deleteArticle } = useStore();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setSelectedArticleId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedArticleId) {
      deleteArticle(selectedArticleId);
      toast({
        title: "Article Deleted",
        description: "The article has been removed from the list and WordPress.",
      });
      setDeleteDialogOpen(false);
      setSelectedArticleId(null);
    }
  };

  const handleEdit = (articleId: string) => {
    toast({
      title: "Edit Article",
      description: "Opening article editor...",
    });
    // In a real app, this would navigate to the editor with the article data
    // For now, we'll just show the toast
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Manage your published content across all connected sites.</p>
        </div>
        <Link href="/editor">
          <Button className="w-full sm:w-auto">
            <PenTool className="w-4 h-4 mr-2" />
            Write New Article
          </Button>
        </Link>
      </div>

      {articles.length === 0 ? (
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
        <div className="grid gap-4">
          {articles.map((article) => {
            const site = sites.find(s => s.id === article.siteId);
            return (
              <div key={article.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base break-words">{article.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{article.category}</Badge>
                      {article.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs text-muted-foreground">{tag}</Badge>
                      ))}
                      {article.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs text-muted-foreground">+{article.tags.length - 3}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>{site?.name || 'Unknown Site'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={article.status === 'published' ? 'bg-green-100 text-green-800 hover:bg-green-100 text-xs' : 'bg-yellow-100 text-yellow-800 text-xs'}>
                          {article.status}
                        </Badge>
                      </div>
                      <span>{format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
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
          })}
        </div>
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
