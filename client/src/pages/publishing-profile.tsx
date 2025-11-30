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
  const [siteUsers, setSiteUsers] = useState<{ [key: string]: any }>({});
  
  const userId = localStorage.getItem('userId');

  // Fetch connected sites and WP profile
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (userId) {
          // Load from local database first as source of truth
          if (publishingProfile?.displayName) {
            setDisplayName(publishingProfile.displayName);
          }
          if (publishingProfile?.profilePicture) {
            setPreviewUrl(publishingProfile.profilePicture);
          }
          
          // Fetch connected sites
          const sitesRes = await fetch(`/api/sites?action=user-sites&userId=${userId}`);
          if (sitesRes.ok) {
            const sites = await sitesRes.json();
            const connected = sites.filter((s: any) => s.userIsConnected);
            setConnectedSites(connected);
            
            // Fetch WP user info for each connected site
            const users: { [key: string]: any } = {};
            for (const site of connected) {
              try {
                const userRes = await fetch(`/api/wp-site-user?userId=${userId}&siteId=${site.id}`);
                if (userRes.ok) {
                  users[site.id] = await userRes.json();
                }
              } catch (e) {
                console.error(`Failed to fetch WP user for site ${site.id}:`, e);
              }
            }
            setSiteUsers(users);
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
      console.log('Image selected:', file.name, 'size:', file.size);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('Image converted to base64, length:', result.length);
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
      console.log('Saving profile with image length:', previewUrl?.length || 0);
      // 1. Save to database
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          profilePicture: previewUrl || undefined
        })
      });

      console.log('Profile save response:', response.status);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }
      
      const savedUser = await response.json();
      console.log('Profile saved, image length in response:', savedUser.profilePicture?.length || 0);

      // 2. Sync to connected WordPress sites
      try {
        const syncRes = await fetch(`/api/sync-profile-to-wp?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            profilePictureUrl: previewUrl || undefined
          })
        });
        const syncData = await syncRes.json();
        console.log('WordPress sync response:', syncData);
      } catch (syncError) {
        console.error('Failed to sync to WordPress:', syncError);
        // Don't fail the save if WordPress sync fails
      }

      // Refetch from API to get the saved profile
      await loadPublishingProfileFromAPI(userId);
      
      // After refetch, update state with saved values from database
      if (savedUser && savedUser.displayName) {
        setDisplayName(savedUser.displayName);
      }
      if (savedUser && savedUser.profilePicture) {
        setPreviewUrl(savedUser.profilePicture);
        console.log('Profile picture updated from database:', savedUser.profilePicture.length, 'bytes');
      }
      
      // Refetch connected sites user data to show updated profile image in cards
      const sitesRes = await fetch(`/api/sites?action=user-sites&userId=${userId}`);
      if (sitesRes.ok) {
        const sites = await sitesRes.json();
        const connected = sites.filter((s: any) => s.userIsConnected);
        setConnectedSites(connected);
        
        // Fetch updated WP user info for each site
        const users: { [key: string]: any } = {};
        for (const site of connected) {
          try {
            const userRes = await fetch(`/api/wp-site-user?userId=${userId}&siteId=${site.id}`);
            if (userRes.ok) {
              users[site.id] = await userRes.json();
            }
          } catch (e) {
            console.error(`Failed to refetch WP user for site ${site.id}:`, e);
          }
        }
        setSiteUsers(users);
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
                const wpUser = siteUsers[site.id];
                return (
                  <div
                    key={site.id}
                    className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors bg-gray-50"
                    data-testid={`connected-site-${site.id}`}
                  >
                    {/* Site header */}
                    <div className="flex items-center gap-2 mb-3">
                      {favicon ? (
                        <img src={favicon} alt={site.name} className="w-5 h-5 rounded flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center">
                          <Globe className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{site.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                      </div>
                    </div>
                    
                    {/* User info */}
                    {wpUser ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-300">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage src={previewUrl || wpUser.profilePicture} alt={wpUser.displayName} />
                          <AvatarFallback className="text-xs">{wpUser.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{wpUser.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{wpUser.username}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground pt-2 border-t border-gray-300">
                        Loading user info...
                      </div>
                    )}
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
                  {previewUrl && previewUrl !== profilePicture ? "Change Picture" : "Upload Picture"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG up to 5MB</p>
                {previewUrl && previewUrl.startsWith('data:') && (
                  <p className="text-xs text-green-600 mt-2">✓ Image selected - Click "Update Profile" to save</p>
                )}
              </div>
            </div>
          </div>
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
