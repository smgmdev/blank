import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, Save, User as UserIcon, Shield, Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const { users, user: currentUserRole } = useStore();
  const { toast } = useToast();
  const currentUser = users[0];
  const isAdmin = currentUserRole === 'admin';
  
  // Account fields
  const [email, setEmail] = useState(currentUser?.email || "user@example.com");
  const [username, setUsername] = useState(currentUser?.username || "");
  
  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  
  // PIN fields
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isPinActive, setIsPinActive] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  
  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  const handleAccountUpdate = async () => {
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      toast({
        variant: "destructive",
        title: "No Changes",
        description: "Please enter at least one field to update.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update account');

      toast({
        title: "Account Updated",
        description: "Your account details have been changed successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update account. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all password fields.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "New password and confirm password must match.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) throw new Error('Failed to update password');

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update password. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePinSetup = async () => {
    if (!pin || !confirmPin) {
      toast({
        variant: "destructive",
        title: "Missing PIN",
        description: "Please enter a 4-digit PIN.",
      });
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({
        variant: "destructive",
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        variant: "destructive",
        title: "PINs Don't Match",
        description: "PINs do not match.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: isPinActive ? pin : null })
      });

      if (!response.ok) throw new Error('Failed to update PIN');

      setPin("");
      setConfirmPin("");
      toast({
        title: "PIN Updated",
        description: isPinActive ? "PIN has been activated." : "PIN has been deactivated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update PIN. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8 pb-20">
      <div className="relative">
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        {isAdmin && (
          <Badge className="absolute top-0 right-0 bg-black text-white rounded-full px-2 py-1 text-xs font-semibold">
            Global
          </Badge>
        )}
        <p className="text-muted-foreground mt-1">Manage your account information and security.</p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            {isAdmin ? "Edit your account details." : "View your account details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              disabled={!isAdmin}
              className={!isAdmin ? "bg-muted" : ""}
              onChange={(e) => isAdmin && setUsername(e.target.value)}
              placeholder="e.g. john_smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled={!isAdmin}
              className={!isAdmin ? "bg-muted" : ""}
              onChange={(e) => isAdmin && setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          {isAdmin && (
            <Button onClick={handleAccountUpdate} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Updating..." : "Update"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button onClick={handlePasswordChange} disabled={isSaving} className="gap-2">
            <Lock className="w-4 h-4" />
            {isSaving ? "Updating..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Create PIN - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Create PIN
            </CardTitle>
            <CardDescription>
              Set a 4-digit PIN for additional security. PIN will be required at login if activated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <input 
                type="checkbox" 
                id="pin-toggle" 
                checked={isPinActive}
                onChange={(e) => setIsPinActive(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="pin-toggle" className="cursor-pointer">Activate PIN Protection</Label>
            </div>

            {isPinActive && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pin">4-Digit PIN</Label>
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.slice(0, 4))}
                      placeholder="0000"
                      maxLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">Confirm PIN</Label>
                  <div className="relative">
                    <Input
                      id="confirm-pin"
                      type={showConfirmPin ? "text" : "password"}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.slice(0, 4))}
                      placeholder="0000"
                      maxLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button onClick={handlePinSetup} disabled={isSaving} className="gap-2">
                  <Shield className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save PIN"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
