"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Building,
  RefreshCw,
} from "lucide-react";
import { AuthService } from "@/lib/backend-service";

// Types based on the API documentation
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  permissions: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: string;
  department: string;
  permissions: string[];
}

interface UpdateUserRequest {
  name?: string;
  role?: string;
  department?: string;
  permissions?: string[];
}

// User service for API calls
class UserService {
  private static readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  static async getAllUsers(): Promise<User[]> {
    const token = AuthService.getTokenFromSession();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
  }

  static async getUserById(id: string): Promise<User> {
    const token = AuthService.getTokenFromSession();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.API_BASE_URL}/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    return response.json();
  }

  static async createUser(userData: CreateUserRequest): Promise<User> {
    const token = AuthService.getTokenFromSession();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.API_BASE_URL}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    return response.json();
  }

  static async updateUser(
    id: string,
    userData: UpdateUserRequest
  ): Promise<User> {
    const token = AuthService.getTokenFromSession();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }

    return response.json();
  }

  static async deleteUser(id: string): Promise<void> {
    const token = AuthService.getTokenFromSession();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${this.API_BASE_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }
  }
}

export default function UsersManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: "",
    name: "",
    password: "",
    role: "user",
    department: "",
    permissions: ["read"],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available roles and permissions
  const roles = [
    { value: "admin", label: "مدير النظام", color: "bg-red-500" },
    { value: "user", label: "مستخدم", color: "bg-blue-500" },
    { value: "analyst", label: "محلل", color: "bg-green-500" },
  ];

  const permissions = [
    { value: "read", label: "قراءة" },
    { value: "write", label: "كتابة" },
    { value: "delete", label: "حذف" },
    { value: "admin", label: "إدارة" },
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const usersData = await UserService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "خطأ في تحميل المستخدمين",
        description: "حدث خطأ أثناء تحميل قائمة المستخدمين",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    setIsSubmitting(true);
    try {
      await UserService.createUser(formData);
      toast({
        title: "تم إنشاء المستخدم بنجاح",
        description: `تم إنشاء حساب جديد للمستخدم ${formData.name}`,
        variant: "success",
      });

      setShowCreateDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "خطأ في إنشاء المستخدم",
        description: "حدث خطأ أثناء إنشاء المستخدم الجديد",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateUserRequest = {
        name: formData.name,
        role: formData.role,
        department: formData.department,
        permissions: formData.permissions,
      };

      await UserService.updateUser(selectedUser.id, updateData);
      toast({
        title: "تم تحديث المستخدم بنجاح",
        description: `تم تحديث بيانات ${formData.name}`,
        variant: "success",
      });

      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "خطأ في تحديث المستخدم",
        description: "حدث خطأ أثناء تحديث بيانات المستخدم",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    try {
      await UserService.deleteUser(userToDelete.id);
      toast({
        title: "تم حذف المستخدم بنجاح",
        description: `تم حذف حساب ${userToDelete.name}`,
        variant: "success",
      });

      setShowDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "خطأ في حذف المستخدم",
        description: "حدث خطأ أثناء حذف المستخدم",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "user",
      department: "",
      permissions: ["read"],
    });
    setShowPassword(false);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
      department: user.department,
      permissions: user.permissions,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "لم يسجل دخول";
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleInfo = (role: string) => {
    return roles.find((r) => r.value === role) || roles[1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <RefreshCw className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400 to-indigo-500 opacity-75 animate-ping"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-blue-700">
              جاري تحميل المستخدمين
            </h2>
            <p className="text-blue-500">يرجى الانتظار...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
            إدارة المستخدمين
          </h1>
          <p className="text-blue-600 text-lg">
            إدارة حسابات المستخدمين والصلاحيات
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl">
              <Plus className="w-5 h-5 ml-2" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-3 border border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
              <Input
                placeholder="ابحث عن المستخدمين بالاسم أو البريد الإلكتروني أو القسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 bg-white border-blue-200 text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl h-12"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-lg rounded-2xl">
          <CardContent className="p-6 text-center">
            <div className="space-y-2">
              <Users className="w-8 h-8 text-blue-600 mx-auto" />
              <p className="text-sm text-blue-600 font-medium">
                إجمالي المستخدمين
              </p>
              <p className="text-2xl font-bold text-blue-700">{users.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => {
          const roleInfo = getRoleInfo(user.role);
          return (
            <Card
              key={user.id}
              className="border border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
            >
              <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${roleInfo.color} flex items-center justify-center shadow-md`}
                    >
                      {user.role === "admin" ? (
                        <Shield className="w-5 h-5 text-white" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-blue-700">
                        {user.name}
                      </CardTitle>
                      <Badge
                        className={`${roleInfo.color} text-white text-xs mt-1`}
                      >
                        {roleInfo.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-700 font-medium">
                      {user.email}
                    </span>
                  </div>

                  {user.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-700">{user.department}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-700">
                      انضم: {formatDate(user.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-blue-700">
                      آخر دخول: {formatDate(user.lastLoginAt)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700">
                    الصلاحيات:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((permission) => {
                      const permInfo = permissions.find(
                        (p) => p.value === permission
                      );
                      return (
                        <Badge
                          key={permission}
                          variant="outline"
                          className="border-blue-200 text-blue-600 text-xs"
                        >
                          {permInfo?.label || permission}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-blue-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(user)}
                    className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDeleteDialog(user)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && !loading && (
        <Card className="border border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-lg rounded-2xl">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-blue-700 mb-2">
              لا توجد نتائج
            </h3>
            <p className="text-blue-500">
              {searchQuery
                ? "لم يتم العثور على مستخدمين مطابقين لبحثك"
                : "لا يوجد مستخدمين في النظام"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-700 flex items-center gap-3">
              <Plus className="w-6 h-6" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription className="text-blue-600">
              قم بإدخال بيانات المستخدم الجديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-blue-700 font-semibold">
                الاسم الكامل
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="أدخل الاسم الكامل"
                className="bg-white border-blue-200 focus:border-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-700 font-semibold">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="أدخل البريد الإلكتروني"
                className="bg-white border-blue-200 focus:border-blue-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-700 font-semibold">
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="أدخل كلمة مرور قوية"
                  className="bg-white border-blue-200 focus:border-blue-500 rounded-xl pl-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-blue-700 font-semibold">
                  الدور
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger className="bg-white border-blue-200 focus:border-blue-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="department"
                  className="text-blue-700 font-semibold"
                >
                  القسم
                </Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="أدخل القسم"
                  className="bg-white border-blue-200 focus:border-blue-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-700 font-semibold">الصلاحيات</Label>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            permissions: [
                              ...formData.permissions,
                              permission.value,
                            ],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            permissions: formData.permissions.filter(
                              (p) => p !== permission.value
                            ),
                          });
                        }
                      }}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-blue-700">
                      {permission.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-blue-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleCreateUser}
                className="flex-1 bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Plus className="w-4 h-4 ml-2" />
                )}
                {isSubmitting ? "جاري الإنشاء..." : "إنشاء المستخدم"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-700 flex items-center gap-3">
              <Edit className="w-6 h-6" />
              تعديل المستخدم
            </DialogTitle>
            <DialogDescription className="text-blue-600">
              تعديل بيانات {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="edit-name"
                className="text-blue-700 font-semibold"
              >
                الاسم الكامل
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="أدخل الاسم الكامل"
                className="bg-white border-blue-200 focus:border-blue-500 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-role"
                  className="text-blue-700 font-semibold"
                >
                  الدور
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger className="bg-white border-blue-200 focus:border-blue-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="edit-department"
                  className="text-blue-700 font-semibold"
                >
                  القسم
                </Label>
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  placeholder="أدخل القسم"
                  className="bg-white border-blue-200 focus:border-blue-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-700 font-semibold">الصلاحيات</Label>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            permissions: [
                              ...formData.permissions,
                              permission.value,
                            ],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            permissions: formData.permissions.filter(
                              (p) => p !== permission.value
                            ),
                          });
                        }
                      }}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-blue-700">
                      {permission.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-blue-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleUpdateUser}
                className="flex-1 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Edit className="w-4 h-4 ml-2" />
                )}
                {isSubmitting ? "جاري التحديث..." : "حفظ التعديلات"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-linear-to-br from-white to-red-50 border border-red-200 shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-red-700 flex items-center gap-3">
              <Trash2 className="w-6 h-6" />
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-600 text-lg leading-relaxed">
              هل أنت متأكد من حذف المستخدم{" "}
              <span className="font-bold">{userToDelete?.name}</span>؟ هذا
              الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Trash2 className="w-4 h-4 ml-2" />
              )}
              {isSubmitting ? "جاري الحذف..." : "حذف المستخدم"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
