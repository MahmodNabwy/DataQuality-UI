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
    <header className="sticky top-0 z-50 border-b border-[#0986ed]/30 bg-[#123a4cf2]/95 backdrop-blur-xl shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="transition-all duration-300">
            <h1 className="text-2xl font-bold text-[#F4F4F4] drop-shadow-sm tracking-wide hover:text-white">
              نظام فحص جودة البيانات الإحصائية
            </h1>
            <p className="text-sm mt-1 text-[#F4F4F4]/80 font-medium">
              {currentProject
                ? currentProject.fileName
                : "الرجاء اختيار أو إنشاء مشروع"}
            </p>
          </div>

          {/* Actions Section */}
          <div className="flex gap-4 items-center">
            {currentProject && (
              <Button
                onClick={onSaveProject}
                className={`gap-2 text-sm py-2.5 px-6 font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 ${
                  hasUnsavedChanges
                    ? "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    : "bg-linear-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white opacity-90"
                }`}
              >
                {hasUnsavedChanges ? "حفظ التغييرات" : "تم الحفظ"}
                <Save className="w-4 h-4" />
              </Button>
            )}

            {currentProject && (
              <Button
                onClick={onExportResults}
                className="gap-2 bg-linear-to-r from-[#0986ed] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg text-sm py-2.5 px-6 font-semibold rounded-xl transition-all duration-300 hover:shadow-xl transform hover:-translate-y-0.5"
              >
                تحميل النتائج
                <Download className="w-4 h-4" />
              </Button>
            )}

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
                  onClick={onLogout}
                  className="px-4 py-3 text-right hover:bg-red-50/80 rounded-xl cursor-pointer transition-colors duration-200 focus:bg-red-50/80"
                >
                  <div className="flex flex-row-reverse items-center gap-3 w-full">
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="font-medium text-red-600">
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
