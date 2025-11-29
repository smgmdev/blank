import { Link, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { useEffect } from "react";
import { 
  LayoutDashboard, 
  Settings, 
  PenTool, 
  LogOut, 
  Globe,
  User,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { user, logout } = useStore();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) return null;

  const isAdmin = user === 'admin';

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", show: true },
    { label: "My Articles", icon: FileText, href: "/my-articles", show: true },
    { label: "Write Article", icon: PenTool, href: "/editor", show: true },
    { label: "Site Management", icon: Globe, href: "/admin/sites", show: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <img 
              src="https://www.worldimpactmedia.org/images/wimb.png" 
              alt="WIMB Logo" 
              className="w-10 h-10 rounded-lg"
            />
            WIMB
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                `}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-2 hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8 border">
                    <AvatarFallback>{isAdmin ? 'AD' : 'US'}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium">{isAdmin ? 'Administrator' : 'Content Creator'}</span>
                    <span className="text-muted-foreground">System Account</span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-8">
          <h1 className="font-semibold text-lg">
            {navItems.find(i => i.href === location)?.label || 'Dashboard'}
          </h1>
        </header>
        <div className="p-8 max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
