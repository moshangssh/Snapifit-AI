/**
 * 训练动作库 - 从 SmartWorkout 824 个动作中精选（#51 去重后 103 个）
 *
 * 数据源: SmartWorkout exercise database
 * 筛选标准: AS 安全、阶段适配、肌肉覆盖全面
 *
 * 分层标签说明:
 * - movement_pattern: 动作模式（用于变式匹配）
 * - primary_muscle: 主要肌群
 * - angle: 角度（incline/decline/flat/neutral/overhead）
 * - equipment_simplified: 器械类型
 *
 * @see docs/adr/0006-exercise-catalog-96-selected-from-824.md
 */

import type { MuscleKey } from "@/lib/muscle-groups"

export type MuscleGroup =
  | 'CHEST'
  | 'BACK'
  | 'SHOULDERS'
  | 'QUADS'
  | 'GLUTES'
  | 'HAMSTRINGS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'CORE'
  | 'FOREARMS'
  | 'CALVES'

export type MovementPattern =
  | 'horizontal_push'
  | 'incline_push'
  | 'decline_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'lateral_raise'
  | 'front_raise'
  | 'rear_delt'
  | 'shrug'
  | 'squat_pattern'
  | 'hinge_pattern'
  | 'lunge_pattern'
  | 'leg_curl'
  | 'leg_extension'
  | 'hip_abduction'
  | 'hip_adduction'
  | 'calf_raise'
  | 'isolation_curl'
  | 'isolation_extension'
  | 'core_flexion'
  | 'core_rotation'
  | 'core_stability'
  | 'mobility'
  | 'compound'

export type ExerciseAngle =
  | 'incline'
  | 'decline'
  | 'flat'
  | 'neutral'
  | 'overhead'

export type EquipmentType =
  | 'MACHINE'
  | 'DUMBBELL'
  | 'CABLE'
  | 'BARBELL'
  | 'BAND'
  | 'BODYWEIGHT'
  | 'OTHER'

export type ExerciseMechanics = 'COMPOUND' | 'ISOLATION'

export type ExerciseLaterality = 'BILATERAL' | 'UNILATERAL' | 'ALTERNATING'

export type ExerciseTag =
  | 'NOVICE_CORE'      // 新手核心池（20 个）
  | 'INTERMEDIATE_VARIANT'  // 中级变式池（30 个）
  | 'ADVANCED'         // 高级扩展池（36 个）
  | 'BENCHMARK'        // 基准动作（中级阶段标记，运行时确定）
  | 'LIFETIME_BENCHMARK'  // 终生基准（高级阶段标记，运行时确定）
  | 'AS_CORE'          // AS 核心活动度（10 个）
  | 'STRENGTH'
  | 'MOBILITY'
  | 'STRETCH'
  | 'WARMUP'
  | 'COOLDOWN'

export interface Exercise {
  id: string
  name: string
  nameEn: string
  primaryMuscle: MuscleGroup
  movementPattern: MovementPattern
  angle: ExerciseAngle
  equipment: EquipmentType
  mechanics: ExerciseMechanics
  laterality: ExerciseLaterality
  tags: ExerciseTag[]
}

/**
 * 力量训练动作库（93 个）
 */
