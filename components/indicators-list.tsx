"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  AlertCircle,
  ChevronDown,
  CheckCheck,
  StickyNote,
  X,
  Filter,
  Trash2,
  Download,
  Edit3,
  History,
  Search,
  Percent,
} from "lucide-react";
import type { QAResults } from "@/lib/qa-engine";
import {
  saveWorkSession,
  loadWorkSession,
  clearWorkSession,
  type ReviewedIndicator,
  loadUserProfile,
  updateProject,
  loadProject,
  type IssueStatus, // Import IssueStatus
} from "@/lib/storage";
import {
  mergeDataEdits,
  type DataEdit,
  type EditSession,
} from "@/lib/edit-session";
import * as XLSX from "xlsx";

import { IndicatorTimelineChart } from "./indicator-timeline-chart";
import { DataEditor } from "./data-editor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  revalidateIssuesAfterEdit,
  recalculateQualityWithFilteredIssues,
  getActiveIssues,
} from "@/lib/qa-engine";

function detectStatisticalOutliers(
  values: Array<{ year: number; value: number; filterName: string }>
): Array<{
  year: number;
  value: number;
  filterName: string;
  isOutlier: boolean;
  zScore: number;
  reason: string;
}> {
  if (values.length < 3) {
    return values.map((v) => ({
      ...v,
      isOutlier: false,
      zScore: 0,
      reason: "Not enough data",
    }));
  }

  const numericValues = values.map((v) => Number(v.value));
  const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  const variance =
    numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    numericValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return values.map((v) => ({
      ...v,
      isOutlier: false,
      zScore: 0,
      reason: "All values identical",
    }));
  }

  return values.map((v, idx) => {
    const numValue = Number(v.value);
    const zScore = (numValue - mean) / stdDev;
    let isOutlier = false;
    let reason = "";

    if (Math.abs(zScore) > 3) {
      isOutlier = true;
      reason = "Extreme outlier";
    } else if (Math.abs(zScore) > 2) {
      isOutlier = true;
      reason = "Unusual value";
    } else if (idx > 0) {
      const prevValue = numericValues[idx - 1];
      const percentChange = Math.abs((numValue - prevValue) / prevValue) * 100;
      if (percentChange > 50) {
        isOutlier = true;
        reason = "Sharp change";
      }
    }

    return {
      ...v,
      isOutlier,
      zScore,
      reason,
    };
  });
}

interface IndicatorsListProps {
  data: any[];
  qaResults: QAResults;
  fileName?: string;
  onDataUpdate?: (newData: any[]) => void;
  onAuditLogUpdate?: (logs: any[]) => void;
  projectId?: string;
}

