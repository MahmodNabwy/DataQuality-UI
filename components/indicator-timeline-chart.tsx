"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // ADDED
import {
  TrendingUp,
  TrendingDown,
  Edit2,
  Save,
  X,
  RotateCcw,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  formatNumber,
  formatNumberFull,
  formatYAxisValue,
  formatPeriodLabel,
  formatPeriodFullLabel,
  createPeriodKey,
} from "@/lib/format-utils";
import type { DataEdit } from "@/lib/storage";

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

interface TimelineChartProps {
  indicatorName: string;
  data: Array<{
    year: number;
    value: number;
    filterName: string;
    month?: number;
    quarter?: number;
  }>;
  anomalies: Array<{
    year: number;
    value: number;
    month?: number;
    quarter?: number;
    isOutlier: boolean;
    zScore: number;
  }>;
  issues: Array<any>;
  auditHistory?: AuditHistory[]; // Add audit history prop
  onDataEdit?: (edits: DataEdit[]) => void;
  onCollapse?: () => void;
  onIssueStatusChange?: (
    issueId: string,
    status: "resolved" | "dismissed",
    metadata?: { tableNumber?: string; comment?: string }
  ) => void;
}

function detectDataFrequency(
  data: Array<{ month?: number; quarter?: number }>
): "monthly" | "quarterly" | "yearly" {
  const hasMonths = data.some((d) => d.month);
  const hasQuarters = data.some((d) => d.quarter);
  return hasMonths ? "monthly" : hasQuarters ? "quarterly" : "yearly";
}

