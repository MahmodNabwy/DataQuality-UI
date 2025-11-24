"use client"

import { useState, useEffect } from "react"
import * as XLSX from "xlsx"
import { processQA } from "@/lib/qa-engine"
import type { QAResults } from "@/lib/qa-engine"
import { 
  useBackendIntegration, 
  FileAnalysisService, 
  ProjectService,
  AuthService,
  type BackendQAResults,
  type BackendProject
} from "@/lib/backend-service"
import { useToast } from "@/hooks/use-toast"

export function useBackendQAProcessor() {
  const [data, setData] = useState<any[] | null>(null)
  const [qaResults, setQaResults] = useState<QAResults | null>(null)
  const [backendQAResults, setBackendQAResults] = useState<BackendQAResults | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [originalFileName, setOriginalFileName] = useState<string | null>(null)
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)
  const [processingDuration, setProcessingDuration] = useState<number | null>(null)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [isBackendMode, setIsBackendMode] = useState(false)
  
  const { isBackendAvailable } = useBackendIntegration()
  const { toast } = useToast()

  // Check backend availability on mount
  useEffect(() => {
    checkBackendStatus()
  }, [])

  const checkBackendStatus = async () => {
    try {
      const available = await isBackendAvailable()
      setIsBackendMode(available && AuthService.getTokenFromSession() !== null)
      
      if (available && !AuthService.getTokenFromSession()) {
        toast({
          title: "Backend متاح",
          description: "يمكنك تسجيل الدخول للاستفادة من المزيد من المميزات",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error checking backend status:', error)
      setIsBackendMode(false)
    }
  }

  const processFileWithBackend = async (file: File): Promise<{data: any[], qaResults: QAResults, backendQAResults?: BackendQAResults}> => {
    console.log("[Backend] Processing file with backend QA engine...")
    
    // First analyze with backend
    const backendResult = await FileAnalysisService.uploadAndAnalyze(file)
    
    if (!backendResult.success) {
      throw new Error(backendResult.error || 'Backend analysis failed')
    }

    // Parse the file locally for data
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    // Also run local QA for comparison
    const localQAResults = processQA(jsonData)

    // Convert backend results to local format
    const combinedResults: QAResults = {
      issues: [
        ...localQAResults.issues,
        ...(backendResult.data?.issues?.map(issue => ({
          id: issue.id,
          checkType: issue.checkType,
          indicatorName: issue.indicatorName,
          filterName: issue.filterName,
          severity: issue.severity,
          message: `[Backend] ${issue.message}`,
          details: issue.details
        })) || [])
      ],
      summary: {
        totalIndicators: Math.max(localQAResults.summary.totalIndicators, backendResult.data?.summary?.totalIndicators || 0),
        passedChecks: localQAResults.summary.passedChecks + (backendResult.data?.summary?.passedChecks || 0),
        failedChecks: localQAResults.summary.failedChecks + (backendResult.data?.summary?.failedChecks || 0),
      },
      qualityScore: {
        overall: Math.min(localQAResults.qualityScore?.overall || 0, backendResult.data?.summary?.qualityScore || 0)
      }
    }

    return {
      data: jsonData,
      qaResults: combinedResults,
      backendQAResults: backendResult.data
    }
  }

  const processFileLocally = async (file: File): Promise<{data: any[], qaResults: QAResults}> => {
    console.log("[Local] Processing file with local QA engine...")
    
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    const results = processQA(jsonData)

    return {
      data: jsonData,
      qaResults: results
    }
  }

  const processFile = async (file: File) => {
    console.log("[QA] Starting file processing:", file.name, "Mode:", isBackendMode ? "Backend" : "Local")
    
    const startTime = Date.now()
    setProcessingStartTime(startTime)
    setIsProcessing(true)
    setOriginalFileName(file.name.replace(/\.[^/.]+$/, ""))
    setCurrentProjectId(null)

    try {
      let processedData: {data: any[], qaResults: QAResults, backendQAResults?: BackendQAResults}

      if (isBackendMode) {
        try {
          processedData = await processFileWithBackend(file)
          setBackendQAResults(processedData.backendQAResults || null)
          
          toast({
            title: "تم التحليل بنجاح",
            description: "تم تحليل الملف باستخدام محرك الجودة المحسن",
            variant: "default"
          })
        } catch (backendError) {
          console.warn('[QA] Backend processing failed, falling back to local:', backendError)
          processedData = await processFileLocally(file)
          setIsBackendMode(false)
          
          toast({
            title: "تحذير",
            description: "تم استخدام المحرك المحلي بدلاً من الخادم",
            variant: "destructive"
          })
        }
      } else {
        processedData = await processFileLocally(file)
      }

      console.log("[QA] Data parsed:", processedData.data.length, "records")
      setData(processedData.data)
      setQaResults(processedData.qaResults)

      const duration = Date.now() - startTime
      setProcessingDuration(duration)

      console.log("[QA] Processing complete - Issues:", processedData.qaResults.issues.length, "Duration:", duration, "ms")

      // Auto-create project if backend is available
      if (isBackendMode && AuthService.getTokenFromSession()) {
        try {
          const projectResult = await ProjectService.createProject(
            file.name,
            file.size,
            processedData.data,
            processedData.qaResults
          )

          if (projectResult.success && projectResult.data) {
            setCurrentProjectId(projectResult.data.id)
            console.log("[QA] Project created in backend:", projectResult.data.id)
            
            toast({
              title: "تم إنشاء المشروع",
              description: "تم حفظ المشروع في قاعدة البيانات",
              variant: "default"
            })
          }
        } catch (error) {
          console.error('[QA] Failed to create backend project:', error)
        }
      }

    } catch (error) {
      console.error("[QA] Error processing file:", error)
      toast({
        title: "خطأ في المعالجة",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const setProcessedData = (projectData: any[], projectQaResults: QAResults, projectId?: string) => {
    console.log("[QA] Restoring project data:", projectData.length, "records")
    setData(projectData)
    setQaResults(projectQaResults)
    setCurrentProjectId(projectId || null)
  }

  const updateProjectData = async (newData: any[]) => {
    if (!currentProjectId || !isBackendMode) {
      console.log("[QA] No backend project to update")
      return
    }

    try {
      // Re-analyze the modified data
      const reanalysisResult = await FileAnalysisService.analyzeData(newData)
      
      if (reanalysisResult.success && reanalysisResult.data) {
        // Update the project in backend
        await ProjectService.updateProject(currentProjectId, {
          modifiedData: newData,
          qaResults: reanalysisResult.data
        })

        // Update local state
        setBackendQAResults(reanalysisResult.data)
        
        toast({
          title: "تم التحديث",
          description: "تم تحديث المشروع وإعادة تحليل البيانات",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('[QA] Failed to update project data:', error)
      toast({
        title: "خطأ في التحديث",
        description: "فشل في تحديث المشروع",
        variant: "destructive"
      })
    }
  }

  const exportResults = async () => {
    if (!data || !qaResults) {
      console.log("[QA] No data to export")
      return
    }

    try {
      const workbook = XLSX.utils.book_new()

      // Enhanced export with backend data if available
      if (backendQAResults) {
        // Backend Analysis Results Sheet
        const backendIssuesData = backendQAResults.issues.map(issue => ({
          "نوع المشكلة": issue.checkType,
          "المؤشر": issue.indicatorName,
          "الفلتر": issue.filterName || "-",
          "الخطورة": issue.severity === "critical" ? "خطأ" : 
                    issue.severity === "warning" ? "تحذير" : "معلومة",
          "الرسالة": issue.message,
          "المصدر": "محرك الخادم"
        }))

        const backendSheet = XLSX.utils.json_to_sheet(backendIssuesData)
        XLSX.utils.book_append_sheet(workbook, backendSheet, "تحليل الخادم")

        // Statistics Sheet
        if (backendQAResults.statistics) {
          const statsData = [
            { "النوع": "القيم الشاذة", "العدد": backendQAResults.statistics.outliers?.length || 0 },
            { "النوع": "القيم المفقودة", "العدد": backendQAResults.statistics.missingValues?.length || 0 },
            { "النوع": "القيم المكررة", "العدد": backendQAResults.statistics.duplicates?.length || 0 },
            { "النوع": "الفجوات الزمنية", "العدد": backendQAResults.statistics.gaps?.length || 0 }
          ]
          
          const statsSheet = XLSX.utils.json_to_sheet(statsData)
          XLSX.utils.book_append_sheet(workbook, statsSheet, "الإحصائيات")
        }
      }

      // Local Analysis Results
      const localIssuesData = qaResults.issues.map(issue => ({
        "نوع المشكلة": issue.checkType,
        "المؤشر": issue.indicatorName,
        "الفلتر": issue.filterName || "-",
        "الخطورة": issue.severity === "critical" ? "خطأ" : 
                  issue.severity === "warning" ? "تحذير" : "معلومة",
        "الرسالة": issue.message,
        "المصدر": "محرك محلي"
      }))

      const localSheet = XLSX.utils.json_to_sheet(localIssuesData)
      XLSX.utils.book_append_sheet(workbook, localSheet, "التحليل المحلي")

      // Original Data
      const dataSheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, dataSheet, "البيانات الأصلية")

      // Summary Sheet
      const summaryData = [
        { "المقياس": "إجمالي الصفوف", "القيمة": data.length },
        { "المقياس": "عدد المؤشرات", "القيمة": qaResults.summary.totalIndicators },
        { "المقياس": "الفحوصات الناجحة", "القيمة": qaResults.summary.passedChecks },
        { "المقياس": "الفحوصات الفاشلة", "القيمة": qaResults.summary.failedChecks },
        { "المقياس": "نوع التحليل", "القيمة": isBackendMode ? "خادم + محلي" : "محلي فقط" },
        { "المقياس": "معرف المشروع", "القيمة": currentProjectId || "غير محفوظ" }
      ]

      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, "الملخص")

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const fileName = originalFileName
        ? `${originalFileName} - تقرير شامل.xlsx`
        : `تقرير-شامل-${new Date().toISOString().split("T")[0]}.xlsx`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("[QA] Enhanced export completed")
      
      toast({
        title: "تم التصدير",
        description: "تم تصدير التقرير الشامل بنجاح",
        variant: "default"
      })

    } catch (error) {
      console.error("[QA] Error during export:", error)
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير التقرير",
        variant: "destructive"
      })
    }
  }

  const switchToBackendMode = async () => {
    const available = await isBackendAvailable()
    const hasToken = AuthService.getToken() !== null
    
    if (available && hasToken) {
      setIsBackendMode(true)
      toast({
        title: "تم التبديل",
        description: "سيتم استخدام محرك الخادم للتحليل",
        variant: "default"
      })
    } else {
      toast({
        title: "غير متاح",
        description: available ? "يرجى تسجيل الدخول أولاً" : "الخادم غير متاح حالياً",
        variant: "destructive"
      })
    }
  }

  const switchToLocalMode = () => {
    setIsBackendMode(false)
    toast({
      title: "تم التبديل",
      description: "سيتم استخدام المحرك المحلي للتحليل",
      variant: "default"
    })
  }

  return {
    data,
    qaResults,
    backendQAResults,
    isProcessing,
    processFile,
    exportResults,
    processingDuration,
    setProcessedData,
    updateProjectData,
    currentProjectId,
    isBackendMode,
    switchToBackendMode,
    switchToLocalMode,
    checkBackendStatus
  }
}