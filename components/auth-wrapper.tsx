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
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">جاري تحميل النظام...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}
