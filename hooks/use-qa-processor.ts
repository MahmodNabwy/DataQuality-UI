"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { processQA } from "@/lib/qa-engine"
import type { QAResults } from "@/lib/qa-engine"
import type { EditSession, AuditTrail } from "@/lib/storage"

export function useQAProcessor() {
  const [data, setData] = useState<any[] | null>(null)
  const [qaResults, setQaResults] = useState<QAResults | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [originalFileName, setOriginalFileName] = useState<string | null>(null)
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)
  const [processingDuration, setProcessingDuration] = useState<number | null>(null)

  const processFile = async (file: File) => {
    console.log("[v0] Starting file upload:", file.name, "Size:", file.size)
    const startTime = Date.now()
    setProcessingStartTime(startTime)
    setIsProcessing(true)
    setOriginalFileName(file.name.replace(/\.[^/.]+$/, ""))
    try {
      const arrayBuffer = await file.arrayBuffer()
      console.log("[v0] File read, parsing with XLSX...")

      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      console.log("[v0] Data parsed:", jsonData.length, "records")

      setData(jsonData)

      console.log("[v0] Running QA checks...")
      const results = processQA(jsonData)
      setQaResults(results)

      const duration = Date.now() - startTime
      setProcessingDuration(duration)

      console.log("[v0] QA complete - Issues found:", results.issues.length, "Duration:", duration, "ms")
    } catch (error) {
      console.error("[v0] Error processing file:", error)
      alert("خطأ في معالجة الملف: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsProcessing(false)
    }
  }

  const setProcessedData = (projectData: any[], projectQaResults: QAResults) => {
    console.log("[v0] Restoring project data:", projectData.length, "records")
    setData(projectData)
    setQaResults(projectQaResults)
  }

  const exportResults = (editSession?: EditSession | null, auditTrail?: AuditTrail | null) => {
    if (!data || !qaResults) {
      console.log("[v0] No data to export")
      return
    }

    console.log("[v0] Starting enhanced export...")
    console.log("[v0] Export - Edit session:", editSession)
    console.log("[v0] Export - Data edits count:", editSession?.dataEdits?.length || 0)

    try {
      const workbook = XLSX.utils.book_new()

      // Sheet 1: Modified Data with edits applied
      if (editSession && editSession.dataEdits && editSession.dataEdits.length > 0) {
        console.log("[v0] Creating modified data sheet with all data and edits applied...")

        const modifiedDataArray = [...data]

        // Apply all edits
        editSession.dataEdits.forEach((edit) => {
          const rowIndex = modifiedDataArray.findIndex(
            (row: any) =>
              row["اسم المؤشر"] === edit.indicatorName &&
              (row["اسم الفلتر"] === edit.filterName || (!row["اسم الفلتر"] && !edit.filterName)) &&
              row["السنة"] === edit.year,
          )

          if (rowIndex >= 0) {
            // Update existing row
            modifiedDataArray[rowIndex] = {
              ...modifiedDataArray[rowIndex],
              القيمة: edit.newValue,
            }
          } else {
            // Create new row for missing data
            const sampleRow = data.find(
              (r: any) => r["اسم المؤشر"] === edit.indicatorName && r["اسم الفلتر"] === edit.filterName,
            )
            if (sampleRow) {
              const newRow = {
                ...sampleRow,
                السنة: edit.year,
                القيمة: edit.newValue,
              }
              modifiedDataArray.push(newRow)
              console.log("[v0] Added new row for missing year in export")
            }
          }
        })

        // Sort the data by indicator, filter, and year for better readability
        modifiedDataArray.sort((a, b) => {
          const indicatorCompare = (a["اسم المؤشر"] || "").localeCompare(b["اسم المؤشر"] || "")
          if (indicatorCompare !== 0) return indicatorCompare

          const filterCompare = (a["اسم الفلتر"] || "").localeCompare(b["اسم الفلتر"] || "")
          if (filterCompare !== 0) return filterCompare

          return (a["السنة"] || 0) - (b["السنة"] || 0)
        })

        const modifiedDataSheet = XLSX.utils.json_to_sheet(modifiedDataArray)
        XLSX.utils.book_append_sheet(workbook, modifiedDataSheet, "البيانات المعدلة")
        console.log("[v0] Added 'البيانات المعدلة' sheet with", modifiedDataArray.length, "rows")
      } else {
        const dataSheet = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(workbook, dataSheet, "البيانات المعدلة")
        console.log("[v0] No modifications - exported original data")
      }

      // Sheet 2: Audit Log
      if (auditTrail && auditTrail.logs && auditTrail.logs.length > 0) {
        const auditData = auditTrail.logs.map((log) => ({
          "التاريخ والوقت": new Date(log.timestamp).toLocaleString("ar-EG"),
          "اسم المستخدم": log.userName,
          "نوع الإجراء":
            log.action === "data_edit"
              ? "تعديل قيمة"
              : log.action === "indicator_rename"
                ? "تعديل اسم"
                : log.action === "issue_resolved"
                  ? "حل مشكلة"
                  : log.action === "issue_dismissed"
                    ? "إلغاء مشكلة"
                    : "إضافة قيمة",
          المؤشر: log.details.indicatorName,
          الفلتر: log.details.filterName || "-",
          السنة: log.details.year || "-",
          الشهر: log.details.month || "-",
          الربع: log.details.quarter || "-",
          "القيمة القديمة": log.details.oldValue !== undefined ? log.details.oldValue : "-",
          "القيمة الجديدة": log.details.newValue !== undefined ? log.details.newValue : "-",
          "رقم الجدول": log.details.tableNumber || "-",
          التعليق: log.details.comment || "-",
        }))

        const auditSheet = XLSX.utils.json_to_sheet(auditData)
        XLSX.utils.book_append_sheet(workbook, auditSheet, "سجل التعديلات")
        console.log("[v0] Added 'سجل التعديلات' sheet")
      }

      // Sheet 3: Problem Summary
      const problemsData = qaResults.issues.map((issue) => ({
        "نوع المشكلة": issue.checkType,
        المؤشر: issue.indicatorName,
        الفلتر: issue.filterName || "-",
        الخطورة: issue.severity === "critical" ? "خطأ" : issue.severity === "warning" ? "تحذير" : "معلومة",
        الرسالة: issue.message,
        التفاصيل: issue.details ? JSON.stringify(issue.details, null, 2) : "",
      }))

      const problemsSheet = XLSX.utils.json_to_sheet(problemsData)
      XLSX.utils.book_append_sheet(workbook, problemsSheet, "ملخص المشاكل")

      // Sheet 4: Original Data
      const dataSheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, dataSheet, "البيانات الأصلية")

      // Sheet 5: QA Summary
      const summaryData = [
        { المقياس: "إجمالي الصفوف", القيمة: data.length },
        { المقياس: "عدد المؤشرات", القيمة: qaResults.summary.totalIndicators },
        { المقياس: "الفحوصات الناجحة", القيمة: qaResults.summary.passedChecks },
        { المقياس: "الفحوصات الفاشلة", القيمة: qaResults.summary.failedChecks },
        {
          المقياس: "معدل النجاح %",
          القيمة: (
            (qaResults.summary.passedChecks / (qaResults.summary.passedChecks + qaResults.summary.failedChecks)) *
            100
          ).toFixed(2),
        },
        {
          المقياس: "وقت الفحص (ثانية)",
          القيمة: processingDuration ? (processingDuration / 1000).toFixed(2) : "غير متاح",
        },
        {
          المقياس: "عدد التعديلات",
          القيمة: editSession?.dataEdits.length || 0,
        },
        {
          المقياس: "درجة الجودة",
          القيمة: qaResults.qualityScore?.overall || "غير متاح",
        },
      ]
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, "ملخص النتائج")

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const fileName = originalFileName
        ? `${originalFileName} - تقرير الجودة.xlsx`
        : `تقرير-الجودة-${new Date().toISOString().split("T")[0]}.xlsx`
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("[v0] Enhanced export completed successfully")
    } catch (error) {
      console.error("[v0] Error during export:", error)
    }
  }

  return {
    data,
    qaResults,
    isProcessing,
    processFile,
    exportResults,
    processingDuration,
    setProcessedData,
  }
}
