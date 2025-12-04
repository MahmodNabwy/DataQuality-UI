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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <Card className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl  transition-all duration-300 rounded-2xl">
          <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-2xl py-4">
            <CardTitle className="flex items-center justify-between">
              <Badge className="bg-linear-to-r from-blue-500 to-indigo-600 text-white shadow-md px-4 py-2 text-lg">
                {totalRecords} تغيير مرفوض
              </Badge>
              <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                التغييرات المرفوضة
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <CardTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent flex justify-between py-4 items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"
                  />
                </svg>
              </div>
              فلاتر البحث والتصفية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  المؤشر الفرعي
                </Label>
                <Select
                  value={filterNameFilter}
                  onValueChange={setFilterNameFilter}
                >
                  <SelectTrigger
                    className="bg-linear-to-r from-white to-blue-50 border-2 border-blue-300 hover:border-blue-500 text-gray-800 h-12 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:ring-4 focus:ring-blue-200"
                    dir="rtl"
                  >
                    <SelectValue
                      placeholder="اختر المؤشر الفرعي..."
                      className="font-medium"
                    />
                  </SelectTrigger>
                  <SelectContent
                    dir="rtl"
                    className="rounded-xl shadow-xl border-2 border-blue-200"
                  >
                    <SelectItem
                      value="all-filters"
                      className="py-3 px-4 text-blue-600 font-medium"
                    >
                      جميع المؤشرات الفرعية
                    </SelectItem>
                    {uniqueFilterNames.map((filter) => (
                      <SelectItem
                        key={filter}
                        value={filter}
                        className="py-3 px-4 hover:bg-blue-50"
                      >
                        {filter}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  المؤشر الرئيسي
                </Label>
                <Select
                  value={indicatorFilter}
                  onValueChange={setIndicatorFilter}
                >
                  <SelectTrigger
                    className="bg-linear-to-r from-white to-blue-50 border-2 border-blue-300 hover:border-blue-500 text-gray-800 h-12 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:ring-4 focus:ring-blue-200"
                    dir="rtl"
                  >
                    <SelectValue
                      placeholder="اختر المؤشر الرئيسي..."
                      className="font-medium"
                    />
                  </SelectTrigger>
                  <SelectContent
                    dir="rtl"
                    className="rounded-xl shadow-xl border-2 border-blue-200"
                  >
                    <SelectItem
                      value="all-indicators"
                      className="py-3 px-4 text-blue-600 font-medium"
                    >
                      جميع المؤشرات الرئيسية
                    </SelectItem>
                    {uniqueIndicators.map((ind) => (
                      <SelectItem
                        key={ind}
                        value={ind}
                        className="py-3 px-4 hover:bg-blue-50"
                      >
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  اسم النشرة
                </Label>
                <Select
                  value={publicationFilter}
                  onValueChange={setPublicationFilter}
                >
                  <SelectTrigger
                    className="bg-linear-to-r from-white to-blue-50 border-2 border-blue-300 hover:border-blue-500 text-gray-800 h-12 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 focus:ring-4 focus:ring-blue-200"
                    dir="rtl"
                  >
                    <SelectValue
                      placeholder="اختر النشرة..."
                      className="font-medium"
                    />
                  </SelectTrigger>
                  <SelectContent
                    dir="rtl"
                    className="rounded-xl shadow-xl border-2 border-blue-200"
                  >
                    <SelectItem
                      value="all-publications"
                      className="py-3 px-4 text-blue-600 font-medium"
                    >
                      جميع النشرات
                    </SelectItem>
                    {uniquePublications.map((pub) => (
                      <SelectItem
                        key={pub}
                        value={pub}
                        className="py-3 px-4 hover:bg-blue-50"
                      >
                        {pub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-blue-200">
              <Button
                onClick={resetFilters}
                variant="outline"
                className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 rounded-xl px-6 py-3 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                مسح الفلاتر
              </Button>

              {Object.keys(savedChanges).length > 0 && (
                <Button
                  onClick={handleApplyChanges}
                  disabled={isSubmitting}
                  className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      جاري التطبيق...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 ml-2" />
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
                  className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <X className="w-5 h-5 ml-2" />
                  مسح جميع التعديلات والمحفوظات
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-linear-to-r from-blue-400 to-indigo-500 opacity-75 animate-ping"></div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-blue-700">
                    جاري تحميل البيانات
                  </h3>
                  <p className="text-blue-500">يرجى الانتظار...</p>
                </div>
              </div>
            ) : rejectedChanges.length === 0 ? (
              <div className="text-center py-16 space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-linear-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-blue-700">
                    لا توجد تغييرات مرفوضة
                  </h3>
                  <p className="text-blue-500 text-lg">
                    لم يتم العثور على أي تغييرات مرفوضة تطابق معايير البحث
                    الحالية
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-linear-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        اسم النشرة
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        المؤشر الرئيسي
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        المؤشر الفرعي
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        السنة
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        الشهر
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        الربع
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        القيمة القديمة
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        القيمة المرفوضة
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        التعليق
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
                        رفض بواسطة
                      </TableHead>
                      <TableHead className="text-blue-700 font-bold text-lg py-6 px-6 text-center">
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
                          className={`border-b-2 border-blue-100 hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 hover:shadow-md ${
                            isSaved
                              ? "bg-linear-to-r from-green-50 to-emerald-50 border-green-200"
                              : "bg-white"
                          }`}
                        >
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                {change.publicationName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="text-blue-600 font-bold">
                              {change.indicatorName}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="text-indigo-600 font-bold">
                              {change.filterName}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                                {change.year}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                {change.month}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                                {change.quarter}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              <span className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-lg font-bold border border-blue-200">
                                {change.oldValue.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6 px-6 text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={
                                    editData?.newValue !== undefined
                                      ? editData.newValue
                                      : change.rejectedValue
                                  }
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Handle empty string as 0 or parse as number
                                    const numValue =
                                      value === "" ? 0 : Number(value);
                                    handleInputChange(
                                      key,
                                      "newValue",
                                      numValue
                                    );
                                  }}
                                  onFocus={(e) => {
                                    // Select all text when input is focused for easy replacement
                                    e.target.select();
                                  }}
                                  className="w-40 bg-linear-to-r from-white to-blue-50 border-2 border-blue-400 text-gray-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 shadow-lg transition-all duration-200 rounded-lg text-center font-bold"
                                />
                              ) : isSaved ? (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-lg font-bold border-2 border-green-200 shadow-md">
                                  {savedChanges[key].newValue.toLocaleString()}
                                </span>
                              ) : (
                                <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-lg font-bold border-2 border-amber-200 shadow-md">
                                  {change.rejectedValue.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-gray-800 py-6 px-6 max-w-[200px] truncate font-semibold text-center border-r border-blue-100"
                            title={
                              isSaved
                                ? savedChanges[key].comment
                                : change.comment
                            }
                          >
                            <div className="flex items-center justify-center">
                              {isSaved ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold max-w-[150px] truncate">
                                  {savedChanges[key].comment}
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm max-w-[150px] truncate">
                                  {change.comment}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-800 py-6 px-6 font-semibold text-center border-r border-blue-100">
                            <div className="flex items-center justify-center">
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                {change.rejectedByName || "غير محدد"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-6 px-6">
                            <div className="flex gap-3 justify-center items-center">
                              {isSaved ? (
                                <Badge className="bg-linear-to-r from-green-500 to-emerald-600 text-white px-4 py-2 shadow-lg rounded-full text-sm font-bold">
                                  ✓ تم التعديل
                                </Badge>
                              ) : isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveClick(change)}
                                    className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4 py-2"
                                    title="حفظ"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4 py-2"
                                    title="إلغاء"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => startEdit(change)}
                                  className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-4 py-2"
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
            <CardContent className="flex items-center justify-between p-6">
              <div className="text-blue-600 font-medium text-lg">
                صفحة {page} من {totalPages} ({totalRecords} سجل)
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
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
            className="bg-linear-to-br from-white to-blue-50 border border-blue-200 shadow-2xl rounded-2xl max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Save className="w-5 h-5 text-white" />
                </div>
                {selectedChange
                  ? "حفظ التعديل"
                  : `حفظ جميع التعديلات (${Object.keys(savedChanges).length})`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {selectedChange ? (
                // Single change mode - show details of the specific row being saved
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <p className="text-blue-700 text-lg font-bold mb-4">
                    تفاصيل التعديل:
                  </p>
                  <div className="text-gray-700 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-medium">المؤشر الرئيسي:</span>
                      <span className="font-bold text-blue-600">
                        {selectedChange.indicatorName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-medium">المؤشر الفرعي:</span>
                      <span className="font-bold text-blue-600">
                        {selectedChange.filterName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-medium">السنة:</span>
                      <span className="font-bold text-blue-600">
                        {selectedChange.year}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-medium">القيمة الحالية:</span>
                      <span className="font-bold text-red-600">
                        {selectedChange.rejectedValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="font-medium">القيمة الجديدة:</span>
                      <span className="font-bold text-green-600">
                        {editValues[
                          `${selectedChange.indicatorId}-${selectedChange.year}-${selectedChange.filterName}`
                        ]?.newValue?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Batch mode for all saved changes
                <div className="bg-linear-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                  <p className="text-green-700 text-lg font-bold mb-4">
                    سيتم تحديث التعليق لجميع التعديلات التالية:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {Object.values(savedChanges).map((savedChange, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm"
                      >
                        <span className="font-medium text-gray-700">
                          {savedChange.change.indicatorName} -{" "}
                          {savedChange.change.filterName} (
                          {savedChange.change.year})
                        </span>
                        <span className="font-bold text-green-600">
                          {savedChange.newValue.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-blue-700 text-lg font-bold mb-3 block">
                  تعليق جديد <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="أدخل تعليق على التعديل الجديد..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-linear-to-r from-white to-blue-50 border-blue-300 text-gray-900 min-h-[120px] placeholder:text-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm transition-all duration-200"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-3 mt-6">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setShowSaveModal(false)}
                className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
              <Button
                onClick={handleModalSubmit}
                disabled={isSubmitting || !newComment.trim()}
                className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300"
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
    </div>
  );
}
