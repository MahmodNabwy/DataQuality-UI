export interface QAIssue {
  checkType: string
  indicatorName: string
  filterName?: string
  severity: "critical" | "warning" | "info"
  message: string
  details?: any
  id?: string
}

export interface IndicatorQuality {
  name: string
  score: number
  rating: "excellent" | "good" | "fair" | "poor"
  issuesCount: {
    critical: number
    warning: number
    info: number
  }
}

export interface QualityScore {
  overall: number
  rating: "excellent" | "good" | "fair" | "poor"
  indicators: IndicatorQuality[]
  breakdown: {
    completeness: number
    accuracy: number
    consistency: number
    validity: number
  }
}

export interface QAResults {
  summary: {
    totalIndicators: number
    passedChecks: number
    failedChecks: number
    checksByType?: Record<string, { passed: number; failed: number }>
  }
  issues: QAIssue[],
  processedAt:number,
  qualityScore?: QualityScore
  missingPeriods?: Map<string, Array<{ year: number; month?: number; quarter?: number }>>
}

function detectStatisticalOutliers(
  values: Array<{ year: number; value: number; filterName: string; month?: number; quarter?: number }>,
): Array<{
  year: number
  value: number
  month?: number
  quarter?: number
  period?: string
  isOutlier: boolean
  zScore: number
  reason: string
}> {
  // Early return for insufficient data
  if (values.length < 3) {
    return values.map((v) => ({ ...v, isOutlier: false, zScore: 0, reason: "Not enough data points" }))
  }

  // Safety check: skip if dataset is too large (performance optimization)
  if (values.length > 500) {
    return values.map((v) => ({
      ...v,
      value: Number(v.value),
      isOutlier: false,
      zScore: 0,
      reason: "Dataset too large, skipped for performance",
    }))
  }

  try {
    // Convert all values to numbers safely
    const numericValues = values.map((v) => {
      const num = Number(v.value)
      return isNaN(num) ? 0 : num
    })

    // Calculate mean
    const sum = numericValues.reduce((a, b) => a + b, 0)
    const mean = sum / numericValues.length

    // Calculate standard deviation
    const squaredDiffs = numericValues.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length
    const stdDev = Math.sqrt(variance)

    // If all values are identical
    if (stdDev === 0 || !isFinite(stdDev)) {
      return values.map((v) => ({
        year: v.year,
        value: Number(v.value),
        month: v.month,
        quarter: v.quarter,
        filterName: v.filterName,
        isOutlier: false,
        zScore: 0,
        reason: "Standard deviation is zero",
      }))
    }

    // Calculate change rates between consecutive periods
    const changeRates: number[] = []
    for (let i = 1; i < numericValues.length; i++) {
      if (numericValues[i - 1] !== 0) {
        const percentChange = Math.abs((numericValues[i] - numericValues[i - 1]) / numericValues[i - 1]) * 100
        if (isFinite(percentChange)) {
          changeRates.push(percentChange)
        }
      }
    }

    const avgChangeRate = changeRates.length > 0 ? changeRates.reduce((a, b) => a + b, 0) / changeRates.length : 0

    // Analyze each value
    return values.map((v, idx) => {
      const numValue = Number(v.value)

      // Calculate Z-Score
      const zScore = (numValue - mean) / stdDev

      // Create period label
      let periodLabel = `${v.year}`
      if (v.month) periodLabel += `-${String(v.month).padStart(2, "0")}`
      else if (v.quarter) periodLabel += `-Q${v.quarter}`

      let isOutlier = false
      let reason = ""

      // Check 1: Extreme Z-Score (> 2.5)
      if (Math.abs(zScore) > 2.5 && isFinite(zScore)) {
        isOutlier = true
        reason = `قيمة شاذة إحصائياً. Z-Score: ${zScore.toFixed(2)}. خارج النطاق الطبيعي`
      }
      // Check 2: Sharp change from previous period
      else if (idx > 0 && numericValues[idx - 1] !== 0) {
        const prevValue = numericValues[idx - 1]
        const percentChange = Math.abs((numValue - prevValue) / prevValue) * 100

        if (isFinite(percentChange) && percentChange > avgChangeRate * 3 && percentChange > 100) {
          isOutlier = true
          reason = `قفزة حادة من ${prevValue.toFixed(0)} إلى ${numValue.toFixed(0)} (${percentChange.toFixed(1)}% تغير). متوسط التغير الطبيعي: ${avgChangeRate.toFixed(1)}%`
        }
      }

      return {
        year: v.year,
        value: numValue,
        month: v.month,
        quarter: v.quarter,
        period: periodLabel,
        filterName: v.filterName,
        isOutlier,
        zScore: isFinite(zScore) ? zScore : 0,
        reason,
      }
    })
  } catch (error) {
    console.error("[v0] Error in statistical analysis:", error)
    return values.map((v) => ({
      ...v,
      value: Number(v.value),
      isOutlier: false,
      zScore: 0,
      reason: "Analysis error",
    }))
  }
}