export default function IndicatorsList({
  data,
  qaResults,
  fileName,
  onDataUpdate,
  onAuditLogUpdate,
  projectId,
}: IndicatorsListProps) {
  const [search, setSearch] = useState("");
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(
    new Set()
  );
  const [lastOpenedIndicator, setLastOpenedIndicator] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "healthy" | "issues" | "reviewed"
  >("all");
  const [reviewedIndicators, setReviewedIndicators] = useState<
    Map<string, ReviewedIndicator>
  >(new Map());
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentIndicator, setCurrentIndicator] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("all");
  const [searchYearFilter, setSearchYearFilter] = useState<string>("all");
  const [searchQualityFilter, setSearchQualityFilter] = useState<string>("all");

  const [editMode, setEditMode] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<EditSession>({
    fileName: "",
    dataEdits: [],
    indicatorEdits: [],
    lastUpdated: 0,
  });

  const [currentQAResults, setCurrentQAResults] =
    useState<QAResults>(qaResults);
  const [issueStatuses, setIssueStatuses] = useState<IssueStatus[]>([]);
  const [modifiedData, setModifiedData] = useState<any[]>(data);

  const applyEditsToData = useCallback(
    (originalData: any[], edits: DataEdit[]): any[] => {
      const dataArray = [...originalData];

      edits.forEach((edit) => {
        const existingRowIndex = dataArray.findIndex(
          (row) =>
            row.indicatorName === edit.indicatorName &&
            row.filterName === edit.filterName &&
            row.year === edit.year
        );

        if (existingRowIndex >= 0) {
          dataArray[existingRowIndex] = {
            ...dataArray[existingRowIndex],
            value: edit.newValue,
          };
        } else {
          const sampleRow = originalData.find(
            (row) =>
              row.indicatorName === edit.indicatorName &&
              row.filterName === edit.filterName
          );
          if (sampleRow) {
            const newRow = {
              ...sampleRow,
              year: edit.year,
              value: edit.newValue,
              السنة: edit.year,
              القيمة: edit.newValue,
            };
            dataArray.push(newRow);
          }
        }
      });

      return dataArray;
    },
    []
  );

  const modifiedDataMemo = useMemo(() => {
    return applyEditsToData(data, editSession.dataEdits);
  }, [data, editSession.dataEdits, applyEditsToData]);

  const filteredIssuesMemo = useMemo(() => {
    return getActiveIssues(currentQAResults.issues, issueStatuses);
  }, [currentQAResults.issues, issueStatuses]);

  const getFilteredIssuesForIndicator = useCallback(
    (indicatorName: string) => {
      const indicatorData = modifiedDataMemo.filter(
        (d) => d.indicatorName === indicatorName
      );
      const allIndicatorIssues = currentQAResults.issues.filter((i) =>
        indicatorData.some((d) => d.indicatorName === i.indicatorName)
      );

      return getActiveIssues(allIndicatorIssues, issueStatuses);
    },
    [modifiedDataMemo, currentQAResults.issues, issueStatuses]
  );

  useEffect(() => {
    setModifiedData(modifiedDataMemo);
  }, [modifiedDataMemo]);

  useEffect(() => {
    if (fileName) {
      const session = loadWorkSession(projectId);
      if (session && session.fileName === fileName) {
        const reviewedMap = new Map<string, ReviewedIndicator>();
        session.reviewedIndicators.forEach((item) => {
          reviewedMap.set(item.name, item);
        });
        setReviewedIndicators(reviewedMap);
      }
    }
  }, [fileName, projectId]);

  useEffect(() => {
    if (projectId) {
      const project = loadProject(projectId);
      // if (project.issueStatuses) {
      //   setIssueStatuses(project.projectData.issueStatuses);
      // }
    }
  }, [projectId]);

  useEffect(() => {
    if (fileName && reviewedIndicators.size > 0) {
      const session = {
        fileName,
        reviewedIndicators: Array.from(reviewedIndicators.values()),
        lastUpdated: Date.now(),
      };
      saveWorkSession(session, projectId);
    }
  }, [reviewedIndicators, fileName, projectId]);

  useEffect(() => {
    if (fileName && projectId) {
      const project = loadProject(projectId);
      if (project) {
        const projectEditSession = project.editSession || {
          fileName: fileName,
          dataEdits: [],
          indicatorEdits: [],
          lastUpdated: Date.now(),
        };
        setEditSession(projectEditSession);
      } else {
        setModifiedData(data);
      }
    } else {
      setModifiedData(data);
    }
  }, [fileName, data, projectId]);

  useEffect(() => {
    setCurrentQAResults(qaResults);
  }, [qaResults]);

  useEffect(() => {
    if (fileName && editSession.dataEdits.length > 0 && projectId) {
      updateProject(projectId, {
        editSession: {
          ...editSession,
          fileName,
          lastUpdated: Date.now(),
        },
      });
    }
  }, [editSession, fileName, projectId]);

  const issueTypes = [
    "all",
    ...new Set(currentQAResults.issues.map((i) => i.checkType)),
  ];

  const handleSaveEdits = useCallback(
    (indicatorName: string, newEdits: DataEdit[]) => {
      const userProfile = loadUserProfile();

      const mergedEdits = mergeDataEdits(editSession.dataEdits, newEdits);

      const newSession = {
        ...editSession,
        dataEdits: mergedEdits,
        lastUpdated: Date.now(),
      };

      setEditSession(newSession);

      const newData = applyEditsToData(data, mergedEdits);
      setModifiedData(newData);

      if (onDataUpdate) {
        onDataUpdate(newData);
      }

      const auditLogs: any[] = [];

      newEdits.forEach((edit) => {
        auditLogs.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          action: "data_edit",
          userName: userProfile?.name || "مستخدم غير معروف",
          timestamp: Date.now(),
          details: {
            indicatorName: edit.indicatorName,
            filterName: edit.filterName,
            year: edit.year,
            month: edit.month,
            quarter: edit.quarter,
            oldValue: edit.oldValue,
            newValue: edit.newValue,
            tableNumber: edit.tableNumber,
            comment: edit.comment,
          },
        });
      });

      const { updatedIssues, autoResolvedCount } = revalidateIssuesAfterEdit(
        newData,
        currentQAResults.issues,
        issueStatuses
      );

      console.log(
        "[v0] Revalidated issues after edit. Auto-resolved:",
        autoResolvedCount
      );

      const updatedQAResults = {
        ...currentQAResults,
        issues: updatedIssues,
      };
      setCurrentQAResults(updatedQAResults);

      if (projectId) {
        const project = loadProject(projectId);
        if (project) {
          const existingLogs = project.projectData?.auditTrail?.logs || [];
          const updatedLogs = [...existingLogs, ...auditLogs];

          console.log(
            "[v0] Updating project with",
            updatedLogs.length,
            "total audit logs"
          );

          if (onAuditLogUpdate) {
            onAuditLogUpdate(updatedLogs);
          }

          updateProject(projectId, {
            projectData: {
              ...project.projectData,
              modifiedData: newData,
              editSession: newSession,
              qaResults: updatedQAResults,
              auditTrail: {
                fileName: fileName || "",
                logs: updatedLogs,
                lastUpdated: Date.now(),
              },
            },
          });
        }
      }

      setEditMode(null);
    },
    [
      editSession,
      data,
      currentQAResults,
      issueStatuses,
      fileName,
      projectId,
      onDataUpdate,
      onAuditLogUpdate,
      applyEditsToData,
    ]
  );

  const getIndicatorEdits = (indicatorName: string): DataEdit[] => {
    if (!editSession || !editSession.dataEdits) {
      return [];
    }
    return editSession.dataEdits.filter(
      (e) => e.indicatorName === indicatorName
    );
  };

  const hasEdits = (indicatorName: string): boolean => {
    if (!editSession || !editSession.dataEdits) {
      return false;
    }
    return editSession.dataEdits.some((e) => e.indicatorName === indicatorName);
  };

  const exportEditedData = () => {
    if (
      !editSession ||
      !editSession.dataEdits ||
      editSession.dataEdits.length === 0
    ) {
      alert("لا توجد تعديلات لتصديرها");
      return;
    }

    // Create Excel with original structure
    const editedRows = modifiedDataMemo.filter((row) =>
      editSession.dataEdits.some(
        (edit) =>
          edit.indicatorName === row.indicatorName &&
          edit.filterName === row.filterName &&
          edit.year === row.year
      )
    );

    const worksheet = XLSX.utils.json_to_sheet(editedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Edited Data");

    // Add change log sheet
    const changeLog = editSession.dataEdits.map((edit) => ({
      "اسم المؤشر": edit.indicatorName,
      "اسم الفلتر": edit.filterName,
      السنة: edit.year,
      "القيمة القديمة": edit.oldValue,
      "القيمة الجديدة": edit.newValue,
      "تاريخ التعديل": new Date(edit.timestamp).toLocaleString("ar-EG"),
    }));
    const changeSheet = XLSX.utils.json_to_sheet(changeLog);
    XLSX.utils.book_append_sheet(workbook, changeSheet, "Change Log");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName?.replace(".xlsx", "") || "data"} - Edited.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearEdits = () => {
    if (confirm("هل أنت متأكد من حذف جميع التعديلات؟")) {
      const emptySession = {
        fileName: fileName || "",
        dataEdits: [],
        indicatorEdits: [],
        lastUpdated: Date.now(),
      };
      setEditSession(emptySession);
      setModifiedData(data);

      if (projectId) {
        updateProject(projectId, {
          projectData: {
            modifiedData: data,
            editSession: emptySession,
          },
        });
      }

      if (onDataUpdate) {
        onDataUpdate(data);
      }
    }
  };

  const handleIssueStatusChange = useCallback(
    (
      issueId: string,
      status: "resolved" | "dismissed",
      metadata?: { tableNumber?: string; comment?: string }
    ) => {
      if (!projectId) return;

      const project = loadProject(projectId);
      if (!project) return;

      const userProfile = loadUserProfile();
      const existingStatuses = project.projectData?.issueStatuses || [];

      const existingIndex = existingStatuses.findIndex(
        (s) => s.issueId === issueId
      );
      const newStatus: IssueStatus = {
        issueId,
        status,
        timestamp: Date.now(),
        userName: userProfile?.name || "مستخدم غير معروف",
        metadata,
      };

      let updatedStatuses: IssueStatus[];
      if (existingIndex >= 0) {
        updatedStatuses = [...existingStatuses];
        updatedStatuses[existingIndex] = newStatus;
      } else {
        updatedStatuses = [...existingStatuses, newStatus];
      }

      setIssueStatuses(updatedStatuses);

      const updatedQuality = recalculateQualityWithFilteredIssues(
        modifiedDataMemo,
        currentQAResults.issues,
        updatedStatuses
      );

      const updatedQAResults = {
        ...currentQAResults,
        qualityScore: updatedQuality,
      };
      setCurrentQAResults(updatedQAResults);

      if (projectId) {
        updateProject(projectId, {
          projectData: {
            ...project.projectData,
            issueStatuses: updatedStatuses,
            qaResults: updatedQAResults,
          },
        });
      }

      const auditLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        action: status === "resolved" ? "issue_resolved" : "issue_dismissed",
        userName: userProfile?.name || "مستخدم غير معروف",
        timestamp: Date.now(),
        details: {
          issueId,
          status,
          ...metadata,
        },
      };

      const existingLogs = project.projectData?.auditTrail?.logs || [];
      const updatedLogs = [...existingLogs, auditLog];

      if (onAuditLogUpdate) {
        onAuditLogUpdate(updatedLogs);
      }

      updateProject(projectId, {
        projectData: {
          ...project.projectData,
          auditTrail: {
            fileName: fileName || "",
            logs: updatedLogs,
            lastUpdated: Date.now(),
          },
        },
      });

      console.log(
        "[v0] Issue status updated successfully. Quality recalculated."
      );
    },
    [
      projectId,
      modifiedDataMemo,
      currentQAResults,
      issueStatuses,
      fileName,
      onAuditLogUpdate,
    ]
  );

  const indicators = useMemo(() => {
    console.log("🚀 ~ IndicatorsList ~ currentQAResults:", currentQAResults);
    console.log("🚀 ~ IndicatorsList ~ modifiedDataMemo:", modifiedDataMemo);
    return Array.from(new Set(modifiedDataMemo.map((d) => d.indicatorName)))
      .map((name) => {
        const indicatorData = modifiedDataMemo.filter(
          (d) => d.indicatorName === name
        );
        const indicatorIssues = getFilteredIssuesForIndicator(name);

        const filteredIssues =
          issueTypeFilter === "all"
            ? indicatorIssues
            : indicatorIssues.filter((i) => i.checkType === issueTypeFilter);

        const hasIssues = filteredIssues.length > 0;

        const timeSeriesData = indicatorData.map((d) => ({
          year: d.year,
          value: Number(d.value),
          filterName: d.filterName,
        }));

        const outliers = detectStatisticalOutliers(timeSeriesData);

        const qualityInfo = currentQAResults.qualityScore?.indicators.find(
          (i) => i.name === name
        );

        const uniqueYears = new Set(indicatorData.map((d) => d.year)).size;

        const reviewedInfo = reviewedIndicators.get(name);
        const isReviewed = !!reviewedInfo;

        return {
          name,
          rowCount: indicatorData.length,
          issueCount: filteredIssues.length,
          hasIssues,
          issues: filteredIssues,
          filters: Array.from(new Set(indicatorData.map((d) => d.filterName))),
          timeSeriesData,
          outliers,
          qualityScore: qualityInfo?.score || 0,
          qualityRating: qualityInfo?.rating || "good",
          issuesBreakdown: qualityInfo?.issuesCount || {
            critical: 0,
            warning: 0,
            info: 0,
          },
          yearsCount: uniqueYears,
          isReviewed,
          reviewedNotes: reviewedInfo?.notes,
          years: Array.from(new Set(indicatorData.map((d) => d.year))),
        };
      })
      .filter((i) => {
        if (search && !i.name.toLowerCase().includes(search.toLowerCase()))
          return false;

        if (
          searchYearFilter !== "all" &&
          !i.years.includes(Number(searchYearFilter))
        )
          return false;

        if (
          searchQualityFilter !== "all" &&
          i.qualityRating !== searchQualityFilter
        )
          return false;

        if (statusFilter === "healthy") return !i.hasIssues && !i.isReviewed;
        if (statusFilter === "issues") return i.hasIssues && !i.isReviewed;
        if (statusFilter === "reviewed") return i.isReviewed;

        return true;
      });
  }, [
    modifiedDataMemo,
    currentQAResults,
    issueStatuses,
    search,
    issueTypeFilter,
    searchYearFilter,
    searchQualityFilter,
    statusFilter,
    reviewedIndicators,
  ]);

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expandedIndicators);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
      setLastOpenedIndicator(name); // Only update when opening a new indicator
    }
    setExpandedIndicators(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 border-red-500/30 text-red-300";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-300";
      case "info":
        return "bg-blue-500/10 border-blue-500/30 text-blue-300";
      default:
        return "bg-slate-500/10 border-slate-500/30 text-slate-300";
    }
  };

  const markAsReviewed = (name: string) => {
    const newReviewed = new Map(reviewedIndicators);
    newReviewed.set(name, {
      name,
      timestamp: Date.now(),
      notes: noteText || undefined,
    });
    setReviewedIndicators(newReviewed);
    setNoteDialogOpen(false);
    setNoteText("");
    setCurrentIndicator(null);
  };

  const unmarkAsReviewed = (name: string) => {
    const newReviewed = new Map(reviewedIndicators);
    newReviewed.delete(name);
    setReviewedIndicators(newReviewed);
  };

  const openNoteDialog = (name: string) => {
    setCurrentIndicator(name);
    const existing = reviewedIndicators.get(name);
    setNoteText(existing?.notes || "");
    setNoteDialogOpen(true);
  };

  const handleClearSession = () => {
    if (confirm("هل أنت متأكد من مسح جميع البيانات المحفوظة؟")) {
      clearWorkSession(projectId);
      setReviewedIndicators(new Map());
    }
  };

  const exportReviewedReport = () => {
    const reviewedData = indicators.filter((i) => i.isReviewed);

    const worksheetData = reviewedData.map((ind) => ({
      "اسم المؤشر": ind.name,
      "درجة الجودة": ind.qualityScore,
      التصنيف: getRatingConfig(ind.qualityRating).label,
      "عدد المشاكل": ind.issueCount,
      ملاحظات: ind.reviewedNotes || "لا توجد ملاحظات",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reviewed Indicators");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      fileName?.replace(".xlsx", "") || "data"
    } - Reviewed Indicators.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalIndicators = Array.from(
    new Set(data.map((d) => d.indicatorName))
  ).length;
  const reviewedCount = reviewedIndicators.size;
  const progressPercentage = (reviewedCount / totalIndicators) * 100;

  const healthyCount = Array.from(
    new Set(data.map((d) => d.indicatorName))
  ).filter((name) => {
    const indicatorData = data.filter((d) => d.indicatorName === name);
    const indicatorIssues = qaResults.issues.filter((i) =>
      indicatorData.some((d) => d.indicatorName === i.indicatorName)
    );
    return indicatorIssues.length === 0 && !reviewedIndicators.has(name);
  }).length;

  const issuesCount = Array.from(
    new Set(data.map((d) => d.indicatorName))
  ).filter((name) => {
    const indicatorData = data.filter((d) => d.indicatorName === name);
    const indicatorIssues = qaResults.issues.filter((i) =>
      indicatorData.some((d) => d.indicatorName === i.indicatorName)
    );
    return indicatorIssues.length > 0 && !reviewedIndicators.has(name);
  }).length;

  const getRatingConfig = (rating: string) => {
    switch (rating) {
      case "excellent":
        return {
          label: "ممتاز",
          color: "bg-green-500/20 border-green-500/50 text-green-300",
          icon: "🏆",
        };
      case "good":
        return {
          label: "جيد",
          color: "bg-blue-500/20 border-blue-500/50 text-blue-300",
          icon: "✨",
        };
      case "fair":
        return {
          label: "متوسط",
          color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300",
          icon: "⚡",
        };
      case "poor":
        return {
          label: "ضعيف",
          color: "bg-red-500/20 border-red-500/50 text-red-300",
          icon: "⚠️",
        };
      default:
        return {
          label: "غير محدد",
          color: "bg-gray-500/20 border-gray-500/50 text-gray-300",
          icon: "❓",
        };
    }
  };

  const handleChartDataEdit = (indicatorName: string, edits: DataEdit[]) => {
    handleSaveEdits(indicatorName, edits);
  };

  const allYears = Array.from(new Set(data.map((d) => d.year))).sort();

  const handleCollapseIndicator = (indicatorName: string) => {
    const newExpanded = new Set(expandedIndicators);
    newExpanded.delete(indicatorName);
    setExpandedIndicators(newExpanded);

    setTimeout(() => {
      const element = document.getElementById(`indicator-${indicatorName}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div className="space-y-4">
      <Card className="border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className="text-center p-4 border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm"
            >
              <Percent className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-blue-300 text-sm mb-2">تقدم الفحص</p>
              <div className="relative pt-1">
                <div className="overflow-hidden h-4 text-xs flex rounded-full bg-blue-950/50 border border-blue-800/30">
                  <div
                    style={{ width: `${progressPercentage}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                  />
                </div>
                <p className="text-2xl font-bold text-blue-100 mt-2">
                  {reviewedCount} / {totalIndicators}
                </p>
                <p className="text-blue-300 text-xs">
                  {progressPercentage.toFixed(1)}% مكتمل
                </p>
              </div>
            </div>
            <div
              className="text-center p-4 border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm"
            >
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{healthyCount}</p>
              <p className="text-white text-sm">مؤشرات سليمة</p>
            </div>
            <div
              className="text-center p-4 border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm"
            >
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{issuesCount}</p>
              <p className="text-white text-sm">تحتاج فحص</p>
            </div>
            <div
              className="text-center p-4 border border-blue-700/40 rounded-2xl 
  bg-linear-to-br from-[#053964] via-[#0986ed]/10 to-[#0b5fa8]/40 
  shadow-lg shadow-blue-900/30 backdrop-blur-sm"
            >
              <CheckCheck className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{reviewedCount}</p>
              <p className="text-white text-sm">تم الفحص</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* عدد التعديلات */}
      {editSession.dataEdits.length > 0 && (
        <Card className="border-[#0986ed]/30 bg-[#1a4e67f2]/95 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={exportEditedData}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <Download className="w-4 h-4 ml-2" />
                  تحميل التعديلات
                </Button>
                <Button
                  onClick={handleClearEdits}
                  variant="outline"
                  className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف التعديلات
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-yellow-100 font-semibold">
                    لديك {editSession.dataEdits.length} تعديل محفوظ
                  </p>
                  <p className="text-yellow-300 text-sm">
                    تم تطبيق التعديلات على البيانات والرسومات البيانية
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative md:col-span-2">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black mx-auto mb-2" />
            <Input
              placeholder="ابحث عن المؤشرات (عربي/إنجليزي)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#fffffff2] via-[#fffffff2]/20 to-[#fffffff2] pr-10"
            />
          </div>

          <Select value={searchYearFilter} onValueChange={setSearchYearFilter}>
            <SelectTrigger className="bg-[#fffffff2] via-[#fffffff2]/20 to-[#fffffff2] cursor-pointer">
              <SelectValue placeholder="تصفية حسب السنة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع السنوات</SelectItem>
              {allYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={searchQualityFilter}
            onValueChange={setSearchQualityFilter}
          >
            <SelectTrigger className="bg-[#fffffff2] via-[#fffffff2]/20 to-[#fffffff2] cursor-pointer">
              <SelectValue placeholder="تصفية حسب الجودة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المستويات</SelectItem>
              <SelectItem value="excellent">ممتاز</SelectItem>
              <SelectItem value="good">جيد</SelectItem>
              <SelectItem value="fair">متوسط</SelectItem>
              <SelectItem value="poor">ضعيف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
            <SelectTrigger className="w-[250px] bg-[#fffffff2] via-[#fffffff2]/20 to-[#fffffff2]">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue placeholder="نوع المشكلة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المشاكل</SelectItem>
              {issueTypes.slice(1).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search ||
            searchYearFilter !== "all" ||
            searchQualityFilter !== "all" ||
            issueTypeFilter !== "all") && (
            <Button
              onClick={() => {
                setSearch("");
                setSearchYearFilter("all");
                setSearchQualityFilter("all");
                setIssueTypeFilter("all");
              }}
              variant="outline"
              size="sm"
              className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
            >
              <X className="w-4 h-4 ml-2" />
              مسح البحث
            </Button>
          )}

          <div className="flex-1" />

          {reviewedCount > 0 && (
            <>
              <Button
                onClick={exportReviewedReport}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Download className="w-4 h-4 ml-2" />
                تنزيل معلومات الفحص
              </Button>
              <Button
                onClick={handleClearSession}
                variant="outline"
                className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30 hover:text-white"
                size="sm"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                مسح البيانات
              </Button>
            </>
          )}
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 gap-2 bg-[#1a4e67f2] border border-blue-800/50">
            <TabsTrigger
              value="all"
              className="bg-blue-600/50 text-blue-100 cursor-pointer"
            >
              الكل ({totalIndicators})
            </TabsTrigger>
            <TabsTrigger
              value="healthy"
              className="bg-green-600/50 text-lime-200 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 ml-2" />
              سليم ({healthyCount})
            </TabsTrigger>
            <TabsTrigger
              value="issu"
              className="bg-red-600/50 text-red-200 cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 ml-2" />
              بحاجة للفحص ({issuesCount})
            </TabsTrigger>
            <TabsTrigger
              value="reviewed"
              className="bg-yellow-600 text-yellow-200 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 ml-2" />
              تم الفحص ({reviewedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* <div className="flex items-center gap-2 text-xl text-white">
          <Search className="w-4 h-4" />
          <span>
            عرض {indicators.length} من {totalIndicators} مؤشر
          </span>
        </div> */}
      </div>

      {editMode ? (
        <DataEditor
          indicatorName={editMode}
          data={modifiedDataMemo
            .filter((d) => d.indicatorName === editMode)
            .map((d) => ({
              year: d.year,
              value: Number(d.value),
              filterName: d.filterName,
            }))}
          onSaveEdits={(edits) => handleSaveEdits(editMode, edits)}
          onCancel={() => setEditMode(null)}
          existingEdits={getIndicatorEdits(editMode)}
        />
      ) : (
        <div className="grid gap-4">
          {indicators.map((indicator) => {
            const ratingConfig = getRatingConfig(indicator.qualityRating);
            const indicatorHasEdits = hasEdits(indicator.name);

            return (
              <Card
                key={indicator.name}
                id={`indicator-${indicator.name}`}
                className={`border-blue-800/50 transition-all duration-300 ${
                  lastOpenedIndicator === indicator.name
                    ? "bg-[#053964] shadow-lg shadow-purple-500/20"
                    : "bg-blue-950/30"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {indicatorHasEdits && (
                        <Badge className="bg-green-900/20 text-sm gap-2 border-green-500/50 text-green-300">
                          <Edit3 className="w-3 h-3 ml-1" />
                          تم التعديل
                        </Badge>
                      )}
                      {indicator.isReviewed ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unmarkAsReviewed(indicator.name)}
                            className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
                          >
                            إعادة الفحص
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openNoteDialog(indicator.name)}
                            className="bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30"
                          >
                            <StickyNote className="w-4 h-4 ml-2" />
                            {indicator.reviewedNotes
                              ? "تعديل الملاحظة "
                              : "إضافة ملاحظة"}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNoteDialog(indicator.name)}
                          className="bg-green-600/20 border-green-500/50 cursor-pointer text-green-300 hover:bg-green-600/30 hover:text-green"
                        >
                          <CheckCheck className="w-4 h-4 ml-2" />
                          تأكيد الفحص
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditMode(indicator.name)}
                        className="bg-yellow-600/20 border-yellow-500/50 text-yellow-300  hover:text-yellow  hover:bg-yellow-600/30"
                      >
                        <Edit3 className="w-4 h-4 ml-2" />
                        تعديل البيانات
                      </Button>

                      <Badge className={`${ratingConfig.color} border text-sm`}>
                        {ratingConfig.icon} {ratingConfig.label} -{" "}
                        {indicator.qualityScore}
                      </Badge>
                    </div>

                    {/* Indicator Name and Toggle button */}
                    <div
                      className="  cursor-pointer flex items-center gap-2"
                      onClick={() => toggleExpand(indicator.name)}
                    >
                      <div>
                        <CardTitle className="text-lg text-blue-100">
                          {indicator.name}
                        </CardTitle>
                        {indicator.reviewedNotes && (
                          <p className="text-blue-400 mt-1 text-xl flex flex-row-reverse items-center gap-1">
                            <StickyNote className="w-3 h-3" />
                            {indicator.reviewedNotes}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform text-blue-400 ${
                          expandedIndicators.has(indicator.name)
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-800/40">
                      <p className="text-blue-300 text-xs">عدد الصفوف</p>
                      <p className="text-2xl font-semibold text-blue-100 mt-1">
                        {indicator.rowCount}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-800/40">
                      <p className="text-blue-300 text-sm">
                        عدد المؤشرات الفرعية{" "}
                      </p>
                      <p className="text-2xl font-semibold text-blue-100 mt-1">
                        {indicator.filters.length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-800/40">
                      <p className="text-blue-300 text-sm">عدد السنوات</p>
                      <p className="text-2xl font-semibold text-blue-100 mt-1">
                        {indicator.yearsCount}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-800/40">
                      <p className="text-blue-300 text-sm">درجة الجودة</p>
                      <p
                        className={`text-2xl font-semibold mt-1 ${
                          indicator.qualityScore >= 95
                            ? "text-green-400"
                            : indicator.qualityScore >= 80
                            ? "text-blue-400"
                            : indicator.qualityScore >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}
                      >
                        {indicator.qualityScore}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-800/40">
                      <p className="text-blue-300 text-sm">الحالة</p>
                      <div className="flex items-center flex-row-reverse gap-2 mt-1">
                        {indicator.hasIssues ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-300 text-sm">
                              بحاجة للفحص
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-300 text-sm">سليم</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {indicator.hasIssues && (
                    <div className="flex items-center gap-2 mb-4">
                      {indicator.issuesBreakdown.critical > 0 && (
                        <Badge className="bg-red-500/20 text-sm border-red-500/50 text-red-300">
                          خطأ: {indicator.issuesBreakdown.critical}
                        </Badge>
                      )}
                      {indicator.issuesBreakdown.warning > 0 && (
                        <Badge className="bg-yellow-500/20 text-sm border-yellow-500/50 text-yellow-300">
                          تحذير: {indicator.issuesBreakdown.warning}
                        </Badge>
                      )}
                      {indicator.issuesBreakdown.info > 0 && (
                        <Badge className="bg-blue-500/20 text-sm border-blue-500/50 text-blue-300">
                          معلومة: {indicator.issuesBreakdown.info}
                        </Badge>
                      )}
                    </div>
                  )}

                  {expandedIndicators.has(indicator.name) && (
                    <div className="mt-4 space-y-2 border-t border-blue-800/30 pt-4">
                      <IndicatorTimelineChart
                        indicatorName={indicator.name}
                        data={indicator.timeSeriesData}
                        anomalies={indicator.outliers}
                        issues={indicator.issues}
                        onDataEdit={(edits) =>
                          handleChartDataEdit(indicator.name, edits)
                        }
                        onCollapse={() =>
                          handleCollapseIndicator(indicator.name)
                        }
                        onIssueStatusChange={handleIssueStatusChange} // Pass callback
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="bg-blue-950 border-blue-800/50 text-blue-100">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظات للمؤشر</DialogTitle>
            <DialogDescription className="text-blue-300">
              {currentIndicator}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="اكتب ملاحظاتك هنا... (اختياري)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="bg-blue-950/40 border-blue-800/50 text-blue-100 min-h-[120px]"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setNoteDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={() =>
                  currentIndicator && markAsReviewed(currentIndicator)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                تأكيد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
