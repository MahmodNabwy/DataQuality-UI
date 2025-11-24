"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit2, Save, X, RotateCcw, AlertTriangle } from "lucide-react"
import type { DataEdit } from "@/lib/storage"

interface DataEditorProps {
  indicatorName: string
  data: Array<{ year: number; value: number; filterName: string }>
  onSaveEdits: (edits: DataEdit[]) => void
  onCancel: () => void
  existingEdits: DataEdit[]
}

export function DataEditor({ indicatorName, data, onSaveEdits, onCancel, existingEdits }: DataEditorProps) {
  const [editedValues, setEditedValues] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    existingEdits.forEach((edit) => {
      const key = `${edit.filterName}-${edit.year}`
      map.set(key, edit.newValue)
    })
    return map
  })

  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [tempValue, setTempValue] = useState("")
  const [tableNumber, setTableNumber] = useState("")
  const [comment, setComment] = useState("")
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [pendingEdits, setPendingEdits] = useState<DataEdit[]>([])

  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [yearInputs, setYearInputs] = useState<Map<string, string>>(new Map())

  // Group data by filter
  const groupedByFilter = data.reduce(
    (acc, item) => {
      if (!acc[item.filterName]) {
        acc[item.filterName] = []
      }
      acc[item.filterName].push(item)
      return acc
    },
    {} as Record<string, typeof data>,
  )

  const allYears = (() => {
    if (data.length === 0) return []
    const years = data.map((item) => item.year)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    const fullYearRange: number[] = []
    for (let year = minYear; year <= maxYear; year++) {
      fullYearRange.push(year)
    }
    return fullYearRange.sort((a, b) => a - b)
  })()

  const allFilterNames = Array.from(new Set(data.map((item) => item.filterName)))

  const filledGroupedByFilter = Object.entries(groupedByFilter).reduce(
    (acc, [filterName, items]) => {
      if (allYears.length === 0) {
        acc[filterName] = items
        return acc
      }

      // Create full range using global years
      const fullYears: typeof data = []
      for (const year of allYears) {
        const existingItem = items.find((item) => item.year === year)
        if (existingItem) {
          fullYears.push(existingItem)
        } else {
          // Add missing year with null value
          fullYears.push({
            year,
            value: 0, // Use 0 as placeholder for missing data
            filterName,
          })
        }
      }

      acc[filterName] = fullYears
      return acc
    },
    {} as Record<string, typeof data>,
  )

  const startEdit = (filterName: string, year: number, currentValue: number) => {
    const key = `${filterName}-${year}`
    const editedValue = editedValues.get(key)
    setEditingCell(key)
    setTempValue(String(editedValue !== undefined ? editedValue : currentValue))
  }

  const saveEdit = (filterName: string, year: number, originalValue: number) => {
    const key = `${filterName}-${year}`
    const newValue = Number.parseFloat(tempValue)

    if (isNaN(newValue)) {
      alert("يرجى إدخال قيمة رقمية صحيحة")
      return
    }

    if (newValue === originalValue) {
      // No change, remove edit if exists
      const newEdits = new Map(editedValues)
      newEdits.delete(key)
      setEditedValues(newEdits)
    } else {
      const newEdits = new Map(editedValues)
      newEdits.set(key, newValue)
      setEditedValues(newEdits)
    }

    setEditingCell(null)
    setTempValue("")
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setTempValue("")
  }

  const resetValue = (filterName: string, year: number) => {
    const key = `${filterName}-${year}`
    const newEdits = new Map(editedValues)
    newEdits.delete(key)
    setEditedValues(newEdits)
  }

  const handleSave = () => {
    const edits: DataEdit[] = []

    editedValues.forEach((newValue, key) => {
      const [filterName, yearStr] = key.split("-")
      const year = Number.parseInt(yearStr)
      const originalItem = data.find((d) => d.filterName === filterName && d.year === year)
      const originalValue = originalItem?.value ?? 0

      if (originalValue !== newValue) {
        edits.push({
          indicatorName,
          filterName,
          year,
          oldValue: originalValue,
          newValue,
          timestamp: Date.now(),
        })
      }
    })

    if (edits.length > 0) {
      setPendingEdits(edits)
      setShowMetadataDialog(true)
    }
  }

  const handleSaveWithMetadata = () => {
    if (!tableNumber.trim()) {
      alert("يرجى إدخال رقم الجدول")
      return
    }

    if (!comment.trim()) {
      alert("يرجى إدخال تعليق على التعديل")
      return
    }

    const editsWithMetadata = pendingEdits.map((edit) => ({
      ...edit,
      tableNumber: tableNumber.trim(),
      comment: comment.trim(),
    }))

    onSaveEdits(editsWithMetadata)
    setShowMetadataDialog(false)
    setTableNumber("")
    setComment("")
    setPendingEdits([])
  }

  const getValue = (filterName: string, year: number, originalValue: number): number => {
    const key = `${filterName}-${year}`
    return editedValues.get(key) ?? originalValue
  }

  const isEdited = (filterName: string, year: number): boolean => {
    const key = `${filterName}-${year}`
    return editedValues.has(key)
  }

  const totalEdits = editedValues.size

  const handleYearInputChange = (filterName: string, value: string) => {
    const newInputs = new Map(yearInputs)
    newInputs.set(filterName, value)
    setYearInputs(newInputs)
  }

  const applyYearInputs = () => {
    if (!selectedYear) return

    let appliedCount = 0
    const newEdits = new Map(editedValues)

    yearInputs.forEach((value, filterName) => {
      if (value.trim() === "") return

      const numValue = Number.parseFloat(value)
      if (isNaN(numValue)) return

      // Find original item OR use 0 for missing years
      const originalItem = data.find((d) => d.filterName === filterName && d.year === selectedYear)
      const originalValue = originalItem?.value ?? 0

      const key = `${filterName}-${selectedYear}`
      newEdits.set(key, numValue)
      appliedCount++
    })

    if (appliedCount > 0) {
      setEditedValues(newEdits)
      setYearInputs(new Map())
      alert(`تم تطبيق ${appliedCount} تعديل للسنة ${selectedYear}`)
    }
  }

  const clearYearInputs = () => {
    setYearInputs(new Map())
  }

  return (
    <>
      <Card className="border-blue-800/50 bg-blue-950/40 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-blue-100">تعديل البيانات: {indicatorName}</CardTitle>
              {totalEdits > 0 && (
                <Badge className="mt-2 bg-yellow-500/20 border-yellow-500/50 text-yellow-300">
                  {totalEdits} تعديل معلق
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={totalEdits === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ التعديلات
              </Button>
              <Button onClick={onCancel} variant="outline" className="border-blue-700/50 text-blue-300 bg-transparent">
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Quick Year Input Panel - Takes 1/4 of space */}
            <div className="w-1/4 flex-shrink-0">
              <Card className="border-green-800/50 bg-green-950/20 sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-green-100 text-base">إدخال سريع حسب السنة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-green-300 text-xs mb-2 block">اختر السنة</label>
                    <Select
                      value={selectedYear?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedYear(Number.parseInt(value))
                        setYearInputs(new Map())
                      }}
                    >
                      <SelectTrigger className="bg-green-950/40 border-green-800/50 text-green-100">
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
                          const originalItem = data.find((d) => d.filterName === filterName && d.year === selectedYear)
                          const currentValue = originalItem?.value ?? 0
                          const key = `${filterName}-${selectedYear}`
                          const isAlreadyEdited = editedValues.has(key)
                          const isMissing = currentValue === 0 || currentValue === null

                          return (
                            <div key={filterName} className="space-y-1">
                              <label
                                className="text-green-200 text-xs block truncate flex items-center gap-1"
                                title={filterName}
                              >
                                {filterName}
                                {isMissing && !isAlreadyEdited && <span className="text-red-400 text-xs">(ناقص)</span>}
                              </label>
                              <Input
                                type="number"
                                placeholder={isMissing ? "أدخل قيمة..." : currentValue.toString()}
                                value={yearInputs.get(filterName) || ""}
                                onChange={(e) => handleYearInputChange(filterName, e.target.value)}
                                className={`h-8 text-sm bg-green-950/40 border-green-800/50 text-green-100 ${
                                  isAlreadyEdited ? "border-yellow-500/50" : isMissing ? "border-red-500/50" : ""
                                }`}
                              />
                              {isAlreadyEdited && <span className="text-yellow-400 text-xs">معدّل مسبقاً</span>}
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-green-800/30">
                        <Button
                          onClick={applyYearInputs}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          تطبيق
                        </Button>
                        <Button
                          onClick={clearYearInputs}
                          size="sm"
                          variant="outline"
                          className="flex-1 border-green-700/50 text-green-300 bg-transparent"
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
                {Object.entries(filledGroupedByFilter).map(([filterName, items]) => {
                  const sortedItems = [...items].sort((a, b) => a.year - b.year)

                  return (
                    <div key={filterName} className="space-y-2">
                      <h4 className="text-blue-200 font-semibold text-sm mb-2">{filterName}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {sortedItems.map((item) => {
                          const key = `${filterName}-${item.year}`
                          const currentValue = getValue(filterName, item.year, item.value)
                          const edited = isEdited(filterName, item.year)
                          const isEditing = editingCell === key
                          const isMissingYear = item.value === 0 || item.value === null

                          return (
                            <div
                              key={key}
                              className={`p-3 rounded-lg border transition-all ${
                                edited
                                  ? "bg-yellow-500/10 border-yellow-500/50"
                                  : isMissingYear
                                    ? "bg-red-500/10 border-red-500/50"
                                    : "bg-blue-900/30 border-blue-800/40 hover:border-blue-700/60"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-blue-300 text-xs font-semibold">{item.year}</span>
                                {edited && (
                                  <button
                                    onClick={() => resetValue(filterName, item.year)}
                                    className="text-blue-400 hover:text-blue-300"
                                    title="إعادة تعيين"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="space-y-2">
                                  <Input
                                    type="number"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    className="h-8 text-sm bg-blue-950/60 border-blue-700/50 text-blue-100"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        saveEdit(filterName, item.year, item.value)
                                      } else if (e.key === "Escape") {
                                        cancelEdit()
                                      }
                                    }}
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => saveEdit(filterName, item.year, item.value)}
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
                                    {isMissingYear && !edited ? (
                                      <p className="text-sm text-red-400 italic">بيانات ناقصة</p>
                                    ) : (
                                      <>
                                        <p
                                          className={`text-sm font-mono truncate ${edited ? "text-yellow-200" : "text-blue-100"}`}
                                        >
                                          {currentValue.toLocaleString("en-US")}
                                        </p>
                                        {edited && (
                                          <p className="text-xs text-blue-400 line-through">
                                            {item.value.toLocaleString("en-US")}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => startEdit(filterName, item.year, item.value)}
                                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {totalEdits > 0 && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-yellow-200 text-sm font-semibold">معلومات التعديلات</p>
                      <p className="text-yellow-300/80 text-xs mt-1">
                        لديك {totalEdits} تعديل معلق. اضغط "حفظ التعديلات" لتطبيق التغييرات وتحديث الرسم البياني.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                    setShowMetadataDialog(false)
                    setTableNumber("")
                    setComment("")
                    setPendingEdits([])
                  }}
                  className="border-blue-700/50 text-blue-300"
                >
                  إلغاء
                </Button>
                <Button onClick={handleSaveWithMetadata} className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التعديلات
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