export function processQA(data: any[]): QAResults {
  const issues: QAIssue[] = []
  let passedChecks = 0
  let failedChecks = 0
  const missingPeriodsMap = new Map<string, Array<{ year: number; month?: number; quarter?: number }>>()

  console.log("[v0] Starting QA processing with", data.length, "records")

  // Validation
  if (!data || data.length === 0) {
    console.error("[v0] No data provided for QA processing")
    return {
      summary: { totalIndicators: 0, passedChecks: 0, failedChecks: 1 },
      issues: [
        {
          checkType: "System Error",
          indicatorName: "System",
          severity: "critical",
          message: "لا توجد بيانات للمعالجة",
        },
      ],
    }
  }

  // Check for required columns
  const requiredColumns = ["indicatorName", "filterName", "year", "value"]
  const hasAllColumns = requiredColumns.every((col) => data.length > 0 && col in data[0])

  if (!hasAllColumns) {
    issues.push({
      checkType: "Missing Columns",
      indicatorName: "System",
      severity: "critical",
      message: `أعمدة مفقودة: ${requiredColumns.join(", ")}`,
      details: { required: requiredColumns },
    })
    failedChecks++
  } else {
    passedChecks++
  }

  // Check for missing data in rows
  const sampleSize = Math.min(data.length, 100) // Only check first 100 rows for performance
  for (let i = 0; i < sampleSize; i++) {
    const row = data[i]
    const missingFields = requiredColumns.filter(
      (col) => row[col] === null || row[col] === undefined || row[col] === "",
    )
    if (missingFields.length > 0) {
      issues.push({
        checkType: "Missing Data",
        indicatorName: row.indicatorName || `صف ${i}`,
        severity: "critical",
        message: `بيانات مفقودة في الصف ${i}: ${missingFields.join(", ")}`,
        details: { row: i, fields: missingFields },
      })
      failedChecks++
    } else {
      passedChecks++
    }
  }

  // Check for numeric values
  data.forEach((row, idx) => {
    if (typeof row.value !== "number" && isNaN(Number(row.value))) {
      issues.push({
        checkType: "Data Type Error",
        indicatorName: row.indicatorName,
        filterName: row.filterName,
        severity: "critical",
        message: `القيمة ليست رقمية: "${row.value}"`,
        details: { row: idx, value: row.value },
      })
      failedChecks++
    } else {
      passedChecks++
    }
  })

  const byIndicator = groupBy(data, "indicatorName")

  // Check for duplicates
  const seenRecords = new Set<string>()
  data.forEach((row, idx) => {
    const period = row.month ? `M${row.month}` : row.quarter ? `Q${row.quarter}` : "Y"
    const recordKey = `${row.indicatorName}|${row.filterName}|${row.year}|${period}`
    if (seenRecords.has(recordKey)) {
      const periodLabel = row.month ? `الشهر ${row.month}` : row.quarter ? `الربع ${row.quarter}` : "السنة"
      issues.push({
        checkType: "Duplicate Records",
        indicatorName: row.indicatorName,
        filterName: row.filterName,
        severity: "critical",
        message: `سجل مكرر: نفس المؤشر والفلتر والسنة (${row.year}) و${periodLabel}`,
        details: { year: row.year, month: row.month, quarter: row.quarter, value: row.value },
      })
      failedChecks++
    } else {
      seenRecords.add(recordKey)
      passedChecks++
    }
  })

  Object.entries(byIndicator).forEach(([indicator, rows]: [string, any[]]) => {
    const byFilter = groupBy(rows, "filterName")

    Object.entries(byFilter).forEach(([filter, filterRows]: [string, any[]]) => {
      const sorted = filterRows.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        if (a.quarter && b.quarter && a.quarter !== b.quarter) return a.quarter - b.quarter
        if (a.month && b.month) return a.month - b.month
        return 0
      })

      const hasValidMonths = sorted.some((r) => {
        const month = r.month
        return (
          month !== null &&
          month !== undefined &&
          month !== "" &&
          !isNaN(Number(month)) &&
          Number(month) >= 1 &&
          Number(month) <= 12 &&
          String(month).toLowerCase() !== "n/a" &&
          String(month).toLowerCase() !== "nan"
        )
      })

      const hasValidQuarters = sorted.some((r) => {
        const quarter = r.quarter
        return (
          quarter !== null &&
          quarter !== undefined &&
          quarter !== "" &&
          !isNaN(Number(quarter)) &&
          Number(quarter) >= 1 &&
          Number(quarter) <= 4 &&
          String(quarter).toLowerCase() !== "n/a" &&
          String(quarter).toLowerCase() !== "nan"
        )
      })

      const dataFrequency = hasValidMonths ? "monthly" : hasValidQuarters ? "quarterly" : "yearly"

      const filterKey = `${indicator}|${filter}`
      const missingPeriods: Array<{ year: number; month?: number; quarter?: number }> = []

      const allYears = data.map((d) => d.year)
      const globalMinYear = Math.min(...allYears)
      const globalMaxYear = Math.max(...allYears)
      const filterMinYear = Math.min(...sorted.map((r) => r.year))
      const filterMaxYear = Math.max(...sorted.map((r) => r.year))

      // Check for missing years at the beginning
      if (filterMinYear > globalMinYear && dataFrequency === "yearly") {
        for (let y = globalMinYear; y < filterMinYear; y++) {
          const missingPeriodsStr: string[] = []
          missingPeriodsStr.push(`${y}`)
          missingPeriods.push({ year: y })

          issues.push({
            checkType: "Timeline Gap",
            indicatorName: indicator,
            filterName: filter,
            severity: "warning",
            message: `بيانات ناقصة في البداية: السنة ${y} مفقودة قبل بداية البيانات (${filterMinYear})`,
            details: {
              from: `${globalMinYear}`,
              to: `${filterMinYear}`,
              gap: filterMinYear - globalMinYear,
              missingPeriods: missingPeriodsStr,
              frequency: dataFrequency,
            },
          })
          failedChecks++
        }
      }

      // Check for missing years at the end
      if (filterMaxYear < globalMaxYear && dataFrequency === "yearly") {
        for (let y = filterMaxYear + 1; y <= globalMaxYear; y++) {
          const missingPeriodsStr: string[] = []
          missingPeriodsStr.push(`${y}`)
          missingPeriods.push({ year: y })

          issues.push({
            checkType: "Timeline Gap",
            indicatorName: indicator,
            filterName: filter,
            severity: "warning",
            message: `بيانات ناقصة في النهاية: السنة ${y} مفقودة بعد نهاية البيانات (${filterMaxYear})`,
            details: {
              from: `${filterMaxYear}`,
              to: `${globalMaxYear}`,
              gap: globalMaxYear - filterMaxYear,
              missingPeriods: missingPeriodsStr,
              frequency: dataFrequency,
            },
          })
          failedChecks++
        }
      }

      // Timeline gap detection with missing periods (existing middle gaps)
      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i]
        const previous = sorted[i - 1]

        let gapFound = false
        const missingPeriodsStr: string[] = []

        if (dataFrequency === "monthly") {
          const prevMonth = previous.month || 1
          const prevYear = previous.year
          const currMonth = current.month || 1
          const currYear = current.year

          const expectedMonth = prevMonth === 12 ? 1 : prevMonth + 1
          const expectedYear = prevMonth === 12 ? prevYear + 1 : prevYear

          if (currYear !== expectedYear || currMonth !== expectedMonth) {
            gapFound = true
            let y = expectedYear
            let m = expectedMonth
            while (y < currYear || (y === currYear && m < currMonth)) {
              missingPeriodsStr.push(`${y}-${String(m).padStart(2, "0")}`)
              missingPeriods.push({ year: y, month: m })
              m++
              if (m > 12) {
                m = 1
                y++
              }
              if (missingPeriodsStr.length > 100) break
            }
          }
        } else if (dataFrequency === "quarterly") {
          const prevQuarter = previous.quarter || 1
          const prevYear = previous.year
          const currQuarter = current.quarter || 1
          const currYear = current.year

          const expectedQuarter = prevQuarter === 4 ? 1 : prevQuarter + 1
          const expectedYear = prevQuarter === 4 ? prevYear + 1 : prevYear

          if (currYear !== expectedYear || currQuarter !== expectedQuarter) {
            gapFound = true
            let y = expectedYear
            let q = expectedQuarter
            while (y < currYear || (y === currYear && q < currQuarter)) {
              missingPeriodsStr.push(`${y}-Q${q}`)
              missingPeriods.push({ year: y, quarter: q })
              q++
              if (q > 4) {
                q = 1
                y++
              }
              if (missingPeriodsStr.length > 100) break
            }
          }
        } else {
          const diff = current.year - previous.year
          if (diff > 1) {
            gapFound = true
            for (let y = previous.year + 1; y < current.year; y++) {
              missingPeriodsStr.push(`${y}`)
              missingPeriods.push({ year: y })
              if (missingPeriodsStr.length > 50) break
            }
          }
        }

        if (gapFound && missingPeriodsStr.length > 0) {
          const frequencyLabel =
            dataFrequency === "monthly" ? "شهري" : dataFrequency === "quarterly" ? "ربع سنوي" : "سنوي"
          const gapCount = missingPeriodsStr.length
          const gapLabel =
            dataFrequency === "monthly"
              ? `${gapCount} شهر`
              : dataFrequency === "quarterly"
                ? `${gapCount} ربع`
                : `${gapCount} سنة`

          const prevKey = previous.month
            ? `${previous.year}-${String(previous.month).padStart(2, "0")}`
            : previous.quarter
              ? `${previous.year}-Q${previous.quarter}`
              : `${previous.year}`

          const currKey = current.month
            ? `${current.year}-${String(current.month).padStart(2, "0")}`
            : current.quarter
              ? `${current.year}-Q${current.quarter}`
              : `${current.year}`

          issues.push({
            checkType: "Timeline Gap",
            indicatorName: indicator,
            filterName: filter,
            severity: "warning",
            message: `فجوة زمنية (نمط ${frequencyLabel}): من ${prevKey} إلى ${currKey}. فجوة ${gapLabel} مفقودة: ${missingPeriodsStr.slice(0, 10).join(", ")}${missingPeriodsStr.length > 10 ? "..." : ""}`,
            details: {
              from: prevKey,
              to: currKey,
              gap: gapCount,
              missingPeriods: missingPeriodsStr.slice(0, 10),
              frequency: dataFrequency,
            },
          })
          failedChecks++
        } else if (!gapFound) {
          passedChecks++
        }
      }

      if (missingPeriods.length > 0) {
        missingPeriodsMap.set(filterKey, missingPeriods)
      }
    })
  })

  // Check for negative values
  data.forEach((row, idx) => {
    if (Number(row.value) < 0) {
      const periodLabel = row.month
        ? `${row.year}-${String(row.month).padStart(2, "0")}`
        : row.quarter
          ? `${row.year}-Q${row.quarter}`
          : `${row.year}`
      issues.push({
        checkType: "Value Range",
        indicatorName: row.indicatorName,
        filterName: row.filterName,
        severity: "info",
        message: `قيمة سالبة في ${periodLabel}: ${Number(row.value)}`,
        details: { row: idx, year: row.year, month: row.month, quarter: row.quarter, value: Number(row.value) },
      })
      failedChecks++
    } else {
      passedChecks++
    }
  })

  // Optimized statistical analysis with limits
  console.log("[v0] Starting statistical analysis...")
  let analyzedCount = 0
  const MAX_ANALYZE_COUNT = 100 // Limit to 100 indicators for performance

  Object.entries(byIndicator).forEach(([indicator, rows]: [string, any[]]) => {
    if (analyzedCount >= MAX_ANALYZE_COUNT) {
      console.log(`[v0] Reached analysis limit, skipping remaining indicators`)
      return
    }

    const byFilter = groupBy(rows, "filterName")
    Object.entries(byFilter).forEach(([filter, filterRows]: [string, any[]]) => {
      // Skip if too many records
      if (filterRows.length > 500) {
        return
      }

      try {
        const sorted = filterRows.sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          if (a.quarter && b.quarter && a.quarter !== b.quarter) return a.quarter - b.quarter
          if (a.month && b.month) return a.month - b.month
          return 0
        })

        const timeSeries = sorted.map((r) => ({
          year: r.year,
          month: r.month,
          quarter: r.quarter,
          value: Number(r.value),
          filterName: filter,
        }))

        const analyzed = detectStatisticalOutliers(timeSeries)

        analyzed.forEach((item) => {
          if (item.isOutlier) {
            issues.push({
              checkType: "Statistical Anomaly",
              indicatorName: indicator,
              filterName: filter,
              severity: Math.abs(item.zScore) > 3 ? "warning" : "info",
              message: item.reason,
              details: {
                period: item.period,
                year: item.year,
                month: item.month,
                quarter: item.quarter,
                value: item.value,
                zScore: item.zScore.toFixed(2),
              },
            })
            failedChecks++
          } else {
            passedChecks++
          }
        })
        analyzedCount++
      } catch (error) {
        console.error("[v0] Error analyzing indicator:", indicator, filter, error)
      }
    })
  })

  const totalIndicators = new Set(data.map((d) => d.indicatorName)).size

  issues.forEach((issue) => {
    const period = issue.details?.month
      ? `M${issue.details.month}`
      : issue.details?.quarter
        ? `Q${issue.details.quarter}`
        : issue.details?.year
          ? `Y${issue.details.year}`
          : ""
    issue.id = `${issue.checkType}|${issue.indicatorName}|${issue.filterName || ""}|${period}|${Date.now()}`
  })

  console.log("[v0] QA processing complete:", { totalIndicators, passedChecks, failedChecks })

  const qualityScore = calculateQualityScore(data, issues)

  return {
    summary: {
      totalIndicators,
      passedChecks,
      failedChecks,
      checksByType: groupChecksByType(issues),
    },
    issues,
    qualityScore,
    missingPeriods: missingPeriodsMap,
  }
}

