import { useState } from "react";
import { useStore, User } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Mail, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const { users, addUser, deleteUser } = useStore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    companyName: ""
  });

  const handleAdd = () => {
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.fullName) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields"
      });
      return;
    }

    addUser({
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      fullName: newUser.fullName,
      companyName: newUser.companyName || undefined
    });

    toast({
      title: "User Created",
      description: `${newUser.fullName} has been added successfully`
    });

    setIsOpen(false);
    setNewUser({ username: "", email: "", password: "", fullName: "", companyName: "" });
  };

  const handleDelete = (id: string, name: string) => {
    deleteUser(id);
    toast({
      title: "User Deleted",
      description: `${name} has been removed`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground text-sm">Create and manage platform users.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the Media Manager platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input 
                  id="username" 
                  placeholder="e.g. john_smith" 
                  value={newUser.username}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="user@example.com" 
                  value={newUser.email}
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Enter password" 
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input 
                  id="fullName" 
                  placeholder="e.g. John Smith" 
                  value={newUser.fullName}
                  onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  placeholder="e.g. Tech Media Inc" 
                  value={newUser.companyName}
                  onChange={e => setNewUser({...newUser, companyName: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Create User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Full Name</TableHead>
              <TableHead className="hidden md:table-cell min-w-[150px]">Username</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[180px]">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                      {user.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{user.username}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{user.companyName || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => handleDelete(user.id, user.fullName)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
