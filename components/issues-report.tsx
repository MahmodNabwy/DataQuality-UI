"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle } from "lucide-react"
import type { QAResults } from "@/lib/qa-engine"
import type { IssueStatus } from "@/lib/storage"

interface IssuesReportProps {
  results: QAResults
  issueStatuses?: IssueStatus[]
  onIssueStatusChange?: (
    issueId: string,
    status: "resolved" | "dismissed",
    metadata?: { tableNumber?: string; comment?: string },
  ) => void
  userName?: string
}

export default function IssuesReport({
  results,
  issueStatuses = [],
  onIssueStatusChange,
  userName,
}: IssuesReportProps) {
  const [dismissDialog, setDismissDialog] = useState<{ open: boolean; issueId?: string; issueData?: any }>({
    open: false,
  })
  const [tableNumber, setTableNumber] = useState("")
  const [comment, setComment] = useState("")

  const activeIssues = results.issues.filter((issue) => {
    const status = issueStatuses.find((s) => s.issueId === issue.id)
    return !status || status.status === "active"
  })

  const grouped = activeIssues.reduce(
    (acc, issue) => {
      const type = issue.checkType
      if (!acc[type]) acc[type] = []
      acc[type].push(issue)
      return acc
    },
    {} as Record<string, typeof activeIssues>,
  )

  const getIssueStatus = (issueId?: string): IssueStatus | undefined => {
    if (!issueId) return undefined
    return issueStatuses.find((s) => s.issueId === issueId)
  }

  const handleMarkResolved = (issueId?: string) => {
    if (!issueId || !onIssueStatusChange) return
    onIssueStatusChange(issueId, "resolved")
  }

  const handleOpenDismissDialog = (issue: any) => {
    setDismissDialog({ open: true, issueId: issue.id, issueData: issue })
    setTableNumber("")
    setComment("")
  }

  const handleDismissIssue = () => {
    if (!dismissDialog.issueId || !onIssueStatusChange) return

    if (!tableNumber.trim() || !comment.trim()) {
      alert("الرجاء إدخال رقم الجدول والتعليق")
      return
    }

    onIssueStatusChange(dismissDialog.issueId, "dismissed", {
      tableNumber: tableNumber.trim(),
      comment: comment.trim(),
    })

    setDismissDialog({ open: false })
    setTableNumber("")
    setComment("")
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-gradient-to-br from-red-600/20 to-red-700/20 border-red-600/40 hover:border-red-500/60"
      case "warning":
        return "bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border-yellow-600/40 hover:border-yellow-500/60"
      case "info":
        return "bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-600/40 hover:border-blue-500/60"
      default:
        return "bg-gradient-to-br from-slate-600/20 to-slate-700/20 border-slate-600/40"
    }
  }

  const severityTextColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-300"
      case "warning":
        return "text-yellow-300"
      case "info":
        return "text-blue-300"
      default:
        return "text-slate-300"
    }
  }

  const totalOriginalIssues = results.issues.length
  const resolvedCount = issueStatuses.filter((s) => s.status === "resolved").length
  const dismissedCount = issueStatuses.filter((s) => s.status === "dismissed").length
  const activeCount = activeIssues.length

  return (
    <div className="space-y-8">
      {(resolvedCount > 0 || dismissedCount > 0) && (
        <Card className="border-blue-800/50 bg-gradient-to-br from-blue-900/40 to-blue-950/40 backdrop-blur">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-blue-100 mb-4">تقدم حل المشاكل</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-300">{totalOriginalIssues}</div>
                <div className="text-sm text-blue-400 mt-1">إجمالي المشاكل</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300">{resolvedCount}</div>
                <div className="text-sm text-green-400 mt-1">تم الحل</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-300">{dismissedCount}</div>
                <div className="text-sm text-gray-400 mt-1">تم الإلغاء</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-300">{activeCount}</div>
                <div className="text-sm text-amber-400 mt-1">نشطة</div>
              </div>
            </div>
            {totalOriginalIssues > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-blue-300 mb-2">
                  <span>نسبة الإنجاز</span>
                  <span>{Math.round(((resolvedCount + dismissedCount) / totalOriginalIssues) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-950/50 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${((resolvedCount + dismissedCount) / totalOriginalIssues) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).length === 0 ? (
        <Card className="border-green-700/50 bg-gradient-to-br from-green-900/40 to-green-950/40 backdrop-blur">
          <CardContent className="pt-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-2xl font-semibold text-green-300 mb-2">✓ ممتاز!</p>
            <p className="text-green-200">
              {totalOriginalIssues > 0
                ? `تم حل جميع المشاكل! (${resolvedCount} محلولة، ${dismissedCount} ملغاة)`
                : "لم يتم اكتشاف أي مشاكل في البيانات"}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([checkType, issues]) => (
          <div key={checkType} className="space-y-4">
            <div className="flex items-center gap-3 px-2 py-1">
              <h3 className="text-lg font-semibold text-blue-100">{checkType}</h3>
              <Badge className="bg-blue-600 text-white">{issues.length}</Badge>
            </div>

            <div className="grid gap-3">
              {issues.map((issue, idx) => {
                const status = getIssueStatus(issue.id)
                return (
                  <Card key={idx} className={`border transition-all hover:shadow-md ${severityColor(issue.severity)}`}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-blue-100">{issue.indicatorName}</p>
                            {issue.filterName && (
                              <p className="text-xs text-blue-300 mt-1">الفلتر: {issue.filterName}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${severityTextColor(issue.severity)}`}>
                              {issue.severity === "critical"
                                ? "حرج"
                                : issue.severity === "warning"
                                  ? "تحذير"
                                  : "معلومة"}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-blue-200 mt-3">{issue.message}</p>

                        {issue.details && (
                          <div className="mt-3 p-3 bg-black/40 rounded border border-blue-800/50 text-xs font-mono text-blue-300 overflow-x-auto">
                            <pre>{JSON.stringify(issue.details, null, 2)}</pre>
                          </div>
                        )}

                        {onIssueStatusChange && (
                          <div className="flex gap-2 mt-4 pt-3 border-t border-blue-800/30">
                            <Button
                              onClick={() => handleMarkResolved(issue.id)}
                              size="sm"
                              className="gap-2 bg-green-600/80 hover:bg-green-600 text-white"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              تم الحل
                            </Button>
                            <Button
                              onClick={() => handleOpenDismissDialog(issue)}
                              size="sm"
                              variant="outline"
                              className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              <XCircle className="w-4 h-4" />
                              إلغاء المشكلة
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))
      )}

      <Dialog open={dismissDialog.open} onOpenChange={(open) => setDismissDialog({ open })}>
        <DialogContent className="bg-slate-900 border-blue-800/50">
          <DialogHeader>
            <DialogTitle className="text-blue-100">إلغاء المشكلة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tableNumber" className="text-blue-200">
                رقم الجدول <span className="text-red-400">*</span>
              </Label>
              <Input
                id="tableNumber"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="أدخل رقم الجدول في المصدر"
                className="bg-slate-800 border-blue-700/50 text-blue-100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-blue-200">
                التعليق <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اشرح سبب إلغاء هذه المشكلة (مثلاً: القيمة صحيحة في المصدر)"
                className="bg-slate-800 border-blue-700/50 text-blue-100 min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialog({ open: false })}>
              إلغاء
            </Button>
            <Button onClick={handleDismissIssue} className="bg-blue-600 hover:bg-blue-700">
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
