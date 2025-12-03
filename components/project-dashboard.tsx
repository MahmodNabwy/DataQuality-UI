"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  TableOfContents,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Settings,
  Download,
  RefreshCcw as Refresh,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/storage";

interface ProjectDashboardProps {
  project: Project;
  onViewIndicators: () => void;
  onViewSummary: () => void;
  onExportData: () => void;
  onRefreshData: () => void;
}

export function ProjectDashboard({
  project,
  onViewIndicators,
  onViewSummary,
  onExportData,
  onRefreshData,
}: ProjectDashboardProps) {
  const [activeView, setActiveView] = useState<
    "overview" | "indicators" | "summary"
  >("overview");

  // Mock data - replace with real data from your backend
  const mockStats = {
    totalIndicators: 24,
    validIndicators: 18,
    invalidIndicators: 6,
    completionRate: 75,
    lastUpdated: new Date().toLocaleDateString("ar-SA"),
  };
  useEffect(() => {
    console.log("project:", project);
  }, [project]);
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Project Header */}
        <div className="bg-white rounded-3xl shadow-xl border border-blue-100 p-8">
          <div className="flex flex-row-reverse items-center justify-between">
            <div className="flex flex-row-reverse items-center gap-6">
              <div className="w-16 h-16 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <TableOfContents className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {project.fileName}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {project.qaResults.summary.totalIndicators} إجمالي المؤشرات
                  </span>

                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-700"
                  >
                    آخر تحديث: {project.qaResults.processedAt}
                  </Badge>
                </div>
              </div>
            </div>
            {/* <div className="flex gap-3">
              <Button
                onClick={onRefreshData}
                variant="outline"
                className="flex items-center gap-2 hover:bg-blue-50 border-blue-200"
              >
                <Refresh className="w-4 h-4" />
                تحديث البيانات
              </Button>
              <Button
                onClick={onExportData}
                className="flex items-center gap-2 bg-linear-to-r text-white from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Download className="w-4 h-4" />
                تصدير التقرير
              </Button>
            </div> */}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600">
                  إجمالي المؤشرات
                </CardTitle>
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {project.qaResults.summary.totalIndicators}
              </div>
              <p className="text-sm text-gray-500">مؤشر متاح للتحليل</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-green-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600">
                  الفحوصات الناجحة
                </CardTitle>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-1">
                {project.qaResults.summary.passedChecks}
              </div>
              <p className="text-sm text-gray-500">مؤشر يلبي معايير الجودة</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-red-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600">
                  الفحوصات الفاشلة
                </CardTitle>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700 mb-1">
                {project.qaResults.summary.failedChecks}
              </div>
              <p className="text-sm text-gray-500">مؤشر يحتاج مراجعة</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-600">
                  دقة البيانات
                </CardTitle>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 mb-1">
                %{project.qaResults.qualityScore.breakdown.accuracy}
              </div>
              <p className="text-sm text-gray-500">من البيانات تم فحصها</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as any)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-white rounded-2xl shadow-lg border border-blue-100 p-2">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
            >
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger
              value="indicators"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
            >
              المؤشرات التفصيلية
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
            >
              تقرير شامل
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card className="bg-white rounded-2xl shadow-xl border border-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <Settings className="w-6 h-6 text-blue-600" />
                    الإجراءات السريعة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={onViewIndicators}
                    className="w-full justify-between bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl py-3 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      <TableOfContents className="w-5 h-5" />
                      <div className="text-right">
                        <div className="font-semibold">عرض جميع المؤشرات</div>
                        <div className="text-sm opacity-90">
                          تصفح وإدارة المؤشرات بالتفصيل
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  <Button
                    onClick={onViewSummary}
                    className="w-full justify-between bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl py-3 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5" />
                      <div className="text-right">
                        <div className="font-semibold">عرض التقرير الشامل</div>
                        <div className="text-sm opacity-90">
                          ملخص كامل لنتائج التحليل
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>

              {/* Progress Overview */}
              <Card className="bg-white rounded-2xl shadow-xl border border-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <PieChart className="w-6 h-6 text-green-600" />
                    تقدم العمل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {mockStats.completionRate}%
                      </div>
                      <p className="text-gray-600">من البيانات تم معالجتها</p>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${mockStats.completionRate}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {mockStats.validIndicators}
                        </div>
                        <div className="text-sm text-gray-600">مؤشر صالح</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {mockStats.invalidIndicators}
                        </div>
                        <div className="text-sm text-gray-600">
                          يحتاج مراجعة
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="indicators" className="mt-6">
            <Card className="bg-white rounded-2xl shadow-xl border border-blue-100">
              <CardContent className="p-8">
                <div className="text-center py-12">
                  <TableOfContents className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    المؤشرات التفصيلية
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    هنا ستجد جميع المؤشرات مع إمكانية التصفية والبحث والتحليل
                    التفصيلي
                  </p>
                  <Button
                    onClick={onViewIndicators}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    عرض جميع المؤشرات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-6">
            <Card className="bg-white rounded-2xl shadow-xl border border-blue-100">
              <CardContent className="p-8">
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-purple-500" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    التقرير الشامل
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    تقرير مفصل يحتوي على جميع نتائج التحليل مع الرسوم البيانية
                    والإحصائيات
                  </p>
                  <Button
                    onClick={onViewSummary}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    عرض التقرير الكامل
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
