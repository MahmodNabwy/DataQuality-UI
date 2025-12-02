"use client";

import { useState, useEffect } from "react";
import { AuthService } from "@/lib/backend-service";
import { loadUserProfile } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  loadAuthSession,
  clearAuthSession,
  type AuthSession,
} from "@/lib/auth";
import {
  Shield,
  Users,
  FileText,
  Activity,
  LogOut,
  Home,
  User,
  Settings,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const authSession = loadAuthSession();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = AuthService.getTokenFromSession();
        if (!token) {
          setLoading(false);
          return;
        }

        const profile = loadUserProfile();
        setUserProfile(profile);

        // Check if user has admin role (you can customize this logic)
        const hasAdminAccess = profile?.role === "admin";
        setIsAdmin(hasAdminAccess);
      } catch (error) {
        console.error("Error checking admin access:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  // const handleLogout = () => {
  //   AuthService.logout();
  //   window.location.href = "/login";
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-800/50 bg-red-950/50">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-red-200">غير مصرح للوصول</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-red-300">هذه الصفحة مخصصة للمديرين فقط</p>
            <p className="text-red-400 text-sm">
              يرجى التواصل مع الإدارة للحصول على الصلاحيات المناسبة
            </p>
            <Link href="/">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Home className="w-4 h-4 ml-2" />
                العودة للصفحة الرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#1D546C] via-[#123A4C]/80 to-[#0986ED]">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-[#0986ED]/30 bg-[#123A4CF2]/95 backdrop-blur-xl shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-[#C1E1FF]" />
            <div>
              <h1 className="text-xl font-bold text-[#F4F4F4]">لوحة التحكم</h1>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-row-reverse items-center gap-3 px-2 py-2 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 shadow-md backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/30">
                <div className="p-2 rounded-full bg-[#FFE08F]/30 shadow-sm">
                  <UserIcon className="w-5 h-5 text-[#FFE08F]" />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-sm font-semibold text-[#F4F4F4] drop-shadow-sm">
                    {authSession?.name || "مستخدم"}
                  </div>
                  <div className="text-sm text-white/60 font-medium">
                    {authSession?.role === "admin" ? "مدير" : "مستخدم"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-2xl p-2"
              sideOffset={8}
            >
              <DropdownMenuLabel className="px-4 py-3 ">
                <div className="flex flex-row-reverse items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-">
                      {authSession?.name || "مستخدم"}
                    </div>
                    <div className="text-sm text-left text-gray-500 font-medium">
                      {authSession?.role === "admin"
                        ? "مدير النظام"
                        : "مستخدم عادي"}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-2 bg-gray-200/50" />

              <DropdownMenuItem className="px-4 py-3 text-right hover:bg-blue-50/80 rounded-xl cursor-pointer transition-colors duration-200 focus:bg-blue-50/80">
                <div className="flex flex-row-reverse items-center gap-3 w-full">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">
                    الملف الشخصي
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="px-4 py-3 text-right hover:bg-blue-50/80 rounded-xl cursor-pointer transition-colors duration-200 focus:bg-blue-50/80">
                <div className="flex flex-row-reverse items-center gap-3 w-full">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">الإعدادات</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-2 bg-gray-200/50" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="px-4 py-3 text-right hover:bg-red-50/80 rounded-xl cursor-pointer transition-colors duration-200 focus:bg-red-50/80"
              >
                <div className="flex flex-row-reverse items-center gap-3 w-full">
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-600">تسجيل الخروج</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Admin Navigation */}
      {/* <nav className="bg-[#123A4CF2] backdrop-blur-md border-b border-blue-800/30 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex gap-2">
          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-600/20 hover:bg-blue-600/40 hover:text-white border-blue-500/50 text-[#B0D6E8]"
            >
              <Activity className="w-4 h-4 ml-2" />
              مراجعة التعديلات
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600/50 hover:bg-blue-600/20 hover:text-white text-[#B0D6E8]"
            >
              <Users className="w-4 h-4 ml-2" />
              إدارة المستخدمين
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600/50 hover:bg-blue-600/20 hover:text-white text-[#B0D6E8]"
            >
              <FileText className="w-4 h-4 ml-2" />
              التقارير
            </Button>
          </Link>
        </div>
      </nav> */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
