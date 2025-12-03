"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { AuthService } from "@/lib/backend-service";
import { loadAuthSession, type AuthSession } from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  isBackendAuthenticated: boolean;
  authSession: AuthSession | null;
  isLoading: boolean;
  login: (session: AuthSession) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);

      // Check local session first
      const session = loadAuthSession();
      if (session) {
        setAuthSession(session);
        setIsAuthenticated(true);

        // If session has token, verify with backend
        if (session.token) {
          try {
            const user = await AuthService.getCurrentUser();
            if (user) {
              setIsBackendAuthenticated(true);
            } else {
              // Token invalid, but keep local session
              console.log("Backend token invalid, keeping local session");
            }
          } catch (error) {
            console.log("Backend not available or token invalid:", error);
          }
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setIsBackendAuthenticated(false);
      setAuthSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (session: AuthSession) => {
    setAuthSession(session);
    setIsAuthenticated(true);
    if (session.token) {
      setIsBackendAuthenticated(true);
    }
  };

  const logout = () => {
    setAuthSession(null);
    setIsAuthenticated(false);
    setIsBackendAuthenticated(false);
    AuthService.clearToken();
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isBackendAuthenticated,
    authSession,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-8">
          {/* Main loader container */}
          <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
            {/* Outer spinning ring */}
            <div className="absolute w-24 h-24 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin"></div>

            {/* Inner pulsing circle */}
            <div className="absolute w-16 h-16 rounded-full bg-linear-to-r from-blue-400 to-indigo-500 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white shadow-lg"></div>
            </div>

            {/* Animated background circles */}
            <div className="absolute w-32 h-32 rounded-full bg-linear-to-r from-blue-400/20 to-indigo-500/20 animate-ping"></div>
            <div className="absolute w-40 h-40 rounded-full bg-linear-to-r from-blue-300/10 to-indigo-400/10 animate-ping animation-delay-200"></div>
          </div>

          {/* Loading text with gradient */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              جاري تحميل النظام
            </h2>
            <p className="text-blue-500 text-lg font-medium">
              يرجى الانتظار...
            </p>

            {/* Loading dots animation */}
            <div className="flex justify-center space-x-2 mt-6">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce animation-delay-100"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}
