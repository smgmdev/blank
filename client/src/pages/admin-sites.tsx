import { useState } from "react";
import { useStore, Site, SeoPlugin } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Globe, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Helper function to display SEO plugin names
const getSeoPluginName = (plugin: SeoPlugin): string => {
  switch(plugin) {
    case 'rankmath': return 'Rank Math';
    case 'aioseo': return 'AIO SEO PRO';
    case 'none': return 'Standard';
    default: return plugin;
  }
};

// Helper function to fetch favicon
const getFavicon = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    return '';
  }
};

export default function AdminSites() {
  const { sites, addSite } = useStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newSite, setNewSite] = useState({
    name: "",
    url: "",
    seoPlugin: "none" as SeoPlugin,
    authCode: ""
  });

  const handleAdd = () => {
    if (!newSite.name || !newSite.url || !newSite.authCode) return;
    addSite({ name: newSite.name, url: newSite.url, seoPlugin: newSite.seoPlugin }, newSite.authCode);
    setIsOpen(false);
    setNewSite({ name: "", url: "", seoPlugin: "none", authCode: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Site Management</h2>
          <p className="text-muted-foreground">Manage connected WordPress instances and their configurations.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New WordPress Site</DialogTitle>
              <DialogDescription>
                Enter the site details and select the installed SEO plugin.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Tech Blog" 
                  value={newSite.name}
                  onChange={e => setNewSite({...newSite, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input 
                  id="url" 
                  placeholder="https://example.com" 
                  value={newSite.url}
                  onChange={e => setNewSite({...newSite, url: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plugin">SEO Plugin</Label>
                <Select 
                  value={newSite.seoPlugin} 
                  onValueChange={(v: SeoPlugin) => setNewSite({...newSite, seoPlugin: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plugin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Default</SelectItem>
                    <SelectItem value="aioseo">AIO SEO PRO</SelectItem>
                    <SelectItem value="rankmath">Rank Math</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="authCode">Authentication Code</Label>
                <Input 
                  id="authCode" 
                  type="password"
                  placeholder="Enter WordPress API authentication code" 
                  value={newSite.authCode}
                  onChange={e => setNewSite({...newSite, authCode: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">Required to securely connect to your WordPress API</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Site</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>SEO Plugin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.map((site) => {
              const favicon = getFavicon(site.url);
              return (
              <TableRow key={site.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {favicon ? (
                    <img src={favicon} alt={site.name} className="w-6 h-6 rounded" />
                  ) : (
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center text-primary">
                      <Globe className="w-4 h-4" />
                    </div>
                  )}
                  {site.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{site.url}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${site.seoPlugin === 'rankmath' ? 'bg-purple-100 text-purple-800' : 
                      site.seoPlugin === 'aioseo' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {getSeoPluginName(site.seoPlugin)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
