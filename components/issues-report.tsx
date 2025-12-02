"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit2,
  Save,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthService } from "@/lib/backend-service";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface RejectedChange {
  id?: string;
  projectId: string;
  indicatorId: string;
  comment: string;
  indicatorName: string;
  filterName: string;
  year: number;
  month: number;
  quarter: number;
  oldValue: number;
  rejectedValue: number;
  publicationName: string;
  rejectedByName: string;
  rejectedAt: string | null;
}

interface RejectedChangesResponse {
  data: RejectedChange[];
  page: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface IssuesReportProps {}

export default function IssuesReport({}: IssuesReportProps) {
  const { toast } = useToast();

  // State for rejected changes data
  const [rejectedChanges, setRejectedChanges] = useState<RejectedChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [publicationFilter, setPublicationFilter] =
    useState("all-publications");
  const [indicatorFilter, setIndicatorFilter] = useState("all-indicators");
  const [filterNameFilter, setFilterNameFilter] = useState("all-filters");

  // Unique values for filter dropdowns
  const [uniquePublications, setUniquePublications] = useState<string[]>([]);
  const [uniqueIndicators, setUniqueIndicators] = useState<string[]>([]);
  const [uniqueFilterNames, setUniqueFilterNames] = useState<string[]>([]);

  // Edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<
    Record<string, { newValue: number; comment: string }>
  >({});

  // Saved changes state - stores changes ready to be applied
  const [savedChanges, setSavedChanges] = useState<
    Record<
      string,
      { change: RejectedChange; newValue: number; comment: string }
    >
  >({});

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedChange, setSelectedChange] = useState<RejectedChange | null>(
    null
  );
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch rejected changes
  const fetchRejectedChanges = async () => {
    setLoading(true);
    try {
      const token = AuthService.getTokenFromSession();
      if (!token) {
        toast({
          title: "خطأ في المصادقة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "error",
        });
        return;
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (publicationFilter && publicationFilter !== "all-publications")
        queryParams.append("publicationName", publicationFilter);
      if (indicatorFilter && indicatorFilter !== "all-indicators")
        queryParams.append("indicatorName", indicatorFilter);
      if (filterNameFilter && filterNameFilter !== "all-filters")
        queryParams.append("filterName", filterNameFilter);

      const response = await fetch(
        `${API_BASE_URL}/Audit/changes/rejected-changes?${queryParams}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data: RejectedChangesResponse = await response.json();
        setRejectedChanges(data.data);
        setTotalRecords(data.page.totalRecords);
        setTotalPages(data.page.totalPages);

        // Extract unique values for filters
        const publications = [
          ...new Set(data.data.map((item) => item.publicationName)),
        ];
        const indicators = [
          ...new Set(data.data.map((item) => item.indicatorName)),
        ];
        const filterNames = [
          ...new Set(data.data.map((item) => item.filterName)),
        ];

        setUniquePublications(publications);
        setUniqueIndicators(indicators);
        setUniqueFilterNames(filterNames);
      } else {
        toast({
          title: "خطأ في تحميل البيانات",
          description: "فشل في تحميل التغييرات المرفوضة",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching rejected changes:", error);
      toast({
        title: "خطأ في النظام",
        description: "حدث خطأ أثناء تحميل البيانات",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchRejectedChanges();
  }, [page, pageSize, publicationFilter, indicatorFilter, filterNameFilter]);

  // Handle edit start
  const startEdit = (change: RejectedChange) => {
    const key = `${change.indicatorId}-${change.year}-${change.filterName}`;
    setEditingRow(key);
    setEditValues((prev) => ({
      ...prev,
      [key]: {
        newValue: change.rejectedValue,
        comment: change.comment,
      },
    }));
  };

  // Handle edit cancel
  const cancelEdit = () => {
    setEditingRow(null);
  };

  // Handle save click - opens modal for comment input
  const handleSaveClick = (change: RejectedChange) => {
    const key = `${change.indicatorId}-${change.year}-${change.filterName}`;
    const editData = editValues[key];

    // Check if there are actual changes for this specific row
    if (!editData || editData.newValue === change.rejectedValue) {
      toast({
        title: "لا توجد تعديلات",
        description:
          "يرجى تعديل القيمة أولاً أو التأكد من أن القيمة مختلفة عن القيمة الأصلية",
        variant: "error",
      });
      return;
    }

    // Set the specific change being saved and open modal
    setSelectedChange(change);
    setNewComment("");
    setShowSaveModal(true);
  };

  // Handle save submission - shows modal for adding comment to all saved changes
  const handleSaveSubmit = () => {
    const savedChangesList = Object.values(savedChanges);

    if (savedChangesList.length === 0) {
      toast({
        title: "لا توجد تعديلات",
        description: "لا توجد تعديلات محفوظة للحفظ",
        variant: "error",
      });
      return;
    }

    setSelectedChange(null); // Clear single change selection for batch mode
    setNewComment("");
    setShowSaveModal(true);
  };

  // Handle modal submission - handles both single row saves and batch updates
  const handleModalSubmit = () => {
    if (!newComment.trim()) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى إدخال التعليق",
        variant: "error",
      });
      return;
    }

    if (selectedChange) {
      // Single row mode - save individual change
      const key = `${selectedChange.indicatorId}-${selectedChange.year}-${selectedChange.filterName}`;
      const editData = editValues[key];

      if (editData) {
        // Save change to local savedChanges state
        setSavedChanges((prev) => ({
          ...prev,
          [key]: {
            change: selectedChange,
            newValue: editData.newValue,
            comment: newComment.trim(),
          },
        }));

        // Remove from editValues
        const updatedEditValues = { ...editValues };
        delete updatedEditValues[key];
        setEditValues(updatedEditValues);
        setEditingRow(null);
      }
    } else {
      // Batch mode - update all saved changes with the new comment
      const updatedSavedChanges = { ...savedChanges };
      Object.keys(updatedSavedChanges).forEach((key) => {
        updatedSavedChanges[key] = {
          ...updatedSavedChanges[key],
          comment: newComment.trim(),
        };
      });

      setSavedChanges(updatedSavedChanges);

      toast({
        title: "تم تحديث التعليق",
        description: `تم تحديث التعليق لجميع التعديلات المحفوظة (${
          Object.keys(savedChanges).length
        })`,
        variant: "success",
      });
    }

    setShowSaveModal(false);
    setSelectedChange(null);
    setNewComment("");
  };

  // Handle input changes
  const handleInputChange = (
    key: string,
    field: "newValue" | "comment",
    value: string | number
  ) => {
    setEditValues((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  // Handle final submission to data-changes endpoint
  const handleFinalSubmit = async () => {
    const changedItems = rejectedChanges.filter((change) => {
      return (
        change.comment && change.comment.trim() !== "" && change.rejectedValue
      );
    });

    if (changedItems.length === 0) {
      toast({
        title: "لا توجد تعديلات",
        description: "لا توجد تعديلات محفوظة للإرسال",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare bulk update payload
      const bulkUpdatePayload = changedItems.map((change) => ({
        projectId: change.projectId,
        changeId: change.id,
        year: change.year,
        oldValue: change.oldValue,
        newValue: change.rejectedValue,
        indicatorName: change.indicatorName,
        filterName: change.filterName,
        comment: change.comment,
        IndicatorId: change.indicatorId,
      }));

      const response = await fetch(`${API_BASE_URL}/Audit/data-changes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AuthService.getTokenFromSession()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bulkUpdatePayload),
      });

      if (response.ok) {
        toast({
          title: "تم إرسال البيانات بنجاح",
          description: ``,
          variant: "success",
        });

        // Refresh data
        fetchRejectedChanges();
      } else {
        throw new Error("Failed to submit data");
      }
    } catch (error) {
      console.error("Error submitting changes:", error);
      toast({
        title: "خطأ في الإرسال",
        description: "حدث خطأ أثناء إرسال التغييرات",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply all saved changes to the API
  const handleApplyChanges = async () => {
    const savedChangesList = Object.values(savedChanges);

    if (savedChangesList.length === 0) {
      toast({
        title: "لا توجد تغييرات",
        description: "لا توجد تغييرات محفوظة للتطبيق",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare bulk update payload
      const bulkUpdatePayload = savedChangesList.map((savedChange) => ({
        projectId: savedChange.change.projectId,
        changeId: savedChange.change.id,
        year: savedChange.change.year,
        oldValue: savedChange.change.oldValue,
        newValue: savedChange.newValue,
        indicatorName: savedChange.change.indicatorName,
        filterName: savedChange.change.filterName,
        comment: savedChange.comment,
        indicatorId: savedChange.change.indicatorId,
        WasRejected: true,
      }));

      const response = await fetch(`${API_BASE_URL}/Audit/data-changes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AuthService.getTokenFromSession()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bulkUpdatePayload),
      });

      if (response.ok) {
        toast({
          title: "تم تطبيق التغييرات بنجاح",
          description: `تم إرسال ${savedChangesList.length} تعديل إلى الخادم`,
          variant: "success",
        });

        // Clear saved changes and refresh data
        setSavedChanges({});
        fetchRejectedChanges();
      } else {
        throw new Error("Failed to apply changes");
      }
    } catch (error) {
      console.error("Error applying changes:", error);
      toast({
        title: "خطأ في تطبيق التغييرات",
        description: "حدث خطأ أثناء إرسال التغييرات",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setPublicationFilter("all-publications");
    setIndicatorFilter("all-indicators");
    setFilterNameFilter("all-filters");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <Badge className="bg-blue-600/20 text-blue-300 border border-blue-500/40">
              {totalRecords} تغيير مرفوض
            </Badge>
            <span>التغييرات المرفوضة</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="border-[#0986ed]/30 bg-[#053964]/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white text-lg">الفلاتر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-blue-300 mb-2 block">المؤشر الفرعي</Label>
              <Select
                value={filterNameFilter}
                onValueChange={setFilterNameFilter}
              >
                <SelectTrigger
                  className="bg-[#053964]/50 border-blue-700/40 text-white"
                  dir="rtl"
                >
                  <SelectValue placeholder="اختر الفلتر..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all-filters">
                    جميع المؤشرات الفرعية
                  </SelectItem>
                  {uniqueFilterNames.map((filter) => (
                    <SelectItem key={filter} value={filter}>
                      {filter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-blue-300 mb-2 block">المؤشر الرئيسي</Label>
              <Select
                value={indicatorFilter}
                onValueChange={setIndicatorFilter}
              >
                <SelectTrigger
                  className="bg-[#053964]/50 border-blue-700/40 text-white"
                  dir="rtl"
                >
                  <SelectValue placeholder="اختر المؤشر..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all-indicators">
                    جميع المؤشرات الرئيسية
                  </SelectItem>
                  {uniqueIndicators.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-blue-300 mb-2 block">اسم النشرة</Label>
              <Select
                value={publicationFilter}
                onValueChange={setPublicationFilter}
              >
                <SelectTrigger
                  className="bg-[#053964]/50 border-blue-700/40 text-white"
                  dir="rtl"
                >
                  <SelectValue placeholder="اختر النشر..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all-publications">جميع النشرات</SelectItem>
                  {uniquePublications.map((pub) => (
                    <SelectItem key={pub} value={pub}>
                      {pub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={resetFilters}
              variant="outline"
              className="border-blue-700/50 text-blue-300 hover:text-white hover:bg-blue-700/20"
            >
              مسح الفلاتر
            </Button>

            {Object.keys(savedChanges).length > 0 && (
              <Button
                onClick={handleApplyChanges}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التطبيق...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    تطبيق التغييرات ({Object.keys(savedChanges).length})
                  </>
                )}
              </Button>
            )}

            {(Object.keys(editValues).length > 0 ||
              Object.keys(savedChanges).length > 0) && (
              <Button
                onClick={() => {
                  setEditValues({});
                  setEditingRow(null);
                  setSavedChanges({});
                }}
                variant="outline"
                className="text-white border-none bg-red-600 hover:bg-red-700 hover:text-white"
              >
                <X className="w-4 h-4 ml-2" />
                مسح جميع التعديلات والمحفوظات
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-[#0986ed]/30 bg-[#053964]/95 backdrop-blur">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="mr-2 text-blue-300">جاري تحميل البيانات...</span>
            </div>
          ) : rejectedChanges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-blue-300 text-lg">لا توجد تغييرات مرفوضة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-blue-800/40">
                  <TableHead className="text-blue-300">اسم النشرة</TableHead>
                  <TableHead className="text-blue-300">
                    المؤشر الرئيسي
                  </TableHead>
                  <TableHead className="text-blue-300">المؤشر الفرعي</TableHead>
                  <TableHead className="text-blue-300">السنة</TableHead>
                  <TableHead className="text-blue-300">الشهر</TableHead>
                  <TableHead className="text-blue-300">الربع</TableHead>
                  <TableHead className="text-blue-300">
                    القيمة القديمة
                  </TableHead>
                  <TableHead className="text-blue-300">
                    القيمة المرفوضة
                  </TableHead>
                  <TableHead className="text-blue-300">التعليق</TableHead>
                  <TableHead className="text-blue-300">رفض بواسطة</TableHead>
                  <TableHead className="text-blue-300 text-center">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedChanges.map((change, index) => {
                  const key = `${change.indicatorId}-${change.year}-${change.filterName}`;
                  const isEditing = editingRow === key;
                  const editData = editValues[key];
                  const isSaved = savedChanges[key];

                  return (
                    <TableRow
                      key={index}
                      className={`border-blue-800/30 hover:bg-blue-900/20 ${
                        isSaved ? "bg-green-900/20" : ""
                      }`}
                    >
                      <TableCell className="text-white">
                        {change.publicationName}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.indicatorName}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.filterName}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.year}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.month}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.quarter}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.oldValue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editData?.newValue || change.rejectedValue}
                            onChange={(e) =>
                              handleInputChange(
                                key,
                                "newValue",
                                Number(e.target.value)
                              )
                            }
                            className="w-24 h-8 bg-[#053964]/50 border-blue-700/40 text-white focus:border-[#0986ED] focus:ring-2 focus:ring-[#0986ED]/30 focus:outline-none"
                          />
                        ) : isSaved ? (
                          <span className="text-green-300 font-semibold">
                            {savedChanges[key].newValue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-yellow-300">
                            {change.rejectedValue.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-white max-w-[200px] truncate"
                        title={
                          isSaved ? savedChanges[key].comment : change.comment
                        }
                      >
                        {isSaved ? (
                          <span className="text-green-300">
                            {savedChanges[key].comment}
                          </span>
                        ) : (
                          change.comment
                        )}
                      </TableCell>
                      <TableCell className="text-white">
                        {change.rejectedByName || "غير محدد"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          {isSaved ? (
                            <span className="text-green-300 text-xs px-2 py-1 bg-green-900/20 rounded">
                              تم التعديل
                            </span>
                          ) : isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSaveClick(change)}
                                className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
                                title="حفظ"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                className="h-8 w-8 p-0 text-white border-none bg-red-600 hover:bg-red-700 hover:text-white"
                                title="إلغاء"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => startEdit(change)}
                              className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border-[#0986ed]/30 bg-[#053964]/95 backdrop-blur">
          <CardContent className="flex items-center justify-between p-4">
            <div className="text-blue-300">
              صفحة {page} من {totalPages} ({totalRecords} سجل)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="border-blue-700/50 text-blue-300 hover:text-white disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="border-blue-700/50 text-blue-300 hover:text-white disabled:opacity-50"
              >
                التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent
          className="border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-300" />
              {selectedChange
                ? "حفظ التعديل"
                : `حفظ جميع التعديلات (${Object.keys(savedChanges).length})`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedChange ? (
              // Single change mode - show details of the specific row being saved
              <div className="bg-blue-900/20 p-3 rounded border border-blue-700/40">
                <p className="text-blue-300 text-sm mb-2">تفاصيل التعديل:</p>
                <div className="text-blue-200 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>المؤشر الرئيسي:</span>
                    <span className="font-semibold">
                      {selectedChange.indicatorName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>المؤشر الفرعي:</span>
                    <span className="font-semibold">
                      {selectedChange.filterName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>السنة:</span>
                    <span className="font-semibold">{selectedChange.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>القيمة الحالية:</span>
                    <span className="font-semibold text-red-300">
                      {selectedChange.rejectedValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>القيمة الجديدة:</span>
                    <span className="font-semibold text-green-300">
                      {editValues[
                        `${selectedChange.indicatorId}-${selectedChange.year}-${selectedChange.filterName}`
                      ]?.newValue?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Batch mode for all saved changes
              <div className="bg-blue-900/20 p-3 rounded border border-blue-700/40">
                <p className="text-blue-300 text-sm mb-2">
                  سيتم تحديث التعليق لجميع التعديلات التالية:
                </p>
                <ul className="text-blue-200 text-sm space-y-1 max-h-32 overflow-y-auto">
                  {Object.values(savedChanges).map((savedChange, index) => (
                    <li key={index} className="flex justify-between">
                      <span>
                        {savedChange.change.indicatorName} -{" "}
                        {savedChange.change.filterName} (
                        {savedChange.change.year})
                      </span>
                      <span className="font-semibold text-green-300">
                        {savedChange.newValue.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Label className="text-blue-300 mb-2 block">
                تعليق جديد <span className="text-red-400">*</span>
              </Label>
              <Textarea
                placeholder="أدخل تعليق على التعديل الجديد..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-[#053964]/50 border-blue-700/40 text-white min-h-[100px] placeholder:text-white/70 focus:border-[#0986ED] focus:ring-2 focus:ring-[#0986ED]/30 focus:outline-none transition-all duration-200 backdrop-blur-sm"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setShowSaveModal(false)}
              className="border-blue-700/50 text-blue-300 hover:text-white hover:bg-blue-700/20 disabled:opacity-50"
            >
              <X className="w-4 h-4 ml-2" />
              إلغاء
            </Button>
            <Button
              onClick={handleModalSubmit}
              disabled={isSubmitting || !newComment.trim()}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التعديل
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
