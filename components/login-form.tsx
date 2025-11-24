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
          };
          saveAuthSession(session);
          onLogin(userData.name, userData.role as "admin" | "user", true);

          toast({
            title: "تم تسجيل الدخول بنجاح",
            description: `أهلاً بك ${userData.name} - متصل بالخادم`,
            variant: "default",
          });
          return;
        } else {
          console.log("Backend auth succeeded but no user data available");
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
    <div className="min-h-screen bg-linear-to-br from-[#1f254b] via-[#0986ed]/20 to-[#1f254b] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg border-[#0986ed]/30 bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-[#1f254b] mb-2">
            نظام فحص جودة البيانات الإحصائية
          </CardTitle>
          <CardDescription className="text-[#1f254b]/70 text-lg font-medium">
            Data Quality Control System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert className="bg-red-50 border-red-200 animate-fade-in-scale">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label
                htmlFor="email"
                className="text-[#1f254b] font-semibold flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-[#0986ed]" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                // placeholder="example@digitalhub.com.eg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-[#0986ed]/30 text-[#1f254b] placeholder:text-[#1f254b]/50 focus:border-[#0986ed] focus:ring-[#0986ed]/20 h-12 text-lg rounded-lg transition-all duration-200"
                required
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="password"
                className="text-[#1f254b] font-semibold flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-[#0986ed]" />
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  // placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-[#0986ed]/30 text-[#1f254b] placeholder:text-[#1f254b]/50 focus:border-[#0986ed] focus:ring-[#0986ed]/20 h-12 text-lg rounded-lg pl-12 transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#0986ed]/60 hover:text-[#0986ed] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0986ed] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 h-12 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 btn-professional"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  جاري تسجيل الدخول...
                </div>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
