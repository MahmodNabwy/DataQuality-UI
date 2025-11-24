export interface DataEdit {
  indicatorName: string
  filterName: string
  year: number
  month?: number
  quarter?: number
  oldValue: number
  newValue: number
  timestamp: number
  tableNumber?: string
  comment?: string
}

export interface IndicatorEdit {
  oldName: string
  newName: string
  timestamp: number
}

export interface EditSession {
  fileName: string
  dataEdits: DataEdit[]
  indicatorEdits: IndicatorEdit[]
  lastUpdated: number
}

export function mergeDataEdits(existingEdits: DataEdit[], newEdits: DataEdit[]): DataEdit[] {
  const editMap = new Map<string, DataEdit>()

  existingEdits.forEach((edit) => {
    const period = edit.month ? `M${edit.month}` : edit.quarter ? `Q${edit.quarter}` : "Y"
    const key = `${edit.indicatorName}|${edit.filterName}|${edit.year}|${period}`
    editMap.set(key, edit)
  })

  newEdits.forEach((edit) => {
    const period = edit.month ? `M${edit.month}` : edit.quarter ? `Q${edit.quarter}` : "Y"
    const key = `${edit.indicatorName}|${edit.filterName}|${edit.year}|${period}`
    editMap.set(key, {
      ...edit,
      timestamp: Date.now(),
    })
  })

  return Array.from(editMap.values())
}

export function loadEditSession(projectId?: string): EditSession | null {
  return null // Will be loaded from project object
}

export function clearEditSession(projectId?: string): void {
  // No-op, will be cleared when project is deleted
}
