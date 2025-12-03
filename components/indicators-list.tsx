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
  FolderOpen,
  AlertTriangle,
  User,
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
import { AuthService } from "@/lib/backend-service";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
  const [auditHistory, setAuditHistory] = useState<AuditHistory[]>([]);
  const [loadingAuditHistory, setLoadingAuditHistory] = useState(false);

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

  const fetchAuditHistory = useCallback(async () => {
    if (!projectId) return;

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
  }, [projectId]);

  // Helper function to check if indicator has audit history
  const hasAuditHistory = useCallback(
    (indicatorName: string) => {
      return auditHistory.some((item) => item.indicatorName === indicatorName);
    },
    [auditHistory]
  );

  // Helper function to get audit history count for indicator
  const getAuditHistoryCount = useCallback(
    (indicatorName: string) => {
      return auditHistory.filter((item) => item.indicatorName === indicatorName)
        .length;
    },
    [auditHistory]
  );

  // Helper function to get the latest audit value for an indicator
  const getLatestAuditValue = useCallback(
    (indicatorName: string, filterName?: string, year?: number) => {
      const indicatorHistory = auditHistory.filter(
        (item) => item.indicatorName === indicatorName
      );

      if (indicatorHistory.length === 0) return null;

      // If filter and year are specified, find exact match first
      if (filterName && year) {
        const exactMatch = indicatorHistory.find(
          (item) => item.filterName === filterName && item.year === year
        );
        if (exactMatch) return exactMatch;
      }

      // Otherwise return the most recent change
      const sorted = indicatorHistory.sort(
        (a, b) =>
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );

      return sorted[0];
    },
    [auditHistory]
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

  // Fetch audit history on component mount
  useEffect(() => {
    fetchAuditHistory();
  }, [fetchAuditHistory]);

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
    return Array.from(new Set(modifiedDataMemo.map((d) => d.indicatorName)))
      .map((name) => {
        const indicatorData = modifiedDataMemo.filter(
          (d) => d.indicatorName === name
        );
        // Get the indicator ID from any data entry for this indicator
        const indicatorId = indicatorData[0]?.id || null;
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
        const indicatorHasAuditHistory = hasAuditHistory(name);
        const auditHistoryCount = getAuditHistoryCount(name);
        const latestAuditValue = getLatestAuditValue(name);

        return {
          id: indicatorId,
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
          hasAuditHistory: indicatorHasAuditHistory,
          auditHistoryCount,
          latestAuditValue,
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
    hasAuditHistory,
    getAuditHistoryCount,
    getLatestAuditValue,
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
          color: "bg-blue-500  border-blue-500/50 text-blue-300",
          icon: "✨",
        };
      case "fair":
        return {
          label: "متوسط",
          color: "bg-yellow-500 border-yellow-500/50 text-yellow-300",
          icon: "⚡",
        };
      case "poor":
        return {
          label: "ضعيف",
          color: "bg-red-500/20 border-red-500/50 text-red-500",
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 space-y-8 p-6">
      <Card className="border border-blue-200 bg-linear-to-br from-white/95 to-blue-50/95 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-linear-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <Percent className="w-8 h-8 text-white" />
              </div>
              <p className="text-purple-100 text-sm mb-3 font-medium">
                تقدم الفحص
              </p>
              <div className="relative pt-2">
                <div className="overflow-hidden h-3 text-xs flex rounded-full bg-white/20 border border-white/30">
                  <div
                    style={{ width: `${progressPercentage}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-linear-to-r from-green-400 to-emerald-500 transition-all duration-500 rounded-full"
                  />
                </div>
                <p className="text-2xl font-bold text-white mt-3">
                  {reviewedCount} / {totalIndicators}
                </p>
                <p className="text-purple-100 text-sm font-medium">
                  {progressPercentage.toFixed(1)}% مكتمل
                </p>
              </div>
            </div>
            <div className="text-center p-6 bg-linear-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {healthyCount}
              </p>
              <p className="text-green-100 text-sm font-semibold">
                مؤشرات سليمة
              </p>
            </div>
            <div className="text-center p-6 bg-linear-to-br from-red-500 to-pink-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {issuesCount}
              </p>
              <p className="text-red-100 text-sm font-semibold">تحتاج فحص</p>
            </div>
            <div className="text-center p-6 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCheck className="w-8 h-8 text-white" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {reviewedCount}
              </p>
              <p className="text-blue-100 text-sm font-semibold">تم الفحص</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* عدد التعديلات */}
      {editSession.dataEdits.length > 0 && (
        <Card className="border border-orange-200 bg-linear-to-br from-white/95 to-orange-50/95 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center flex-row-reverse justify-between p-6 bg-linear-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200 shadow-lg">
              <div className="flex flex-row-reverse items-center gap-4">
                <div className="w-14 h-14 bg-linear-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Edit3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-800 mb-1">
                    لديك {editSession.dataEdits.length} تعديل محفوظ
                  </p>
                  <p className="text-sm text-orange-600 font-medium">
                    تم تطبيق التعديلات على البيانات والرسومات البيانية
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={exportEditedData}
                  className="bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل التعديلات
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-linear-to-br from-white/95 to-blue-50/95 rounded-3xl shadow-2xl border border-blue-200 p-8 space-y-8 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative md:col-span-2">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400" />
            <Input
              placeholder="ابحث عن المؤشرات (عربي/إنجليزي)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/80 border-blue-200 pr-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 shadow-md hover:shadow-lg transition-all duration-300 h-12 text-lg"
            />
          </div>

          <Select value={searchYearFilter} onValueChange={setSearchYearFilter}>
            <SelectTrigger className="bg-white/80 rtl border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 shadow-md hover:shadow-lg transition-all duration-300 h-12">
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
            <SelectTrigger className="bg-white/80 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 shadow-md hover:shadow-lg transition-all duration-300 h-12 cursor-pointer">
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

        <div className="flex gap-4 items-center">
          <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
            <SelectTrigger className="w-[280px] bg-white/80 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 shadow-md hover:shadow-lg transition-all duration-300 h-12">
              <Filter className="w-5 h-5 ml-2 text-blue-500" />
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
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              مسح البحث
            </Button>
          )}

          <div className="flex-1" />

          {reviewedCount > 0 && (
            <>
              <Button
                onClick={exportReviewedReport}
                className="bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg transition-all duration-200 flex items-center gap-2"
                size="sm"
              >
                <Download className="w-4 h-4" />
                تنزيل معلومات الفحص
              </Button>
              <Button
                onClick={handleClearSession}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold shadow-sm transition-all duration-200 flex items-center gap-2"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
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
          <TabsList className="grid w-full grid-cols-4 gap-3 bg-blue-50/50 rounded-2xl shadow-lg border border-blue-200   backdrop-blur-sm">
            <TabsTrigger
              value="all"
              className="cursor-pointer data-[state=active]:bg-linear-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300 flex items-center gap-2   hover:bg-blue-100"
            >
              <FolderOpen className="w-4 h-4" />
              الكل ({totalIndicators})
            </TabsTrigger>
            <TabsTrigger
              value="healthy"
              className="cursor-pointer data-[state=active]:bg-linear-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300 flex items-center gap-2   hover:bg-green-100"
            >
              <CheckCircle className="w-4 h-4" />
              سليم ({healthyCount})
            </TabsTrigger>
            <TabsTrigger
              value="issues"
              className="cursor-pointer data-[state=active]:bg-linear-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300 flex items-center gap-2   hover:bg-red-100"
            >
              <AlertCircle className="w-4 h-4" />
              بحاجة للفحص ({issuesCount})
            </TabsTrigger>
            <TabsTrigger
              value="reviewed"
              className="cursor-pointer data-[state=active]:bg-linear-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300 flex items-center gap-2   hover:bg-purple-100"
            >
              <CheckCheck className="w-4 h-4" />
              تم الفحص ({reviewedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {editMode ? (
        <DataEditor
          key={"Data Editor-Indicator List"}
          indicatorName={editMode}
          data={modifiedDataMemo
            .filter((d) => d.indicatorName === editMode)
            .map((d) => ({
              year: d.year,
              value: Number(d.value),
              filterName: d.filterName,
              id: d.id, // Include the ID for each data entry
            }))}
          onSaveEdits={(edits) => handleSaveEdits(editMode, edits)}
          onCancel={() => setEditMode(null)}
          existingEdits={getIndicatorEdits(editMode)}
          projectId={projectId}
          indicatorId={
            // Find the first data entry for this indicator to get its ID
            modifiedDataMemo.find((d) => d.indicatorName === editMode)?.id ||
            editMode
          }
        />
      ) : (
        <div className="grid gap-6">
          {indicators.map((indicator) => {
            const ratingConfig = getRatingConfig(indicator.qualityRating);
            const indicatorHasEdits = hasEdits(indicator.name);

            return (
              <Card
                key={indicator.name}
                id={`indicator-${indicator.name}`}
                className={`border border-blue-200 transition-all duration-300 shadow-xl hover:shadow-2xl rounded-2xl overflow-hidden ${
                  lastOpenedIndicator === indicator.name
                    ? "bg-linear-to-br from-white to-blue-50 ring-2 ring-blue-400 ring-opacity-60 shadow-blue-400/20"
                    : "bg-linear-to-br from-white/95 to-blue-50/95 hover:from-white hover:to-blue-100/50"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {indicatorHasEdits && (
                        <Badge className="bg-linear-to-r from-blue-100 to-indigo-100 text-sm gap-2 border-blue-200 text-blue-700 font-semibold shadow-sm">
                          <Edit3 className="w-3 h-3" />
                          تم التعديل
                        </Badge>
                      )}
                      {indicator.hasAuditHistory && (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-linear-to-r from-purple-100 to-violet-100 border-purple-200 text-purple-700 text-sm gap-2 font-semibold shadow-sm">
                            <History className="w-3 h-3" />
                            تعديل {indicator.auditHistoryCount}
                          </Badge>
                        </div>
                      )}
                      {indicator.isReviewed ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unmarkAsReviewed(indicator.name)}
                            className="border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                          >
                            إعادة الفحص
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openNoteDialog(indicator.name)}
                            className="bg-linear-to-r from-purple-100 to-violet-100 border-purple-200 text-purple-700 hover:from-purple-200 hover:to-violet-200 hover:text-purple-800 font-semibold shadow-sm transition-all duration-200"
                          >
                            <StickyNote className="w-4 h-4" />
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
                          className="bg-linear-to-r from-green-100 to-emerald-100 border-green-200 text-green-700 hover:from-green-200 hover:to-emerald-200 hover:text-green-800 font-semibold shadow-sm transition-all duration-200"
                        >
                          <CheckCheck className="w-4 h-4" />
                          تأكيد الفحص
                        </Button>
                      )}
                      {!indicator.isReviewed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditMode(indicator.name)}
                          className="bg-linear-to-r from-orange-100 to-amber-100 border-orange-200 text-orange-700 hover:from-orange-200 hover:to-amber-200 hover:text-orange-800 font-semibold shadow-sm transition-all duration-200"
                        >
                          <Edit3 className="w-4 h-4" />
                          تعديل البيانات
                        </Button>
                      )}

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
                        <CardTitle className="text-xl font-bold text-gray-700 mb-2">
                          {indicator.name}
                        </CardTitle>
                        {indicator.reviewedNotes && (
                          <div className="inline-flex items-center gap-2 px-3 py-2 bg-linear-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl text-purple-700 font-medium shadow-sm">
                            <StickyNote className="w-4 h-4" />
                            <span className="text-sm">
                              {indicator.reviewedNotes}
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-6 h-6 transition-transform text-blue-400 ${
                          expandedIndicators.has(indicator.name)
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-gray-600 text-sm font-medium mb-2">
                        عدد الصفوف
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {indicator.rowCount}
                      </p>
                    </div>
                    <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-gray-600 text-sm font-medium mb-2">
                        عدد المؤشرات الفرعية
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {indicator.filters.length}
                      </p>
                    </div>
                    <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-gray-600 text-sm font-medium mb-2">
                        عدد السنوات
                      </p>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-gray-800">
                          {indicator.yearsCount} /{" "}
                          {indicator.years.length > 0
                            ? Math.max(...indicator.years) -
                              Math.min(...indicator.years) +
                              1
                            : 0}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-gray-600 text-sm font-medium mb-2">
                        درجة الجودة
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          indicator.qualityScore >= 95
                            ? "text-green-600"
                            : indicator.qualityScore >= 80
                            ? "text-blue-600"
                            : indicator.qualityScore >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {indicator.qualityScore}
                      </p>
                    </div>
                    <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-gray-600 text-sm font-medium mb-2">
                        الحالة
                      </p>
                      <div className="flex items-center flex-row-reverse gap-2">
                        {indicator.hasIssues ? (
                          <>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-600 text-sm font-medium">
                              بحاجة للفحص
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-green-600 text-sm font-medium">
                              سليم
                            </span>
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
                        <Badge className="bg-yellow-600 text-sm border-yellow-500 text-yellow-200">
                          تحذير: {indicator.issuesBreakdown.warning}
                        </Badge>
                      )}
                      {indicator.issuesBreakdown.info > 0 && (
                        <Badge className="bg-blue-600 text-sm border-blue-500 text-blue-200">
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
                        auditHistory={auditHistory}
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
        <DialogContent className="bg-linear-to-br from-white to-blue-50 border border-blue-200 text-blue-900 shadow-2xl rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">
              إضافة ملاحظات للمؤشر
            </DialogTitle>
            <DialogDescription className="text-blue-600 font-medium text-lg">
              {currentIndicator}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <Textarea
              placeholder="اكتب ملاحظاتك هنا... (اختياري)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="bg-white/80 border-blue-200 text-blue-900 min-h-[120px] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-400 shadow-md"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setNoteDialogOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-200 rounded-xl px-6 py-3 shadow-md hover:shadow-lg"
              >
                إلغاء
              </Button>
              <Button
                onClick={() =>
                  currentIndicator && markAsReviewed(currentIndicator)
                }
                className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg transition-all duration-200 rounded-xl px-6 py-3 hover:shadow-xl"
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
