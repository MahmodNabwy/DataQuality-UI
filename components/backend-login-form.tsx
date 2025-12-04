"use client";

import { useState } from "react";
import { Eye, EyeOff, LogIn, User, Lock, Cloud, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AuthService } from "@/lib/backend-service";
import { saveAuthSession, type AuthSession } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface BackendLoginFormProps {
  onLogin: (session: AuthSession, isBackendAuth?: boolean) => void;
  onCancel?: () => void;
}

export default function BackendLoginForm({
  onLogin,
  onCancel,
}: BackendLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackendMode, setIsBackendMode] = useState(true); // Default to backend
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Try backend authentication first
      console.log("[Auth] Attempting backend login...");
      const backendResult = await AuthService.login(email, password);

      if (backendResult.success && backendResult.user) {
        console.log("[Auth] Backend login successful");

        const session: AuthSession = {
          email: backendResult.user.email,
          name: backendResult.user.name,
          role: backendResult.user.role as "admin" | "user",
          loginTime: Date.now(),
        };

        saveAuthSession(session);
        onLogin(session, true);

        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `أهلاً بك ${backendResult.user.name} - متصل بالخادم`,
          variant: "success",
        });
        return;
      } else {
        console.log("[Auth] Backend login failed, trying local auth...");
        toast({
          title: "فشل تسجيل الدخول عبر الخادم",
          description:
            backendResult.message || "جاري المحاولة مع النظام المحلي...",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("[Auth] Login error:", error);
      toast({
        title: "خطأ في تسجيل الدخول",
        description:
          error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const predefinedUsers = [
    { email: "admin@system.com", name: "Admin", role: "admin" },
    { email: "Nourhan_Gamal@System.com", name: "Nourhan Gamal", role: "user" },
    { email: "Yahya_Othman@System.com", name: "Yahya Othman", role: "user" },
    { email: "Omnia_Adel@System.com", name: "Omnia Adel", role: "user" },
  ];

  const handleUserSelect = (userEmail: string) => {
    setEmail(userEmail);
    setPassword(""); // User needs to enter password
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900">
      <Card className="w-full max-w-md border-blue-700/50 bg-blue-900/30 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-blue-100">
            تسجيل الدخول
          </CardTitle>
          <CardDescription className="text-center text-blue-300">
            ادخل بياناتك للوصول إلى نظام فحص جودة البيانات
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Authentication Mode Switcher */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-blue-700/30 bg-blue-900/20">
            <div className="flex items-center gap-2">
              {isBackendMode ? (
                <Cloud className="h-5 w-5 text-blue-400" />
              ) : (
                <Database className="h-5 w-5 text-blue-400" />
              )}
              <span className="text-sm text-blue-200">
                {isBackendMode ? "تسجيل دخول عبر الخادم" : "تسجيل دخول محلي"}
              </span>
            </div>
            <Switch
              checked={isBackendMode}
              onCheckedChange={setIsBackendMode}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-200">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ادخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-blue-900/20 border-blue-700/50 text-blue-100 placeholder-blue-400"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-200">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="ادخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-blue-900/20 border-blue-700/50 text-blue-100 placeholder-blue-400"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-200"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  جاري تسجيل الدخول...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول
                </div>
              )}
            </Button>
          </form>

          <Separator className="bg-blue-700/30" />

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full border-blue-700/50 bg-blue-900/20 hover:bg-blue-900/40 text-blue-200"
              disabled={isLoading}
            >
              إلغاء
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
