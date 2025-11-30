import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Globe } from "lucide-react";

// Fetch WordPress user profile data from the API
const fetchWPProfile = async (userId: string) => {
  try {
    const response = await fetch(`/api/wp-user-profile?userId=${userId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Failed to fetch WP profile from API', e);
  }
  return null;
};

export default function PublishingProfile() {
  const { publishingProfile, updatePublishingProfile, loadPublishingProfileFromAPI } = useStore();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(publishingProfile?.displayName || "");
  const [profilePicture, setProfilePicture] = useState(publishingProfile?.profilePicture || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(profilePicture);
  const [connectedSites, setConnectedSites] = useState<any[]>([]);
  const [favicons, setFavicons] = useState<{ [key: string]: string }>({});
  
  const userId = localStorage.getItem('userId');

  // Fetch connected sites and WP profile
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (userId) {
          // Fetch connected sites
          const sitesRes = await fetch(`/api/sites?action=user-sites&userId=${userId}`);
          if (sitesRes.ok) {
            const sites = await sitesRes.json();
            const connected = sites.filter((s: any) => s.userIsConnected);
            setConnectedSites(connected);
          }
          
          // Fetch WP profile
          const wpData = await fetchWPProfile(userId);
          if (wpData && typeof wpData === 'object') {
            const { displayName: wpDisplayName, profilePicture: wpProfilePicture } = wpData as { displayName: string; profilePicture?: string };
            setDisplayName(wpDisplayName || publishingProfile?.displayName || "");
            if (wpProfilePicture) {
              setPreviewUrl(wpProfilePicture);
            } else if (publishingProfile?.profilePicture) {
              setPreviewUrl(publishingProfile.profilePicture);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [publishingProfile, userId]);

  // Get favicon for a site URL
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProfilePicture(result);
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Display Name",
        description: "Please enter a display name"
      });
      return;
    }

    if (!userId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not found. Please log in again."
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save to database
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          profilePicture: previewUrl || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      // 2. Sync to connected WordPress sites
      try {
        await fetch(`/api/sync-profile-to-wp?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            profilePictureUrl: previewUrl || undefined
          })
        });
      } catch (syncError) {
        console.error('Failed to sync to WordPress:', syncError);
        // Don't fail the save if WordPress sync fails
      }

      // Refetch from API and WordPress to ensure everything is synced
      await loadPublishingProfileFromAPI(userId);
      
      // Reload WP profile to show it was synced
      await new Promise(r => setTimeout(r, 500));
      const wpData = await fetchWPProfile(userId);
      if (wpData) {
        setDisplayName(wpData.displayName || displayName);
        if (wpData.profilePicture) {
          setPreviewUrl(wpData.profilePicture);
        }
      }

      toast({
        title: "Profile Updated",
        description: "Your publishing profile has been saved and synced to WordPress"
      });
    } catch (error: any) {
      console.error('Profile save error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save profile. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8 pb-20">
      <div>
        <p className="text-muted-foreground text-sm mt-1">Manage how your profile appear on your published article.</p>
      </div>

      {/* Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Preview</CardTitle>
          <CardDescription>
            This is how your articles will be attributed on WordPress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2">
              <AvatarImage src={previewUrl} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{displayName || "Your Display Name"}</p>
              <p className="text-sm text-muted-foreground">Author Profile</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Display Name */}
      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
          <CardDescription>
            The name shown as the author on published articles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Smith"
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a profile picture to appear with your articles on WordPress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2">
                <AvatarImage src={previewUrl} alt={displayName} />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="profilePicture"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("profilePicture")?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Picture
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG up to 5MB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Connected Sites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Connected Sites
          </CardTitle>
          <CardDescription>
            WordPress sites where you can publish articles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connectedSites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectedSites.map((site) => {
                const favicon = getFavicon(site.url);
                return (
                  <div
                    key={site.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors bg-gray-50"
                    data-testid={`connected-site-${site.id}`}
                  >
                    {favicon ? (
                      <img src={favicon} alt={site.name} className="w-6 h-6 rounded flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center">
                        <Globe className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{site.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No connected sites yet.</p>
              <p className="text-xs">Authenticate to sites in the dashboard to start publishing.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Update Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="button-update-profile"
      >
        {isSaving ? "Updating..." : "Update Profile"}
      </Button>
    </div>
  );
}