function groupBy(arr: any[], key: string) {
  return arr.reduce(
    (acc, item) => {
      const k = item[key]
      if (!acc[k]) acc[k] = []
      acc[k].push(item)
      return acc
    },
    {} as Record<string, any[]>,
  )
}

function groupChecksByType(issues: QAIssue[]) {
  const result: Record<string, { passed: number; failed: number }> = {}

  issues.forEach((issue) => {
    if (!result[issue.checkType]) {
      result[issue.checkType] = { passed: 0, failed: 0 }
    }
    result[issue.checkType].failed++
  })

  return result
}

function detectConsecutiveYearAnomalies(
  rows: Array<{ year: number; value: number; filterName: string; month?: number; quarter?: number }>,
): Array<{ message: string; years: number[] }> {
  const anomalies: Array<{ message: string; years: number[] }> = []
  const sorted = rows.sort((a, b) => a.year - b.year)
  const years = sorted.map((r) => r.year)

  // Search for duplicate years - this means duplicate data
  for (let i = 0; i < years.length - 1; i++) {
    if (years[i] === years[i + 1]) {
      anomalies.push({
        message: `Duplicate data: year ${years[i]} appears multiple times. Check for duplicate records in the data.`,
        years: [years[i]],
      })
    }
  }

  // Search for illogical time gaps (if there are specific follow-up intentions)
  for (let i = 1; i < years.length; i++) {
    const diff = years[i] - years[i - 1]
    // Acceptable gaps: one year (annual), four years (quarterly), twelve months (monthly)
    if (![1, 4, 12].includes(diff) && diff > 0) {
      anomalies.push({
        message: `Illogical time gap: from year ${years[i - 1]} to ${years[i]} (difference ${diff} years). Expected time series: annual (1), quarterly (4), or monthly (12)`,
        years: years.slice(Math.max(0, i - 2), i + 2),
      })
    }
  }

  return anomalies
}

