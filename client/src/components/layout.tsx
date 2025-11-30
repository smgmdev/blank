import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Settings, 
  PenTool, 
  LogOut, 
  Globe,
  User,
  FileText,
  Users,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout, isPublishing } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  // Fetch user info from Supabase
  useEffect(() => {
    if (user) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        fetch(`/api/users/${userId}`)
          .then(res => res.ok ? res.json() : null)
          .then(userData => {
            if (userData) {
              setUserInfo(userData);
            }
          })
          .catch(e => console.debug('User fetch:', e));
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  // Close mobile menu and prevent interactions during publishing
  useEffect(() => {
    if (isPublishing) {
      setMobileMenuOpen(false);
    }
  }, [isPublishing]);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (!user) return null;

  const isAdmin = user === 'admin';

  const navItems = [
    { label: "Media Network", headerLabel: "Media Network", icon: LayoutDashboard, href: "/dashboard", show: true },
    { label: "My Articles", headerLabel: "My Articles", icon: FileText, href: "/my-articles", show: true },
    { label: "Write New Article", headerLabel: "Editor", icon: PenTool, href: "/editor", show: true },
    { label: "Site Management", headerLabel: "Site Management", icon: Globe, href: "/admin/sites", show: isAdmin },
    { label: "User Management", headerLabel: "User Management", icon: Users, href: "/admin/users", show: isAdmin },
  ];

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen bg-muted/30 flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden h-16 bg-background border-b border-border flex items-center justify-between px-4 sticky top-0 z-30">
        {isPublishing ? (
          <div className={`flex items-center gap-2 cursor-not-allowed opacity-50`}>
            <img 
              src="https://www.worldimpactmedia.org/images/wimb.png" 
              alt="WIMB Logo" 
              className="w-8 h-8"
            />
            <div className="flex flex-col text-primary font-normal text-xs leading-tight">
              <span>Media</span>
              <span>Manager</span>
            </div>
          </div>
        ) : (
          <Link href="/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <img 
                src="https://www.worldimpactmedia.org/images/wimb.png" 
                alt="WIMB Logo" 
                className="w-8 h-8"
              />
              <div className="flex flex-col text-primary font-normal text-xs leading-tight">
                <span>Media</span>
                <span>Manager</span>
              </div>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => !isPublishing && setMobileMenuOpen(!mobileMenuOpen)}
          disabled={isPublishing}
          className="lg:hidden hover:bg-gray-200 rounded-full"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar / Mobile Menu */}
      <aside className={`
        fixed lg:relative inset-0 lg:inset-auto left-0 top-0 w-64 bg-background border-r border-border flex flex-col z-50 lg:z-30
        lg:w-64 lg:h-screen lg:inset-y-0 lg:top-auto
        transition-all duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex h-16 items-center px-6 border-b border-border">
          {isPublishing ? (
            <div className="flex items-center gap-3 cursor-not-allowed opacity-50">
              <img 
                src="https://www.worldimpactmedia.org/images/wimb.png" 
                alt="WIMB Logo" 
                className="w-10 h-10"
              />
              <div className="flex flex-col text-primary font-normal text-sm leading-tight">
                <span>Media</span>
                <span>Manager</span>
              </div>
            </div>
          ) : (
            <Link href="/dashboard">
              <div className="flex items-center gap-3 cursor-pointer">
                <img 
                  src="https://www.worldimpactmedia.org/images/wimb.png" 
                  alt="WIMB Logo" 
                  className="w-10 h-10"
                />
                <div className="flex flex-col text-primary font-normal text-sm leading-tight">
                  <span>Media</span>
                  <span>Manager</span>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Mobile Menu Header */}
        <div className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-border">
          {isPublishing ? (
            <div className="flex items-center gap-3 cursor-not-allowed opacity-50">
              <img 
                src="https://www.worldimpactmedia.org/images/wimb.png" 
                alt="WIMB Logo" 
                className="w-8 h-8"
              />
              <div className="flex flex-col text-primary font-normal text-xs leading-tight">
                <span>Media</span>
                <span>Manager</span>
              </div>
            </div>
          ) : (
            <Link href="/dashboard" onClick={handleNavClick}>
              <div className="flex items-center gap-3 cursor-pointer">
                <img 
                  src="https://www.worldimpactmedia.org/images/wimb.png" 
                  alt="WIMB Logo" 
                  className="w-8 h-8"
                />
                <div className="flex flex-col text-primary font-normal text-xs leading-tight">
                  <span>Media</span>
                  <span>Manager</span>
                </div>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden hover:bg-gray-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Account - Top of sidebar */}
        <div className="p-3 lg:p-4 border-b border-border">
          <DropdownMenu open={isPublishing ? false : undefined} onOpenChange={isPublishing ? () => {} : undefined}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start px-2 hover:bg-muted"
                disabled={isPublishing}
              >
                <div className={`flex items-center gap-3 min-w-0 ${isPublishing ? 'opacity-50' : ''}`}>
                  <Avatar className="w-8 h-8 border flex-shrink-0">
                    <AvatarFallback className="text-xs lg:text-sm">
                      {userInfo?.fullName 
                        ? userInfo.fullName.split(' ').slice(0, 2).map((n: string) => n.charAt(0)).join('').toUpperCase()
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs lg:text-sm min-w-0 gap-0.5">
                    <span className="font-medium truncate">{userInfo?.fullName || (isAdmin ? 'Administrator' : 'User')}</span>
                    <span className="text-muted-foreground text-xs">Account</span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 animate-fade-in">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  onClick={handleNavClick}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isPublishing ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-pointer'}
                    ${isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-blue-50 hover:text-blue-600"}
                  `}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-10 top-16"
          onClick={() => !isPublishing && setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen lg:h-full overflow-hidden">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm z-10 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-start gap-2">
            <h1 className="font-semibold text-lg">
              {location === '/settings' ? 'Account Settings' : (navItems.find(i => i.href === location)?.headerLabel || 'Dashboard')}
            </h1>
            {location === '/settings' && (
              <Badge className="bg-black text-white rounded-full px-0.5 py-0 text-[10px] font-semibold h-fit mt-0.5">
                Global
              </Badge>
            )}
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8 w-full animate-fade-in overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