export const STRENGTH_EXERCISES: Exercise[] = [

  // ========== 新手核心池（20 个）==========
  // 机械/哑铃/绳索，安全稳定，覆盖 6 肌群
  {
    id: '81112d74-4711-4ddc-9145-a610bf8407c8',
    name: '器械卧推',
    nameEn: 'Machine Chest Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'horizontal_push',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '4eb45701-1c6d-46b7-a427-24f80a43837c',
    name: '地面哑铃卧推',
    nameEn: 'Floor Dumbbell Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'horizontal_push',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '6548ec6b-8ab8-4866-8b80-e2b412937051',
    name: '蝴蝶机胸部飞鸟',
    nameEn: 'Pec Deck Chest Fly',
    primaryMuscle: 'CHEST',
    movementPattern: 'horizontal_push',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: 'd8e77fb2-ebb1-4e7c-8e93-fd397a8c290b',
    name: '单臂坐姿划船',
    nameEn: 'One-Arm Seated Row',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '4ba860b1-2e76-45b6-8023-c386bc56e65d',
    name: '器械下拉',
    nameEn: 'Machine Pullover',
    primaryMuscle: 'BACK',
    movementPattern: 'vertical_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '245a9e25-296f-4330-9fb6-82de62ebfaca',
    name: '单臂胸部支撑划船机',
    nameEn: 'One-Arm Chest Supported Row Machine',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '12838e78-2632-4e2b-87c9-3926e86a7e1a',
    name: '哑铃坐姿侧平举',
    nameEn: 'Dumbbell Seated Lateral Raise',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'lateral_raise',
    angle: 'flat',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '6b0ffef6-8dd1-4b89-999a-a11d85d9e16f',
    name: '器械肩推举',
    nameEn: 'Machine Shoulder Press',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'vertical_push',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '5ee2a3f3-0b7a-7527-b3ee-d7d87664862b',
    name: '器械反向飞鸟',
    nameEn: 'Machine Reverse Flyes',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'rear_delt',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '084947cf-098f-62f2-36b2-41547577e2b8',
    name: '窄距45度腿举',
    nameEn: 'Narrow Stance 45 Degree Leg Press',
    primaryMuscle: 'QUADS',
    movementPattern: 'squat_pattern',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '3ae8ee86-534c-0824-07b6-e9f105b97c1d',
    name: '坐姿腿弯举',
    nameEn: 'Seated Leg Curl',
    primaryMuscle: 'HAMSTRINGS',
    movementPattern: 'leg_curl',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: 'd61ba24e-4c00-4c61-9127-08db49a79c32',
    name: '器械臀桥',
    nameEn: 'Machine Hip Thrust',
    primaryMuscle: 'GLUTES',
    movementPattern: 'hinge_pattern',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: 'c0d708f6-00ab-118f-9f7d-e13f27e5458b',
    name: '坐姿髋外展',
    nameEn: 'Seated Hip Abduction',
    primaryMuscle: 'GLUTES',
    movementPattern: 'hip_abduction',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '174978b8-1b92-4700-96d0-98d1835628dd',
    name: '哑铃蜘蛛弯举',
    nameEn: 'Dumbbell Spider Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: 'ef115bce-70a8-4db5-b917-3e9fc3a89d5c',
    name: '坐姿下压训练机',
    nameEn: 'Seated Dip Machine',
    primaryMuscle: 'TRICEPS',
    movementPattern: 'isolation_extension',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: 'ca1dbb25-9c6d-464b-95ca-a55d9b72395a',
    name: '牧师锤式弯举',
    nameEn: 'Preacher Hammer Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '0f7bb383-5b6c-4065-8d63-21b9925d37f0',
    name: '绳索交叉三头肌伸展',
    nameEn: 'Cable Cross Triceps Extension',
    primaryMuscle: 'TRICEPS',
    movementPattern: 'isolation_extension',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: 'cb4adf67-8fc7-4fee-b077-0971132d0c9a',
    name: '坐姿腹部绳索卷腹',
    nameEn: 'Seated Ab Cable Crunch',
    primaryMuscle: 'CORE',
    movementPattern: 'core_flexion',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '0ad57432-b306-46f9-a486-635db0a1080c',
    name: '旋转躯干',
    nameEn: 'Rotary Torso',
    primaryMuscle: 'CORE',
    movementPattern: 'core_rotation',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '2f181b12-c156-48f8-bfb4-efc2ffc650dc',
    name: '负重仰卧起坐',
    nameEn: 'Weighted Sit Up',
    primaryMuscle: 'CORE',
    movementPattern: 'core_stability',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },

  // ========== 中级变式池（30 个）==========
  // 基于新手核心的角度/器械变式
  {
    id: '18d649a8-769d-4722-837f-556903fe81ba',
    name: '低位滑轮上斜卧推',
    nameEn: 'Low Cable Incline Bench Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'incline_push',
    angle: 'incline',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '833d7f7c-e6ab-4796-97c7-17ebb035d33d',
    name: '下斜卧推',
    nameEn: 'Decline Chest Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'decline_push',
    angle: 'decline',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '7be164bf-92d9-4808-bbf4-2aa207d17205',
    name: '单臂哑铃上斜卧推',
    nameEn: 'One-Arm Dumbbell Incline Bench Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'incline_push',
    angle: 'incline',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '80fd9286-0d64-becd-c2c2-83742b0c3974',
    name: '上斜哑铃飞鸟',
    nameEn: 'Incline Dumbbell Chest Fly',
    primaryMuscle: 'CHEST',
    movementPattern: 'horizontal_push',
    angle: 'incline',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '13a0a404-a40c-4565-b125-29a3c83a2bd6',
    name: '坐姿绳索宽握划船',
    nameEn: 'Seated Cable Wide Grip Row',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '25472b18-efdc-438a-a2c2-ab72994be361',
    name: '绳索中立握距下拉',
    nameEn: 'Cable Neutral Grip Lat Pulldown',
    primaryMuscle: 'BACK',
    movementPattern: 'vertical_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '1a9dfa03-6633-4c8e-830e-1c5928b8c0d7',
    name: '绳索直臂背阔肌下拉',
    nameEn: 'Rope Straight-Arm Lat Pulldown',
    primaryMuscle: 'BACK',
    movementPattern: 'vertical_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '138862a9-3d34-4aa7-86f0-13e35d16e12f',
    name: '单臂下拉绳低位划船',
    nameEn: 'One-Arm Cable Low Row',
    primaryMuscle: 'BACK',
    movementPattern: 'vertical_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '23aaf86c-d27a-4464-88d0-e3f88bb1ba4c',
    name: '哑铃凯尔索耸肩',
    nameEn: 'Dumbbell Kelso Shrugs',
    primaryMuscle: 'BACK',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '05047869-eeb1-4c65-948c-0d85715bacae',
    name: '杠铃片前平举驱动',
    nameEn: 'Plate Front Raise Drive',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'front_raise',
    angle: 'flat',
    equipment: 'OTHER',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '0ea2687b-5d78-4041-8ad4-66a6a8848da1',
    name: '单臂拉力器侧平举',
    nameEn: 'One-Arm Cable Lateral Raise',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'lateral_raise',
    angle: 'flat',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '5b2bdea5-ceee-a837-596c-fd2f6138ffff',
    name: '坐姿哑铃推举',
    nameEn: 'Seated Dumbbell Shoulder Press',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'vertical_push',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '3ac761ff-672b-488c-bd22-3ded2b757e13',
    name: '绳索仰握面拉',
    nameEn: 'Cable Supinated Face Pull',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'rear_delt',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '2f8af6f8-5cd3-821e-ec81-1314359d9cfc',
    name: '绳索直立划船',
    nameEn: 'Cable Upright Row',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '8dcc0b41-7486-485d-aa85-c09fa57537eb',
    name: '半程臀腿屈伸',
    nameEn: 'Glute-Ham Raise 1/2',
    primaryMuscle: 'QUADS',
    movementPattern: 'leg_extension',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '9202e88a-111c-40f8-8464-d567a7fff830',
    name: '坐姿单腿腿弯举',
    nameEn: 'Seated Single Leg Curl',
    primaryMuscle: 'HAMSTRINGS',
    movementPattern: 'leg_curl',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '0b59dd85-d65d-4e28-bad1-2a74fc204504',
    name: '哑铃单腿臀桥',
    nameEn: 'Dumbbell Single Leg Hip Thrust',
    primaryMuscle: 'GLUTES',
    movementPattern: 'hinge_pattern',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '142bd4e5-6755-42e2-83ad-cbfcf6388dab',
    name: '坐姿髋内收',
    nameEn: 'Seated Hip Adduction',
    primaryMuscle: 'QUADS',
    movementPattern: 'hip_adduction',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '12c994b1-6251-4d3e-96e6-8186ee6a0afd',
    name: '负重坐姿提踵',
    nameEn: 'Weighted Seated Calf Raise',
    primaryMuscle: 'CALVES',
    movementPattern: 'calf_raise',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '127dc619-8078-4148-907b-e08a49f1676a',
    name: '哑铃台阶反向弓步',
    nameEn: 'Dumbbell Reverse Lunge off Step',
    primaryMuscle: 'GLUTES',
    movementPattern: 'lunge_pattern',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'ALTERNATING',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '293c61e4-0955-4504-a40d-3b671498ad97',
    name: '哑铃仰握牧师凳弯举',
    nameEn: 'Dumbbell Supinated Preacher Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '89d00daa-f73b-4391-84d1-803ac433363e',
    name: '哑铃上斜交替仰握弯举',
    nameEn: 'Dumbbell Incline Alternate Supinated Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'incline',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'ALTERNATING',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: 'b866a8c1-4083-403a-9a68-ba6846f85a87',
    name: '集中锤式弯举',
    nameEn: 'Concentration Hammer Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '427c150b-3c0d-4010-9476-0787cfc84514',
    name: '单臂武士刀三头肌过顶伸展',
    nameEn: 'One-Arm Katana Triceps Overhead Extension',
    primaryMuscle: 'TRICEPS',
    movementPattern: 'isolation_extension',
    angle: 'overhead',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '83d39870-dd41-c0dc-5115-5067cb98c3dc',
    name: '哑铃仰卧三头肌伸展',
    nameEn: 'Dumbbell Lying Triceps Extension',
    primaryMuscle: 'TRICEPS',
    movementPattern: 'isolation_extension',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '27433624-9149-4eba-b527-9314b99d8a2c',
    name: '仰卧EZ杠三头肌伸展',
    nameEn: 'Lying EZ-Bar Triceps Extension',
    primaryMuscle: 'TRICEPS',
    movementPattern: 'isolation_extension',
    angle: 'neutral',
    equipment: 'OTHER',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '73240447-5323-4b6d-99ce-cffbffb19a07',
    name: '负重平板支撑',
    nameEn: 'Weighted Plank',
    primaryMuscle: 'CORE',
    movementPattern: 'core_stability',
    angle: 'flat',
    equipment: 'OTHER',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '11abe949-7bce-4971-95c0-f754772ee813',
    name: '负重下斜卷腹',
    nameEn: 'Weighted Decline Crunch',
    primaryMuscle: 'CORE',
    movementPattern: 'core_flexion',
    angle: 'decline',
    equipment: 'OTHER',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '149f6670-3321-4e86-a231-796f1c26a1a4',
    name: '腹肌轮滚动',
    nameEn: 'Ab Wheel Rollout',
    primaryMuscle: 'CORE',
    movementPattern: 'core_stability',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },

  // ========== 高级扩展池（36 个）==========
  // 单侧/复杂/条件性杠铃
  {
    id: '03d73a15-6288-4c26-922f-dfc877f44128',
    name: '单腿深蹲',
    nameEn: 'Pistol Squat',
    primaryMuscle: 'QUADS',
    movementPattern: 'squat_pattern',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '04035dba-efc3-4736-9b1b-bc4fd23d9695',
    name: '单臂背阔肌下拉',
    nameEn: 'One-Arm Lat Pulldown',
    primaryMuscle: 'BACK',
    movementPattern: 'vertical_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '081d6aee-e878-4d7e-adda-925768ebf2bc',
    name: '单臂哑铃俯身肩胛骨划船',
    nameEn: 'One-Arm Dumbbell Bent Over Scapula Row',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '09aed7e3-7a9c-4e38-81a6-bb7675692cbf',
    name: '单臂中立腕哑铃弯举',
    nameEn: 'One-Arm Neutral Wrist Dumbbell Curl',
    primaryMuscle: 'FOREARMS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '0c179dee-0e67-473f-84ce-02a48a1e0513',
    name: '跪姿弹力带臀部后踢',
    nameEn: 'Kneeling Resistance Band Glute Kickback',
    primaryMuscle: 'GLUTES',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'BAND',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '0d99097d-9865-470d-823e-a6170baf0631',
    name: '绳索前平举',
    nameEn: 'Cable Front Raise',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'front_raise',
    angle: 'flat',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '1bf3fec3-3ec8-48b8-bb5c-7439876c7aab',
    name: '单臂哑铃肩推',
    nameEn: 'One-Arm Shoulder Press Dumbbell',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'vertical_push',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '20afacad-4d93-423b-8d48-7fd05134b702',
    name: '单臂拉索前平举',
    nameEn: 'One-Arm Cable Front Raise',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'front_raise',
    angle: 'flat',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '214c92ad-dfe0-40a9-a697-d492de526d44',
    name: '杠铃台阶上步',
    nameEn: 'Barbell Step-up',
    primaryMuscle: 'QUADS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '2187784c-77b0-4106-9b6f-cd5938da82b8',
    name: '单腿哑铃提踵',
    nameEn: 'Single-Leg Calf Raise with Dumbbell',
    primaryMuscle: 'CALVES',
    movementPattern: 'calf_raise',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '229f5259-a671-48c4-acd0-dd109e3744ab',
    name: '单臂绳索飞鸟',
    nameEn: 'One-Arm Cable Fly',
    primaryMuscle: 'CHEST',
    movementPattern: 'horizontal_push',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '2340824d-e207-4561-bdcd-8752070c06da',
    name: '单臂直臂下拉训练',
    nameEn: 'One-Arm Straight-Arm Cable Lat Pulldown',
    primaryMuscle: 'BACK',
    movementPattern: 'vertical_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '245e0727-1c35-4965-aa28-0456d8969828',
    name: '钢索髋关节外展',
    nameEn: 'Cable Hip Abducction',
    primaryMuscle: 'GLUTES',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    // 提升为新手核心：钢索/器械引导、无轴向负重(AS 安全)、低技术门槛的臀中肌外展。
    // 下A/下B 主项需 2 个臀动作 + 热身激活需 1 个,原novice池仅 2 个臀会迫使热身复制主项动作。(issue #47)
    tags: ['NOVICE_CORE', 'STRENGTH'],
  },
  {
    id: '26268881-afd6-445d-9a8b-a149d8dafdaa',
    name: '单臂哑铃弯举',
    nameEn: 'Single Dumbbell Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '27149543-dc50-48eb-86f7-022e7ab1b591',
    name: '箱式台阶上步',
    nameEn: 'Box step-up',
    primaryMuscle: 'QUADS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'OTHER',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '272ee53c-baf9-4a84-a909-e7370543dd8a',
    name: '单臂低位拉索坐姿划船',
    nameEn: 'One-Arm Low Cable Seated Row',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '2b8538c5-03b4-4f4f-b178-11dd9b8ad4f3',
    name: '单臂机器牧师弯举',
    nameEn: 'One-Arm Machine Preacher Curl',
    primaryMuscle: 'BICEPS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '2d243c0b-02d2-4e67-8a63-dca09e86b55a',
    name: '俯身壶铃划船',
    nameEn: 'Bent Over Kettlebell Row',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'OTHER',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '30fec8f3-59a5-4d4f-9988-972018248c9f',
    name: '哑铃分腿蹲',
    nameEn: 'Dumbbell Split Squat',
    primaryMuscle: 'QUADS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '0349439c-c56e-4bd8-88b9-7bf9b00f3811',
    name: '哑铃推举',
    nameEn: 'Dumbbell Push Press',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'vertical_push',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '0a75e037-9658-4706-a497-d7efe844e10b',
    name: '徒手风车式',
    nameEn: 'Bodyweight Windmill',
    primaryMuscle: 'CORE',
    movementPattern: 'core_stability',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'COMPOUND',
    laterality: 'ALTERNATING',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '15f450f0-f4f1-4391-b59e-c79cd37956ac',
    name: '哑铃侧桥',
    nameEn: 'Dumbbell Side Bridge',
    primaryMuscle: 'CORE',
    movementPattern: 'core_stability',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '19862249-cbd3-4104-bcc0-b5ad1c21bd73',
    name: '杠铃推举',
    nameEn: 'Barbell Push Press',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'vertical_push',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '1a6fdebd-5789-415d-9724-bda20c1c846e',
    name: '横叉平板支撑',
    nameEn: 'Straddle Planche',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'compound',
    angle: 'flat',
    equipment: 'OTHER',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '20995c61-3541-47c8-be8d-e1db17c6bffc',
    name: '拳面俯卧撑',
    nameEn: 'Knuckle Push-Up',
    primaryMuscle: 'CHEST',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '03b44dbb-7517-432a-8906-17069ed494b2',
    name: '安德森深蹲',
    nameEn: 'Anderson Squat',
    primaryMuscle: 'QUADS',
    movementPattern: 'squat_pattern',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '07747821-38bb-4522-9f6b-b4ae4abf2282',
    name: '杠铃地板卧推',
    nameEn: 'Barbell Floor Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'horizontal_push',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '085cfcf8-548d-44df-8e92-eb9936752382',
    name: '杠铃提踵',
    nameEn: 'Barbell Calf Raise',
    primaryMuscle: 'CALVES',
    movementPattern: 'calf_raise',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '0c3e27ed-e95b-7611-a3e8-7dab63585d21',
    name: '杠铃划船',
    nameEn: 'Barbell Bent Over Row',
    primaryMuscle: 'BACK',
    movementPattern: 'horizontal_pull',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '10544e2e-3765-1ba9-b753-c9ccd60b06d4',
    name: '上斜杠铃卧推',
    nameEn: 'Incline Barbell Bench Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'incline_push',
    angle: 'incline',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '114ad863-9971-40c3-8108-2a983fe656ae',
    name: '缺口硬拉',
    nameEn: 'Deficit Deadlift',
    primaryMuscle: 'HAMSTRINGS',
    movementPattern: 'hinge_pattern',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '145b65df-1575-4204-852c-0e3f24b29139',
    name: '杠铃深蹲',
    nameEn: 'Barbell Squat',
    primaryMuscle: 'QUADS',
    movementPattern: 'squat_pattern',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '17325fc8-61c6-4697-9fe1-17e7ece44254',
    name: '杠铃限位深蹲',
    nameEn: 'Pin Squat',
    primaryMuscle: 'QUADS',
    movementPattern: 'squat_pattern',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '17d168cd-9745-60f3-f30f-7ec574eaf8a3',
    name: '杰伊姆卧推',
    nameEn: 'JM Press',
    primaryMuscle: 'TRICEPS',
    movementPattern: 'horizontal_push',
    angle: 'neutral',
    equipment: 'BARBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },

  // ========== 补充动作（10 个）==========
  // 填补覆盖不足（下胸/肩后束/上背等）
  {
    id: 'c30468f2-024b-79d4-df35-0c937e391555',
    name: '下斜哑铃卧推',
    nameEn: 'Decline Dumbbell Bench Press',
    primaryMuscle: 'CHEST',
    movementPattern: 'decline_push',
    angle: 'decline',
    equipment: 'DUMBBELL',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: '241b716d-5fcd-42ca-b987-5e78239d4ea2',
    name: '俯身哑铃侧平举',
    nameEn: 'Bent Over Dumbbell Lateral Raise',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'lateral_raise',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '3c28f1b2-7cb3-4c6a-9d73-64730de893e6',
    name: '坐姿面拉',
    nameEn: 'Seated Face Pull',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'rear_delt',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'COMPOUND',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '61fb6b76-1d67-48f8-abba-bca2c60db1f9',
    name: '哑铃耸肩',
    nameEn: 'Dumbbell Shoulder Shrugs',
    primaryMuscle: 'BACK',
    movementPattern: 'shrug',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: 'd919d4f3-6cb0-4e11-b70a-3788dcc0a371',
    name: '绳索耸肩',
    nameEn: 'Cable Shrug',
    primaryMuscle: 'BACK',
    movementPattern: 'shrug',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['INTERMEDIATE_VARIANT', 'STRENGTH'],
  },
  {
    id: 'c72d1396-05a3-4254-a62e-dbbba9813472',
    name: '单腿仰卧腿弯举',
    nameEn: 'Single-Leg Lying Curl',
    primaryMuscle: 'HAMSTRINGS',
    movementPattern: 'leg_curl',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '99704170-da3e-48e5-bb24-33f8193d2892',
    name: '钢索髋关节内收',
    nameEn: 'Cable Hip Adduction',
    primaryMuscle: 'QUADS',
    movementPattern: 'hip_adduction',
    angle: 'neutral',
    equipment: 'MACHINE',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: 'b2c6ca4b-db03-4553-8d9f-6e5e87bbd118',
    name: '哑铃站立反向腕屈伸',
    nameEn: 'Dumbbell Standing Reverse Wrist Curls',
    primaryMuscle: 'FOREARMS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: 'bd7b2836-8bd5-4dd6-8645-2bad2da1c2db',
    name: '单臂哑铃侧平举',
    nameEn: 'One-Arm Dumbbell Lateral Raise',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'lateral_raise',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  },
  {
    id: '12b4858c-6c84-43b4-964d-cfd590ff7958',
    name: '单臂哑铃腕屈曲',
    nameEn: 'One-Arm Wrist Curl Dumbbell',
    primaryMuscle: 'FOREARMS',
    movementPattern: 'isolation_curl',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'UNILATERAL',
    tags: ['ADVANCED', 'STRENGTH'],
  }
]

/**
 * AS 核心活动度动作库（10 个）
 * 用于 warmup 和 cooldown，覆盖胸椎/髋/肩胛/脊柱 4 个维度
 */
export const AS_CORE_EXERCISES: Exercise[] = [
  {
    id: '08cde7c0-5988-4190-b12b-b0b565d113f6',
    name: '手臂环绕',
    nameEn: 'Arm Circles',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'mobility',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'WARMUP'],
  },
  {
    id: '6d2a3622-980f-4d8f-aa00-852652cdd1d5',
    name: '弹力带肩部穿越',
    nameEn: 'Band Pass Through Shoulders',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'BAND',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH', 'WARMUP'],
  },
  {
    id: '77e949b2-df71-4560-b72c-f79eaa7966dc',
    name: '坐姿肩外旋',
    nameEn: 'Seated Shoulder External Rotation',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY'],
  },
  {
    id: '4a5f1411-75cd-4485-bbcb-d408f76f0a93',
    name: '弓步拉伸',
    nameEn: 'Lunge Stretch',
    primaryMuscle: 'QUADS',
    movementPattern: 'lunge_pattern',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH', 'WARMUP'],
  },
  {
    id: '4ec535de-1f4a-451a-9dc5-dab2920b51f4',
    name: '坐姿四字伸展',
    nameEn: 'Seated Figure 4 Stretch',
    primaryMuscle: 'GLUTES',
    movementPattern: 'mobility',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH', 'WARMUP'],
  },
  {
    id: '085df570-92e9-46b5-ad8c-fd6650a4a498',
    name: '坐姿单腿腘绳肌拉伸',
    nameEn: 'Seated Single Leg Hamstring Stretch',
    primaryMuscle: 'QUADS',
    movementPattern: 'mobility',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH', 'WARMUP'],
  },
  {
    id: '183cf14a-3214-4b69-8047-c5ddb4fa0f08',
    name: '站立前屈',
    nameEn: 'Standing Forward Bend',
    primaryMuscle: 'QUADS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH', 'WARMUP'],
  },
  {
    id: '1fcb8c2c-1f5c-4623-91b4-5f2f946ade06',
    name: '仰卧蝴蝶式',
    nameEn: 'Lying Butterfly Pose',
    primaryMuscle: 'QUADS',
    movementPattern: 'compound',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH'],
  },
  {
    id: '3ba7a9b4-88ba-4390-9593-de658b6668e6',
    name: '哑铃古巴旋转',
    nameEn: 'Dumbbell Cuban Rotation',
    primaryMuscle: 'SHOULDERS',
    movementPattern: 'mobility',
    angle: 'neutral',
    equipment: 'DUMBBELL',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'WARMUP'],
  },
  {
    id: '291593e2-7736-4028-9bf2-77192645930b',
    name: '颈部侧向拉伸',
    nameEn: 'Neck Side Stretch',
    primaryMuscle: 'BACK',
    movementPattern: 'mobility',
    angle: 'neutral',
    equipment: 'BODYWEIGHT',
    mechanics: 'ISOLATION',
    laterality: 'BILATERAL',
    tags: ['AS_CORE', 'MOBILITY', 'STRETCH', 'WARMUP'],
  }
]

