"use client";

import { FolderOpen } from "lucide-react";
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
    <nav className="sticky top-[72px] z-40 w-full border-b border-[#0986ed]/20 bg-[#fffffff2] backdrop-blur-sm leading-9 shadow-sm">
      <div className="container mx-auto px-6">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList
            className={`grid w-full ${
              hasProject ? "grid-cols-5" : "grid-cols-1 max-w-xs"
            } bg-transparent border-0 p-0 h-auto gap-2`}
          >
            <TabsTrigger
              value="projects"
              className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
            >
              <FolderOpen className="w-4 h-4 inline-block mr-2" />
              المشاريع
            </TabsTrigger>
            {hasProject && (
              <>
                <TabsTrigger
                  value="summary"
                  className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
                >
                  ملخص النتائج
                </TabsTrigger>
                <TabsTrigger
                  value="indicators"
                  className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
                >
                  المؤشرات
                </TabsTrigger>
                <TabsTrigger
                  value="issues"
                  className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
                >
                  التغييرات المرفوضة
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="cursor-pointer py-3 px-6 data-[state=active]:bg-[#1f66a0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-semibold text-[#1f254b] hover:bg-white/80 transition-all duration-200"
                >
                  سجل التدقيق
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}
