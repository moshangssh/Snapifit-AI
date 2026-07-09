import type { MetabolicFlag } from "./metabolic-flags"

// 食物记录类型
export interface FoodEntry {
  log_id: string
  food_name: string
  consumed_grams: number
  meal_type: string // breakfast, lunch, dinner, snack
  time_period?: string // 时间段：morning, noon, afternoon, evening
  nutritional_info_per_100g: {
    calories: number
    carbohydrates: number
    protein: number
    fat: number
    fiber?: number
    sugar?: number
    sodium?: number
    [key: string]: number | undefined
  }
  total_nutritional_info_consumed: {
    calories: number
    carbohydrates: number
    protein: number
    fat: number
    fiber?: number
    sugar?: number
    sodium?: number
    [key: string]: number | undefined
  }
  is_estimated: boolean
  timestamp?: string
  // 解析时 AI 打标的代谢因素,记录时确定的食物事实(同 protein);缺省表示未打过标
  metabolic_flags?: MetabolicFlag[]
}

// 运动记录类型
export interface ExerciseEntry {
  log_id: string
  exercise_name: string
  exercise_type: "cardio" | "strength" | "flexibility" | "other"
  duration_minutes: number
  distance_km?: number // 适用于有氧运动
  sets?: number // 适用于力量训练
  reps?: number // 适用于力量训练
  weight_kg?: number // 适用于力量训练
  estimated_mets: number // 代谢当量
  user_weight: number // 用户体重，用于计算卡路里消耗
  calories_burned_estimated: number
  muscle_groups?: string[] // 锻炼的肌肉群
  is_estimated: boolean
  timestamp?: string
}

// 日常摘要类型
export interface DailySummaryType {
  totalCaloriesConsumed: number
  totalCaloriesBurned: number
  macros: {
    carbs: number
    protein: number
    fat: number
  }
  micronutrients: Record<string, number>
}

// 智能建议类型
export interface SmartSuggestion {
  title: string
  description: string
  actionable: boolean
  icon: string
}

export interface SmartSuggestionCategory {
  key: string
  category: string
  priority: 'high' | 'medium' | 'low'
  suggestions: SmartSuggestion[]
  summary: string
}

export interface SmartSuggestionsResponse {
  suggestions: SmartSuggestionCategory[]
  generatedAt: string
  dataDate: string
  summary?: string
  highlights?: string[]
  risks?: string[]
}

export interface PeriodSmartAnalysisResponse {
  range: '7d' | '30d'
  startDate: string
  endDate: string
  generatedAt: string
  dataDays: number
  minDataDays: number
  summary: string
  highlights: string[]
  risks: string[]
  suggestions: SmartSuggestionCategory[]
}

export type PlannedTrainingType =
  | "rest"
  | "strength"
  | "strength_cardio"
  | "high_output"

export interface MealPlanNutritionEstimate {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
}

export interface MealPlanItem {
  title: string
  kind: "combo" | "single"
  foods: string[]
  portionHint: string
  bestFor: string
  nutrition: MealPlanNutritionEstimate
  isProteinPick?: boolean
  slightlyOverBudget?: boolean
  warning?: string
}

export interface MealPlanBudgetSnapshot {
  date: string
  baselineExpenditure: number
  recordedExerciseCalories: number
  targetCalories: number
  consumedCalories: number
  remainingCalories: number
  macroTargets: {
    protein: number
    carbohydrates: number
    fat: number
  }
  remainingMacros: {
    protein: number
    carbohydrates: number
    fat: number
  }
  remainingMealSlots: Array<"breakfast" | "lunch" | "dinner" | "snack">
  summaryText: string
}

export interface MealPlanSuggestion {
  generatedAt: string
  inputPreference: string
  budgetSnapshot: MealPlanBudgetSnapshot
  summary: string
  items: MealPlanItem[]
}

// 每日状态记录类型
export interface DailyStatus {
  stress: number // 压力水平 1-6
  mood: number // 心情状态 1-6
  health: number // 健康状况 1-6
  stressNotes?: string // 压力补充说明
  moodNotes?: string // 心情补充说明
  healthNotes?: string // 健康状况补充说明
  bedTime?: string // 睡眠时间 (HH:MM格式)
  wakeTime?: string // 起床时间 (HH:MM格式)
  sleepQuality?: number // 睡眠质量 1-6
  sleepNotes?: string // 睡眠补充说明
}

// 日志类型
export interface DailyLog {
  date: string
  foodEntries: FoodEntry[]
  exerciseEntries: ExerciseEntry[]
  summary: DailySummaryType
  weight?: number // 当日体重
  /** @deprecated 仅用于读取历史数据。新流程不再写入 daily activityLevel，统一从 profile 取 */
  activityLevel?: string
  calculatedBMR?: number // 当日计算的 BMR
  /** @deprecated 仅用于读取历史数据。新流程改用 baselineExpenditure + 运动消耗计算缺口 */
  calculatedTDEE?: number
  baselineExpenditure?: number // 基础消耗（BMR × PAL，只含 NEAT+TEF，不含刻意运动）
  dailyTotalExpenditure?: number // 今日总消耗 = baselineExpenditure + summary.totalCaloriesBurned
  dailyStatus?: DailyStatus // 每日状态记录
  /** @deprecated 旧版「今天还能吃什么」训练强度字段。新流程不再写入或用于预算。 */
  plannedTrainingType?: PlannedTrainingType
  mealPlanSuggestion?: MealPlanSuggestion
}

// 用户配置类型
export interface UserProfile {
  weight: number
  height: number
  age: number
  gender: string
  activityLevel: string
  goal: string
  targetWeight?: number
  targetCalories?: number
  notes?: string
  bmrFormula?: 'mifflin-st-jeor' | 'harris-benedict' // 新增：BMR计算公式选择
  bmrCalculationBasis?: 'totalWeight' | 'leanBodyMass' // 新增：BMR计算依据
  bodyFatPercentage?: number // 新增：体脂率，用于去脂体重计算
  // 专业模式字段
  professionalMode?: boolean // 是否启用专业模式
  medicalHistory?: string // 现有疾病、过敏、药物/补充剂、家族病史
  lifestyle?: string // 食物偏好/禁忌、睡眠质量、压力水平、烟酒习惯
  healthAwareness?: string // 健康认知与目标期望
}

// 模型配置类型
export interface ModelConfig {
  name: string
  baseUrl: string
  apiKey: string
}

// AI 配置类型
export interface AIConfig {
  agentModel: ModelConfig // 工作模型/Agents模型
  chatModel: ModelConfig // 对话模型
  visionModel: ModelConfig // 视觉模型
}

// AI助手记忆类型
export interface AIMemory {
  expertId: string // 对应专家角色ID
  content: string // 记忆内容，限制500字
  lastUpdated: string // 最后更新时间
  version: number // 版本号，用于跟踪更新
}

// AI记忆更新请求类型
export interface AIMemoryUpdateRequest {
  expertId: string
  newContent: string
  reason?: string // 更新原因
}

// 扩展的消息类型，支持思考过程
export interface ExtendedMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  reasoning_content?: string // 思考过程内容
  timestamp?: string
}