export function calculateQualityScore(data: any[], issues: QAIssue[]): QualityScore {
  const totalRecords = data.length
  const totalIndicators = new Set(data.map((d) => d.indicatorName)).size

  // Calculate issues by severity
  const criticalIssues = issues.filter((i) => i.severity === "critical").length
  const warningIssues = issues.filter((i) => i.severity === "warning").length
  const infoIssues = issues.filter((i) => i.severity === "info").length

  // Weight penalties by severity
  const criticalPenalty = criticalIssues * 10
  const warningPenalty = warningIssues * 5
  const infoPenalty = infoIssues * 2
  const totalPenalty = criticalPenalty + warningPenalty + infoPenalty

  // Calculate breakdown scores
  const missingDataIssues = issues.filter((i) => i.checkType === "Missing Data" || i.checkType === "Missing Columns")
  const completeness = Math.max(0, 100 - (missingDataIssues.length / totalRecords) * 100)

  const typeErrors = issues.filter((i) => i.checkType === "Data Type Error" || i.checkType === "Value Range")
  const validity = Math.max(0, 100 - (typeErrors.length / totalRecords) * 100)

  const duplicates = issues.filter((i) => i.checkType === "Duplicate Records" || i.checkType === "Duplicate Years")
  const consistency = Math.max(0, 100 - (duplicates.length / totalRecords) * 100)

  const anomalies = issues.filter((i) => i.checkType === "Statistical Anomaly" || i.checkType === "Timeline Gap")
  const accuracy = Math.max(0, 100 - (anomalies.length / totalRecords) * 50)

  // Calculate overall score
  const baseScore = 100
  const overallScore = Math.max(0, Math.min(100, baseScore - (totalPenalty / totalRecords) * 100))

  // Determine overall rating
  let rating: "excellent" | "good" | "fair" | "poor"
  if (overallScore >= 95) rating = "excellent"
  else if (overallScore >= 80) rating = "good"
  else if (overallScore >= 60) rating = "fair"
  else rating = "poor"

  // Calculate per-indicator quality
  const indicatorIssues = new Map<string, { critical: number; warning: number; info: number }>()

  issues.forEach((issue) => {
    if (!indicatorIssues.has(issue.indicatorName)) {
      indicatorIssues.set(issue.indicatorName, { critical: 0, warning: 0, info: 0 })
    }
    const counts = indicatorIssues.get(issue.indicatorName)!
    if (issue.severity === "critical") counts.critical++
    else if (issue.severity === "warning") counts.warning++
    else counts.info++
  })

  const indicators: IndicatorQuality[] = []
  const indicatorNames = new Set(data.map((d) => d.indicatorName))

  indicatorNames.forEach((name) => {
    const indicatorData = data.filter((d) => d.indicatorName === name)
    const counts = indicatorIssues.get(name) || { critical: 0, warning: 0, info: 0 }
    const totalIssues = counts.critical + counts.warning + counts.info

    // Calculate indicator score
    const indicatorPenalty = counts.critical * 10 + counts.warning * 5 + counts.info * 2
    const indicatorScore = Math.max(0, Math.min(100, 100 - (indicatorPenalty / indicatorData.length) * 100))

    let indicatorRating: "excellent" | "good" | "fair" | "poor"
    if (indicatorScore >= 95) indicatorRating = "excellent"
    else if (indicatorScore >= 80) indicatorRating = "good"
    else if (indicatorScore >= 60) indicatorRating = "fair"
    else indicatorRating = "poor"

    indicators.push({
      name,
      score: Math.round(indicatorScore),
      rating: indicatorRating,
      issuesCount: counts,
    })
  })

  // Sort indicators by score (worst first)
  indicators.sort((a, b) => a.score - b.score)

  return {
    overall: Math.round(overallScore),
    rating,
    indicators,
    breakdown: {
      completeness: Math.round(completeness),
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      validity: Math.round(validity),
    },
  }
}

