import type { UserProfile } from './types';

/**
 * 活动水平对应的 PAL（Physical Activity Level）乘数。
 *
 * 语义说明：这里的乘数**仅覆盖 NEAT（非运动性活动）+ TEF（食物热效应）**，
 * **不再**包含 EAT（刻意运动消耗）。用户应将跑步/举铁等运动单独记录到运动模块，
 * 由调用方在 baseline 之上累加，构成今日总消耗。
 *
 * 注:active / very_active 已从标准 Harris-Benedict PAL(1.725 / 1.9)下调,
 * 因为标准表的高档原本就靠"刻意运动"占主要比例,改成纯 NEAT 后明显高估。
 *
 * 对照表(NEAT-only 校准):
 *   sedentary    1.2    — 久坐少动（办公室 + 通勤坐车）
 *   light        1.375  — 站立工作 / 经常走动
 *   moderate     1.55   — 体力劳动（护士、工地）
 *   active       1.6    — 重体力劳动（标准 PAL 1.725,下调 0.125 抵消运动占比）
 *   very_active  1.75   — 极重体力（标准 PAL 1.9,下调 0.15 抵消运动占比）
 */
const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.6,
  very_active: 1.75,
};

/**
 * 使用 Katch-McArdle 公式计算基础代谢率 (BMR)
 * @param leanBodyMassKg 去脂体重 (kg)
 * @returns BMR (kcal/天)
 */
export function calculateKatchMcArdleBMR(leanBodyMassKg: number): number {
  if (leanBodyMassKg <= 0) {
    return 0; // 或者抛出错误，取决于如何处理无效输入
  }
  return 370 + (21.6 * leanBodyMassKg);
}

/**
 * 使用 Mifflin-St Jeor 公式计算基础代谢率 (BMR)
 * @param weightKg 体重 (kg)
 * @param heightCm 身高 (cm)
 * @param ageYears 年龄 (岁)
 * @param gender 性别 ('male' | 'female' | 'other')
 * @returns BMR (kcal/天)
 */
export function calculateMifflinStJeorBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other'
): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else if (gender === 'female') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  } else {
    // 对于 'other' 性别，取男性和女性BMR的平均值
    const maleBMR = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
    const femaleBMR = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
    return (maleBMR + femaleBMR) / 2;
  }
}

/**
 * 使用修正版 Harris-Benedict 公式计算基础代谢率 (BMR)
 * @param weightKg 体重 (kg)
 * @param heightCm 身高 (cm)
 * @param ageYears 年龄 (岁)
 * @param gender 性别 ('male' | 'female' | 'other')
 * @returns BMR (kcal/天)
 */
export function calculateHarrisBenedictBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other'
): number {
  if (gender === 'male') {
    return 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears + 88.362;
  } else if (gender === 'female') {
    return 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears + 447.593;
  } else {
    // 对于 'other' 性别，取男性和女性BMR的平均值
    const maleBMR = 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears + 88.362;
    const femaleBMR = 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears + 447.593;
    return (maleBMR + femaleBMR) / 2;
  }
}

/**
 * 计算每日总能量消耗 (TDEE)
 * @deprecated 旧语义假设 PAL 已含运动，会与单独记录的运动消耗双重计算。
 *   新代码请使用 `calculateBaselineExpenditure`，并在外层叠加当日运动消耗。
 * @param bmr 基础代谢率 (kcal/天)
 * @param activityLevel 活动水平 (来自 UserProfile.activityLevel)
 * @param additionalTEF 额外的食物热效应 (kcal/天) - 可选
 * @returns TDEE (kcal/天)
 */
export function calculateTDEE(bmr: number, activityLevel: string, additionalTEF?: number): number {
  const multiplier = activityMultipliers[activityLevel] || 1.55; // 默认为中等活动水平 (moderate)
  const baseTDEE = bmr * multiplier;

  // 如果提供了额外的TEF，则添加到TDEE中
  // 注意：传统的活动乘数已经包含了平均TEF，这里的additionalTEF是额外增强的部分
  return additionalTEF ? baseTDEE + additionalTEF : baseTDEE;
}

/**
 * 计算基础消耗 (Baseline Expenditure = BMR × PAL + additionalTEF)
 *
 * 语义：**不含**刻意运动消耗（EAT）。仅覆盖 BMR + NEAT + TEF。
 * 调用方应在此基础上累加当日运动消耗，得到 dailyTotalExpenditure：
 *
 *   dailyTotalExpenditure = baseline + totalCaloriesBurned
 *   缺口 = dailyTotalExpenditure - totalCaloriesConsumed
 *
 * @param bmr 基础代谢率 (kcal/天)
 * @param activityLevel 日常状态档位（参见 activityMultipliers 注释）
 * @param additionalTEF 额外的食物热效应增强 (kcal/天)，可选
 * @returns 基础消耗 (kcal/天)
 */
