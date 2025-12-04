"use client";

import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Shield,
} from "lucide-react";
import { saveAuthSession } from "@/lib/auth";
import { AuthService } from "@/lib/backend-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-wrapper";

interface LoginFormProps {
  onLogin: (
    name: string,
    role: "admin" | "user",
    isBackendAuth?: boolean
  ) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useBackendAuth, setUseBackendAuth] = useState(true);

  const { toast } = useToast();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      console.log("Attempting backend authentication...");
      const backendResult = await AuthService.login(email, password);

      console.log("Backend response:", backendResult);

      if (backendResult.token != null) {
        // If backend auth succeeds but no user data, try to get current user
        let userData = backendResult.user;

        if (!userData && backendResult.token) {
          console.log(
            "No user data in response, trying to fetch current user..."
          );
        }

        if (userData) {
          const session = {
            email: userData.email,
            name: userData.name,
            role: userData.role as "admin" | "user",
            loginTime: Date.now(),
            token: backendResult.token,
          };
          saveAuthSession(session);

          toast({
            title: "تم تسجيل الدخول بنجاح",
            variant: "success",
          });

          // Automatic role-based routing - single navigation
          setTimeout(() => {
            if (userData.role === "admin") {
              // Redirect admin users to admin dashboard
              window.location.href = "/admin";
            } else {
              // Redirect regular users to main page (projects list)
              window.location.href = "/";
            }
          }, 1000); // Small delay to show success message

          return;
        } else {
          setError(
            "تم تسجيل الدخول بنجاح لكن لم يتم العثور على بيانات المستخدم"
          );
          return;
        }
      } else {
        // Backend failed, try local auth
        console.log(
          "Backend auth failed:",
          backendResult.message || "Unknown error"
        );
        console.log("Falling back to local authentication...");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-5 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute w-80 h-80 bg-linear-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl top-10 left-10 animate-pulse" />
      <div className="absolute w-60 h-60 bg-linear-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse animation-delay-1000" />
      <div className="absolute w-48 h-48 bg-linear-to-r from-indigo-400/15 to-blue-500/15 rounded-full blur-2xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse animation-delay-500" />

      <Card className="w-full max-w-xl border border-blue-200 bg-linear-to-br from-white/95 to-blue-50/95 backdrop-blur-xl shadow-2xl rounded-3xl animate-fade-in overflow-hidden">
        <CardHeader className="text-center pb-6 pt-8 bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent mb-3">
            نظام فحص جودة البيانات الإحصائية
          </CardTitle>
          <CardDescription className="text-blue-600 text-lg font-semibold tracking-wide">
            Data Quality Control System
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 p-10">
          <form onSubmit={handleSubmit} className="space-y-8" autoComplete="on">
            {/* Error Alert */}
            {error && (
              <Alert className="bg-red-50 border-2 border-red-200 animate-fade-in-scale shadow-lg rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <AlertDescription className="text-red-800 font-semibold text-lg">
                    {error}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-4">
              <Label
                htmlFor="email"
                className="text-blue-700 font-bold text-lg flex items-center gap-3"
              >
                <div className="p-2 rounded-full bg-blue-100">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                البريد الإلكتروني
              </Label>

              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/80 border-2 border-blue-200 text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 h-14 text-lg rounded-xl transition-all duration-300 shadow-md hover:shadow-lg placeholder:text-blue-400"
                placeholder="أدخل البريد الإلكتروني"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-4">
              <Label
                htmlFor="password"
                className="text-blue-700 font-bold text-lg flex items-center gap-3"
              >
                <div className="p-2 rounded-full bg-blue-100">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                كلمة المرور
              </Label>

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/80 border-2 border-blue-200 text-right text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 h-14 text-lg rounded-xl  transition-all duration-300 shadow-md hover:shadow-lg placeholder:text-blue-400"
                  placeholder="أدخل كلمة المرور"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-full hover:bg-blue-100"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 h-16 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full" />
                  <span className="text-lg">جاري تسجيل الدخول...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <User className="w-8 h-8" />
                  <span className="text-lg">تسجيل الدخول</span>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
