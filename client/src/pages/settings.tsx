import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, Save, User as UserIcon } from "lucide-react";

export default function Settings() {
  const { users, user: currentUserRole } = useStore();
  const { toast } = useToast();
  const currentUser = users[0]; // Demo: using first user
  const isAdmin = currentUserRole === 'admin';
  const [email, setEmail] = useState(currentUser?.email || "user@example.com");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [companyName, setCompanyName] = useState(currentUser?.companyName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleUsernameUpdate = async () => {
    if (!username) {
      toast({
        variant: "destructive",
        title: "Missing Username",
        description: "Please enter a valid username.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!response.ok) throw new Error('Failed to update username');

      toast({
        title: "Username Updated",
        description: "Your username has been changed successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update username. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Missing Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) throw new Error('Failed to update email');

      toast({
        title: "Email Updated",
        description: "Your email has been changed successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update email. Please try again.",
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

  return (
    <div className="max-w-2xl space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account information and security.</p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Account Information
            <Badge className="ml-auto bg-black text-white rounded-full px-3 py-1 text-xs font-semibold">
              Global
            </Badge>
          </CardTitle>
          <CardDescription>
            {isAdmin ? "Edit your account details." : "View your account details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted" : ""}
                onChange={(e) => isAdmin && setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email2">Email</Label>
              <Input
                id="email2"
                value={email}
                disabled={!isAdmin}
                className={!isAdmin ? "bg-muted" : ""}
                onChange={(e) => isAdmin && setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={companyName || "-"}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handleUsernameUpdate} disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "Updating..." : "Update Username"}
              </Button>
              <Button onClick={handleEmailUpdate} disabled={isSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? "Updating..." : "Update Email"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Address
          </CardTitle>
          <CardDescription>
            Update your email address associated with this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Current Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <Button onClick={handleEmailUpdate} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Updating..." : "Update Email"}
          </Button>
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
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handlePasswordChange} disabled={isSaving} className="gap-2">
            <Lock className="w-4 h-4" />
            {isSaving ? "Updating..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
