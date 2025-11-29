import { useState } from "react";
import { useStore, DEMO_CREDENTIALS } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("demo@writer.com");
  const [userPassword, setUserPassword] = useState("password");
  const [adminEmail, setAdminEmail] = useState("admin@system.com");
  const [adminPassword, setAdminPassword] = useState("password");

  const handleLogin = (type: 'admin' | 'user') => {
    const email = type === 'admin' ? adminEmail : userEmail;
    const password = type === 'admin' ? adminPassword : userPassword;
    const creds = DEMO_CREDENTIALS[type];

    // Check if email/username and password match
    const isValidEmail = creds.emails.includes(email);
    const isValidPassword = password === creds.password;

    if (!isValidEmail || !isValidPassword) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: `Valid ${type === 'user' ? 'creator' : 'admin'} credentials required`
      });
      return;
    }

    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      login(type);
      setLocation(type === 'admin' ? '/admin/sites' : '/dashboard');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mx-auto mb-4 shadow-lg shadow-primary/20">
            <span className="text-2xl font-bold">W</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your publishing dashboard</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Choose your role to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="user">Content Creator</TabsTrigger>
                <TabsTrigger value="admin">Administrator</TabsTrigger>
              </TabsList>
              
              <TabsContent value="user" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email or Username</Label>
                  <Input 
                    id="email" 
                    placeholder="demo@writer.com or writer" 
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin('user')}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleLogin('user')}
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In as Creator"}
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  Demo: demo@writer.com or writer / password
                </div>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Admin area requires elevated privileges.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email or Username</Label>
                  <Input 
                    id="admin-email" 
                    placeholder="admin@system.com or admin" 
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Master Password</Label>
                  <Input 
                    id="admin-password" 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin('admin')}
                  />
                </div>
                <Button 
                  className="w-full variant-default" 
                  onClick={() => handleLogin('admin')}
                  disabled={isLoading}
                >
                   {isLoading ? "Verifying..." : "Access Admin Console"}
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  Demo: admin@system.com or admin / password
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
