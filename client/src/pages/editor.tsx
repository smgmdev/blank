import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Save, FileText } from "lucide-react";

export default function Editor() {
  const { sites } = useStore();
  const { toast } = useToast();
  const connectedSites = sites.filter(s => s.isConnected);
  
  const [selectedSiteId, setSelectedSiteId] = useState<string>(connectedSites[0]?.id || "");
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const plugin = selectedSite?.seoPlugin || 'none';

  const handlePublish = () => {
    if (!selectedSiteId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a site to publish to." });
      return;
    }
    
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      toast({
        title: "Published!",
        description: `Article successfully published to ${selectedSite?.name}`,
      });
    }, 2000);
  };

  if (connectedSites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No Connected Sites</h3>
        <p className="text-muted-foreground max-w-sm">
          You need to connect to at least one WordPress site in the Dashboard before you can write articles.
        </p>
        <Button asChild>
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
      {/* Main Editor */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Input 
            placeholder="Enter article title..." 
            className="text-3xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50" 
          />
        </div>
        <Textarea 
          placeholder="Start writing your amazing content..." 
          className="min-h-[60vh] resize-none border-none px-0 focus-visible:ring-0 text-lg leading-relaxed" 
        />
      </div>

      {/* Sidebar Controls */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publishing Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Destination Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {connectedSites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select defaultValue="publish">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">Publish Immediately</SelectItem>
                  <SelectItem value="draft">Save as Draft</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex gap-2">
              <Button variant="outline" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button className="flex-1" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SEO Plugin Fields - DYNAMIC */}
        <Card className="border-blue-100 dark:border-blue-900 overflow-hidden">
          <div className={`h-1.5 w-full ${
            plugin === 'rankmath' ? 'bg-purple-500' :
            plugin === 'aioseo' ? 'bg-green-500' :
            plugin === 'yoast' ? 'bg-amber-500' : 'bg-gray-300'
          }`} />
          
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              SEO Settings
              <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded capitalize">
                {plugin === 'none' ? 'Default WP' : plugin}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plugin === 'rankmath' && (
              <>
                 <div className="space-y-2">
                  <Label className="text-purple-600 font-medium">Focus Keyword (RankMath)</Label>
                  <Input placeholder="Main keyword..." />
                  <p className="text-xs text-muted-foreground">Enter the main keyword you want to rank for.</p>
                </div>
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input placeholder="Title to appear in Google..." />
                  <div className="h-1 w-full bg-gray-100 rounded overflow-hidden">
                    <div className="h-full bg-green-500 w-3/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea className="h-20" placeholder="Meta description..." />
                </div>
              </>
            )}

            {plugin === 'aioseo' && (
              <>
                <div className="space-y-2">
                  <Label className="text-green-600 font-medium">AIOSEO Score: 85/100</Label>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[85%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Post Title</Label>
                  <Input />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea className="h-24" />
                </div>
                <div className="space-y-2">
                  <Label>Social Image</Label>
                  <Button variant="outline" size="sm" className="w-full">Upload Social Image</Button>
                </div>
              </>
            )}

            {plugin === 'yoast' && (
              <>
                <div className="flex gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                </div>
                <div className="space-y-2">
                  <Label>Focus Keyphrase</Label>
                  <Input />
                </div>
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input />
                </div>
              </>
            )}

            {plugin === 'none' && (
              <div className="text-sm text-muted-foreground text-center py-4">
                Basic WordPress SEO fields only. <br/>
                Install a plugin on the site to see more options.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
