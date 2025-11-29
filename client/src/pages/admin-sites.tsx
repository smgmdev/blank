import { useState, useEffect } from "react";
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
  const { sites, addSite, removeSite } = useStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sites_db, setSites_db] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [newSite, setNewSite] = useState({
    name: "",
    url: "",
    seoPlugin: "rankmath" as SeoPlugin,
    apiUrl: "",
    apiToken: ""
  });
  const [adminCreds, setAdminCreds] = useState({
    username: "",
    password: ""
  });

  // Fetch sites from database on mount
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await fetch('/api/sites');
        if (response.ok) {
          const data = await response.json();
          setSites_db(data);
        }
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSites();
  }, []);

  const handleVerifyConnection = async () => {
    if (!newSite.apiUrl || !adminCreds.username || !adminCreds.password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Enter API URL and admin credentials"
      });
      return;
    }

    setIsVerifying(true);
    try {
      // First create the site as unverified
      const siteResponse = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSite.name,
          url: newSite.url,
          apiUrl: newSite.apiUrl,
          apiToken: newSite.apiToken || "pending",
          seoPlugin: newSite.seoPlugin
        })
      });

      if (!siteResponse.ok) throw new Error('Failed to create site');
      const site = await siteResponse.json();

      // Now verify the connection
      const verifyResponse = await fetch(`/api/sites/${site.id}/verify-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUsername: adminCreds.username,
          adminPassword: adminCreds.password
        })
      });

      if (!verifyResponse.ok) {
        // Delete the unverified site
        await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error);
      }

      const verifyData = await verifyResponse.json();
      setSites_db([...sites_db, { ...site, isConnected: true }]);
      setIsOpen(false);
      setIsVerified(false);
      setNewSite({ name: "", url: "", seoPlugin: "rankmath", apiUrl: "", apiToken: "" });
      setAdminCreds({ username: "", password: "" });

      toast({
        title: "Success",
        description: verifyData.message
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAdd = async () => {
    if (!newSite.name || !newSite.url || !newSite.apiUrl) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields"
      });
      return;
    }

    if (!isVerified) {
      toast({
        variant: "destructive",
        title: "Not Verified",
        description: "Please verify the WordPress connection first"
      });
      return;
    }

    handleVerifyConnection();
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/sites/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSites_db(sites_db.filter(s => s.id !== id));
        toast({
          title: "Deleted",
          description: "Site removed successfully"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete site"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                <Label htmlFor="apiUrl">WordPress REST API URL</Label>
                <Input 
                  id="apiUrl" 
                  placeholder="https://example.com/wp-json" 
                  value={newSite.apiUrl}
                  onChange={e => setNewSite({...newSite, apiUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token / App Password</Label>
                <Input 
                  id="apiToken" 
                  type="password"
                  placeholder="Enter WordPress API token or app password" 
                  value={newSite.apiToken}
                  onChange={e => setNewSite({...newSite, apiToken: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">Create an App Password in WordPress Settings for security</p>
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
                    <SelectItem value="rankmath">Rank Math</SelectItem>
                    <SelectItem value="aioseo">AIO SEO PRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-3 block">Verify WordPress Connection</Label>
                <div className="space-y-2">
                  <Input 
                    placeholder="WordPress admin username" 
                    value={adminCreds.username}
                    onChange={e => setAdminCreds({...adminCreds, username: e.target.value})}
                    disabled={isVerifying}
                  />
                  <Input 
                    type="password"
                    placeholder="WordPress admin password / app password" 
                    value={adminCreds.password}
                    onChange={e => setAdminCreds({...adminCreds, password: e.target.value})}
                    disabled={isVerifying}
                  />
                  <Button 
                    onClick={handleVerifyConnection}
                    disabled={isVerifying}
                    className="w-full"
                    variant="outline"
                  >
                    {isVerifying ? "Verifying..." : "Test Connection"}
                  </Button>
                  {isVerified && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800">
                      ✓ WordPress connection verified
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="justify-between flex gap-2 flex-col-reverse sm:flex-row w-full">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsOpen(false);
                  setIsVerified(false);
                  setAdminCreds({ username: "", password: "" });
                }}
                className="hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAdd} 
                className="w-full sm:w-auto"
                disabled={!isVerified || isVerifying}
              >
                Add Site
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Site Name</TableHead>
              <TableHead className="hidden md:table-cell min-w-[220px]">URL</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[140px]">SEO Plugin</TableHead>
              <TableHead className="text-right min-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites_db.map((site) => {
              const favicon = getFavicon(site.url);
              return (
              <TableRow key={site.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {favicon ? (
                      <img src={favicon} alt={site.name} className="w-6 h-6 rounded flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center text-primary flex-shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate md:hidden">{site.url}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm break-all">{site.url}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                    ${site.seoPlugin === 'rankmath' ? 'bg-purple-100 text-purple-800' : 
                      site.seoPlugin === 'aioseo' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {getSeoPluginName(site.seoPlugin)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => handleDelete(site.id)}
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
