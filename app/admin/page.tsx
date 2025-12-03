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
      <div className="flex flex-row-reverse items-center gap-4 px-6 py-4 bg-linear-to-r from-white/10 to-blue-50/10 hover:from-white/15 hover:to-blue-50/15 rounded-2xl border border-white/30 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl">
        <div className="p-3 rounded-full bg-linear-to-r from-blue-400/30 to-indigo-500/30 shadow-lg">
          <User className="w-6 h-6 text-white" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-xl font-bold text-white drop-shadow-md">
            {authSession?.name || "مستخدم"}
          </div>
          <div className="text-sm text-blue-200 font-semibold">
            {authSession?.role === "admin" ? "مدير النظام" : "مستخدم"}
          </div>
        </div>
      </div>
      <Button
        onClick={handleLogout}
        className="gap-3 bg-linear-to-r cursor-pointer from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm py-3 px-8 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
      >
        <XCircle className="w-5 h-5" />
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
  isRejected?: boolean;
}

interface PublicationGroup {
  projectId: string;
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
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null
  );
  const [selectedChange, setSelectedChange] = useState<AuditChange | null>(
    null
  );
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [finishingAuditIds, setFinishingAuditIds] = useState<Set<string>>(
    new Set()
  );

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

  const handleRejectChange = async (change: AuditChange) => {
    try {
      const token = AuthService.getTokenFromSession();
      if (!token) return;

      const requestBody = {
        ChangeId: change.id,
        approve: false,
        comment: rejectionComment,
      };

      const response = await fetch(`${API_BASE_URL}/Audit/changes/reject`, {
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
        title: "تم رفض التعديل",
        description: "تم رفض التعديل وإرساله للمراجعة مرة أخرى",
        variant: "success",
      });

      // Update the change status locally
      change.isApproved = false;
      change.isRejected = true;

      // Refresh data after action
      await fetchAuditChanges();
      setShowRejectionDialog(false);
      setSelectedChange(null);
      setRejectionComment("");
    } catch (error) {
      console.error("Error rejecting change:", error);

      // Show error toast
      toast({
        title: "حدث خطأ في النظام",
        description: "لم يتم حفظ قرار الرفض. يرجى المحاولة مرة أخرى",
        variant: "error",
      });
    }
  };

  const exportPublicationToExcel = async (publication: PublicationGroup) => {
    // Prevent concurrent requests for the same publication
    if (downloadingFileId === publication.projectId) {
      return;
    }

    try {
      // Set downloading state for this publication
      setDownloadingFileId(publication.projectId);

      const token = AuthService.getTokenFromSession();
      if (!token) {
        toast({
          title: "خطأ في المصادقة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "error",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "جاري إنشاء الملف",
        description: "يرجى الانتظار أثناء تحضير ملف Excel...",
        variant: "success",
      });

      const response = await fetch(
        `${API_BASE_URL}/File/generate-final-result/${publication.projectId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the blob data
      const blob = await response.blob();

      // Get filename from response headers or use default with publication name, finalResult, and current date/time
      const contentDisposition = response.headers.get("Content-Disposition");
      const now = new Date();
      const dateTimeString = now
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5); // Format: 2024-12-03T14-30-45
      let fileName = `${publication.publicationName}-finalResult-${dateTimeString}.xlsx`;

      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (fileNameMatch && fileNameMatch[1]) {
          const serverFileName = fileNameMatch[1].replace(/['"]/g, "");
          // Extract extension from server filename if available
          const extension = serverFileName.split(".").pop() || "xlsx";
          fileName = `${publication.publicationName} -Final Result- ${dateTimeString}.${extension}`;
        }
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success toast
      toast({
        title: "تم تحميل الملف بنجاح",
        description: `تم تحميل ملف Excel لنشرة "${publication.publicationName}"`,
        variant: "success",
      });
    } catch (error) {
      console.error("Error downloading Excel file:", error);

      // Show error toast
      toast({
        title: "حدث خطأ أثناء تحميل الملف",
        description: "لم يتم تحميل ملف Excel. يرجى المحاولة مرة أخرى",
        variant: "error",
      });
    } finally {
      // Always clear the downloading state
      setDownloadingFileId(null);
    }
  };

  const finishAudit = async (publication: PublicationGroup) => {
    // Prevent concurrent requests for the same publication
    if (finishingAuditIds.has(publication.projectId)) {
      return;
    }

    try {
      // Add to processing set
      setFinishingAuditIds((prev) => new Set(prev).add(publication.projectId));

      const token = AuthService.getTokenFromSession();
      if (!token) {
        toast({
          title: "خطأ في المصادقة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "error",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "جاري إنهاء المراجعة",
        description: `يتم الآن إنهاء مراجعة نشرة "${publication.publicationName}"...`,
        variant: "success",
      });

      const response = await fetch(
        `${API_BASE_URL}/Projects/${publication.projectId}/mark-as-ended`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Show success toast
      toast({
        title: "تم إنهاء المراجعة بنجاح",
        description: `تم إنهاء مراجعة نشرة "${publication.publicationName}" وتم تغيير حالتها إلى منتهية`,
        variant: "success",
      });

      // Refresh data after action
      await fetchAuditChanges();
    } catch (error) {
      console.error("Error finishing audit:", error);

      // Show error toast
      toast({
        title: "حدث خطأ أثناء إنهاء المراجعة",
        description: "لم يتم إنهاء المراجعة. يرجى المحاولة مرة أخرى",
        variant: "error",
      });
    } finally {
      // Always remove from processing set
      setFinishingAuditIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(publication.projectId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
              <RefreshCw className="w-10 h-10 text-white animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400 to-indigo-500 opacity-75 animate-ping"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-blue-700">
              جاري تحميل لوحة المراجعة
            </h2>
            <p className="text-blue-500 text-lg">يرجى الانتظار...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="container mx-auto max-w-7xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4 mb-10">
            <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              لوحة مراجعة التعديلات
            </h1>
            <p className="text-blue-600 text-lg">
              قم بمراجعة واعتماد التعديلات المطلوبة على البيانات
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                title: "عدد النشرات",
                value: stats.totalPublications,
                icon: <FileText className="h-10 w-10 text-white" />,
                gradient: "from-blue-500 to-blue-600",
                iconBg: "from-blue-400 to-blue-500",
              },
              {
                title: "إجمالي التغييرات",
                value: stats.totalChanges,
                icon: <Activity className="h-10 w-10 text-white" />,
                gradient: "from-indigo-500 to-indigo-600",
                iconBg: "from-indigo-400 to-indigo-500",
              },
              {
                title: "عدد المؤشرات",
                value: stats.totalIndicators,
                icon: <BarChart className="h-10 w-10 text-white" />,
                gradient: "from-purple-500 to-purple-600",
                iconBg: "from-purple-400 to-purple-500",
              },
              {
                title: "عدد المؤشرات الفرعية",
                value: stats.totalFilters,
                icon: <Filter className="h-10 w-10 text-white" />,
                gradient: "from-cyan-500 to-cyan-600",
                iconBg: "from-cyan-400 to-cyan-500",
              },
              {
                title: "عدد المستخدمين",
                value: stats.totalUsers,
                icon: <Users className="h-10 w-10 text-white" />,
                gradient: "from-emerald-500 to-emerald-600",
                iconBg: "from-emerald-400 to-emerald-500",
              },
            ].map((card, idx) => (
              <Card
                key={idx}
                className={`rounded-2xl border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-linear-to-br ${card.gradient} transform hover:-translate-y-1`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-blue-100">
                        {card.title}
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {card.value.toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-full bg-linear-to-r ${card.iconBg} shadow-lg`}
                    >
                      {card.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Publications */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-blue-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                النشرات المتاحة للمراجعة
              </h2>
              <Badge className="bg-linear-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 text-lg shadow-md">
                {publications.length} نشرة
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publications.map((pub) => (
                <Card
                  key={pub.publicationName}
                  className="rounded-2xl border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 bg-linear-to-br from-white to-blue-50 transform hover:-translate-y-1 overflow-hidden"
                >
                  <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-xl font-bold text-blue-700 truncate">
                        {pub.publicationName}
                      </span>
                      <Badge className="bg-linear-to-r from-amber-500 to-orange-600 text-white px-3 py-1 shadow-md">
                        {pub.changes.length} تغيير
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6 space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {pub.changes.filter((c) => c.isApproved).length}
                        </div>
                        <div className="text-sm text-blue-500">معتمد</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-2xl font-bold text-amber-600">
                          {
                            pub.changes.filter(
                              (c) => !c.isApproved && !c.isRejected
                            ).length
                          }
                        </div>
                        <div className="text-sm text-amber-500">
                          في الانتظار
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => finishAudit(pub)}
                          disabled={finishingAuditIds.has(pub.projectId)}
                        >
                          {finishingAuditIds.has(pub.projectId) ? (
                            <>
                              <RefreshCw className="w-4 h-4 ml-1 animate-spin" />
                              جاري الإنهاء...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 ml-1" />
                              إنهاء المراجعة
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 text-sm shadow-md hover:shadow-lg transition-all duration-200 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => exportPublicationToExcel(pub)}
                          disabled={downloadingFileId === pub.projectId}
                        >
                          {downloadingFileId === pub.projectId ? (
                            <>
                              <RefreshCw className="w-4 h-4 ml-1 animate-spin" />
                              جاري التحميل...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 ml-1" />
                              تحميل Excel
                            </>
                          )}
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full bg-linear-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border-2 border-blue-300 hover:border-blue-500 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-xl cursor-pointer"
                        onClick={() => setSelectedPublication(pub)}
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التغييرات ({pub.changes.length})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {publications.length === 0 && (
            <div className="text-center py-16 space-y-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-linear-to-r from-blue-100 to-indigo-100 flex items-center justify-center shadow-lg">
                <FileText className="w-16 h-16 text-blue-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-blue-700">
                  لا توجد نشرات متاحة
                </h3>
                <p className="text-blue-500 text-lg">
                  لم يتم العثور على أي نشرات تحتاج للمراجعة في الوقت الحالي
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Publication Changes Modal */}
        {selectedPublication && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPublication(null)}
          >
            <Card
              className="w-full max-w-6xl max-h-[90vh] overflow-hidden border border-blue-200 bg-linear-to-br from-white to-blue-50 backdrop-blur shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-700">
                    تغييرات نشرة: {selectedPublication.publicationName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPublication(null)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full p-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(90vh-8rem)] p-6">
                <div className="space-y-6">
                  {selectedPublication.changes.map((change, index) => (
                    <Card
                      key={index}
                      className="border border-blue-200 bg-linear-to-r from-white to-blue-50 shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden"
                    >
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-blue-100">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-semibold text-blue-700">
                                {change.changedBy || "غير محدد"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-indigo-100">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                              </div>
                              <span className="text-sm text-gray-600">
                                {new Date(change.changedAt).toLocaleString(
                                  "ar-EG"
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-blue-700">
                              {change.indicatorName}
                            </h4>
                            <p className="text-sm text-indigo-600 font-medium">
                              {change.filterName}
                            </p>
                            <p className="text-sm text-gray-600">
                              السنة:{" "}
                              <span className="font-bold text-purple-600">
                                {change.year}
                              </span>
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-lg border">
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                                {change.oldValue.toLocaleString()}
                              </span>
                              <span className="text-gray-500 font-bold">←</span>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                                {change.newValue.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-center text-gray-600">
                              جدول:{" "}
                              <span className="font-semibold text-blue-600">
                                {change.tableNumber}
                              </span>
                            </p>
                            {change.comment && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-700 font-medium">
                                  {change.comment}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-3">
                            {change.isApproved ? (
                              <div className="flex items-center justify-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-green-700 font-bold">
                                  تم الاعتماد
                                </span>
                              </div>
                            ) : change.isRejected ||
                              change.isApproved == false ? (
                              <div className="flex items-center justify-center gap-2 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                <span className="text-orange-700 font-bold text-center">
                                  تم الإرسال للمراجعة مرة أخرى
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                                  onClick={() =>
                                    handleApproveChange(change, true)
                                  }
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  موافق
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                                  onClick={() => {
                                    setSelectedChange(change);
                                    setShowRejectionDialog(true);
                                  }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  رفض
                                </Button>
                              </div>
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

        {/* Rejection Dialog */}
        {showRejectionDialog && selectedChange && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setShowRejectionDialog(false);
              setSelectedChange(null);
              setRejectionComment("");
            }}
          >
            <Card
              className="w-full max-w-md border border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="bg-linear-to-r from-red-50 to-red-100 border-b border-red-200 rounded-t-2xl">
                <CardTitle className="text-red-700 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-200">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  رفض التعديل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      المؤشر:
                    </span>
                    <span className="font-bold text-blue-700">
                      {selectedChange.indicatorName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      الفلتر:
                    </span>
                    <span className="font-bold text-indigo-700">
                      {selectedChange.filterName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      التغيير:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-bold">
                        {selectedChange.oldValue}
                      </span>
                      <span className="text-gray-500">←</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-bold">
                        {selectedChange.newValue}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    سبب الرفض <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="اكتب سبب رفض التعديل بشكل واضح ومفصل..."
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                    className="bg-linear-to-r from-white to-red-50 border-2 border-red-300 focus:border-red-500 text-gray-900 placeholder:text-red-400 min-h-[120px] rounded-xl"
                    required
                  />
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectionDialog(false);
                      setSelectedChange(null);
                      setRejectionComment("");
                    }}
                    className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 rounded-xl px-6 py-3"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => {
                      if (!rejectionComment.trim()) {
                        toast({
                          title: "خطأ",
                          description: "يرجى إدخال سبب الرفض",
                          variant: "error",
                        });
                        return;
                      }
                      handleRejectChange(selectedChange);
                    }}
                    className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    رفض التعديل
                  </Button>
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
              className="w-full max-w-md border border-blue-200 bg-linear-to-br from-white to-blue-50 shadow-2xl rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="bg-linear-to-r from-green-50 to-green-100 border-b border-green-200 rounded-t-2xl">
                <CardTitle className="text-green-700 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  اعتماد التعديل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      المؤشر:
                    </span>
                    <span className="font-bold text-blue-700">
                      {selectedChange.indicatorName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      الفلتر:
                    </span>
                    <span className="font-bold text-indigo-700">
                      {selectedChange.filterName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      التغيير:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-bold">
                        {selectedChange.oldValue}
                      </span>
                      <span className="text-gray-500">←</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-bold">
                        {selectedChange.newValue}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    تعليق الاعتماد
                  </label>
                  <Textarea
                    placeholder="أضف تعليق على قرار الاعتماد (اختياري)..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="bg-linear-to-r from-white to-green-50 border-2 border-green-300 focus:border-green-500 text-gray-900 placeholder:text-green-400 min-h-[120px] rounded-xl"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApprovalDialog(false);
                      setSelectedChange(null);
                      setApprovalComment("");
                    }}
                    className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 rounded-xl px-6 py-3"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => handleApproveChange(selectedChange, false)}
                    className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    رفض
                  </Button>
                  <Button
                    onClick={() => handleApproveChange(selectedChange, true)}
                    className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
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
