/**
 * تنسيق الأرقام الكبيرة إلى صيغة مختصرة وسهلة القراءة
 * @example formatNumber(1000000) => "1.0M"
 * @example formatNumber(1500000) => "1.5M"
 * @example formatNumber(1000000000) => "1.0B"
 */
export function formatNumber(num: number): string {
  if (num === 0) return "0"

  const absNum = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  // الترتيبات: مليار، مليون، ألف
  if (absNum >= 1e9) {
    return sign + (absNum / 1e9).toFixed(1) + "B"
  }
  if (absNum >= 1e6) {
    return sign + (absNum / 1e6).toFixed(1) + "M"
  }
  if (absNum >= 1e3) {
    return sign + (absNum / 1e3).toFixed(1) + "K"
  }

  return sign + absNum.toFixed(0)
}

/**
 * تنسيق الأرقام للعرض في Tooltip (بدون اختصار)
 */
export function formatNumberFull(num: number): string {
  if (typeof num !== "number") return String(num)
  return num.toLocaleString("en-US")
}

/**
 * تنسيق الأرقام للمحاور مع ترك مسافة
 */
export function formatYAxisValue(num: number): string {
  return formatNumber(num)
}

/**
 * تنسيق الفترة الزمنية بناءً على نوع البيانات
 */
export function formatPeriodLabel(
  year: number,
  month?: number,
  quarter?: number,
  frequency?: "monthly" | "quarterly" | "yearly",
): string {
  if (month) {
    const monthNames = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ]
    return `${year}-${String(month).padStart(2, "0")}`
  }
  if (quarter) {
    return `${year}-ر${quarter}`
  }
  return `${year}`
}

/**
 * تنسيق الفترة للعرض الكامل في Tooltip
 */
export function formatPeriodFullLabel(year: number, month?: number, quarter?: number): string {
  if (month) {
    const monthNames = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ]
    return `${monthNames[month - 1]} ${year}`
  }
  if (quarter) {
    return `الربع ${quarter} - ${year}`
  }
  return `${year}`
}

/**
 * إنشاء مفتاح فريد للفترة
 */
export function createPeriodKey(year: number, month?: number, quarter?: number): string {
  if (month) return `${year}-${String(month).padStart(2, "0")}`
  if (quarter) return `${year}-Q${quarter}`
  return `${year}`
}
