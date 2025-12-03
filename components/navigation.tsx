"use client";

import {
  FolderOpen,
  TriangleAlert,
  LayoutDashboard,
  TableOfContents,
  Activity,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  hasProject: boolean;
}

export function Navigation({
  activeTab,
  onTabChange,
  hasProject,
}: NavigationProps) {
  return (
    <nav className="sticky top-[72px] z-40 w-full border-b border-[#0986ed]/20 bg-linear-to-r from-[#fdfdff] via-[#ffffff] to-[#fdfdff] backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-6 py-1">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList
            className={`grid w-full ${
              hasProject ? "grid-cols-3" : "grid-cols-1 max-w-xs"
            } bg-white/50 backdrop-blur-sm border border-[#0986ed]/10 p-1 h-auto gap-1 rounded-xl shadow-inner`}
          >
            {hasProject && (
              <>
                <TabsTrigger
                  value="dashboard"
                  className="group relative cursor-pointer py-3 px-4 data-[state=active]:bg-linear-to-r data-[state=active]:from-[#1f66a0] data-[state=active]:to-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl font-semibold text-[#1f254b] hover:bg-gradient-to-r hover:from-white/90 hover:to-gray-50 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-transparent data-[state=active]:border-[#1f66a0]/30"
                >
                  <LayoutDashboard className="w-4 h-4 inline-block mr-2 transition-transform duration-200 group-hover:scale-110" />
                  <span className="relative">
                    لوحة التحكم
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1f66a0] group-data-[state=active]:w-full transition-all duration-300"></span>
                  </span>
                </TabsTrigger>
                {/* <TabsTrigger
                  value="indicators"
                  className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
                >
                  <TableOfContents className="w-4 h-4 inline-block mr-2" />
                  المؤشرات
                </TabsTrigger> */}
                {/* <TabsTrigger
                  value="summary"
                  className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
                >
                  <Activity className="w-4 h-4 inline-block mr-2" />
                  ملخص النتائج
                </TabsTrigger> */}
                <TabsTrigger
                  value="issues"
                  className="group relative cursor-pointer py-3 px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#1f66a0] data-[state=active]:to-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl font-semibold text-[#1f254b] hover:bg-gradient-to-r hover:from-white/90 hover:to-gray-50 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-transparent data-[state=active]:border-[#1f66a0]/30"
                >
                  <TriangleAlert className="w-4 h-4 inline-block mr-2 transition-transform duration-200 group-hover:scale-110" />
                  <span className="relative">
                    التغييرات المرفوضة
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1f66a0] group-data-[state=active]:w-full transition-all duration-300"></span>
                  </span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="projects"
              className="group relative cursor-pointer py-3 px-6 data-[state=active]:bg-linear-to-r data-[state=active]:from-[#1f66a0] data-[state=active]:to-[#2563eb] data-[state=active]:text-white data-[state=active]:shadow-xl rounded-xl font-semibold text-[#1f254b] hover:bg-gradient-to-r hover:from-white/90 hover:to-gray-50 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] border border-transparent data-[state=active]:border-[#1f66a0]/30"
            >
              <FolderOpen className="w-4 h-4 inline-block mr-2 transition-transform duration-200 group-hover:scale-110" />
              <span className="relative">
                المشاريع
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1f66a0] group-data-[state=active]:w-full transition-all duration-300"></span>
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}
