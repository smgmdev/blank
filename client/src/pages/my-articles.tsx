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
import { FileText, ExternalLink, Trash2, Edit, Globe } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function MyArticles() {
  const { articles, sites, deleteArticle } = useStore();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
      deleteArticle(id);
      toast({
        title: "Article Deleted",
        description: "The article has been removed from the list.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Articles</h2>
          <p className="text-muted-foreground">Manage your published content across all connected sites.</p>
        </div>
        <Link href="/editor">
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Write New
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Article Details</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  No articles published yet. Start writing!
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => {
                const site = sites.find(s => s.id === article.siteId);
                return (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div className="font-medium text-base">{article.title}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-normal">{article.category}</Badge>
                        {article.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs font-normal text-muted-foreground">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-3 h-3 text-muted-foreground" />
                        {site?.name || 'Unknown Site'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={article.status === 'published' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800'}>
                        {article.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(article.publishedAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {article.wpLink && (
                          <Button variant="ghost" size="icon" asChild title="View on WordPress">
                            <a href={article.wpLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Edit (Mock)">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(article.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
