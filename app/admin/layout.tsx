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
        const session = loadAuthSession();

        // If no token or session, redirect to login
        if (!token || !session) {
          window.location.href = "/login";
          return;
        }

        // Check if user has admin role
        const hasAdminAccess = session.role === "admin";
        setIsAdmin(hasAdminAccess);
        setUserProfile(session);

        // If user is not admin, redirect to login
        if (!hasAdminAccess) {
          window.location.href = "/login";
          return;
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        // On error, redirect to login
        window.location.href = "/login";
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
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <Shield className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400 to-indigo-500 opacity-75 animate-ping"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-blue-700">
              جاري التحقق من الصلاحيات
            </h2>
            <p className="text-blue-500 text-lg">يرجى الانتظار...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg mx-auto border border-red-200 bg-linear-to-br from-white to-red-50 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="text-center bg-linear-to-r from-red-50 to-red-100 border-b border-red-200">
            <div className="w-20 h-20 mx-auto rounded-full bg-linear-to-r from-red-500 to-red-600 flex items-center justify-center shadow-xl mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-700">
              غير مصرح للوصول
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6 p-8">
            <div className="space-y-3">
              <p className="text-red-600 text-lg font-medium">
                هذه الصفحة مخصصة للمديرين فقط
              </p>
              <p className="text-red-500 text-sm">
                يرجى التواصل مع الإدارة للحصول على الصلاحيات المناسبة
              </p>
            </div>
            <Link href="/">
              <Button className="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-xl">
                <Home className="w-5 h-5 ml-2" />
                العودة للصفحة الرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-blue-200 bg-linear-to-r from-white/95 to-blue-50/95 backdrop-blur-xl shadow-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                لوحة التحكم{" "}
              </h1>
              <p className="text-sm text-blue-500 font-medium">
                إدارة نظام جودة البيانات
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-row-reverse items-center gap-3 px-4 py-3 bg-linear-to-r from-white/80 to-blue-50/80 hover:from-white/90 hover:to-blue-50/90 rounded-2xl border border-blue-200 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300">
                <div className="p-2 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 shadow-md">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-right leading-tight">
                  <div className="text-sm font-bold text-blue-700">
                    {authSession?.name || "مستخدم"}
                  </div>
                  <div className="text-xs text-blue-500 font-semibold">
                    {authSession?.role === "admin" ? "مدير النظام" : "مستخدم"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 mt-3 bg-white/95 backdrop-blur-xl border border-blue-200 shadow-2xl rounded-2xl p-3"
              sideOffset={8}
            >
              <DropdownMenuLabel className="px-4 py-4">
                <div className="flex flex-row-reverse items-center gap-4">
                  <div className="p-3 rounded-full bg-linear-to-r from-blue-100 to-indigo-100">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-700 text-lg">
                      {authSession?.name || "مستخدم"}
                    </div>
                    <div className="text-sm text-blue-500 font-semibold">
                      {authSession?.role === "admin"
                        ? "مدير النظام"
                        : "مستخدم عادي"}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="my-3 bg-blue-200" />

              <DropdownMenuItem className="px-4 py-3 text-right hover:bg-blue-50 rounded-xl cursor-pointer transition-all duration-200 focus:bg-blue-50 mb-2">
                <div className="flex flex-row-reverse items-center gap-3 w-full">
                  <div className="p-2 rounded-full bg-blue-100">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-semibold text-blue-700">
                    الملف الشخصي
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="px-4 py-3 text-right hover:bg-indigo-50 rounded-xl cursor-pointer transition-all duration-200 focus:bg-indigo-50 mb-2">
                <div className="flex flex-row-reverse items-center gap-3 w-full">
                  <div className="p-2 rounded-full bg-indigo-100">
                    <Settings className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-indigo-700">
                    الإعدادات
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-3 bg-blue-200" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="px-4 py-3 text-right hover:bg-red-50 rounded-xl cursor-pointer transition-all duration-200 focus:bg-red-50"
              >
                <div className="flex flex-row-reverse items-center gap-3 w-full">
                  <div className="p-2 rounded-full bg-red-100">
                    <LogOut className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="font-semibold text-red-600">
                    تسجيل الخروج
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-linear-to-r from-white/80 to-blue-50/80 backdrop-blur-md border-b border-blue-200 shadow-md">
        <div className="container mx-auto px-6 py-4 flex gap-3">
          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              className="bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4 py-2"
            >
              <Activity className="w-4 h-4 ml-2" />
              مراجعة التعديلات
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button
              variant="outline"
              size="sm"
              className="border-blue-200 hover:bg-linear-to-r hover:from-indigo-500 hover:to-indigo-600 hover:border-0 hover:text-white text-blue-600 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl px-4 py-2"
            >
              <Users className="w-4 h-4 ml-2" />
              إدارة المستخدمين
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button
              variant="outline"
              size="sm"
              className="border-blue-200 hover:bg-linear-to-r hover:from-purple-500 hover:to-purple-600 hover:border-0 hover:text-white text-blue-600 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl px-4 py-2"
            >
              <FileText className="w-4 h-4 ml-2" />
              التقارير
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
