import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns"

export interface WeightSource {
  date: string
  weight: number
}

interface WeightLogLike {
  weight?: unknown
}

export function isValidWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

export function formatWeightKg(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1)
}

export function formatRecentWeightSourceLabel(
  sourceDateKey: string,
  selectedDate: Date,
): string {
  const sourceDate = parseISO(sourceDateKey)
  if (Number.isNaN(sourceDate.getTime())) return sourceDateKey

  const daysAgo = differenceInCalendarDays(selectedDate, sourceDate)
  if (daysAgo === 1) return "昨日"
  if (daysAgo === 2) return "前日"
  if (daysAgo >= 3 && daysAgo <= 6) return `${daysAgo}天前`

  return format(sourceDate, "yyyy-MM-dd")
}

export function formatWeightSource(
  source: WeightSource,
  selectedDate: Date,
): string {
  return `${formatRecentWeightSourceLabel(source.date, selectedDate)} ${formatWeightKg(source.weight)} kg`
}

export async function findRecentWeightSource(
  selectedDate: Date,
  lookbackDays: number,
  getLog: (dateKey: string) => Promise<WeightLogLike | null>,
): Promise<WeightSource | undefined> {
  for (let daysAgo = 1; daysAgo <= lookbackDays; daysAgo++) {
    const dateKey = format(subDays(selectedDate, daysAgo), "yyyy-MM-dd")
    const log = await getLog(dateKey)
    if (isValidWeight(log?.weight)) {
      return { date: dateKey, weight: log.weight }
    }
  }

  return undefined
}