export function calculateBaselineExpenditure(
  bmr: number,
  activityLevel: string,
  additionalTEF?: number,
): number {
  const multiplier = activityMultipliers[activityLevel] || 1.2; // 默认 sedentary，避免高估
  const base = bmr * multiplier;
  return additionalTEF ? base + additionalTEF : base;
}

/**
 * 根据用户配置和当日数据计算 BMR 和基础消耗
 * @param userProfile 用户配置信息（活动水平统一从此读取）
 * @param currentDayData 包含当日可选的体重、TEF
 * @returns 包含 bmr、tdee（向后兼容字段，等于 baselineExpenditure）、baselineExpenditure 的对象
 */
export function calculateMetabolicRates(
  userProfile: UserProfile,
  currentDayData: {
    weight?: number; // 当日体重 (kg)
    /** @deprecated 已废弃，仅保留参数以兼容旧调用方。活动水平统一从 userProfile 读取 */
    activityLevel?: string;
    additionalTEF?: number; // 额外的TEF增强 (kcal)
  }
): { bmr: number; tdee: number; baselineExpenditure: number; tefEnhancement?: number } | undefined {
  const weightToUse = currentDayData.weight && currentDayData.weight > 0
    ? currentDayData.weight
    : userProfile.weight;

  // 活动水平只读 profile，不再支持 daily override
  const activityLevelForBaseline = userProfile.activityLevel;

  if (!weightToUse || !activityLevelForBaseline || !activityMultipliers.hasOwnProperty(activityLevelForBaseline)) {
    console.warn(
      "calculateMetabolicRates: Missing valid weight or activityLevel. Cannot calculate baseline.",
      { weightToUse, profileActivityLevel: userProfile.activityLevel }
    );
    return undefined;
  }

  console.log(`calculateMetabolicRates: Using weight: ${weightToUse}kg, activity level: ${activityLevelForBaseline}`);

  let bmr: number | undefined = undefined;

  // 尝试基于去脂体重计算 BMR
  if (userProfile.bmrCalculationBasis === 'leanBodyMass') {
    if (userProfile.bodyFatPercentage && userProfile.bodyFatPercentage > 0 && userProfile.bodyFatPercentage < 100) {
      const leanBodyMassKg = weightToUse * (1 - (userProfile.bodyFatPercentage / 100));
      if (leanBodyMassKg > 0) {
        bmr = calculateKatchMcArdleBMR(leanBodyMassKg);
        // console.log(`Calculated BMR using Katch-McArdle: ${bmr} (LBM: ${leanBodyMassKg}kg)`);
        if (bmr <= 0) {
          console.warn("calculateMetabolicRates: Katch-McArdle BMR is not positive. Will attempt fallback.");
          bmr = undefined;
        }
      } else {
        console.warn("calculateMetabolicRates: Calculated Lean Body Mass is not positive. Will attempt fallback to total weight calculation.");
      }
    } else {
      console.warn("calculateMetabolicRates: bmrCalculationBasis is 'leanBodyMass' but bodyFatPercentage is invalid or missing. Will attempt fallback to total weight calculation.");
    }
  }

  // 如果未使用去脂体重计算，或计算失败，则回退到基于总体重的计算
  if (bmr === undefined) {
    if (!userProfile.height || !userProfile.age || !userProfile.gender) {
      console.warn("calculateMetabolicRates: Missing height, age, or gender for total weight BMR calculation.");
      return undefined;
    }
    const validGenders = ['male', 'female', 'other'];
    const gender = userProfile.gender as 'male' | 'female' | 'other';
    if (!validGenders.includes(gender)) {
        console.warn(`Invalid gender: ${userProfile.gender}. Cannot calculate BMR.`);
        return undefined;
    }
    const formula = (userProfile.bmrFormula && ['mifflin-st-jeor', 'harris-benedict'].includes(userProfile.bmrFormula))
                    ? userProfile.bmrFormula
                    : 'mifflin-st-jeor';
    // console.log(`Calculating BMR using ${formula} with total weight ${weightToUse}kg.`);
    if (formula === 'mifflin-st-jeor') {
      bmr = calculateMifflinStJeorBMR(weightToUse, userProfile.height, userProfile.age, gender);
    } else {
      bmr = calculateHarrisBenedictBMR(weightToUse, userProfile.height, userProfile.age, gender);
    }
  }

  if (bmr === undefined || bmr <= 0) {
      console.warn(`Final calculated BMR is not positive or undefined: ${bmr}. Cannot calculate baseline.`);
      return undefined;
  }

  const baseline = calculateBaselineExpenditure(bmr, activityLevelForBaseline, currentDayData.additionalTEF);

  return {
    bmr: parseFloat(bmr.toFixed(0)),
    tdee: parseFloat(baseline.toFixed(0)), // 向后兼容字段，数值等同 baselineExpenditure
    baselineExpenditure: parseFloat(baseline.toFixed(0)),
    tefEnhancement: currentDayData.additionalTEF ? parseFloat(currentDayData.additionalTEF.toFixed(1)) : undefined,
  };
}