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
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pin, setPin] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handlePinSubmit = () => {
    if (!pin || pin.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN"
      });
      return;
    }

    if (pin !== currentUser.pin) {
      toast({
        variant: "destructive",
        title: "Invalid PIN",
        description: "PIN is incorrect"
      });
      setPin("");
      return;
    }

    // PIN is correct, complete login
    localStorage.setItem('sessionId', currentUser.sessionId);
    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('userRole', currentUser.role);
    login(currentUser.role);
    setLocation(currentUser.role === 'admin' ? '/admin/sites' : '/dashboard');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please enter email/username and password"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials"
        });
        setIsLoading(false);
        return;
      }

      const user = await response.json();
      if (!user.id || !user.role || !user.sessionId) {
        throw new Error('Invalid login response');
      }
      
      // Check if user has PIN enabled
      if (user.pin) {
        setCurrentUser(user);
        setShowPinPrompt(true);
        setPin("");
        setIsLoading(false);
        return;
      }
      
      // No PIN, proceed with login
      localStorage.setItem('sessionId', user.sessionId);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userRole', user.role);
      login(user.role);
      setLocation(user.role === 'admin' ? '/admin/sites' : '/dashboard');
      setIsLoading(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "Connection failed. Please try again."
      });
      setIsLoading(false);
    }
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
            {showPinPrompt ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pin">Enter 4-Digit PIN</Label>
                  <Input 
                    id="pin" 
                    type="password" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value.slice(0, 4))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                    placeholder="0000"
                    maxLength={4}
                    autoFocus
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handlePinSubmit}
                >
                  Verify PIN
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    setShowPinPrompt(false);
                    setPin("");
                    setCurrentUser(null);
                  }}
                >
                  Back
                </Button>
              </>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            )}

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
