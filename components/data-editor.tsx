"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Edit2,
  Save,
  X,
  RotateCcw,
  AlertTriangle,
  Loader2,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthService } from "@/lib/backend-service";
import type { DataEdit } from "@/lib/storage";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface AuditHistory {
  id: string;
  projectId: string;
  indicatorName: string;
  filterName: string;
  year: number;
  month: number | null;
  quarter: number | null;
  oldValue: number;
  newValue: number;
  changeType: string;
  changedBy: string | null;
  changedAt: string;
  comment: string;
  tableNumber: string;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  isMigratedToProduction: boolean;
  migratedAt: string | null;
}

interface DataEditorProps {
  indicatorId: string;
  indicatorName: string;
  data: Array<{ year: number; value: number; filterName: string; id?: string }>;
  onSaveEdits: (edits: DataEdit[]) => void;
  onCancel: () => void;
  existingEdits: DataEdit[];
  projectId?: string;
}

export function DataEditor({
  indicatorId,
  indicatorName,
  data,
  onSaveEdits,
  onCancel,
  existingEdits,
  projectId,
}: DataEditorProps) {
  const { toast } = useToast();
  const [editedValues, setEditedValues] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    existingEdits.forEach((edit) => {
      const key = `${edit.filterName}-${edit.year}`;
      map.set(key, edit.newValue);
    });
    return map;
  });

  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [comment, setComment] = useState("");
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<DataEdit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearInputs, setYearInputs] = useState<Map<string, string>>(new Map());
  const [auditHistory, setAuditHistory] = useState<AuditHistory[]>([]);
  const [loadingAuditHistory, setLoadingAuditHistory] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditItem, setSelectedAuditItem] = useState<{
    filterName: string;
    year: number;
  } | null>(null);

  // Group data by filter
  const groupedByFilter = data.reduce((acc, item) => {
    if (!acc[item.filterName]) {
      acc[item.filterName] = [];
    }
    acc[item.filterName].push(item);
    return acc;
  }, {} as Record<string, typeof data>);

  // Debug: Check for duplicate IDs
  console.log("🚀 ~ DataEditor ~ data:", data);
  console.log("🔍 ~ DataEditor ~ Checking for duplicate IDs:");
  const idCounts = data.reduce((acc, item) => {
    const id = item.id || "undefined";
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log("📊 ~ DataEditor ~ ID frequency:", idCounts);

  // Show entries with duplicate IDs
  const duplicateIds = Object.entries(idCounts).filter(
    ([id, count]) => count > 1
  );
  if (duplicateIds.length > 0) {
    console.warn("⚠️ ~ DataEditor ~ Found duplicate IDs:", duplicateIds);
    duplicateIds.forEach(([duplicateId]) => {
      const entriesWithSameId = data.filter((d) => d.id === duplicateId);
      console.warn(`🔄 Entries with ID ${duplicateId}:`, entriesWithSameId);
    });
  }

  const allYears = (() => {
    if (data.length === 0) return [];
    const years = data.map((item) => item.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const fullYearRange: number[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      fullYearRange.push(year);
    }
    return fullYearRange.sort((a, b) => a - b);
  })();

  const allFilterNames = Array.from(
    new Set(data.map((item) => item.filterName))
  );

  const filledGroupedByFilter = Object.entries(groupedByFilter).reduce(
    (acc, [filterName, items]) => {
      if (allYears.length === 0) {
        acc[filterName] = items;
        return acc;
      }

      // Create full range using global years
      const fullYears: typeof data = [];
      for (const year of allYears) {
        const existingItem = items.find((item) => item.year === year);
        if (existingItem) {
          fullYears.push(existingItem);
        } else {
          // Add missing year with null value
          fullYears.push({
            year,
            value: 0, // Use 0 as placeholder for missing data
            filterName,
          });
        }
      }

      acc[filterName] = fullYears;
      return acc;
    },
    {} as Record<string, typeof data>
  );

  const startEdit = (
    filterName: string,
    year: number,
    currentValue: number
  ) => {
    const key = `${filterName}-${year}`;
    const editedValue = editedValues.get(key);
    setEditingCell(key);
    setTempValue(
      String(editedValue !== undefined ? editedValue : currentValue)
    );
  };

  const saveEdit = (
    item: any,
    filterName: string,
    year: number,
    originalValue: number
  ) => {
    const key = `${filterName}-${year}`;
    const newValue = Number.parseFloat(tempValue);
    if (isNaN(newValue)) {
      alert("يرجى إدخال قيمة رقمية صحيحة");
      return;
    }

    if (newValue === originalValue) {
      // No change, remove edit if exists
      const newEdits = new Map(editedValues);
      newEdits.delete(key);
      setEditedValues(newEdits);
    } else {
      const newEdits = new Map(editedValues);
      // Round to integer to match API expectations
      newEdits.set(key, newValue);
      setEditedValues(newEdits);
    }

    setEditingCell(null);
    setTempValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setTempValue("");
  };

  const resetValue = (filterName: string, year: number) => {
    const key = `${filterName}-${year}`;
    const newEdits = new Map(editedValues);
    newEdits.delete(key);
    setEditedValues(newEdits);
  };

  const handleSave = () => {
    const edits: DataEdit[] = [];

    editedValues.forEach((newValue, key) => {
      const [filterName, yearStr] = key.split("-");
      const year = Number.parseInt(yearStr);
      const originalItem = data.find(
        (d) => d.filterName === filterName && d.year === year
      );
      const originalValue = originalItem?.value ?? 0;

      if (originalValue !== newValue) {
        edits.push({
          projectId: projectId || "",
          indicatorName,
          filterName,
          year,
          oldValue: originalValue,
          newValue,
          timestamp: Date.now(),
        });
      }
    });

    if (edits.length > 0) {
      // Accumulate edits instead of replacing them
      const existingEdits = pendingEdits.filter((edit) => {
        // Remove any existing edit for the same filter and year to avoid duplicates
        return !edits.some(
          (newEdit) =>
            newEdit.filterName === edit.filterName && newEdit.year === edit.year
        );
      });

      setPendingEdits([...existingEdits, ...edits]);
      setShowMetadataDialog(true);
    }
  };

  const submitDataChange = async (edit: DataEdit[]) => {
    const token = AuthService.getTokenFromSession();
    if (!token) {
      throw new Error("غير مسجل دخول");
    }

    // Ensure newValue is integer and format according to API schema
    const requestBody = edit.map((item) => {
      // Find the specific data entry to get its ID
      const dataEntry = data.find(
        (d) => d.year === item.year && d.filterName === item.filterName
      );

      // Check for potential duplicate IDs
      const allMatchingEntries = data.filter(
        (d) => d.filterName === item.filterName
      );

      return {
        id: dataEntry?.id, // Include the specific data entry ID
        projectId: item.projectId,
        indicatorId: indicatorId, // Use the actual indicatorId prop
        indicatorName: item.indicatorName,
        filterName: item.filterName,
        year: item.year,
        month: item.month || 0,
        quarter: item.quarter || 0,
        oldValue: item.oldValue,
        newValue: item.newValue,
        comment: item.comment || "",
        tableNumber: item.tableNumber || "",
      };
    });

    console.log("🚀 ~ submitDataChange ~ requestBody:", requestBody);

    const response = await fetch(`${API_BASE_URL}/Audit/data-changes`, {
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

    return response;
  };

  const fetchAuditHistory = async () => {
    if (!projectId) return;
    console.log("Data:", data);
    setLoadingAuditHistory(true);
    try {
      const token = AuthService.getTokenFromSession();
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/Audit/projects/${projectId}/changes`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const history: AuditHistory[] = await response.json();
        setAuditHistory(history);
      }
    } catch (error) {
      console.error("Error fetching audit history:", error);
    } finally {
      setLoadingAuditHistory(false);
    }
  };

  // Fetch audit history on component mount
  useEffect(() => {
    fetchAuditHistory();
  }, [projectId]);

  // Helper function to get audit history for a specific year and filter
  const getAuditHistoryForItem = (filterName: string, year: number) => {
    return auditHistory.filter(
      (item) =>
        item.indicatorName === indicatorName &&
        item.filterName === filterName &&
        item.year === year
    );
  };

  // Helper function to check if an item has audit history
  const hasAuditHistory = (filterName: string, year: number) => {
    return getAuditHistoryForItem(filterName, year).length > 0;
  };

  // Helper function to get the latest audit value
  const getLatestAuditValue = (filterName: string, year: number) => {
    const history = getAuditHistoryForItem(filterName, year);
    if (history.length === 0) return null;

    // Sort by changedAt date and get the most recent one
    const latest = history.sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    )[0];
    return latest.newValue;
  };

  // Function to open audit history modal
  const openAuditModal = (filterName: string, year: number) => {
    setSelectedAuditItem({ filterName, year });
    setShowAuditModal(true);
  };

  const handleSaveWithMetadata = async () => {
    if (!tableNumber.trim()) {
      alert("يرجى إدخال رقم الجدول");
      return;
    }

    if (!comment.trim()) {
      alert("يرجى إدخال تعليق على التعديل");
      return;
    }

    setIsSubmitting(true);

    try {
      const editsWithMetadata = pendingEdits.map((edit) => ({
        ...edit,
        tableNumber: tableNumber.trim(),
        comment: comment.trim(),
      }));
      console.log(
        "🚀 ~ handleSaveWithMetadata ~ editsWithMetadata:",
        editsWithMetadata
      );

      await submitDataChange(editsWithMetadata);

      setShowMetadataDialog(false);
      // Show success toast
      toast({
        title: "تم حفظ التعديلات بنجاح",
        description: "تم نقل البيانات إلى مرحلة طلب تغيير البيانات",
        variant: "success",
      });

      // Call original handler for local state
      onSaveEdits(editsWithMetadata);

      // Clear edited values to mark them as no longer having missing values
      setEditedValues(new Map());

      setShowMetadataDialog(false);
      setTableNumber("");
      setComment("");
      setPendingEdits([]);
    } catch (error) {
      console.error("Error submitting data changes:", error);

      toast({
        title: "حدث خطأ في النظام",
        description: "يرجى الاتصال بمسؤولي النظام",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValue = (
    filterName: string,
    year: number,
    originalValue: number
  ): number => {
    const key = `${filterName}-${year}`;
    return editedValues.get(key) ?? originalValue;
  };

  const isEdited = (filterName: string, year: number): boolean => {
    const key = `${filterName}-${year}`;
    return editedValues.has(key);
  };

  const totalEdits = editedValues.size;

  const handleYearInputChange = (filterName: string, value: string) => {
    const newInputs = new Map(yearInputs);
    newInputs.set(filterName, value);
    setYearInputs(newInputs);
  };

  const applyYearInputs = () => {
    if (!selectedYear) return;

    let appliedCount = 0;
    const newEdits = new Map(editedValues);

    yearInputs.forEach((value, filterName) => {
      if (value.trim() === "") return;

      const numValue = Number.parseFloat(value);
      if (isNaN(numValue)) return;

      // Find original item OR use 0 for missing years
      const originalItem = data.find(
        (d) => d.filterName === filterName && d.year === selectedYear
      );
      const originalValue = originalItem?.value ?? 0;

      const key = `${filterName}-${selectedYear}`;
      newEdits.set(key, numValue);
      appliedCount++;
    });

    if (appliedCount > 0) {
      setEditedValues(newEdits);
      setYearInputs(new Map());
      alert(`تم تطبيق ${appliedCount} تعديل للسنة ${selectedYear}`);
    }
  };

  const clearYearInputs = () => {
    setYearInputs(new Map());
  };

  return (
    <>
      <Card className="bg-linear-to-br from-white to-gray-50 border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-gray-100 pb-6">
          <div className="flex items-center pt-8 justify-between">
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={totalEdits === 0}
                className="bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ التعديلات
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                className="bg-linear-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
            </div>

            <div className="text-right">
              <CardTitle className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                تعديل البيانات: {indicatorName}
              </CardTitle>
              {totalEdits > 0 && (
                <Badge className="mt-2 bg-linear-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-md">
                  {totalEdits} تعديل معلق
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* Quick Year Input Panel - Takes 1/4 of space */}
            <div className="w-1/4 shrink-0">
              <Card className="bg-linear-to-br from-blue-50 to-purple-50 border border-blue-200 shadow-lg sticky top-4">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold bg-linear-to-r from-blue-600 to-purple-700 bg-clip-text text-transparent">
                    إدخال سريع حسب السنة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-blue-700 text-sm mb-2 block font-medium">
                      اختر السنة
                    </label>
                    <Select
                      value={selectedYear?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedYear(Number.parseInt(value));
                        setYearInputs(new Map());
                      }}
                    >
                      <SelectTrigger className="bg-white border-blue-300 text-blue-900 hover:border-blue-400 focus:ring-2 focus:ring-blue-200 shadow-sm">
                        <SelectValue placeholder="اختر سنة..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedYear && (
                    <>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {allFilterNames.map((filterName) => {
                          const originalItem = data.find(
                            (d) =>
                              d.filterName === filterName &&
                              d.year === selectedYear
                          );
                          const currentValue = originalItem?.value ?? 0;
                          const key = `${filterName}-${selectedYear}`;
                          const isAlreadyEdited = editedValues.has(key);
                          const isMissing =
                            currentValue === 0 || currentValue === null;

                          return (
                            <div key={filterName} className="space-y-2">
                              <label
                                className="text-emerald-700 text-sm truncate flex items-center gap-2 font-medium"
                                title={filterName}
                              >
                                <span className="truncate">{filterName}</span>
                                {isMissing && !isAlreadyEdited && (
                                  <Badge className="text-xs bg-red-100 border-red-300 text-red-700">
                                    ناقص
                                  </Badge>
                                )}
                                {hasAuditHistory(filterName, selectedYear) && (
                                  <button
                                    onClick={() =>
                                      openAuditModal(filterName, selectedYear)
                                    }
                                    className="text-blue-500 hover:text-blue-600 transition-colors"
                                    title="عرض تاريخ التعديلات"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                )}
                              </label>
                              <Input
                                type="number"
                                placeholder={
                                  isMissing &&
                                  hasAuditHistory(filterName, selectedYear)
                                    ? getLatestAuditValue(
                                        filterName,
                                        selectedYear
                                      )?.toString() || "أدخل قيمة..."
                                    : isMissing
                                    ? "أدخل قيمة..."
                                    : currentValue.toString()
                                }
                                value={yearInputs.get(filterName) || ""}
                                onChange={(e) =>
                                  handleYearInputChange(
                                    filterName,
                                    e.target.value
                                  )
                                }
                                className={`h-9 text-sm bg-white border-emerald-300 text-emerald-900 placeholder:text-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200 shadow-sm ${
                                  isAlreadyEdited
                                    ? "border-yellow-400 focus:border-yellow-500 focus:ring-yellow-200"
                                    : isMissing
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                                    : ""
                                }`}
                              />
                              {isAlreadyEdited && (
                                <Badge className="text-xs bg-yellow-100 border-yellow-300 text-yellow-700">
                                  معدّل مسبقاً
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-emerald-200">
                        <Button
                          onClick={applyYearInputs}
                          size="sm"
                          className="flex-1 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          تطبيق
                        </Button>
                        <Button
                          onClick={clearYearInputs}
                          size="sm"
                          variant="outline"
                          className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          مسح
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Data Grid - Takes 3/4 of space */}
            <div className="flex-1">
              <div className="space-y-6">
                {Object.entries(filledGroupedByFilter).map(
                  ([filterName, items]) => {
                    const sortedItems = [...items].sort(
                      (a, b) => a.year - b.year
                    );

                    return (
                      <div key={filterName} className="space-y-3">
                        <div className="flex justify-end text-right items-center gap-3">
                          <h4 className="text-xl font-bold bg-linear-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                            {filterName}
                          </h4>
                          <div className="w-1 h-6 bg-linear-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {sortedItems.map((item) => {
                            const key = `${filterName}-${item.year}`;
                            const currentValue = getValue(
                              filterName,
                              item.year,
                              item.value
                            );
                            const edited = isEdited(filterName, item.year);
                            const isEditing = editingCell === key;
                            const isMissingYear =
                              item.value === 0 || item.value === null;

                            return (
                              <div
                                key={key}
                                className={`p-4 rounded-xl border transition-all duration-200 shadow-md hover:shadow-lg ${
                                  edited
                                    ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300 shadow-yellow-200/50" //بيانات معدلة
                                    : isMissingYear &&
                                      hasAuditHistory(filterName, item.year) //بيانات في إنتظار الفحص
                                    ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 shadow-orange-200/50"
                                    : !isMissingYear &&
                                      !hasAuditHistory(filterName, item.year) //بيانات صحيحة
                                    ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400 shadow-blue-200/50"
                                    : isMissingYear &&
                                      !hasAuditHistory(filterName, item.year) //بيانات ناقصة
                                    ? "bg-gradient-to-br from-red-50 to-red-100 border-red-300 shadow-red-200/50"
                                    : "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-lg font-bold
                                      ${
                                        edited
                                          ? "text-yellow-800" //بيانات معدلة
                                          : isMissingYear &&
                                            hasAuditHistory(
                                              filterName,
                                              item.year
                                            ) //بيانات في إنتظار الفحص
                                          ? "text-orange-800"
                                          : !isMissingYear &&
                                            !hasAuditHistory(
                                              filterName,
                                              item.year
                                            ) //بيانات صحيحة
                                          ? "text-blue-800"
                                          : isMissingYear &&
                                            !hasAuditHistory(
                                              filterName,
                                              item.year
                                            ) //بيانات ناقصة
                                          ? "text-red-800"
                                          : "text-blue-800"
                                      }`}
                                    >
                                      {item.year}
                                    </span>
                                    {hasAuditHistory(filterName, item.year) && (
                                      <button
                                        onClick={() =>
                                          openAuditModal(filterName, item.year)
                                        }
                                        className="text-blue-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-all duration-200"
                                        title="عرض تاريخ التعديلات"
                                      >
                                        <History className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  {edited && (
                                    <button
                                      onClick={() =>
                                        resetValue(filterName, item.year)
                                      }
                                      className="text-blue-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-all duration-200"
                                      title="إعادة تعيين"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>

                                {isEditing ? (
                                  <div className="space-y-3">
                                    <Input
                                      type="number"
                                      value={tempValue}
                                      onChange={(e) =>
                                        setTempValue(e.target.value)
                                      }
                                      className="h-9 text-sm bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          saveEdit(
                                            item,
                                            filterName,
                                            item.year,
                                            item.value
                                          );
                                        } else if (e.key === "Escape") {
                                          cancelEdit();
                                        }
                                      }}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          saveEdit(
                                            item,
                                            filterName,
                                            item.year,
                                            item.value
                                          )
                                        }
                                        className="h-8 text-sm bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 flex-1 shadow-md"
                                      >
                                        <Save className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={cancelEdit}
                                        variant="outline"
                                        className="h-8 text-sm bg-linear-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 border border-gray-300 flex-1 shadow-sm"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      {isMissingYear &&
                                      !edited &&
                                      !hasAuditHistory(
                                        filterName,
                                        item.year
                                      ) ? (
                                        <p className="text-sm text-red-600 italic font-medium">
                                          بيانات ناقصة
                                        </p>
                                      ) : (
                                        <>
                                          <p
                                            className={`text-lg font-bold
                                      ${
                                        edited
                                          ? "text-yellow-800" //بيانات معدلة
                                          : isMissingYear &&
                                            hasAuditHistory(
                                              filterName,
                                              item.year
                                            ) //بيانات في إنتظار الفحص
                                          ? "text-orange-800"
                                          : !isMissingYear &&
                                            !hasAuditHistory(
                                              filterName,
                                              item.year
                                            ) //بيانات صحيحة
                                          ? "text-blue-800"
                                          : isMissingYear &&
                                            !hasAuditHistory(
                                              filterName,
                                              item.year
                                            ) //بيانات ناقصة
                                          ? "text-red-800"
                                          : "text-blue-800"
                                      }`}
                                          >
                                            {edited
                                              ? currentValue.toLocaleString(
                                                  "en-US"
                                                )
                                              : hasAuditHistory(
                                                  filterName,
                                                  item.year
                                                ) && isMissingYear
                                              ? getLatestAuditValue(
                                                  filterName,
                                                  item.year
                                                )?.toLocaleString("en-US")
                                              : currentValue.toLocaleString(
                                                  "en-US"
                                                )}
                                          </p>
                                          {edited && (
                                            <p className="text-sm text-gray-500 line-through">
                                              {hasAuditHistory(
                                                filterName,
                                                item.year
                                              ) && item.value === 0
                                                ? getLatestAuditValue(
                                                    filterName,
                                                    item.year
                                                  )?.toLocaleString("en-US")
                                                : item.value.toLocaleString(
                                                    "en-US"
                                                  )}
                                            </p>
                                          )}
                                          {hasAuditHistory(
                                            filterName,
                                            item.year
                                          ) &&
                                            isMissingYear &&
                                            !edited && (
                                              <Badge className="mt-1 bg-orange-100 border-orange-300 text-orange-700">
                                                في إنتظار الفحص
                                              </Badge>
                                            )}
                                        </>
                                      )}
                                    </div>
                                    <button
                                      onClick={() =>
                                        startEdit(
                                          filterName,
                                          item.year,
                                          item.value
                                        )
                                      }
                                      className="text-blue-600 hover:text-blue-700 p-2 rounded-full hover:bg-blue-100 transition-all duration-200 shrink-0"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {totalEdits > 0 && (
                <div className="mt-6 p-5 bg-linear-to-r from-yellow-50 to-amber-50 border border-yellow-300 rounded-xl shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-r from-yellow-500 to-amber-500 flex items-center justify-center shadow-md">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-yellow-800 text-lg font-bold mb-2">
                        معلومات التعديلات
                      </p>
                      <p className="text-yellow-700 text-sm leading-relaxed">
                        لديك {totalEdits} تعديل معلق. اضغط "حفظ التعديلات"
                        لتطبيق التغييرات وتحديث الرسم البياني.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit History Modal */}
      {showAuditModal && selectedAuditItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <Card
            className="
      w-full max-w-2xl max-h-[80vh] 
      border border-blue-800/40 
      bg-linear-to-br from-blue-950 to-blue-900/90
      shadow-2xl shadow-blue-900/40 
      rounded-xl animate-scale-in
    "
          >
            <CardHeader>
              <CardTitle className="text-blue-100 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-300" />
                تاريخ التعديلات - {selectedAuditItem.filterName} (
                {selectedAuditItem.year})
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {getAuditHistoryForItem(
                  selectedAuditItem.filterName,
                  selectedAuditItem.year
                ).length === 0 ? (
                  <div className="text-center py-10 opacity-80">
                    <History className="w-14 h-14 text-blue-400 mx-auto mb-3" />
                    <p className="text-blue-300 text-lg">
                      لا توجد تعديلات مسجلة
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getAuditHistoryForItem(
                      selectedAuditItem.filterName,
                      selectedAuditItem.year
                    )
                      .sort(
                        (a, b) =>
                          new Date(b.changedAt).getTime() -
                          new Date(a.changedAt).getTime()
                      )
                      .map((audit, index) => (
                        <div
                          key={audit.id}
                          className="
                    p-4 
                    bg-blue-900/40 
                    border border-blue-800/40 
                    rounded-lg 
                    shadow-md shadow-blue-950/30 
                    hover:bg-blue-900/50 
                    transition-all
                  "
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-700/20 text-blue-200 border border-blue-600/40">
                                تعديل #
                                {getAuditHistoryForItem(
                                  selectedAuditItem.filterName,
                                  selectedAuditItem.year
                                ).length - index}
                              </Badge>

                              {audit.isApproved && (
                                <Badge className="bg-green-700/20 text-green-300 border border-green-600/40">
                                  معتمد
                                </Badge>
                              )}

                              {audit.isMigratedToProduction && (
                                <Badge className="bg-purple-700/20 text-purple-300 border border-purple-600/40">
                                  في الإنتاج
                                </Badge>
                              )}
                            </div>

                            <span className="text-blue-400 text-sm">
                              {new Date(audit.changedAt).toLocaleString(
                                "ar-EG",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-blue-400 text-sm mb-1">
                                القيمة القديمة
                              </p>
                              <p className="text-blue-100 font-mono text-lg">
                                {audit.oldValue.toLocaleString("en-US")}
                              </p>
                            </div>

                            <div>
                              <p className="text-blue-400 text-sm mb-1">
                                القيمة الجديدة
                              </p>
                              <p className="text-green-300 font-mono text-lg font-semibold">
                                {audit.newValue.toLocaleString("en-US")}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-blue-400 text-sm mb-1">
                                رقم الجدول
                              </p>
                              <p className="text-blue-200">
                                {audit.tableNumber || "غير محدد"}
                              </p>
                            </div>

                            <div>
                              <p className="text-blue-400 text-sm mb-1">
                                نوع التغيير
                              </p>
                              <p className="text-blue-200">
                                {audit.changeType || "تعديل يدوي"}
                              </p>
                            </div>
                          </div>

                          {audit.comment && (
                            <div className="mb-3">
                              <p className="text-blue-400 text-sm mb-1">
                                التعليق
                              </p>
                              <p className="text-blue-200 bg-blue-900/50 p-2 rounded border border-blue-800/30">
                                {audit.comment}
                              </p>
                            </div>
                          )}

                          {audit.approvedBy && (
                            <div className="text-sm text-blue-400">
                              <p>تم الاعتماد بواسطة: {audit.approvedBy}</p>
                              <p>
                                تاريخ الاعتماد:{" "}
                                {new Date(audit.approvedAt!).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-blue-800/40 ">
                <Button
                  onClick={() => {
                    setShowAuditModal(false);
                    setSelectedAuditItem(null);
                  }}
                  variant="outline"
                  className="border-blue-700/40 text-blue-300 hover:bg-blue-900/20"
                >
                  إغلاق
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showMetadataDialog && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Only close if clicking on the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              setShowMetadataDialog(false);
              setTableNumber("");
              setComment("");
              setPendingEdits([]);
            }
          }}
        >
          <Card
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-[#F4F4F4]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMetadataDialog(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
                معلومات التعديل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-blue-300 text-sm mb-2 block">
                  رقم الجدول <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="مثال: جدول 3.2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="bg-[#053964]/50 border-blue-700/40 text-white placeholder:text-white/70 focus:border-[#0986ED] focus:ring-2 focus:ring-[#0986ED]/30 focus:outline-none transition-all duration-200 backdrop-blur-sm"
                  required
                />
              </div>
              <div>
                <label className="text-blue-300 text-sm mb-2 block">
                  تعليق على التعديل <span className="text-red-400">*</span>
                </label>
                <Textarea
                  placeholder="اكتب سبب التعديل أو أي ملاحظات..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-[#053964]/50 border-blue-700/40 text-white min-h-[100px] placeholder:text-white/70 focus:border-[#0986ED] focus:ring-2 focus:ring-[#0986ED]/30 focus:outline-none transition-all duration-200 backdrop-blur-sm"
                  required
                />
              </div>

              <div className="flex gap-2 justify-start pt-4">
                <Button
                  onClick={handleSaveWithMetadata}
                  disabled={isSubmitting}
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
                      حفظ التعديلات
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowMetadataDialog(false);
                    setTableNumber("");
                    setComment("");
                    setPendingEdits([]);
                  }}
                  className="border-blue-700/50 text-blue-300 hover:text-white hover:bg-blue-700/20 hover:border-blue-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                >
                  <X className="w-4 h-4 ml-2" />
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