interface IssueStatus {
  issueId: string
  status: "active" | "resolved" | "dismissed"
  timestamp?: number
  metadata?: any
}

export function revalidateIssuesAfterEdit(
  data: any[],
  allIssues: QAIssue[],
  issueStatuses: IssueStatus[],
): { updatedIssues: QAIssue[]; autoResolvedCount: number } {
  // Re-run QA analysis on the data
  const freshQAResults = processQA(data)

  // Create a map of old issue IDs
  const oldIssueIds = new Set(allIssues.map((i) => i.id))
  const newIssueIds = new Set(freshQAResults.issues.map((i) => i.id))

  // Find issues that were auto-resolved by data edits
  const autoResolvedIssues: string[] = []

  allIssues.forEach((oldIssue) => {
    if (!oldIssue.id) return

    // Check if this issue still exists in fresh results
    const stillExists = freshQAResults.issues.some((newIssue) => {
      // Match by type, indicator, filter, and period
      return (
        newIssue.checkType === oldIssue.checkType &&
        newIssue.indicatorName === oldIssue.indicatorName &&
        newIssue.filterName === oldIssue.filterName &&
        newIssue.details?.year === oldIssue.details?.year &&
        newIssue.details?.month === oldIssue.details?.month &&
        newIssue.details?.quarter === oldIssue.details?.quarter
      )
    })

    if (!stillExists) {
      // Issue was resolved by data edit
      const existingStatus = issueStatuses.find((s) => s.issueId === oldIssue.id)
      if (!existingStatus || existingStatus.status === "active") {
        autoResolvedIssues.push(oldIssue.id)
      }
    }
  })

  // Update issue statuses for auto-resolved issues
  const updatedStatuses = issueStatuses.map((status) => {
    if (autoResolvedIssues.includes(status.issueId)) {
      return {
        ...status,
        status: "resolved" as const,
        timestamp: Date.now(),
        metadata: {
          ...status.metadata,
          autoResolved: true,
          comment: "تم حل المشكلة تلقائياً بعد تعديل البيانات",
        },
      }
    }
    return status
  })

  console.log("[v0] Auto-resolved issues:", autoResolvedIssues.length)

  return {
    updatedIssues: freshQAResults.issues,
    autoResolvedCount: autoResolvedIssues.length,
  }
}

export function getActiveIssues(allIssues: QAIssue[], issueStatuses: IssueStatus[]): QAIssue[] {
  return allIssues.filter((issue) => {
    if (!issue.id) return true // Include issues without IDs (shouldn't happen but be safe)
    const status = issueStatuses.find((s) => s.issueId === issue.id)
    return !status || status.status === "active"
  })
}

export function recalculateQualityWithFilteredIssues(
  data: any[],
  allIssues: QAIssue[],
  issueStatuses: IssueStatus[],
): QualityScore {
  const activeIssues = getActiveIssues(allIssues, issueStatuses)

  return calculateQualityScore(data, activeIssues)
}
