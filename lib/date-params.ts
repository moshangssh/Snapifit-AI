import { format } from "date-fns"

export function parseDateParam(param: string | null | undefined): Date {
  if (!param) return new Date()
  const [year, month, day] = param.split("-").map(Number)
  if (year && month && day) {
    const d = new Date(year, month - 1, day)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

export function formatDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd")
}
