import type { FoodEntry } from './types';
import type { MetabolicFlag } from './metabolic-flags';

/**
 * 计算基础食物热效应 (TEF)
 * 基于宏量营养素的热效应系数：
 * - 蛋白质: 20-30% (取25%)
 * - 碳水化合物: 5-10% (取8%)
 * - 脂肪: 0-3% (取2%)
 */
export function calculateBaseTEF(foodEntries: FoodEntry[]): {
  totalTEF: number;
  tefByMacro: {
    protein: number;
    carbs: number;
    fat: number;
  };
  totalCalories: number;
} {
  let totalProteinTEF = 0;
  let totalCarbsTEF = 0;
  let totalFatTEF = 0;
  let totalCalories = 0;

  foodEntries.forEach(entry => {
    if (entry.total_nutritional_info_consumed) {
      const nutrition = entry.total_nutritional_info_consumed;
      
      // 计算各宏量营养素的卡路里
      const proteinCalories = (nutrition.protein || 0) * 4; // 1g蛋白质 = 4kcal
      const carbsCalories = (nutrition.carbohydrates || 0) * 4; // 1g碳水 = 4kcal
      const fatCalories = (nutrition.fat || 0) * 9; // 1g脂肪 = 9kcal
      
      // 计算各宏量营养素的TEF
      totalProteinTEF += proteinCalories * 0.25; // 25%
      totalCarbsTEF += carbsCalories * 0.08; // 8%
      totalFatTEF += fatCalories * 0.02; // 2%
      
      totalCalories += nutrition.calories || 0;
    }
  });

  const totalTEF = totalProteinTEF + totalCarbsTEF + totalFatTEF;

  return {
    totalTEF,
    tefByMacro: {
      protein: totalProteinTEF,
      carbs: totalCarbsTEF,
      fat: totalFatTEF,
    },
    totalCalories,
  };
}

/**
 * 识别可能影响TEF的食物和物质
 * 返回影响因素和建议的乘数
 *
 * 每个条目优先读取解析时打标的 metabolic_flags;
 * 无 flags 的条目(历史数据、手动编辑、AI 漏标为空)回落到关键词匹配。
 */
export function identifyTEFEnhancers(foodEntries: FoodEntry[]): {
  factors: string[];
  suggestedMultiplier: number;
} {
  const factors: string[] = [];
  let multiplier = 1.0;

  // 检查每个食物条目
  foodEntries.forEach(entry => {
    matchEntryEnhancers(entry).forEach(enhancer => {
      if (!factors.includes(enhancer.description)) {
        factors.push(enhancer.description);
        // 累积乘数效应，但有上限
        multiplier = Math.min(multiplier * enhancer.multiplier, 1.3); // 最大30%增强
      }
    });
  });

  return {
    factors,
    suggestedMultiplier: Math.round(multiplier * 100) / 100 // 保留2位小数
  };
}

interface TEFEnhancer {
  flag: MetabolicFlag;
  keywords: string[];
  multiplier: number;
  description: string;
}

// 定义可能影响TEF的关键词
// 注意：不包括高蛋白食物，因为蛋白质的TEF已经在基础计算中考虑了
const tefEnhancers: Record<string, TEFEnhancer> = {
  // 咖啡因类 - 可提高TEF 5-15%
  caffeine: {
    flag: 'caffeine',
    keywords: ['咖啡', '茶', '红茶', '乌龙茶', '咖啡因', '浓缩咖啡', '拿铁', '卡布奇诺', '美式咖啡', '奶茶', '茶叶', '可乐', '能量饮料'],
    multiplier: 1.1,
    description: '咖啡因'
  },
  // 绿茶特殊成分 - 儿茶素可提高TEF (优先级高于普通咖啡因)
  greenTea: {
    flag: 'green-tea',
    keywords: ['绿茶', '抹茶', '龙井', '碧螺春', '毛峰', '铁观音', '绿茶提取物'],
    multiplier: 1.12,
    description: '绿茶儿茶素'
  },
  // 辛辣食物 - 辣椒素可提高TEF 5-10%
  spicy: {
    flag: 'spicy',
    keywords: ['辣椒', '胡椒', '芥末', '生姜', '大蒜', '洋葱', '辛辣', '麻辣', '川菜', '湘菜', '韩式', '泡菜', '咖喱', '辣椒素', '黑胡椒', '白胡椒'],
    multiplier: 1.08,
    description: '辛辣食物'
  },
  // 冷饮 - 身体需要额外能量加热
  cold: {
    flag: 'cold',
    keywords: ['冰水', '冰饮', '冰咖啡', '冰茶', '冰淇淋', '冰块', '冷饮', '冰沙'],
    multiplier: 1.03,
    description: '冷饮热效应'
  },
  // 其他代谢增强物质
  metabolicEnhancers: {
    flag: 'metabolic-enhancer',
    keywords: ['肉桂', '姜黄', '柠檬', '柚子', '薄荷', '椰子油', 'MCT油', '藤黄果', '左旋肉碱', '共轭亚油酸'],
    multiplier: 1.05,
    description: '代谢增强物质'
  }
};

// 单个条目命中的增强因素。flags 路径与关键词路径共用同一条
// "绿茶儿茶素优先级高于普通咖啡因"规则:同一食物命中绿茶时,
// 跳过 caffeine 规则,避免 "绿茶" / "抹茶拿铁" 被叠加成 1.1 × 1.12。
function matchEntryEnhancers(entry: FoodEntry): TEFEnhancer[] {
  const flags = entry.metabolic_flags;

  if (flags && flags.length > 0) {
    const greenTeaHit = flags.includes('green-tea');

    return Object.values(tefEnhancers).filter(enhancer => {
      if (enhancer.flag === 'caffeine' && greenTeaHit) return false;
      return flags.includes(enhancer.flag);
    });
  }

  const foodName = entry.food_name.toLowerCase();
  const greenTeaHit = tefEnhancers.greenTea.keywords.some(keyword =>
    foodName.includes(keyword.toLowerCase())
  );

  return Object.values(tefEnhancers).filter(enhancer => {
    if (enhancer.flag === 'caffeine' && greenTeaHit) return false;
    return enhancer.keywords.some(keyword =>
      foodName.includes(keyword.toLowerCase())
    );
  });
}
