"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Weight, Utensils, Dumbbell, Target, TrendingUp } from "lucide-react"
import { format, subDays } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { Tile } from "@/components/ui/tile"
import { SectionCardHeader } from "@/components/ui/section-card-header"
import { cn } from "@/lib/utils"

interface ChartData {
  date: string
  weight?: number
  caloriesIn?: number
  caloriesOut?: number
  calorieDeficit?: number
}

interface ManagementChartsProps {
  selectedDate: Date
  refreshTrigger?: number
}

type DateRange = '7d' | '14d' | '30d' | '90d'
type MetricKey = 'weight' | 'calories' | 'exercise' | 'deficit'

interface DateRangeOption {
  value: DateRange
  label: string
  days: number
}

const METRIC_META: Record<MetricKey, { label: string; unit: string; colorVar: string }> = {
  weight:   { label: "体重",     unit: "kg",   colorVar: "--c-weight"   },
  calories: { label: "卡路里",   unit: "kcal", colorVar: "--c-food"     },
  exercise: { label: "运动消耗", unit: "kcal", colorVar: "--c-exercise" },
  deficit:  { label: "热量缺口", unit: "kcal", colorVar: "--c-weight"   },
}

function collectMetricValues(data: ChartData[], metric: MetricKey): number[] {
  switch (metric) {
    case "weight":
      return data.map(d => d.weight).filter((v): v is number => typeof v === "number")
    case "calories":
      return data.map(d => d.caloriesIn ?? 0).filter(v => v > 0)
    case "exercise":
      return data.map(d => d.caloriesOut ?? 0).filter(v => v > 0)
    case "deficit":
      return data
        .filter(d => (d.caloriesIn ?? 0) > 0 || (d.caloriesOut ?? 0) > 0)
        .map(d => d.calorieDeficit ?? 0)
  }
}

function formatMetricValue(v: number, metric: MetricKey, kind: "range" | "avg"): string {
  if (metric === "weight") return kind === "avg" ? v.toFixed(2) : v.toFixed(1)
  const rounded = Math.round(v)
  return rounded > 0 && metric === "deficit" ? `+${rounded}` : rounded.toString()
}

