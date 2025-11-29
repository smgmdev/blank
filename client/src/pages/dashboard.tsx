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
  const { sites, connectSite, disconnectSite } = useStore();
  const { toast } = useToast();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [twoFACode, setTwoFACode] = useState("");
  const [requiresTwoFA, setRequiresTwoFA] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favicons, setFavicons] = useState<{ [key: string]: string }>({});

  // Auto-refresh connection status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Silently check connection status without showing loading state
      // In a real app, this would check against the WP API
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

    // If 2FA is required, check 2FA code
    if (requiresTwoFA) {
      if (!twoFACode) {
        toast({
          variant: "destructive",
          title: "Missing 2FA Code",
          description: "Please enter your 2-factor authentication code"
        });
        return;
      }
    }

    setIsVerifying(true);

    // Verify credentials and 2FA
    setTimeout(() => {
      const isValidUser = DEMO_CREDENTIALS.user.emails.includes(credentials.username) && 
                         credentials.password === DEMO_CREDENTIALS.user.password;
      const isValidAdmin = DEMO_CREDENTIALS.admin.emails.includes(credentials.username) && 
                          credentials.password === DEMO_CREDENTIALS.admin.password;
      
      if (!isValidUser && !isValidAdmin) {
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Invalid credentials. Try: demo@writer.com/writer or admin@system.com/admin"
        });
        setIsVerifying(false);
        return;
      }

      // Check if 2FA is required but not yet provided
      if (!requiresTwoFA) {
        // Simulate 50% chance of requiring 2FA
        const needs2FA = Math.random() > 0.5;
        if (needs2FA) {
          setRequiresTwoFA(true);
          toast({
            title: "2FA Required",
            description: "Your account has 2-factor authentication enabled. Please enter your code."
          });
          setIsVerifying(false);
          return;
        }
      }

      // If we get here, authentication is complete
      if (selectedSiteId) {
        connectSite(selectedSiteId);
      }
      
      toast({
        title: "Authenticated Successfully",
        description: "You can now publish to this site."
      });
      
      setAuthDialogOpen(false);
      setCredentials({ username: "", password: "" });
      setTwoFACode("");
      setRequiresTwoFA(false);
      setSelectedSiteId(null);
      setIsVerifying(false);
    }, 1500);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Sites</h2>
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
              className={`transition-all hover:shadow-lg border-0 shadow-sm ${site.isConnected ? 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/40 ring-1 ring-primary/20' : 'bg-card'}`}
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
                  {site.isConnected && (
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
                {site.isConnected ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDisconnect(site.id)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => handleAuthenticateClick(site.id)}
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
        <DialogContent className="animate-fade-in">
          <DialogHeader>
            <DialogTitle>Authenticate to {selectedSite?.name}</DialogTitle>
            <DialogDescription>
              Enter your credentials to verify publishing rights.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!requiresTwoFA ? (
              <>
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
              </>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-2">
                  <p className="font-medium">Two-Factor Authentication Required</p>
                  <p className="text-xs mt-1">Your account has 2FA enabled. Enter the code from your authenticator app.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="2fa-code" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    2FA Code
                  </Label>
                  <Input 
                    id="2fa-code" 
                    placeholder="000000" 
                    maxLength={6}
                    value={twoFACode}
                    onChange={e => setTwoFACode(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={isVerifying}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyCredentials()}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAuthDialogOpen(false);
                setRequiresTwoFA(false);
                setCredentials({ username: "", password: "" });
                setTwoFACode("");
              }} 
              disabled={isVerifying}
            >
              {requiresTwoFA ? 'Back' : 'Cancel'}
            </Button>
            <Button onClick={handleVerifyCredentials} disabled={isVerifying} className="gap-2">
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {requiresTwoFA ? 'Verifying...' : 'Verifying...'}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  {requiresTwoFA ? 'Verify & Authenticate' : 'Authenticate'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
