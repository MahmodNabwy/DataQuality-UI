"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  FileText,
  AlertTriangle,
  Search,
  BarChart3,
  CheckCircle,
  BarChart,
  Users,
  X,
} from "lucide-react";
import { AuthService } from "@/lib/backend-service";
import {
  loadAuthSession,
  clearAuthSession,
  type AuthSession,
} from "@/lib/auth";
import * as XLSX from "xlsx";

// Simple UserProfile component for admin
function UserProfile() {
  const authSession = loadAuthSession();

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-row-reverse items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 shadow-md backdrop-blur-xl transition-all duration-300">
        <div className="p-2 rounded-full bg-[#FFE08F]/30 shadow-sm">
          <User className="w-5 h-5 text-[#FFE08F]" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-lg font-semibold text-[#F4F4F4] drop-shadow-sm">
            {authSession?.name || "مستخدم"}
          </div>
          <div className="text-sm text-white/60 font-medium">
            {authSession?.role === "admin" ? "مدير" : "مستخدم"}
          </div>
        </div>
      </div>
      <Button
        onClick={handleLogout}
        className="gap-2 bg-linear-to-r cursor-pointer from-red-500 to-red-600 hover:from-red-600 hover:to-red-700  text-white text-sm py-2.5 px-6 font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-0.5"
      >
        <XCircle className="w-4 h-4" />
        تسجيل الخروج
      </Button>
    </div>
  );
}

interface AuditChange {
  id: string;
  indicatorName: string;
  filterName: string;
  year: number;
  month: number | null;
  quarter: number | null;
  oldValue: number;
  newValue: number;
  changeType?: string;
  changedBy: string | null;
  changedAt: string;
  comment: string;
  tableNumber: string;
  isApproved?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  isMigratedToProduction?: boolean;
  migratedAt?: string | null;
}

interface PublicationGroup {
  publicationName: string;
  totalChanges: number;
  changes: AuditChange[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminAuditPage() {
  const { toast } = useToast();
  const [publications, setPublications] = useState<PublicationGroup[]>([]);
  const [selectedPublication, setSelectedPublication] =
    useState<PublicationGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<AuditChange | null>(
    null
  );
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [showChangesDialog, setShowChangesDialog] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalPublications: 0,
    totalChanges: 0,
    totalIndicators: 0,
    totalFilters: 0,
    totalUsers: 0,
  });