function calculateAdvancedStats(values: number[]) {
  if (values.length === 0) return null;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);
  const sortedValues = [...values].sort((a, b) => a - b);
  const median = sortedValues[Math.floor(sortedValues.length / 2)];

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const trend = denominator === 0 ? 0 : numerator / denominator;
  const volatility = (stdDev / mean) * 100;

  return {
    mean,
    stdDev,
    median,
    trend,
    volatility,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 border-red-500/20 text-red-400";
    case "warning":
      return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
    case "info":
      return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    default:
      return "bg-slate-500/10 border-slate-500/20";
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  const fullLabel = dataPoint
    ? formatPeriodFullLabel(dataPoint.year, dataPoint.month, dataPoint.quarter)
    : label;

  return (
    <div
      className="
        bg-blue-950/95 
        border border-blue-800/60 
        rounded-xl 
        p-4 
        shadow-xl 
        backdrop-blur 
        z-50
        overflow-x-auto
      "
      style={{ direction: "rtl" }}
    >
      {/* Title */}
      <p className="text-blue-100 text-sm font-semibold mb-3">{fullLabel}</p>

      {/* Data Items */}
      {payload.map((entry: any, index: number) => {
        const filterName = entry.dataKey;

        const currentValue = entry.value;
        const auditValue = dataPoint[`${filterName}_audit`];
        const originalValue = dataPoint[`${filterName}_original`];
        const hasAudit = dataPoint[`${filterName}_hasAudit`];

        return (
          <div
            key={index}
            className="mb-3 last:mb-0 pb-2 border-b border-blue-800/40 last:border-none "
          >
            {/* Filter name with colored bullet */}
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: entry.color }} className="text-lg">
                ●
              </span>
              <span className="text-blue-200 font-medium">{filterName}</span>
            </div>

            {/* Values */}
            <div className="mr-5 text-sm leading-relaxed">
              {hasAudit ? (
                <div className="space-y-1">
                  <p className="text-purple-300">
                    📜 آخر قيمة من السجل:{" "}
                    <span className="font-bold">
                      {formatNumberFull(auditValue)}
                    </span>
                  </p>

                  {originalValue && originalValue !== auditValue && (
                    <p className="text-blue-400 line-through">
                      القيمة الأصلية: {formatNumberFull(originalValue)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-blue-200">
                  القيمة الحالية:{" "}
                  <span className="font-bold">
                    {formatNumberFull(currentValue)}
                  </span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <text x={x} y={y} textAnchor="end" fill="#cbd5e1" fontSize={12} dy={4}>
      {formatYAxisValue(payload.value)}
    </text>
  );
};

export function IndicatorTimelineChart({
  indicatorName,
  data,
  anomalies,
  issues,
  auditHistory = [],
  onDataEdit,
  onCollapse,
  onIssueStatusChange,
}: TimelineChartProps) {
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set()
  );
  const [showIndividual, setShowIndividual] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"single" | "multi">(
    "multi"
  ); // Move selection mode to combined view only
  const [editingFilter, setEditingFilter] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Map<string, number>>(
    new Map()
  );
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [comment, setComment] = useState("");
  const [pendingEdits, setPendingEdits] = useState<DataEdit[]>([]);
  // </CHANGE>
  const [dismissDialog, setDismissDialog] = useState<{
    open: boolean;
    issueId?: string;
    issueData?: any;
  }>({
    open: false,
  });
  const [dismissTableNumber, setDismissTableNumber] = useState("");
  const [dismissComment, setDismissComment] = useState("");

  const dataFrequency = detectDataFrequency(data);

  // Helper function to get latest audit value for a specific filter/year combination
  const getLatestAuditValue = (
    filterName: string,
    year: number,
    month?: number,
    quarter?: number
  ): number | null => {
    if (!auditHistory || auditHistory.length === 0) return null;

    const matchingHistory = auditHistory.filter(
      (item) =>
        item.indicatorName === indicatorName &&
        item.filterName === filterName &&
        item.year === year &&
        (month ? item.month === month : true) &&
        (quarter ? item.quarter === quarter : true)
    );

    if (matchingHistory.length === 0) return null;

    // Sort by changedAt timestamp and get the most recent
    const sorted = matchingHistory.sort(
      (a, b) =>
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );

    return sorted[0]?.newValue ?? null;
  };

  const filters = Array.from(new Set(data.map((d) => d.filterName)));

  const periods = Array.from(
    new Set(data.map((d) => createPeriodKey(d.year, d.month, d.quarter)))
  ).sort();

  const getMissingPeriods = (
    filterName: string
  ): Array<{ year: number; month?: number; quarter?: number }> => {
    const gapIssues = issues.filter(
      (issue) =>
        issue.checkType === "Timeline Gap" && issue.filterName === filterName
    );

    const missing: Array<{ year: number; month?: number; quarter?: number }> =
      [];
    gapIssues.forEach((issue) => {
      if (issue.details?.missingPeriods) {
        issue.details.missingPeriods.forEach((periodStr: string) => {
          if (periodStr.includes("Q")) {
            const [yearStr, quarterStr] = periodStr.split("-Q");
            missing.push({
              year: Number.parseInt(yearStr),
              quarter: Number.parseInt(quarterStr),
            });
          } else if (periodStr.includes("-")) {
            const [yearStr, monthStr] = periodStr.split("-");
            missing.push({
              year: Number.parseInt(yearStr),
              month: Number.parseInt(monthStr),
            });
          } else {
            missing.push({ year: Number.parseInt(periodStr) });
          }
        });
      }
    });
    return missing;
  };

  const getValue = (
    filterName: string,
    year: number,
    month?: number,
    quarter?: number
  ): number | null => {
    const key = `${filterName}-${createPeriodKey(year, month, quarter)}`;
    const editedValue = editedValues.get(key);
    if (editedValue !== undefined) return editedValue;

    // Check for audit history value first
    const auditValue = getLatestAuditValue(filterName, year, month, quarter);
    if (auditValue !== null) return auditValue;

    const original = data.find(
      (d) =>
        d.filterName === filterName &&
        d.year === year &&
        d.month === month &&
        d.quarter === quarter
    );
    return original?.value ?? null;
  };

  const allPeriodsSet = new Set(periods);
  filters.forEach((filter) => {
    const missing = getMissingPeriods(filter);
    missing.forEach((m) => {
      allPeriodsSet.add(createPeriodKey(m.year, m.month, m.quarter));
    });
  });
  const allPeriods = Array.from(allPeriodsSet).sort();

  const chartData: Array<any> = [];
  const filterStats: Record<string, any> = {};

  // Group data by periods
  const periodData = new Map<string, any>();
  data.forEach((d) => {
    const periodKey = createPeriodKey(d.year, d.month, d.quarter);
    if (!periodData.has(periodKey)) {
      periodData.set(periodKey, {
        periodKey,
        periodLabel: formatPeriodLabel(
          d.year,
          d.month,
          d.quarter,
          dataFrequency
        ),
        year: d.year,
        month: d.month,
        quarter: d.quarter,
      });
    }
  });

  // Add missing periods to period data
  filters.forEach((filter) => {
    const missing = getMissingPeriods(filter);
    missing.forEach((m) => {
      const periodKey = createPeriodKey(m.year, m.month, m.quarter);
      if (!periodData.has(periodKey)) {
        periodData.set(periodKey, {
          periodKey,
          periodLabel: formatPeriodLabel(
            m.year,
            m.month,
            m.quarter,
            dataFrequency
          ),
          year: m.year,
          month: m.month,
          quarter: m.quarter,
          isMissing: true,
        });
      }
    });
  });

  allPeriods.forEach((periodKey) => {
    const periodInfo = periodData.get(periodKey);
    if (!periodInfo) return;

    const dataPoint: any = {
      period: periodInfo.periodLabel,
      periodKey,
      year: periodInfo.year,
      month: periodInfo.month,
      quarter: periodInfo.quarter,
      isMissing: periodInfo.isMissing || false,
    };

    filters.forEach((filter) => {
      const value = getValue(
        filter,
        periodInfo.year,
        periodInfo.month,
        periodInfo.quarter
      );
      const auditValue = getLatestAuditValue(
        filter,
        periodInfo.year,
        periodInfo.month,
        periodInfo.quarter
      );
      const originalValue =
        data.find(
          (d) =>
            d.filterName === filter &&
            d.year === periodInfo.year &&
            d.month === periodInfo.month &&
            d.quarter === periodInfo.quarter
        )?.value ?? null;

      dataPoint[filter] = value;
      dataPoint[`${filter}_audit`] = auditValue;
      dataPoint[`${filter}_original`] = originalValue;
      dataPoint[`${filter}_hasAudit`] = auditValue !== null;
    });
    chartData.push(dataPoint);
  });

  filters.forEach((filter) => {
    const values = chartData
      .map((d) => d[filter])
      .filter((v) => v !== undefined && v !== 0);
    filterStats[filter] = calculateAdvancedStats(values);
  });

  const startEdit = (
    filterName: string,
    year: number,
    month?: number,
    quarter?: number
  ) => {
    const key = `${filterName}-${createPeriodKey(year, month, quarter)}`;
    const currentValue = getValue(filterName, year, month, quarter);
    setEditingCell(key);
    setTempValue(currentValue !== null ? String(currentValue) : "");
  };

  const saveEdit = (
    filterName: string,
    year: number,
    month?: number,
    quarter?: number
  ) => {
    const key = `${filterName}-${createPeriodKey(year, month, quarter)}`;
    const newValue = Number.parseFloat(tempValue);

    if (isNaN(newValue)) {
      alert("يرجى إدخال قيمة رقمية صحيحة");
      return;
    }

    const originalData = data.find(
      (d) =>
        d.filterName === filterName &&
        d.year === year &&
        d.month === month &&
        d.quarter === quarter
    );

    const newEdits = new Map(editedValues);
    newEdits.set(key, newValue);
    setEditedValues(newEdits);

    setEditingCell(null);
    setTempValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setTempValue("");
  };

  const resetValue = (
    filterName: string,
    year: number,
    month?: number,
    quarter?: number
  ) => {
    const key = `${filterName}-${createPeriodKey(year, month, quarter)}`;
    const newEdits = new Map(editedValues);
    newEdits.delete(key);
    setEditedValues(newEdits);
  };

  const isEdited = (
    filterName: string,
    year: number,
    month?: number,
    quarter?: number
  ): boolean => {
    const key = `${filterName}-${createPeriodKey(year, month, quarter)}`;
    return editedValues.has(key);
  };

  const saveAllEdits = () => {
    if (!onDataEdit) return;

    const edits: DataEdit[] = [];

    editedValues.forEach((newValue, key) => {
      const [filterName, ...periodParts] = key.split("-");
      const periodKey = periodParts.join("-");

      // Parse period key to extract year, month, quarter
      let year: number;
      let month: number | undefined;
      let quarter: number | undefined;

      if (periodKey.includes("Q")) {
        const [yearStr, quarterStr] = periodKey.split("-Q");
        year = Number.parseInt(yearStr);
        quarter = Number.parseInt(quarterStr);
      } else if (periodKey.includes("-") && periodKey.split("-").length === 2) {
        const [yearStr, monthStr] = periodKey.split("-");
        year = Number.parseInt(yearStr);
        month = Number.parseInt(monthStr);
      } else {
        year = Number.parseInt(periodKey);
      }

      const originalItem = data.find(
        (d) =>
          d.filterName === filterName &&
          d.year === year &&
          d.month === month &&
          d.quarter === quarter
      );

      const oldValue = originalItem?.value ?? 0;
      // Moved audit log to indicators-list.tsx to prevent duplicate logs
      /*
      addAuditLog({
        userName,
        action: originalItem ? "data_edit" : "value_add",
        timestamp: Date.now(),
        details: {
          indicatorName,
          filterName,
          year,
          month,
          quarter,
          oldValue,
          newValue,
          description: originalItem
            ? `تم تعديل القيمة من ${oldValue} إلى ${newValue}`
            : `تم إضافة قيمة جديدة: ${newValue}`
        }
      })
      */

      edits.push({
        indicatorName,
        filterName,
        year,
        month,
        quarter,
        oldValue,
        newValue,
        timestamp: Date.now(),
      });
    });

    if (edits.length > 0) {
      setPendingEdits(edits);
      setShowMetadataDialog(true);
    }
    // </CHANGE>
  };

  const handleSaveWithMetadata = () => {
    if (!tableNumber.trim()) {
      alert("يرجى إدخال رقم الجدول");
      return;
    }

    if (!comment.trim()) {
      alert("يرجى إدخال تعليق على التعديل");
      return;
    }

    const editsWithMetadata = pendingEdits.map((edit) => ({
      ...edit,
      tableNumber: tableNumber.trim(),
      comment: comment.trim(),
    }));

    onDataEdit?.(editsWithMetadata);
    setEditedValues(new Map());
    setEditingFilter(null);
    setShowMetadataDialog(false);
    setTableNumber("");
    setComment("");
    setPendingEdits([]);
  };
  // </CHANGE>

  const discardEdits = () => {
    setEditedValues(new Map());
    setEditingFilter(null);
  };

  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];

  const activeFilters =
    selectedFilters.size === 0 ? new Set(filters) : selectedFilters;

  const allValues = data.map((d) => Number(d.value));
  const average =
    allValues.length > 0
      ? allValues.reduce((a, b) => a + b, 0) / allValues.length
      : 0;

  const getIssuesForFilters = (filterNames: Set<string>) => {
    return issues.filter((issue) => {
      if (issue.filterName) {
        return filterNames.has(issue.filterName);
      }
      return true;
    });
  };

  const getIssuesForFilter = (filterName: string) => {
    return issues.filter((issue) => issue.filterName === filterName);
  };

  const getXAxisInterval = () => {
    if (dataFrequency === "monthly") {
      const dataLength = chartData.length;
      if (dataLength > 36) return Math.floor(dataLength / 12); // Show ~12 labels
      if (dataLength > 24) return 2; // Show every 2 months
      return 1; // Show every month for smaller datasets
    }
    return 0; // Show all ticks for yearly and quarterly
  };

  const frequencyLabel =
    dataFrequency === "monthly"
      ? "شهري"
      : dataFrequency === "quarterly"
      ? "ربع سنوي"
      : "سنوي";

  const handleFilterClick = (filter: string) => {
    if (!showIndividual) {
      if (selectionMode === "single") {
        // Single selection: only one filter at a time
        setSelectedFilters(new Set([filter]));
      } else {
        // Multi selection: toggle
        const newSet = new Set(selectedFilters);
        if (newSet.has(filter)) {
          newSet.delete(filter);
        } else {
          newSet.add(filter);
        }
        setSelectedFilters(newSet);
      }
    } else {
      // In individual view, simple toggle
      const newSet = new Set(selectedFilters);
      if (newSet.has(filter)) {
        newSet.delete(filter);
      } else {
        newSet.add(filter);
      }
      setSelectedFilters(newSet);
    }
  };

  const selectAllFilters = () => {
    setSelectedFilters(new Set(filters));
  };

  const deselectAllFilters = () => {
    setSelectedFilters(new Set());
  };

  const handleMarkResolved = (issueId?: string) => {
    if (!issueId || !onIssueStatusChange) return;
    onIssueStatusChange(issueId, "resolved");
  };

  const handleOpenDismissDialog = (issue: any) => {
    setDismissDialog({ open: true, issueId: issue.id, issueData: issue });
    setDismissTableNumber("");
    setDismissComment("");
  };

  const handleDismissIssue = () => {
    if (!dismissDialog.issueId || !onIssueStatusChange) return;

    if (!dismissTableNumber.trim() || !dismissComment.trim()) {
      alert("الرجاء إدخال رقم الجدول والتعليق");
      return;
    }

    onIssueStatusChange(dismissDialog.issueId, "dismissed", {
      tableNumber: dismissTableNumber.trim(),
      comment: dismissComment.trim(),
    });

    setDismissDialog({ open: false });
    setDismissTableNumber("");
    setDismissComment("");
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="text-sm bg-blue-600/20 border-blue-500/50 text-blue-300"
            >
              نمط البيانات: {frequencyLabel}
            </Badge>
            <CardTitle className="text-base text-chart-4">
              اختر المؤشرات الفرعية للتحليل
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row-reverse gap-2">
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilters.has(filter) ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterClick(filter)}
                className={`cursor-pointer text-xs font-medium transition-all ${
                  activeFilters.has(filter)
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0"
                    : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 border border-slate-600"
                }`}
              >
                {filter}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 flex-row-reverse">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showIndividual}
                onChange={(e) => {
                  setShowIndividual(e.target.checked);
                  if (!e.target.checked) {
                    // Going back to combined view
                    setSelectedFilters(new Set());
                  }
                }}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-sm text-slate-300 font-semibold">
                عرض منفصل لكل مؤشر فرعي{" "}
              </span>
            </label>

            {!showIndividual && (
              <>
                <div className="flex items-center flex-row-reverse gap-2 border-r border-slate-600 pr-4">
                  <span className="text-sm text-slate-400">: وضع الأختيار</span>
                  <div className="flex gap-1 bg-slate-700/50 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setSelectionMode("single");
                        // Keep only first selected if switching to single
                        if (selectedFilters.size > 1) {
                          const first = Array.from(selectedFilters)[0];
                          setSelectedFilters(new Set([first]));
                        }
                      }}
                      className={`px-3 cursor-pointer py-1 rounded text-xs font-medium transition-all ${
                        selectionMode === "single"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      اختيار واحد
                    </button>
                    <button
                      onClick={() => setSelectionMode("multi")}
                      className={`px-3 py-1 cursor-pointer rounded text-xs font-medium transition-all ${
                        selectionMode === "multi"
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      اختيار متعدد
                    </button>
                  </div>
                </div>

                {selectionMode === "multi" && (
                  <div className="flex gap-2 border-r border-slate-600 pr-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllFilters}
                      className="h-8 text-xs bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/30"
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={deselectAllFilters}
                      className="h-8 text-xs bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
                    >
                      إلغاء التحديد
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!showIndividual && (
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <div className="flex flex-col items-center justify-center text-center mb-4">
              <CardTitle className="text-base text-slate-200">
                {indicatorName}
              </CardTitle>
            </div>
            <CardTitle className="text-base text-center text-chart-2">
              السلسلة الزمنية المدمجة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 80,
                  bottom: dataFrequency === "monthly" ? 90 : 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  angle={
                    dataFrequency === "monthly"
                      ? -45
                      : dataFrequency === "quarterly"
                      ? -20
                      : 0
                  }
                  textAnchor={
                    dataFrequency === "monthly" || dataFrequency === "quarterly"
                      ? "end"
                      : "middle"
                  }
                  height={
                    dataFrequency === "monthly"
                      ? 90
                      : dataFrequency === "quarterly"
                      ? 60
                      : 30
                  }
                  interval={getXAxisInterval()}
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#94a3b8" tick={<CustomYAxisTick />} width={70} />
                <Tooltip
                  content={<CustomTooltip />}
                  wrapperStyle={{
                    zIndex: 9999999,
                    pointerEvents: "auto",

                    // position: "relative",
                  }}
                />
                <ReferenceLine
                  y={average}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  label={{
                    value: "المتوسط العام",
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                />
                <Legend />
                {Array.from(activeFilters).map((filter, idx) => (
                  <Line
                    key={filter}
                    type="monotone"
                    dataKey={filter}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const hasAudit = payload[`${filter}_hasAudit`];
                      const periodData = data.find(
                        (d) =>
                          createPeriodKey(d.year, d.month, d.quarter) ===
                            payload.periodKey && d.filterName === filter
                      );
                      const anomaly = anomalies.find(
                        (a) =>
                          a.year === payload.year &&
                          a.month === payload.month &&
                          a.quarter === payload.quarter &&
                          a.value === periodData?.value
                      );

                      if (anomaly?.isOutlier) {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={6}
                            fill={
                              Math.abs(anomaly.zScore) > 3
                                ? "#ef4444"
                                : "#f59e0b"
                            }
                            stroke="white"
                            strokeWidth={2}
                          />
                        );
                      }

                      if (hasAudit) {
                        // Purple diamond for audit history values
                        return (
                          <g>
                            <rect
                              x={cx - 4}
                              y={cy - 4}
                              width={8}
                              height={8}
                              fill="#8b5cf6"
                              stroke="white"
                              strokeWidth={2}
                              transform={`rotate(45 ${cx} ${cy})`}
                            />
                            <circle
                              cx={cx + 8}
                              cy={cy - 8}
                              r={2}
                              fill="#8b5cf6"
                            />
                          </g>
                        );
                      }

                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill={colors[idx % colors.length]}
                        />
                      );
                    }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {getIssuesForFilters(activeFilters).length > 0 && (
              <div className="border-t border-slate-700 pt-4 mt-4">
                <p className="text-xl font-semibold text-slate-300 mb-3">
                  : المشاكل المكتشفة
                </p>
                <div className="space-y-2">
                  {getIssuesForFilters(activeFilters).map((issue, idx) => (
                    <div
                      key={idx}
                      className={`border rounded p-3 text-sm ${getSeverityColor(
                        issue.severity
                      )}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold">{issue.checkType}</div>
                        <Badge variant="outline" className="text-sm">
                          {issue.severity === "critical"
                            ? "حرج"
                            : issue.severity === "warning"
                            ? "تحذير"
                            : "معلومة"}
                        </Badge>
                      </div>
                      <p className="text-slate-200 mb-2 text-xl">
                        {issue.message}
                      </p>
                      {issue.filterName && (
                        <p className="text-xl text-slate-300">
                          الفلتر: {issue.filterName}
                        </p>
                      )}
                      {issue.details && (
                        <div className="mt-2 p-2 bg-black/30 rounded text-xl font-mono text-slate-300">
                          {JSON.stringify(issue.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-700/30 rounded text-sm text-slate-400 space-y-1">
              <p>
                ● النقاط العادية | ● البرتقالية = تحذير (Z &gt; 2) | ● الحمراء =
                شاذة جداً (Z &gt; 3)
              </p>
              <p>◆ البنفسجية = قيم من سجل التعديلات | 📜 رمز السجل</p>
            </div>
          </CardContent>
        </Card>
      )}

      {showIndividual && (
        <div className="space-y-6">
          {Array.from(activeFilters).map((filter, idx) => {
            const filterData = data.filter((d) => d.filterName === filter);
            const stats = filterStats[filter];
            const filterChartData = chartData.map((d) => ({
              period: d.period,
              periodKey: d.periodKey,
              year: d.year,
              month: d.month,
              quarter: d.quarter,
              value: d[filter],
              isMissing: d.isMissing,
            }));
            const filterIssues = getIssuesForFilter(filter);
            const filterHasEdits = Array.from(editedValues.keys()).some((key) =>
              key.startsWith(`${filter}-`)
            );
            const missingPeriods = getMissingPeriods(filter);

            return (
              <Card key={filter} className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <div className="flex flex-col items-center justify-center text-center mb-4">
                    <div className="text-slate-400 mb-2 text-base">
                      المؤشر الرئيسي
                    </div>
                    <CardTitle className="text-slate-200 font-bold text-xl">
                      {indicatorName}
                    </CardTitle>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-purple-400 text-lg">
                        {filter}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditingFilter(
                            editingFilter === filter ? null : filter
                          )
                        }
                        className="bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30"
                      >
                        <Edit2 className="w-3 h-3 ml-1" />
                        {editingFilter === filter ? "إخفاء التعديل" : "تعديل"}
                      </Button>

                      {filterHasEdits && (
                        <Button
                          size="sm"
                          onClick={saveAllEdits}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-3 h-3 ml-1" />
                          حفظ (
                          {
                            Array.from(editedValues.keys()).filter((k) =>
                              k.startsWith(`${filter}-`)
                            ).length
                          }
                          )
                        </Button>
                      )}
                      {/* </CHANGE> */}

                      {stats && stats.trend > 0 ? (
                        <Badge variant="outline" className="text-green-400">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          صاعد
                        </Badge>
                      ) : stats && stats.trend < 0 ? (
                        <Badge variant="outline" className="text-red-400">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          هابط
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">
                          مستقر
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats && (
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 p-2 rounded">
                        <p className="text-blue-300">المتوسط</p>
                        <p className="font-semibold text-blue-100">
                          {formatNumber(stats.mean)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 p-2 rounded">
                        <p className="text-green-300">الحد الأدنى</p>
                        <p className="font-semibold text-green-100">
                          {formatNumber(stats.min)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 p-2 rounded">
                        <p className="text-orange-300">الحد الأقصى</p>
                        <p className="font-semibold text-orange-100">
                          {formatNumber(stats.max)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 p-2 rounded">
                        <p className="text-purple-300">التذبذب %</p>
                        <p
                          className={`font-semibold ${
                            stats.volatility > 30
                              ? "text-red-300"
                              : "text-green-300"
                          }`}
                        >
                          {stats.volatility.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 p-2 rounded">
                        <p className="text-cyan-300">الاتجاه</p>
                        <p
                          className={`font-semibold text-xs ${
                            stats.trend > 0 ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {stats.trend > 0 ? "+" : ""}
                          {stats.trend.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={filterChartData}
                      margin={{
                        top: 40,
                        right: 10,
                        left: 10,
                        bottom:
                          dataFrequency === "monthly"
                            ? 90
                            : dataFrequency === "quarterly"
                            ? 60
                            : 40,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id={`gradient-${idx}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={colors[idx % colors.length]}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={colors[idx % colors.length]}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="period"
                        stroke="#94a3b8"
                        angle={
                          dataFrequency === "monthly"
                            ? -45
                            : dataFrequency === "quarterly"
                            ? -20
                            : 0
                        }
                        textAnchor={
                          dataFrequency === "monthly" ||
                          dataFrequency === "quarterly"
                            ? "end"
                            : "middle"
                        }
                        height={
                          dataFrequency === "monthly"
                            ? 90
                            : dataFrequency === "quarterly"
                            ? 60
                            : 30
                        }
                        interval={getXAxisInterval()}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={<CustomYAxisTick />}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {stats && (
                        <ReferenceLine
                          y={stats.mean}
                          stroke="#94a3b8"
                          strokeDasharray="5 5"
                          label={{
                            value: "المتوسط",
                            fill: "#94a3b8",
                            fontSize: 12,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="value"
                        fill={`url(#gradient-${idx})`}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={2}
                        connectNulls={false}
                        dot={(props) => {
                          const { cx, cy, payload } = props;

                          if (
                            payload.value === null ||
                            payload.value === undefined
                          ) {
                            const chartMiddleY = 150; // Approximate middle of 300px chart height
                            return (
                              <circle
                                cx={cx}
                                cy={chartMiddleY}
                                r={6}
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="2,2"
                              />
                            );
                          }

                          const periodData = filterData.find(
                            (d) =>
                              createPeriodKey(d.year, d.month, d.quarter) ===
                              payload.periodKey
                          );
                          const anomaly = anomalies.find(
                            (a) =>
                              a.year === payload.year &&
                              a.month === payload.month &&
                              a.quarter === payload.quarter &&
                              a.value === periodData?.value
                          );
                          if (anomaly?.isOutlier) {
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill={
                                  Math.abs(anomaly.zScore) > 3
                                    ? "#ef4444"
                                    : "#f59e0b"
                                }
                                stroke="white"
                                strokeWidth={2}
                              />
                            );
                          }

                          const hasAudit = payload[`${filter}_hasAudit`];
                          if (hasAudit) {
                            // Purple diamond for audit history values
                            return (
                              <g>
                                <rect
                                  x={cx - 4}
                                  y={cy - 4}
                                  width={8}
                                  height={8}
                                  fill="#8b5cf6"
                                  stroke="white"
                                  strokeWidth={2}
                                  transform={`rotate(45 ${cx} ${cy})`}
                                />
                                <circle
                                  cx={cx + 8}
                                  cy={cy - 8}
                                  r={2}
                                  fill="#8b5cf6"
                                />
                              </g>
                            );
                          }

                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill={colors[idx % colors.length]}
                            />
                          );
                        }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {editingFilter === filter && (
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <p className="text-sm font-semibold text-blue-300 mb-3">
                        تعديل قيم الفلتر ({frequencyLabel}):
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                        {filterChartData.map((period) => {
                          const { year, month, quarter } = period;
                          const key = `${filter}-${createPeriodKey(
                            year,
                            month,
                            quarter
                          )}`;
                          const currentValue = getValue(
                            filter,
                            year,
                            month,
                            quarter
                          );
                          const originalData = data.find(
                            (d) =>
                              d.filterName === filter &&
                              d.year === year &&
                              d.month === month &&
                              d.quarter === quarter
                          );
                          const edited = isEdited(filter, year, month, quarter);
                          const isEditing = editingCell === key;
                          const hasIssue = filterIssues.some((issue) => {
                            const details = issue.details;
                            return (
                              details?.year === year &&
                              details?.month === month &&
                              details?.quarter === quarter
                            );
                          });
                          const isMissing = currentValue === null;

                          return (
                            <div
                              key={key}
                              className={`p-3 rounded-lg border transition-all ${
                                edited
                                  ? "bg-yellow-500/10 border-yellow-500/50"
                                  : isMissing
                                  ? "bg-red-500/10 border-red-500/50"
                                  : hasIssue
                                  ? "bg-orange-500/10 border-orange-500/50"
                                  : "bg-slate-700/30 border-slate-600/40"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-slate-300 text-xs font-semibold">
                                  {period.period}
                                </span>
                                {edited && !isMissing && (
                                  <button
                                    onClick={() =>
                                      resetValue(filter, year, month, quarter)
                                    }
                                    className="text-blue-400 hover:text-blue-300"
                                    title="إعادة تعيين"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                                {isMissing && !edited && (
                                  <span className="text-red-400 text-xs">
                                    مفقودة
                                  </span>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="space-y-2">
                                  <Input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) =>
                                      setTempValue(e.target.value)
                                    }
                                    placeholder={isMissing ? "أدخل القيمة" : ""}
                                    className="h-8 text-sm bg-slate-900/60 border-slate-600/50 text-slate-100"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        saveEdit(filter, year, month, quarter);
                                      } else if (e.key === "Escape") {
                                        cancelEdit();
                                      }
                                    }}
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        saveEdit(filter, year, month, quarter)
                                      }
                                      className="h-6 text-xs bg-green-600 hover:bg-green-700 flex-1"
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={cancelEdit}
                                      variant="outline"
                                      className="h-6 text-xs flex-1 bg-transparent"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    {currentValue !== null ? (
                                      <>
                                        <p
                                          className={`text-sm font-mono truncate ${
                                            edited
                                              ? "text-yellow-200"
                                              : hasIssue
                                              ? "text-red-300"
                                              : "text-slate-100"
                                          }`}
                                        >
                                          {currentValue.toLocaleString("en-US")}
                                        </p>
                                        {edited && originalData && (
                                          <p className="text-xs text-slate-400 line-through">
                                            {originalData.value.toLocaleString(
                                              "en-US"
                                            )}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-sm text-red-400 italic">
                                        -
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      startEdit(filter, year, month, quarter)
                                    }
                                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filterIssues.length > 0 ? (
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <p className="text-sm font-semibold text-red-300 mb-3">
                        ⚠️ المشاكل المكتشفة في هذا الفلتر:
                      </p>
                      <div className="space-y-3">
                        {filterIssues.map((issue, issueIdx) => (
                          <div
                            key={issueIdx}
                            className={`border rounded-lg p-4 text-sm transition-all hover:shadow-lg ${
                              issue.severity === "critical"
                                ? "bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30"
                                : issue.severity === "warning"
                                ? "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30"
                                : "bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                  issue.severity === "critical"
                                    ? "bg-red-500/20"
                                    : issue.severity === "warning"
                                    ? "bg-yellow-500/20"
                                    : "bg-blue-500/20"
                                }`}
                              >
                                <span className="text-xl">
                                  {issue.severity === "critical"
                                    ? "🚨"
                                    : issue.severity === "warning"
                                    ? "⚠️"
                                    : "ℹ️"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-base text-slate-100">
                                    {issue.checkType}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      issue.severity === "critical"
                                        ? "bg-red-500/20 border-red-500/50 text-red-300"
                                        : issue.severity === "warning"
                                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                                        : "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                    }`}
                                  >
                                    {issue.severity === "critical"
                                      ? "🔴 حرج"
                                      : issue.severity === "warning"
                                      ? "🟡 تحذير"
                                      : "🔵 معلومة"}
                                  </Badge>
                                </div>
                                <p className="text-slate-200 leading-relaxed">
                                  {issue.message}
                                </p>
                              </div>
                            </div>

                            {issue.details && (
                              <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                <p className="text-xs font-semibold text-slate-400 mb-2">
                                  📊 التفاصيل:
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(issue.details).map(
                                    ([key, value]) => {
                                      if (
                                        key === "missingPeriods" &&
                                        Array.isArray(value)
                                      ) {
                                        return (
                                          <div key={key} className="col-span-2">
                                            <span className="text-slate-400">
                                              {key}:
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {value.map(
                                                (period: string, i: number) => (
                                                  <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="text-xs bg-red-500/10 border-red-500/30 text-red-300"
                                                  >
                                                    {period}
                                                  </Badge>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div key={key}>
                                          <span className="text-slate-400">
                                            {key}:
                                          </span>{" "}
                                          <span className="text-slate-200 font-mono">
                                            {typeof value === "number"
                                              ? value.toLocaleString("en-US")
                                              : String(value)}
                                          </span>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}

                            {onIssueStatusChange && issue.id && (
                              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/50">
                                <Button
                                  onClick={() => handleMarkResolved(issue.id)}
                                  size="sm"
                                  className="gap-2 cursor-pointer bg-green-600/80 hover:bg-green-600 text-white"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  تم الحل
                                </Button>
                                <Button
                                  onClick={() => handleOpenDismissDialog(issue)}
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 cursor-pointer border-gray-600 text-gray-300 hover:bg-gray-800"
                                >
                                  <XCircle className="w-4 h-4" />
                                  إلغاء المشكلة
                                </Button>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                              <p className="text-xs text-slate-400">
                                💡{" "}
                                <span className="font-semibold">
                                  الحل المقترح:
                                </span>{" "}
                                {issue.severity === "critical"
                                  ? "يجب إصلاح هذه المشكلة قبل المتابعة"
                                  : issue.checkType === "Timeline Gap"
                                  ? "استخدم زر 'تعديل' لإضافة القيم المفقودة أو تأكد من صحة البيانات"
                                  : issue.checkType === "Value Range"
                                  ? "راجع القيمة وتأكد من صحتها، أو عدلها إذا كانت خاطئة"
                                  : "راجع البيانات وتأكد من منطقيتها"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-lg p-6 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="text-4xl">✅</span>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-green-300 mb-2">
                              المؤشر الفرعي سليم تماماً!
                            </p>
                            <p className="text-sm text-slate-300">
                              لا توجد أي مشاكل في البيانات. جميع القيم ضمن
                              النطاق المتوقع ولا توجد فجوات زمنية.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="border-t border-slate-700 pt-4 mt-6 flex justify-center">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => onCollapse?.()} // CHANGED
                      className="bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 w-full max-w-md"
                    >
                      <ChevronUp className="w-5 h-5 ml-2" />
                      إغلاق المؤشر
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showMetadataDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-blue-800/50 bg-blue-950 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-blue-100">معلومات التعديل</CardTitle>
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
                  className="bg-blue-950/40 border-blue-800/50 text-blue-100"
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
                  className="bg-blue-950/40 border-blue-800/50 text-blue-100 min-h-[100px]"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMetadataDialog(false);
                    setTableNumber("");
                    setComment("");
                    setPendingEdits([]);
                  }}
                  className="border-blue-700/50 text-blue-300"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveWithMetadata}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التعديلات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* </CHANGE> */}

      {dismissDialog.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md border-blue-800/50 bg-blue-950 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-blue-100">إلغاء المشكلة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-blue-300 text-sm mb-2 block">
                  رقم الجدول <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="أدخل رقم الجدول في المصدر"
                  value={dismissTableNumber}
                  onChange={(e) => setDismissTableNumber(e.target.value)}
                  className="bg-blue-950/40 border-blue-800/50 text-blue-100"
                  required
                />
              </div>
              <div>
                <label className="text-blue-300 text-sm mb-2 block">
                  التعليق <span className="text-red-400">*</span>
                </label>
                <Textarea
                  placeholder="اشرح سبب إلغاء هذه المشكلة (مثلاً: القيمة صحيحة في المصدر)"
                  value={dismissComment}
                  onChange={(e) => setDismissComment(e.target.value)}
                  className="bg-blue-950/40 border-blue-800/50 text-blue-100 min-h-[100px]"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDismissDialog({ open: false })}
                  className="border-blue-700/50 text-blue-300"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleDismissIssue}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  تأكيد الإلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
