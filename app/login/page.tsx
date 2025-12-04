"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/login-form";
import { loadAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if user is already logged in
    const session = loadAuthSession();
    if (session) {
      // Redirect based on role
      if (session.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    }
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const handleLogin = (
    name: string,
    role: "admin" | "user",
    isBackendAuth?: boolean
  ) => {
    // Login logic is handled in the LoginForm component
    // Redirection happens there based on role
  };

  return <LoginForm onLogin={handleLogin} />;
}
