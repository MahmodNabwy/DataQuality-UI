"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Save, UserIcon, LogOut, Settings, User } from "lucide-react";
import type { Project } from "@/lib/storage";
import type { AuthSession } from "@/lib/auth";

interface HeaderProps {
  currentProject: Project | null;
  authSession: AuthSession | null;
  hasUnsavedChanges: boolean;
  onSaveProject: () => void;
  onExportResults: () => void;
  onLogout: () => void;
}

export function Header({
  currentProject,
  authSession,
  hasUnsavedChanges,
  onSaveProject,
  onExportResults,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-linear-to-r from-blue-600 via-indigo-700 to-purple-800 shadow-2xl border-b border-blue-400/30">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="transition-all duration-300">
            <h1 className="text-3xl font-bold bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent drop-shadow-lg tracking-wide hover:scale-105 transition-transform duration-300">
              نظام فحص جودة البيانات الإحصائية
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-linear-to-r from-yellow-400 to-orange-500 animate-pulse"></div>
              <p className="text-base text-blue-100 font-medium">
                {currentProject
                  ? currentProject.fileName
                  : "الرجاء اختيار أو إنشاء مشروع"}
              </p>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex gap-4 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-row-reverse items-center gap-3 px-4 py-3 bg-linear-to-r from-white/20 to-blue-200/30 hover:from-white/30 hover:to-blue-200/40 rounded-2xl border border-white/30 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-transparent">
                  <div className="p-2 rounded-full bg-linear-to-r from-yellow-400 to-orange-500 shadow-lg">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-sm font-bold text-white drop-shadow-sm">
                      {authSession?.name || "مستخدم"}
                    </div>
                    <div className="text-sm text-blue-100 font-medium">
                      {authSession?.role === "admin" ? "مدير" : "مستخدم"}
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-72 mt-3 bg-linear-to-br from-white to-blue-50 backdrop-blur-xl border border-blue-200 shadow-2xl rounded-2xl p-3"
                sideOffset={8}
              >
                <DropdownMenuLabel className="px-4 py-4 ">
                  <div className="flex flex-row-reverse items-center gap-4">
                    <div className="p-3 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 shadow-lg">
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-lg">
                        {authSession?.name || "مستخدم"}
                      </div>
                      <div className="text-sm text-blue-600 font-medium mt-1">
                        {authSession?.role === "admin"
                          ? "مدير النظام"
                          : "مستخدم عادي"}
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-3 bg-linear-to-r from-transparent via-blue-300 to-transparent h-px" />

                <DropdownMenuItem className="px-4 py-3 text-right hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl cursor-pointer transition-all duration-300 focus:bg-linear-to-r focus:from-blue-50 focus:to-indigo-50 group">
                  <div className="flex flex-row-reverse items-center gap-3 w-full">
                    <div className="p-2 rounded-full bg-linear-to-r from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-300">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">
                      الملف الشخصي
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="px-4 py-3 text-right hover:bg-linear-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl cursor-pointer transition-all duration-300 focus:bg-linear-to-r focus:from-purple-50 focus:to-pink-50 group">
                  <div className="flex flex-row-reverse items-center gap-3 w-full">
                    <div className="p-2 rounded-full bg-linear-to-r from-purple-100 to-pink-100 group-hover:from-purple-200 group-hover:to-pink-200 transition-all duration-300">
                      <Settings className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="font-semibold text-gray-800 group-hover:text-purple-700 transition-colors duration-300">
                      الإعدادات
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-3 bg-linear-to-r from-transparent via-red-300 to-transparent h-px" />

                <DropdownMenuItem
                  onClick={onLogout}
                  className="px-4 py-3 text-right hover:bg-linear-to-r hover:from-red-50 hover:to-pink-50 rounded-xl cursor-pointer transition-all duration-300 focus:bg-linear-to-r focus:from-red-50 focus:to-pink-50 group"
                >
                  <div className="flex flex-row-reverse items-center gap-3 w-full">
                    <div className="p-2 rounded-full bg-linear-to-r from-red-100 to-pink-100 group-hover:from-red-200 group-hover:to-pink-200 transition-all duration-300">
                      <LogOut className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="font-semibold text-gray-800 group-hover:text-red-700 transition-colors duration-300">
                      تسجيل الخروج
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
