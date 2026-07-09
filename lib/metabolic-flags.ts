export const METABOLIC_FLAGS = [
  "caffeine",
  "green-tea",
  "spicy",
  "cold",
  "metabolic-enhancer",
] as const

export type MetabolicFlag = typeof METABOLIC_FLAGS[number]

export const METABOLIC_FLAG_SET: ReadonlySet<string> = new Set(METABOLIC_FLAGS)
