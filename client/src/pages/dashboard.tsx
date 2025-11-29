import { useState } from "react";
import { useStore, DEMO_CREDENTIALS, SeoPlugin } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Lock, User } from "lucide-react";
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

export default function Dashboard() {
  const { sites, connectSite, disconnectSite } = useStore();
  const { toast } = useToast();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [isVerifying, setIsVerifying] = useState(false);
  const [favicons, setFavicons] = useState<{ [key: string]: string }>({});

  const handleAuthenticateClick = (siteId: string) => {
    setSelectedSiteId(siteId);
    setAuthDialogOpen(true);
  };

  const handleVerifyCredentials = () => {
    if (!credentials.username || !credentials.password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter both username/email and password"
      });
      return;
    }

    setIsVerifying(true);

    // Verify credentials
    setTimeout(() => {
      const isValidUser = DEMO_CREDENTIALS.user.emails.includes(credentials.username) && 
                         credentials.password === DEMO_CREDENTIALS.user.password;
      const isValidAdmin = DEMO_CREDENTIALS.admin.emails.includes(credentials.username) && 
                          credentials.password === DEMO_CREDENTIALS.admin.password;
      
      if (isValidUser || isValidAdmin) {
        if (selectedSiteId) {
          connectSite(selectedSiteId);
        }
        
        toast({
          title: "Authenticated Successfully",
          description: "You can now publish to this site."
        });
        
        setAuthDialogOpen(false);
        setCredentials({ username: "", password: "" });
        setSelectedSiteId(null);
      } else {
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Invalid credentials. Try: demo@writer.com/writer or admin@system.com/admin"
        });
      }
      
      setIsVerifying(false);
    }, 1500);
  };

  const handleDisconnect = (siteId: string) => {
    disconnectSite(siteId);
    toast({
      title: "Disconnected",
      description: "You have been disconnected from this site.",
    });
  };

  // Function to fetch favicon
  const getFavicon = (url: string) => {
    if (favicons[url]) return favicons[url];
    try {
      const domain = new URL(url).hostname;
      const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      setFavicons(prev => ({ ...prev, [url]: iconUrl }));
      return iconUrl;
    } catch (e) {
      return null;
    }
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Sites</h2>
        <p className="text-muted-foreground">Authenticate to sites to publish articles.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sites.map((site) => {
          const favicon = getFavicon(site.url);
          return (
            <Card key={site.id} className={`transition-all hover:shadow-md ${site.isConnected ? 'border-primary/50 bg-primary/5' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  {favicon ? (
                    <img src={favicon} alt={site.name} className="w-8 h-8 rounded" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary/10" />
                  )}
                  {site.isConnected && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Authenticated
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-1">{site.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{site.url}</p>
                <div className="text-xs text-muted-foreground">
                  {getSeoPluginName(site.seoPlugin)}
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                {site.isConnected ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full text-destructive hover:text-destructive text-xs"
                    onClick={() => handleDisconnect(site.id)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleAuthenticateClick(site.id)}
                  >
                    Authenticate
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authenticate to {selectedSite?.name}</DialogTitle>
            <DialogDescription>
              Enter your credentials to verify publishing rights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="auth-username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Email or Username
              </Label>
              <Input 
                id="auth-username" 
                placeholder="demo@writer.com or writer" 
                value={credentials.username}
                onChange={e => setCredentials({...credentials, username: e.target.value})}
                disabled={isVerifying}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input 
                id="auth-password" 
                type="password"
                placeholder="password" 
                value={credentials.password}
                onChange={e => setCredentials({...credentials, password: e.target.value})}
                disabled={isVerifying}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCredentials()}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Demo Credentials:</p>
              <ul className="space-y-1 text-xs">
                <li><strong>Creator:</strong> demo@writer.com or writer</li>
                <li><strong>Admin:</strong> admin@system.com or admin</li>
                <li><strong>Password:</strong> password</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthDialogOpen(false)} disabled={isVerifying}>Cancel</Button>
            <Button onClick={handleVerifyCredentials} disabled={isVerifying} className="gap-2">
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Authenticate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
