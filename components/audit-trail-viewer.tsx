"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, User, Edit3, Plus, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'
import type { AuditLogEntry } from "@/lib/storage"
import { IndicatorTimelineChart } from "@/components/indicator-timeline-chart"

interface AuditTrailViewerProps {
  logs: AuditLogEntry[]
  data?: any[]
  qaResults?: any[]
}

export function AuditTrailViewer({ logs, data, qaResults }: AuditTrailViewerProps) {
  const [expandedCharts, setExpandedCharts] = useState<Set<string>>(new Set())

  if (logs.length === 0) {
    return (
      <Card className="border-blue-800/50 bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-blue-100">سجل التدقيق</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-blue-300 py-8">لا توجد تعديلات مسجلة بعد</p>
        </CardContent>
      </Card>
    )
  }

  // Group logs by Indicator -> Filter
  const groupedLogs = logs.reduce((acc, log) => {
    const indicatorName = log.details.indicatorName
    const filterName = log.details.filterName || "عام"

    if (!acc[indicatorName]) {
      acc[indicatorName] = {}
    }
    if (!acc[indicatorName][filterName]) {
      acc[indicatorName][filterName] = []
    }
    acc[indicatorName][filterName].push(log)
    return acc
  }, {} as Record<string, Record<string, AuditLogEntry[]>>)

  const toggleChart = (key: string) => {
    const newExpanded = new Set(expandedCharts)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedCharts(newExpanded)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ar-EG", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getChartData = (indicatorName: string, filterName: string) => {
    if (!data) return null
    
    const indicatorData = data.find(d => d.indicator === indicatorName)
    if (!indicatorData) return null

    // Filter data for specific filter
    const filteredData = indicatorData.data.filter((d: any) => d.filterName === filterName)
    
    // Get anomalies and issues if available
    let anomalies: any[] = []
    let issues: any[] = []
    
    if (qaResults) {
      const indicatorResult = qaResults.find(r => r.indicatorName === indicatorName)
      if (indicatorResult) {
        anomalies = indicatorResult.anomalies.filter((a: any) => 
          // We can't easily filter anomalies by filterName without more info, 
          // but usually they are tied to data points. 
          // For now, we'll pass all and let the chart handle it or filter if possible.
          // Actually, anomalies usually don't have filterName directly in the top level array 
          // unless we check the structure. Let's assume we pass all for the indicator 
          // and the chart filters by matching data points.
          true
        )
        issues = indicatorResult.issues.filter((i: any) => i.filterName === filterName)
      }
    }

    return {
      indicatorName,
      data: filteredData,
      anomalies,
      issues
    }
  }

  return (
    <Card className="border-blue-800/50 bg-blue-900/20">
      <CardHeader>
        <CardTitle className="text-blue-100">سجل التدقيق ({logs.length} عملية)</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <Accordion type="multiple" className="space-y-4">
            {Object.entries(groupedLogs).map(([indicatorName, filters]) => (
              <AccordionItem 
                key={indicatorName} 
                value={indicatorName}
                className="border border-blue-700/30 rounded-lg bg-slate-800/50 overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-800/80 hover:no-underline">
                  <div className="flex items-center gap-3 text-right w-full">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                      {Object.values(filters).reduce((acc, curr) => acc + curr.length, 0)} تعديلات
                    </Badge>
                    <span className="font-semibold text-blue-100">{indicatorName}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                  {Object.entries(filters).map(([filterName, filterLogs]) => {
                    const chartKey = `${indicatorName}-${filterName}`
                    const isChartVisible = expandedCharts.has(chartKey)
                    const chartData = isChartVisible ? getChartData(indicatorName, filterName) : null

                    return (
                      <div key={filterName} className="border border-slate-700/50 rounded-lg bg-slate-900/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                            <h4 className="font-medium text-purple-200">{filterName}</h4>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleChart(chartKey)}
                            className={`gap-2 ${isChartVisible ? 'bg-blue-600/20 text-blue-300' : 'bg-slate-800 text-slate-400'}`}
                          >
                            <BarChart2 className="w-4 h-4" />
                            {isChartVisible ? "إخفاء الرسم البياني" : "عرض الرسم البياني"}
                          </Button>
                        </div>

                        <div className="rounded-md border border-slate-700/50 overflow-hidden mb-4">
                          <Table>
                            <TableHeader className="bg-slate-800/50">
                              <TableRow className="hover:bg-transparent border-slate-700/50">
                                <TableHead className="text-right text-slate-400 h-9">التاريخ</TableHead>
                                <TableHead className="text-right text-slate-400 h-9">المستخدم</TableHead>
                                <TableHead className="text-right text-slate-400 h-9">السنة</TableHead>
                                <TableHead className="text-right text-slate-400 h-9">الفترة</TableHead>
                                <TableHead className="text-center text-slate-400 h-9">التغيير</TableHead>
                                <TableHead className="text-right text-slate-400 h-9">رقم الجدول</TableHead>
                                <TableHead className="text-right text-slate-400 h-9">التعليق</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filterLogs.sort((a, b) => b.timestamp - a.timestamp).map((log) => (
                                <TableRow key={log.id} className="hover:bg-slate-800/30 border-slate-700/30">
                                  <TableCell className="font-mono text-xs text-slate-300">
                                    {formatTimestamp(log.timestamp)}
                                  </TableCell>
                                  <TableCell className="text-slate-300">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-500" />
                                      {log.userName}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-300">{log.details.year}</TableCell>
                                  <TableCell className="text-slate-300">
                                    {log.details.month ? `شهر ${log.details.month}` : 
                                     log.details.quarter ? `ربع ${log.details.quarter}` : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                      <span className="px-2 py-0.5 bg-red-900/20 text-red-300 rounded text-xs font-mono">
                                        {log.details.oldValue}
                                      </span>
                                      <span className="text-slate-500">←</span>
                                      <span className="px-2 py-0.5 bg-green-900/20 text-green-300 rounded text-xs font-mono">
                                        {log.details.newValue}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-300">
                                    {log.details.tableNumber ? (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                                        {log.details.tableNumber}
                                      </Badge>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-slate-300 max-w-xs">
                                    {log.details.comment ? (
                                      <span className="text-sm text-slate-400 italic">{log.details.comment}</span>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {isChartVisible && chartData && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <IndicatorTimelineChart
                              indicatorName={chartData.indicatorName}
                              data={chartData.data}
                              anomalies={chartData.anomalies}
                              issues={chartData.issues}
                              // We don't pass onDataEdit here as this is a read-only view
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
