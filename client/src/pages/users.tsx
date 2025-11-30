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
import { Plus, Trash2, Mail, User as UserIcon, Edit2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const { users, addUser, deleteUser, user: currentUser } = useStore();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    companyName: ""
  });
  const [editUser, setEditUser] = useState({
    username: "",
    fullName: "",
    email: "",
    companyName: "",
    password: ""
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

    setIsCreateOpen(false);
    setNewUser({ username: "", email: "", password: "", fullName: "", companyName: "" });
  };

  const handleEditOpen = (user: any) => {
    setEditingUser(user);
    setEditUser({ 
      username: user.username, 
      fullName: user.fullName, 
      email: user.email, 
      companyName: user.companyName || "",
      password: ""
    });
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const updateData: any = {};
      
      if (editUser.username) updateData.username = editUser.username;
      if (editUser.fullName) updateData.fullName = editUser.fullName;
      if (editUser.email) updateData.email = editUser.email;
      if (editUser.companyName) updateData.companyName = editUser.companyName;
      if (editUser.password) updateData.password = editUser.password;
      
      if (Object.keys(updateData).length === 0) {
        toast({
          variant: "destructive",
          title: "No Changes",
          description: "Please enter at least one field to update"
        });
        return;
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error("Failed to update user");

      toast({
        title: "User Updated",
        description: `${editUser.fullName} has been updated successfully`
      });

      setIsEditOpen(false);
      setEditingUser(null);
      setEditUser({ username: "", fullName: "", email: "", companyName: "", password: "" });
      
      // Refresh users list by reloading page
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user"
      });
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="animate-fade-in w-full sm:max-w-md flex flex-col">
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
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Enter password" 
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
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
            <DialogFooter className="justify-between flex gap-2 flex-col-reverse sm:flex-row w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateOpen(false)}
                className="hover:bg-red-500 hover:text-white hover:border-red-500 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} className="w-full sm:w-auto">Add New User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="animate-fade-in w-full sm:max-w-md flex flex-col max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input 
                  id="edit-username" 
                  placeholder="e.g. john_smith" 
                  value={editUser.username}
                  onChange={e => setEditUser({...editUser, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input 
                  id="edit-fullName" 
                  placeholder="e.g. John Smith" 
                  value={editUser.fullName}
                  onChange={e => setEditUser({...editUser, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  placeholder="user@example.com" 
                  value={editUser.email}
                  onChange={e => setEditUser({...editUser, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-companyName">Company Name</Label>
                <Input 
                  id="edit-companyName" 
                  placeholder="e.g. Tech Media Inc" 
                  value={editUser.companyName}
                  onChange={e => setEditUser({...editUser, companyName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Password</Label>
                <div className="relative">
                  <Input 
                    id="edit-password" 
                    type={showEditPassword ? "text" : "password"}
                    placeholder="Leave blank to keep current password" 
                    value={editUser.password}
                    onChange={e => setEditUser({...editUser, password: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="justify-between flex gap-2 flex-col-reverse sm:flex-row w-full">
              <Button 
                variant="outline" 
                onClick={() => setIsEditOpen(false)}
                className="hover:bg-red-500 hover:text-white hover:border-red-500 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button onClick={handleEditSave} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Name</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[120px]">Username</TableHead>
                <TableHead className="hidden md:table-cell min-w-[160px]">Email</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[120px]">Company</TableHead>
                <TableHead className="text-right min-w-[60px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {user.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate sm:hidden">{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm truncate">{user.username}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate">{user.email}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground truncate">{user.companyName || '-'}</TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                      onClick={() => handleEditOpen(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => handleDelete(user.id, user.fullName)}
                      data-testid={`button-delete-user-${user.id}`}
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
    </div>
  );
}
