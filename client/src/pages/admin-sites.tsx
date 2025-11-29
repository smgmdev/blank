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
import { Plus, Globe, Trash2, ExternalLink, LogIn, Lock, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSites() {
  const { sites, addSite, disconnectSite, connectSite } = useStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedSiteForLogin, setSelectedSiteForLogin] = useState<string | null>(null);
  const [loginCredentials, setLoginCredentials] = useState({ username: "", password: "" });
  const [isVerifying, setIsVerifying] = useState(false);
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

  const handleConnectClick = (siteId: string) => {
    setSelectedSiteForLogin(siteId);
    setLoginDialogOpen(true);
  };

  const handleVerifyCredentials = () => {
    if (!loginCredentials.username || !loginCredentials.password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter both username and password"
      });
      return;
    }

    setIsVerifying(true);

    // Mock API call to WordPress
    setTimeout(() => {
      // Simulate credential verification
      const isValid = loginCredentials.username.length > 0 && loginCredentials.password.length > 0;
      
      if (isValid) {
        // Connect the site
        if (selectedSiteForLogin) {
          connectSite(selectedSiteForLogin);
        }
        
        toast({
          title: "Connected Successfully",
          description: `You have been authenticated with publishing rights`
        });
        
        setLoginDialogOpen(false);
        setLoginCredentials({ username: "", password: "" });
        setSelectedSiteForLogin(null);
      } else {
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Invalid WordPress credentials or insufficient publishing rights"
        });
      }
      
      setIsVerifying(false);
    }, 1500);
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
                    <SelectItem value="aioseo">All in One SEO (AIOSEO)</SelectItem>
                    <SelectItem value="rankmath">Rank Math</SelectItem>
                    <SelectItem value="yoast">Yoast SEO</SelectItem>
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
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary">
                    <Globe className="w-4 h-4" />
                  </div>
                  {site.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{site.url}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${site.seoPlugin === 'rankmath' ? 'bg-purple-100 text-purple-800' : 
                      site.seoPlugin === 'aioseo' ? 'bg-green-100 text-green-800' : 
                      site.seoPlugin === 'yoast' ? 'bg-amber-100 text-amber-800' : 
                      'bg-gray-100 text-gray-800'}`}>
                    {site.seoPlugin === 'none' ? 'Standard' : site.seoPlugin}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!site.isConnected ? (
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleConnectClick(site.id)}
                      >
                        <LogIn className="w-4 h-4" />
                        Connect
                      </Button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Connected ✓</span>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => disconnectSite(site.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* WordPress Login Dialog */}
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to WordPress Site</DialogTitle>
            <DialogDescription>
              Enter your WordPress credentials to authenticate and verify publishing rights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wp-username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                WordPress Username
              </Label>
              <Input 
                id="wp-username" 
                placeholder="your-username" 
                value={loginCredentials.username}
                onChange={e => setLoginCredentials({...loginCredentials, username: e.target.value})}
                disabled={isVerifying}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wp-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                WordPress Password
              </Label>
              <Input 
                id="wp-password" 
                type="password"
                placeholder="your-password" 
                value={loginCredentials.password}
                onChange={e => setLoginCredentials({...loginCredentials, password: e.target.value})}
                disabled={isVerifying}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCredentials()}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">What we check:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Valid WordPress credentials via REST API</li>
                <li>User has "Editor" or "Administrator" role</li>
                <li>Publishing permissions verified</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoginDialogOpen(false)} disabled={isVerifying}>Cancel</Button>
            <Button onClick={handleVerifyCredentials} disabled={isVerifying} className="gap-2">
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Connect Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