/**
 * 按 ID 快速查找力量训练动作
 */
export const EXERCISES_BY_ID = new Map(
  STRENGTH_EXERCISES.map(ex => [ex.id, ex]),
)

/**
 * 肌群到 MuscleKey 的映射
 */
export const MUSCLE_MAP: Record<MuscleGroup, MuscleKey[]> = {
  CHEST: ["chest"],
  BACK: ["upper-back"],
  SHOULDERS: ["front-deltoids"],
  QUADS: ["quadriceps"],
  GLUTES: ["glutes"],
  HAMSTRINGS: ["hamstrings"],
  BICEPS: ["biceps"],
  TRICEPS: ["triceps"],
  CORE: ["abs"],
  FOREARMS: ["forearms"],
  CALVES: ["calves"],
}

/**
 * 解析动作命中的 MuscleKey。
 *
 * MUSCLE_MAP 以 primaryMuscle 为粒度,无法区分肩部三束——侧平举（中束）、
 * 反向飞鸟/面拉（后束）会和肩推（前束）混为一谈。这里用 movementPattern 细化
 * SHOULDERS:lateral_raise→中束、rear_delt→后束、其余→前束;其它肌群仍走 MUSCLE_MAP。
 * 三个引擎共用此函数,保证处方与 fatigueSnapshot 的肌群口径一致。(issue #47)
 */
