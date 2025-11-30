"use client";

import { useState, useEffect } from "react";
import { AuthService } from "@/lib/backend-service";
import { loadUserProfile } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, FileText, Activity, LogOut, Home } from "lucide-react";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

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
        const hasAdminAccess =
          profile?.role === "admin" || profile?.permissions?.includes("admin");
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
    AuthService.logout();
    window.location.href = "/login";
  };

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
            <CardTitle className="text-red-200">غير مخول للوصول</CardTitle>
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

          {/* User Profile & Actions */}
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="text-right">
                <p className="text-[#C1E1FF] font-medium">{userProfile.name}</p>
                <Badge className="bg-purple-600/20 border-purple-500/50 text-purple-300 flex items-center">
                  <Shield className="w-3 h-3 ml-1" />
                  مدير
                </Badge>
              </div>
            )}
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="border-blue-500/50 text-[#B0D6E8] hover:bg-blue-700/20 hover:text-white"
              >
                <Home className="w-4 h-4 ml-2" />
                الصفحة الرئيسية
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-red-600/50 text-red-300 hover:bg-red-600/20"
            >
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-[#123A4CF2] backdrop-blur-md border-b border-blue-800/30 shadow-sm">
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
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
