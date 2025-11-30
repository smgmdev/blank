import { useState, useEffect } from "react";
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
import { CheckCircle2, Loader2, Lock, User, RefreshCw } from "lucide-react";
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
  const { toast } = useToast();
  const userId = localStorage.getItem('userId');
  const [sites, setSites] = useState<any[]>([]);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favicons, setFavicons] = useState<{ [key: string]: string }>({});

  // Fetch real sites from API on mount
  useEffect(() => {
    const fetchSites = async () => {
      try {
        if (!userId) return;
        
        const response = await fetch(`/api/user-sites?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setSites(data);
        }
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      }
    };
    fetchSites();
  }, [userId]);

  // Auto-refresh sites every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (!userId) return;
        
        const response = await fetch(`/api/user-sites?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setSites(data);
        }
      } catch (error) {
        console.error('Failed to refresh sites:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  const handleAuthenticateClick = (siteId: string) => {
    setSelectedSiteId(siteId);
    setAuthDialogOpen(true);
  };

  const handleVerifyCredentials = async () => {
    if (!credentials.username || !credentials.password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter both WordPress username and password"
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Get current user ID from localStorage
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User session not found. Please log in again.');
      }

      // Call WordPress authentication endpoint
      const authResponse = await fetch(
        `/api/authenticate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            siteId: selectedSiteId,
            wpUsername: credentials.username,
            wpPassword: credentials.password
          })
        }
      );

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.error || 'WordPress authentication failed');
      }

      const result = await authResponse.json();

      toast({
        title: "Authenticated Successfully",
        description: "Your WordPress account is verified. You can now publish to this site."
      });

      // Update local state immediately to show connected button
      setSites(sites.map(s => 
        s.id === selectedSiteId ? { ...s, userIsConnected: true } : s
      ));

      setAuthDialogOpen(false);
      setCredentials({ username: "", password: "" });
      setSelectedSiteId(null);
    } catch (error: any) {
      const errorMsg = error.message;
      const hintText = error.hint || "Check your credentials and try again";
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: `${errorMsg}. ${hintText}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate checking connection status
    setTimeout(() => {
      toast({
        title: "Status Updated",
        description: "Connection status refreshed"
      });
      setIsRefreshing(false);
    }, 1000);
  };

  const handleDisconnect = async (siteId: string) => {
    try {
      if (!userId) throw new Error('User session not found');

      const response = await fetch(
        `/api/disconnect`,
        { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, siteId })
        }
      );

      if (!response.ok) throw new Error('Failed to disconnect');

      // Update local state to show disconnected
      setSites(sites.map(site => 
        site.id === siteId ? { ...site, userIsConnected: false } : site
      ));
      toast({
        title: "Disconnected",
        description: "You have been disconnected from this site.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Disconnection Failed",
        description: error.message
      });
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Media Network</h2>
          <p className="text-muted-foreground">Authenticate to sites to publish articles.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sites.map((site) => {
          const favicon = getFavicon(site.url);
          return (
            <Card 
              key={site.id} 
              className={`transition-all hover:shadow-lg border-0 shadow-sm bg-card`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {favicon ? (
                      <img src={favicon} alt={site.name} className="w-6 h-6 rounded flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-primary/10 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-xs truncate">{site.name}</h3>
                  </div>
                  {site.userIsConnected && (
                    <div className="flex-shrink-0">
                      <div className="bg-green-50 border border-green-200 rounded-full p-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{site.url}</p>
              </CardContent>
              <div className="px-4 pb-3 pt-0">
                {site.userIsConnected ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full h-8 text-xs border-green-500 text-green-700 hover:border-red-500 hover:text-destructive hover:bg-red-50 transition-all duration-200 group"
                    onClick={() => handleDisconnect(site.id)}
                  >
                    <span className="group-hover:hidden">Connected</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs border-black text-black hover:bg-black hover:text-white transition-all duration-200"
                    onClick={() => handleAuthenticateClick(site.id)}
                    data-testid="button-authenticate-site"
                  >
                    Authenticate
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Authentication Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="animate-fade-in w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authenticate to {selectedSite?.name}</DialogTitle>
            <DialogDescription>
              Enter your WordPress account credentials to verify you have publishing access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
              <p className="font-medium mb-2">Verify Your WordPress Account</p>
              <p className="text-xs">Enter your WordPress login credentials to authenticate and start publishing.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                WordPress Username
              </Label>
              <Input 
                id="auth-username" 
                placeholder="Your WordPress username" 
                value={credentials.username}
                onChange={e => setCredentials({...credentials, username: e.target.value})}
                disabled={isVerifying}
                data-testid="input-wp-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                WordPress Password
              </Label>
              <Input 
                id="auth-password" 
                type="password"
                placeholder="Your WordPress password" 
                value={credentials.password}
                onChange={e => setCredentials({...credentials, password: e.target.value})}
                disabled={isVerifying}
                data-testid="input-wp-password"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCredentials()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAuthDialogOpen(false);
                setCredentials({ username: "", password: "" });
              }} 
              disabled={isVerifying}
              data-testid="button-cancel-auth"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyCredentials} 
              disabled={isVerifying} 
              className="gap-2"
              data-testid="button-authenticate"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Authenticate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