export function resolveMuscleKeys(exercise: Exercise): MuscleKey[] {
  if (exercise.primaryMuscle === "SHOULDERS") {
    switch (exercise.movementPattern) {
      case "lateral_raise":
        return ["side-deltoids"]
      case "rear_delt":
        return ["back-deltoids"]
      default:
        return ["front-deltoids"]
    }
  }

  return MUSCLE_MAP[exercise.primaryMuscle]
}

/**
 * 完整动作库（103 个）
 */
export const ALL_EXERCISES = [...STRENGTH_EXERCISES, ...AS_CORE_EXERCISES]

/**
 * 按阶段获取动作池
 */
export function getExercisesByPhase(phase: 'novice' | 'intermediate' | 'advanced'): Exercise[] {
  switch (phase) {
    case 'novice':
      return STRENGTH_EXERCISES.filter(ex => ex.tags.includes('NOVICE_CORE'))
    case 'intermediate':
      return STRENGTH_EXERCISES.filter(ex =>
        ex.tags.includes('NOVICE_CORE') || ex.tags.includes('INTERMEDIATE_VARIANT')
      )
    case 'advanced':
      return STRENGTH_EXERCISES // 全部开放
  }
}

/**
 * 按 movement_pattern 和 primary_muscle 查找变式
 */