  const fetchAuditChanges = useCallback(async () => {
    setLoading(true);
    try {
      const token = AuthService.getTokenFromSession();
      if (!token) return;

      // Fetch all audit changes grouped by publication
      const response = await fetch(
        `${API_BASE_URL}/Audit/changes/by-publication`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        const publicationGroups: PublicationGroup[] =
          responseData.publications || [];
        setPublications(publicationGroups);

        // Calculate statistics from API response
        const apiStats = responseData.page;
        if (apiStats) {
          setStats({
            totalPublications:
              apiStats.totalPublications || publicationGroups.length,
            totalChanges: apiStats.totalChanges || 0,
            totalIndicators: apiStats.totalUniqueIndicators || 0,
            totalFilters: apiStats.totalUniqueFilters || 0,
            totalUsers: apiStats.totalUniqueUsers || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching audit changes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditChanges();
  }, [fetchAuditChanges]);

  const handleApproveChange = async (
    change: AuditChange,
    approved: boolean
  ) => {
    try {
      const token = AuthService.getTokenFromSession();
      if (!token) return;

      const authSession = loadAuthSession();

      const requestBody = {
        ChangeId: change.id,
        Approve: approved,
        Comment: approvalComment || null,
        UserId: authSession?.email || null,
      };

      const response = await fetch(`${API_BASE_URL}/Audit/changes/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Show success toast
      toast({
        title: approved ? "تم اعتماد التعديل" : "تم رفض التعديل",
        description: approved
          ? "تم اعتماد التعديل بنجاح وسيتم تطبيقه في النظام"
          : "تم رفض التعديل ولن يتم تطبيقه في النظام",
        variant: "success",
      });
      change.isApproved = approved;
      change.approvedBy = authSession?.email || "غير محدد";
      change.approvedAt = new Date().toISOString();

      // Refresh data after action
      await fetchAuditChanges();
      setShowApprovalDialog(false);
      setSelectedChange(null);
      setApprovalComment("");
    } catch (error) {
      console.error("Error approving change:", error);

      // Show error toast
      toast({
        title: "حدث خطأ في النظام",
        description: "لم يتم حفظ قرار الاعتماد. يرجى المحاولة مرة أخرى",
        variant: "error",
      });
    }
  };

  const exportPublicationToExcel = (publication: PublicationGroup) => {
    const exportData = publication.changes.map((change) => ({
      "اسم المؤشر": change.indicatorName,
      "اسم الفلتر": change.filterName,
      السنة: change.year,
      الشهر: change.month || "-",
      الربع: change.quarter || "-",
      "القيمة القديمة": change.oldValue,
      "القيمة الجديدة": change.newValue,
      "رقم الجدول": change.tableNumber,
      التعليق: change.comment,
      المستخدم: change.changedBy || "غير محدد",
      "تاريخ التعديل": new Date(change.changedAt).toLocaleString("ar-EG"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      publication.publicationName
    );

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${publication.publicationName}-${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const finishAudit = async (publication: PublicationGroup) => {
    try {
      const token = AuthService.getTokenFromSession();
      if (!token) return;

      // Here you would make the API call to finish audit for this publication
      console.log(
        "Finishing audit for publication:",
        publication.publicationName
      );

      // Refresh data after action
      await fetchAuditChanges();
    } catch (error) {
      console.error("Error finishing audit:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1D546C]  ">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-blue-200">جاري تحميل سجل التعديلات...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-6 ">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              title: "عدد النشرات",
              value: stats.totalPublications,
              icon: <FileText className="h-8 w-8 text-white" />,
              bg: "from-[#0A80D0] to-[#145064]",
            },
            {
              title: "إجمالي التغييرات",
              value: stats.totalChanges,
              icon: <Activity className="h-8 w-8 text-white" />,
              bg: "from-[#145064] to-[#0A80D0]",
            },
            {
              title: "عدد المؤشرات",
              value: stats.totalIndicators,
              icon: <BarChart className="h-8 w-8 text-white" />,
              bg: "from-[#0F3D52] to-[#0A80D0]",
            },
            {
              title: "عدد المؤشرات الفرعية",
              value: stats.totalFilters,
              icon: <Filter className="h-8 w-8 text-white" />,
              bg: "from-[#1D546C] to-[#0A80D0]",
            },
            {
              title: "عدد المستخدمين",
              value: stats.totalUsers,
              icon: <Users className="h-8 w-8 text-white" />,
              bg: "from-[#0F3D52] to-[#0A80D0]",
            },
          ].map((card, idx) => (
            <Card
              key={idx}
              className={`rounded-2xl border border-blue-600/40 shadow-xl shadow-blue-900/40
          bg-linear-to-br ${card.bg} backdrop-blur-sm hover:shadow-blue-800/60 transition-all`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">{card.title}</p>
                    <p className="text-2xl font-bold text-white">
                      {card.value}
                    </p>
                  </div>
                  {card.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Publications */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publications.map((pub) => (
            <Card
              key={pub.publicationName}
              className="rounded-2xl border border-blue-700/30 shadow-lg shadow-blue-900/40
          bg-linear-to-br from-[#145064]/80 via-[#1D546C]/40 to-[#0986ED]/20
          backdrop-blur-md hover:shadow-blue-800/60 transition-all"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span className="font-semibold">{pub.publicationName}</span>
                  <Badge className="bg-blue-600/30 border-blue-300/40 text-white">
                    {pub.changes.length} تغيير
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Buttons Row */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className=" bg-green-600 
                          hover:bg-green-700 
                          text-white 
                          text-sm 
                          shadow-md 
                          hover:shadow-lg 
                          transition-all 
                          duration-200 
                          rounded-lg"
                    onClick={() => finishAudit(pub)}
                  >
                    <CheckCircle className="w-4 h-4 ml-1" />
                    إنهاء المراجعة
                  </Button>

                  <Button
                    variant="outline"
                    className="text-white border-blue-400 hover:bg-blue-900/20 hover:text-white text-sm shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                    onClick={() => exportPublicationToExcel(pub)}
                  >
                    <Download className="w-4 h-4 ml-1" /> تحميل Excel
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-white border-blue-400 hover:bg-blue-900/20 hover:text-white text-sm shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                  onClick={() => setSelectedPublication(pub)}
                >
                  <Eye className="w-4 h-4 ml-2" />
                  عرض التغييرات ({pub.changes.length})
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {publications.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <p className="text-blue-200">لا توجد نشرات متاحة</p>
          </div>
        )}

        {/* Publication Changes Modal */}
        {selectedPublication && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPublication(null)}
          >
            <Card
              className="w-full max-w-5xl max-h-[90vh] overflow-hidden border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-[#F4F4F4]">
                  <span>
                    تغييرات نشرة: {selectedPublication.publicationName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPublication(null)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-8rem)]">
                <div className="space-y-4">
                  {selectedPublication.changes.map((change, index) => (
                    <Card
                      key={index}
                      className="border-blue-700/40 bg-[#053964]/50 backdrop-blur-sm"
                    >
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-blue-100">
                                {change.changedBy || "غير محدد"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-300" />
                              <span className="text-xs text-blue-200">
                                {new Date(change.changedAt).toLocaleString(
                                  "ar-EG"
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white">
                              {change.indicatorName}
                            </p>
                            <p className="text-xs text-blue-200">
                              {change.filterName}
                            </p>
                            <p className="text-xs text-blue-300">
                              السنة: {change.year}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-red-300  ">
                                {change.oldValue}
                              </span>
                              <span className="text-blue-200">←</span>
                              <span className="text-green-300 font-medium">
                                {change.newValue}
                              </span>
                            </div>
                            <p className="text-xs text-blue-200">
                              جدول: {change.tableNumber}
                            </p>
                            {change.comment && (
                              <p className="text-xs bg-blue-950/50 p-2 rounded mt-1 text-blue-100 border border-blue-800/30">
                                {change.comment}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {change.isApproved ? (
                              <div className="flex items-center justify-center p-2 bg-green-600/20 border border-green-500/40 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
                                <span className="text-green-300 text-sm font-medium">
                                  تم الاعتماد
                                </span>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() =>
                                    handleApproveChange(change, true)
                                  }
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  موافق
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-300 hover:bg-red-500/10 hover:text-white"
                                  onClick={() =>
                                    handleApproveChange(change, false)
                                  }
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  رفض
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Approval Dialog */}
        {showApprovalDialog && selectedChange && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setShowApprovalDialog(false);
              setSelectedChange(null);
              setApprovalComment("");
            }}
          >
            <Card
              className="w-full max-w-md border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="text-[#F4F4F4]">اعتماد التعديل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-blue-100">
                    <strong>المؤشر:</strong> {selectedChange.indicatorName}
                  </p>
                  <p className="text-sm text-blue-100">
                    <strong>الفلتر:</strong> {selectedChange.filterName}
                  </p>
                  <p className="text-sm text-blue-100">
                    <strong>التغيير:</strong> {selectedChange.oldValue} ←{" "}
                    {selectedChange.newValue}
                  </p>
                </div>

                <div>
                  <label className="text-sm mb-2 block text-blue-100">
                    تعليق الاعتماد
                  </label>
                  <Textarea
                    placeholder="أضف تعليق على قرار الاعتماد..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="bg-blue-950/40 border-blue-800/50 text-blue-100 placeholder:text-blue-300/50"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApprovalDialog(false);
                      setSelectedChange(null);
                      setApprovalComment("");
                    }}
                    className="border-blue-700/50 text-blue-300 hover:bg-blue-800/20"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => handleApproveChange(selectedChange, false)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    رفض
                  </Button>
                  <Button
                    onClick={() => handleApproveChange(selectedChange, true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    اعتماد
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
