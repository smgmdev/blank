import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, CheckCircle2, XCircle, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { sites, connectSite, disconnectSite } = useStore();
  const { toast } = useToast();

  const handleConnect = (siteId: string) => {
    // Simulate Auth Flow
    toast({
      title: "Authenticating...",
      description: "Redirecting to WordPress to verify credentials.",
    });
    
    setTimeout(() => {
      connectSite(siteId);
      toast({
        title: "Connected Successfully",
        description: "You can now publish articles to this site.",
        variant: "default"
      });
    }, 1500);
  };

  const handleDisconnect = (siteId: string) => {
    disconnectSite(siteId);
    toast({
      title: "Disconnected",
      description: "Access token revoked.",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Sites</h2>
        <p className="text-muted-foreground">Connect to the sites you want to publish to.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map((site) => (
          <Card key={site.id} className={`transition-all hover:shadow-md ${site.isConnected ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center">
                <Globe className={`w-5 h-5 ${site.isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              {site.isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <XCircle className="w-3 h-3 mr-1" /> Not Connected
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="text-lg mb-1">{site.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {site.url}
              </CardDescription>
              
              <div className="mt-4 text-xs text-muted-foreground bg-background/50 p-2 rounded border inline-block">
                Plugin: <span className="font-medium capitalize">{site.seoPlugin === 'none' ? 'Default' : site.seoPlugin}</span>
              </div>
            </CardContent>
            <CardFooter>
              {site.isConnected ? (
                <Button 
                  variant="outline" 
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => handleDisconnect(site.id)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button className="w-full" onClick={() => handleConnect(site.id)}>
                  Connect Site
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