export function findVariants(
  benchmark: Exercise,
  pool: Exercise[],
  excludeIds: string[] = []
): Exercise[] {
  return pool.filter(ex =>
    ex.movementPattern === benchmark.movementPattern &&
    ex.primaryMuscle === benchmark.primaryMuscle &&
    ex.id !== benchmark.id &&
    !excludeIds.includes(ex.id) &&
    (ex.angle !== benchmark.angle || ex.equipment !== benchmark.equipment)
  )
}

/**
 * 按肌群筛选动作
 */
export function getExercisesByMuscle(
  muscle: MuscleGroup,
  pool: Exercise[] = STRENGTH_EXERCISES
): Exercise[] {
  return pool.filter(ex => ex.primaryMuscle === muscle)
}

/**
 * 获取 AS 核心动作（按 focus 筛选）
 */
export function getASCoreExercises(focus: 'upper' | 'lower'): Exercise[] {
  if (focus === 'upper') {
    return AS_CORE_EXERCISES.filter(ex =>
      ex.primaryMuscle === 'SHOULDERS' || ex.primaryMuscle === 'BACK'
    )
  } else {
    return AS_CORE_EXERCISES.filter(ex =>
      ex.primaryMuscle === 'QUADS' || ex.primaryMuscle === 'GLUTES'
    )
  }
}
