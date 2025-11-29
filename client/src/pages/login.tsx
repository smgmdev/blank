import { useState } from "react";
import { useStore, DEMO_CREDENTIALS } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("demo@writer.com");
  const [password, setPassword] = useState("password");

  const handleLogin = () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter email/username and password"
      });
      return;
    }

    // Check admin credentials
    const isAdmin = DEMO_CREDENTIALS.admin.emails.includes(email) && 
                    password === DEMO_CREDENTIALS.admin.password;
    
    // Check user credentials
    const isUser = DEMO_CREDENTIALS.user.emails.includes(email) && 
                   password === DEMO_CREDENTIALS.user.password;

    if (!isAdmin && !isUser) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid credentials"
      });
      return;
    }

    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      const type = isAdmin ? 'admin' : 'user';
      login(type);
      setLocation(isAdmin ? '/admin/sites' : '/dashboard');
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img 
              src="https://www.worldimpactmedia.org/images/wimb.png" 
              alt="WIMB Logo" 
              className="w-24 h-24"
            />
          </div>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email or Username</Label>
              <Input 
                id="email" 
                placeholder="demo@writer.com or admin@system.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            {/* Demo Credentials */}
            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Demo Testing Accounts:</p>
              
              <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
                <p className="font-semibold text-foreground">Content Creator</p>
                <p className="text-muted-foreground">Email: demo@writer.com</p>
                <p className="text-muted-foreground">Password: password</p>
              </div>

              <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
                <p className="font-semibold text-foreground">Administrator</p>
                <p className="text-muted-foreground">Email: admin@system.com</p>
                <p className="text-muted-foreground">Password: password</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="w-full py-6 text-center text-xs text-muted-foreground mt-8">
        <p>&copy; {new Date().getFullYear()} World Impact Media Organization. All rights reserved.</p>
      </div>
    </div>
  );
}