export function ManagementCharts({ selectedDate, refreshTrigger }: ManagementChartsProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [activeMetric, setActiveMetric] = useState<MetricKey>('weight')
  const [isDataOptimized, setIsDataOptimized] = useState(false)
  const [realDataCount, setRealDataCount] = useState(0)
  const { getData: getDailyLog, isInitializing: dbInitializing } = useIndexedDB("healthLogs")

  // 日期范围选项
  const dateRangeOptions: DateRangeOption[] = [
    { value: '7d', label: "7天", days: 7 },
    { value: '14d', label: "14天", days: 14 },
    { value: '30d', label: "30天", days: 30 },
    { value: '90d', label: "90天", days: 90 },
  ]

  useEffect(() => {
    // 等待 IndexedDB 初始化完成后再获取数据
    if (!dbInitializing) {
      const timer = setTimeout(() => {
        fetchChartData()
      }, 100) // 减少延迟时间

      return () => clearTimeout(timer)
    }
  }, [selectedDate, refreshTrigger, dbInitializing, getDailyLog, dateRange])

  const fetchChartData = async () => {
    setIsLoading(true)
    try {
      // 根据选择的日期范围获取数据
      const selectedRange = dateRangeOptions.find(option => option.value === dateRange)
      const daysToFetch = selectedRange?.days || 7
      const data: ChartData[] = []

      for (let i = daysToFetch - 1; i >= 0; i--) {
        const date = subDays(selectedDate, i)
        const dateStr = format(date, 'yyyy-MM-dd')

        try {
          const dailyLog = await getDailyLog(dateStr)

          // 为每一天都创建一个条目，即使没有数据
          const chartEntry: ChartData = {
            date: format(date, 'MM/dd', { locale: zhCN }),
            weight: dailyLog?.weight !== undefined ? dailyLog.weight : undefined,
            caloriesIn: Math.round(dailyLog?.summary?.totalCaloriesConsumed || 0),
            caloriesOut: Math.round(dailyLog?.summary?.totalCaloriesBurned || 0),
            calorieDeficit: Math.round(
              (dailyLog?.summary?.totalCaloriesConsumed || 0) -
              (dailyLog?.summary?.totalCaloriesBurned || 0) -
              (dailyLog?.calculatedTDEE || 1800)
            )
          }

          data.push(chartEntry)
        } catch (error) {
          // 即使出错也添加一个空数据点，保持图表连续性
          console.warn(`获取 ${dateStr} 数据失败:`, error)
          data.push({
            date: format(date, 'MM/dd', { locale: zhCN }),
            weight: undefined,
            caloriesIn: 0,
            caloriesOut: 0,
            calorieDeficit: -1800
          })
        }
      }

      // 检查是否有任何真实数据
      const hasRealData = data.some(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      if (hasRealData) {
        // 计算有效数据点的数量
        const realDataCount = data.filter(entry =>
          entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
        ).length

        // 智能调整显示策略
        const optimizedData = optimizeDataForDisplay(data, realDataCount)
        const isOptimized = optimizedData.length < data.length

        console.log(`✅ 图表显示真实数据，共 ${optimizedData.length} 天，有效数据 ${realDataCount} 天 (${dateRange}):`, optimizedData)
        setIsUsingMockData(false)
        setIsDataOptimized(isOptimized)
        setRealDataCount(realDataCount)
        setChartData(optimizedData)
      } else {
        console.log(`❌ 没有找到真实数据，使用模拟数据 (${dateRange})`)
        setIsUsingMockData(true)
        generateMockData()
      }
    } catch (error) {
      console.error('获取图表数据失败:', error)
      setIsUsingMockData(true)
      generateMockData()
    } finally {
      setIsLoading(false)
    }
  }





  // 智能优化数据显示策略
  const optimizeDataForDisplay = (data: ChartData[], realDataCount: number): ChartData[] => {
    // 如果有效数据点很少，调整显示策略
    if (realDataCount <= 3) {
      // 只显示有数据的天数及其前后各一天，最少显示5天
      const dataWithRealValues = data.filter(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      if (dataWithRealValues.length === 0) return data

      // 找到第一个和最后一个有数据的索引
      const firstRealIndex = data.findIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )
      const lastRealIndex = data.findLastIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      // 计算显示范围，确保至少显示5天
      const minDisplayDays = 5
      const actualSpan = lastRealIndex - firstRealIndex + 1
      const displaySpan = Math.max(minDisplayDays, actualSpan + 2) // 前后各留一天

      const startIndex = Math.max(0, firstRealIndex - Math.floor((displaySpan - actualSpan) / 2))
      const endIndex = Math.min(data.length - 1, startIndex + displaySpan - 1)

      return data.slice(startIndex, endIndex + 1)
    }

    // 如果有效数据点较少（少于选择范围的1/3），建议更短的时间范围
    const selectedRange = dateRangeOptions.find(option => option.value === dateRange)
    const totalDays = selectedRange?.days || 7

    if (realDataCount < totalDays / 3) {
      // 数据稀疏，只显示有数据的区间
      const firstRealIndex = data.findIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )
      const lastRealIndex = data.findLastIndex(entry =>
        entry.weight !== undefined || entry.caloriesIn > 0 || entry.caloriesOut > 0
      )

      if (firstRealIndex !== -1 && lastRealIndex !== -1) {
        // 显示从第一个数据点到最后一个数据点的区间，前后各留1-2天
        const padding = Math.min(2, Math.floor(totalDays * 0.1))
        const startIndex = Math.max(0, firstRealIndex - padding)
        const endIndex = Math.min(data.length - 1, lastRealIndex + padding)

        return data.slice(startIndex, endIndex + 1)
      }
    }

    // 数据充足，返回原始数据
    return data
  }
  const generateMockData = () => {
    const selectedRange = dateRangeOptions.find(option => option.value === dateRange)
    const daysToGenerate = selectedRange?.days || 7
    const data: ChartData[] = []

    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const date = subDays(selectedDate, i)
      const weight = 70 + Math.sin(i * 0.1) * 2 + Math.random() * 1 - 0.5
      const caloriesIn = 1800 + Math.random() * 600
      const caloriesOut = 300 + Math.random() * 400
      const calorieDeficit = caloriesIn - caloriesOut - 1800 // 假设TDEE为1800

      data.push({
        date: format(date, 'MM/dd', { locale: zhCN }),
        weight: Number(weight.toFixed(1)),
        caloriesIn: Number(caloriesIn.toFixed(0)),
        caloriesOut: Number(caloriesOut.toFixed(0)),
        calorieDeficit: Number(calorieDeficit.toFixed(0))
      })
    }
    setChartData(data)
  }

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case 'weight':
        return [`${value} kg`, "体重"]
      case 'caloriesIn':
        return [`${value} kcal`, "卡路里摄入"]
      case 'caloriesOut':
        return [`${value} kcal`, "运动消耗"]
      case 'calorieDeficit':
        return [`${value > 0 ? '+' : ''}${value} kcal`, value > 0 ? "热量盈余" : "热量缺口"]
      default:
        return [value, name]
    }
  }

  // 自定义X轴 tick — 日期 + 星期 横向堆叠
  const showWeekday = (dateRange === '7d' || dateRange === '14d') || chartData.length <= 10
  const renderXAxisTick = (props: { x?: number; y?: number; payload?: { value?: string } }) => {
    const { x = 0, y = 0, payload } = props
    const tickItem = payload?.value
    if (!tickItem) return <g />
    let weekday: string | null = null
    if (showWeekday) {
      const [month, day] = tickItem.split('/')
      const currentYear = new Date().getFullYear()
      const d = new Date(currentYear, parseInt(month) - 1, parseInt(day))
      weekday = format(d, 'eee', { locale: zhCN })
    }
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="middle"
          fontSize={11}
          fill="hsl(var(--muted-foreground))"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {tickItem}
        </text>
        {weekday && (
          <text
            x={0}
            y={0}
            dy={28}
            textAnchor="middle"
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
            fillOpacity={0.7}
          >
            {weekday}
          </text>
        )}
      </g>
    )
  }

  // 动态计算X轴间隔
  const getXAxisInterval = () => {
    if (chartData.length <= 5) return 0 // 5个点以下显示所有
    if (chartData.length <= 10) return 'preserveStartEnd' // 10个点以下保持首尾
    if (dateRange === '90d') return 'preserveStartEnd'
    return 'preserveStartEnd'
  }

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border">
        <CardContent className="p-5 sm720:p-7">
          <SectionCardHeader
            tileVariant="ink"
            icon={<TrendingUp />}
            title="管理图表"
            subtitle="加载中…"
          />
          <p className="py-8 text-center text-sm text-muted-foreground">加载图表数据中...</p>
        </CardContent>
      </Card>
    )
  }

  const currentRangeOption = dateRangeOptions.find(opt => opt.value === dateRange) ?? dateRangeOptions[0]
  const metricMeta = METRIC_META[activeMetric]
  const metricValues = collectMetricValues(chartData, activeMetric)
  const hasMetricData = metricValues.length > 0
  const stats = hasMetricData
    ? {
        min: Math.min(...metricValues),
        max: Math.max(...metricValues),
        avg: metricValues.reduce((a, b) => a + b, 0) / metricValues.length,
      }
    : null

  const headerSubtitle = isUsingMockData
    ? "演示数据 — 请先记录您的健康数据"
    : isDataOptimized
      ? `${currentRangeOption.label} 健康数据趋势分析 · 已优化(${realDataCount} 天有效)`
      : `${currentRangeOption.label} 健康数据趋势分析`

  const rangePill = (
    <div
      role="tablist"
      aria-label="日期范围"
      className="inline-flex h-8 items-center rounded-md bg-muted p-0.5 text-muted-foreground"
    >
      {dateRangeOptions.map((option) => {
        const active = dateRange === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setDateRange(option.value)}
            className={cn(
              "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-[6px] px-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-[0_0_0_1px_hsl(var(--border))_inset]"
                : "hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="p-5 sm720:p-7">
        <SectionCardHeader
          tileVariant="ink"
          icon={<TrendingUp />}
          title="管理图表"
          subtitle={headerSubtitle}
          action={rangePill}
          className="flex-wrap gap-3"
        />

        <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as MetricKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted p-1">
            <TabsTrigger
              value="weight"
              className="data-[state=active]:shadow-[0_0_0_1px_hsl(var(--border))_inset] data-[state=active]:font-semibold"
            >
              <Weight className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              体重
            </TabsTrigger>
            <TabsTrigger
              value="calories"
              className="data-[state=active]:shadow-[0_0_0_1px_hsl(var(--border))_inset] data-[state=active]:font-semibold"
            >
              <Utensils className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              卡路里
            </TabsTrigger>
            <TabsTrigger
              value="exercise"
              className="data-[state=active]:shadow-[0_0_0_1px_hsl(var(--border))_inset] data-[state=active]:font-semibold"
            >
              <Dumbbell className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              运动消耗
            </TabsTrigger>
            <TabsTrigger
              value="deficit"
              className="data-[state=active]:shadow-[0_0_0_1px_hsl(var(--border))_inset] data-[state=active]:font-semibold"
            >
              <Target className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              热量缺口
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: `hsl(var(${metricMeta.colorVar}))` }}
              />
              <span className="font-medium text-foreground">{metricMeta.label}</span>
              <span className="text-muted-foreground">({metricMeta.unit})</span>
            </div>
            <div className="text-[12px] text-muted-foreground tabular-nums">
              {hasMetricData && stats ? (
                <>
                  区间 {formatMetricValue(stats.min, activeMetric, "range")} – {formatMetricValue(stats.max, activeMetric, "range")}
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  {currentRangeOption.days} 日均值 {formatMetricValue(stats.avg, activeMetric, "avg")}
                </>
              ) : (
                <span className="text-muted-foreground/70">暂无数据</span>
              )}
            </div>
          </div>

          <div className="mt-4 relative">
            {/* 图表内容 */}
            <div className={isUsingMockData ? 'opacity-30 pointer-events-none select-none' : ''}>
              <TabsContent value="weight" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.55} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={showWeekday ? 44 : 24}
                        tick={renderXAxisTick}
                      />
                      <YAxis
                        hide
                        domain={[(dataMin: number) => Math.max(0, dataMin - 2), (dataMax: number) => dataMax + 2]}
                      />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(var(--c-weight))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--c-weight))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--c-weight))', strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="calories" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.55} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={showWeekday ? 44 : 24}
                        tick={renderXAxisTick}
                      />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="caloriesIn"
                        stroke="hsl(var(--c-food))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--c-food))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--c-food))', strokeWidth: 2 }}
                        name="卡路里摄入"
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="exercise" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.55} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={showWeekday ? 44 : 24}
                        tick={renderXAxisTick}
                      />
                      <YAxis hide domain={['dataMin', 'dataMax']} />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="caloriesOut"
                        stroke="hsl(var(--c-exercise))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--c-exercise))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--c-exercise))', strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="deficit" className="space-y-4">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="hsl(var(--border))" strokeOpacity={0.55} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        interval={getXAxisInterval()}
                        minTickGap={chartData.length <= 5 ? 10 : (dateRange === '90d' ? 20 : 35)}
                        height={showWeekday ? 44 : 24}
                        tick={renderXAxisTick}
                      />
                      <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                      <Tooltip
                        formatter={formatTooltipValue}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="calorieDeficit"
                        stroke="hsl(var(--c-weight))"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--c-weight))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--c-weight))', strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </div>

            {/* 模拟数据覆盖层 */}
            {isUsingMockData && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/95 rounded-lg">
                <div className="text-center px-8 max-w-md">
                  <Tile variant="ink" size={36} className="mx-auto mb-4">
                    <TrendingUp />
                  </Tile>
                  <h4 className="text-base font-semibold text-foreground mb-2">
                    开始记录您的健康数据
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    记录体重、饮食和运动数据后,这里将显示您的真实健康趋势图表
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    当前显示的是演示数据
                  </p>
                </div>
              </div>
            )}


          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
