import type { FoodEntry, TEFAnalysis } from './types';

/**
 * TEF分析缓存管理器
 * 用于避免重复计算相同食物组合的TEF
 * 支持本地存储持久化
 */
export class TEFCacheManager {
  private cache = new Map<string, { analysis: TEFAnalysis; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
  private readonly STORAGE_KEY = 'tef-analysis-cache';
  private isInitialized = false;

  /**
   * 生成食物条目的稳定哈希
   * 排除 log_id 等记录标识，但保留进食时间语义。
   * TEF AI prompt 会分析时间窗口，时间变化必须触发新分析。
   */
  generateFoodEntriesHash(foodEntries: FoodEntry[]): string {
    const stableData = foodEntries
      .map(entry => ({
        name: entry.food_name.trim().toLowerCase(),
        grams: Math.round(entry.consumed_grams * 100) / 100, // 保留2位小数
        mealType: entry.meal_type,
        timePeriod: entry.time_period ?? null,
        timestamp: entry.timestamp ?? null,
        // 只包含营养信息的关键字段
        nutrition: {
          calories: Math.round((entry.total_nutritional_info_consumed?.calories || 0) * 100) / 100,
          protein: Math.round((entry.total_nutritional_info_consumed?.protein || 0) * 100) / 100,
          carbohydrates: Math.round((entry.total_nutritional_info_consumed?.carbohydrates || 0) * 100) / 100,
          fat: Math.round((entry.total_nutritional_info_consumed?.fat || 0) * 100) / 100,
        }
      }))
      .sort((a, b) => {
        // 按语义字段排序，避免 UI 列表顺序变化造成缓存失效。
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        if (a.grams !== b.grams) return a.grams - b.grams;
        const mealCompare = a.mealType.localeCompare(b.mealType);
        if (mealCompare !== 0) return mealCompare;
        const timePeriodCompare = (a.timePeriod ?? '').localeCompare(b.timePeriod ?? '');
        if (timePeriodCompare !== 0) return timePeriodCompare;
        return (a.timestamp ?? '').localeCompare(b.timestamp ?? '');
      });
    
    return JSON.stringify(stableData);
  }

  /**
   * 初始化缓存（从本地存储加载）
   */
  private initializeCache(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // 只加载未过期的缓存
        for (const [hash, cached] of Object.entries(data)) {
          const cacheData = cached as { analysis: TEFAnalysis; timestamp: number };
          if (now - cacheData.timestamp < this.CACHE_DURATION) {
            this.cache.set(hash, cacheData);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load TEF cache from localStorage:', error);
    }

    this.isInitialized = true;
  }

  /**
   * 保存缓存到本地存储
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save TEF cache to localStorage:', error);
    }
  }

  /**
   * 获取缓存的TEF分析结果
   */
  getCachedAnalysis(foodEntries: FoodEntry[]): TEFAnalysis | null {
    this.initializeCache();

    if (foodEntries.length === 0) return null;

    const hash = this.generateFoodEntriesHash(foodEntries);
    const cached = this.cache.get(hash);

    if (!cached) return null;

    const cacheAge = Date.now() - cached.timestamp;
    if (cacheAge > this.CACHE_DURATION) {
      // 清除过期缓存
      this.cache.delete(hash);
      this.saveToStorage();
      return null;
    }

    return cached.analysis;
  }

  /**
   * 缓存TEF分析结果
   */
  setCachedAnalysis(foodEntries: FoodEntry[], analysis: TEFAnalysis): void {
    this.initializeCache();

    if (foodEntries.length === 0) return;

    const hash = this.generateFoodEntriesHash(foodEntries);
    this.cache.set(hash, {
      analysis,
      timestamp: Date.now()
    });

    // 清理过期缓存（每次设置时检查）
    this.cleanExpiredCache();

    // 保存到本地存储
    this.saveToStorage();
  }

  /**
   * 检查是否需要重新分析TEF
   */
  shouldAnalyzeTEF(foodEntries: FoodEntry[], previousHash: string): boolean {
    this.initializeCache();

    if (foodEntries.length === 0) return false;

    const currentHash = this.generateFoodEntriesHash(foodEntries);

    // 如果哈希相同，不需要重新分析
    if (currentHash === previousHash) return false;

    // 检查是否有有效缓存
    const cached = this.getCachedAnalysis(foodEntries);
    return cached === null;
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let hasChanges = false;

    for (const [hash, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(hash);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveToStorage();
    }
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null;
    
    for (const cached of this.cache.values()) {
      if (oldestTimestamp === null || cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldestTimestamp
    };
  }
}

// 导出单例实例
export const tefCacheManager = new TEFCacheManager();
