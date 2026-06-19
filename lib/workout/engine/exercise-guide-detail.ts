/**
 * 自动生成 —— 请勿手动编辑。
 *
 * 由 scripts/gen-exercise-guide.mjs 从 SmartWorkout 源数据派生（运行 `npm run gen:guide` 重生成）。
 * 详情内容（分步骤 / 演示视频 / 缩略图）由「动作指南」Dialog 懒加载（dynamic import），不进首屏包。
 * 仅作教学参考，绝不覆盖引擎处方或 AS 安全提醒。无源内容的动作不在此模块中（走回退）。
 *
 * @see docs/adr/0007-exercise-guide-content-from-smartworkout.md
 */

export interface ExerciseGuideDetailEntry {
  /** 分步骤做法（来自源数据 instructionsZh）。 */
  instructions: string[]
  /** 演示视频热链（仅 videoLightUrl；部分动作源数据为空）。 */
  videoLightUrl: string
  /** 缩略图热链（视频加载失败时回退；部分动作源数据为空）。 */
  thumbnail: string
}

export const EXERCISE_GUIDE_DETAIL: Record<string, ExerciseGuideDetailEntry> =
  {
    "81112d74-4711-4ddc-9145-a610bf8407c8": {
      "instructions": [
        "调整座椅高度，使手柄与胸部齐平。",
        "背靠垫坐下，双脚平放在地面上。",
        "用正握法握住手柄，肘部弯曲约90度。",
        "收紧核心，将手柄向前推，直到手臂完全伸展但不要锁住肘部。",
        "在动作的顶端稍作停顿。",
        "慢慢地、有控制地回到起始位置，保持胸部肌肉的张力。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b1da7c65-b714-4a3d-b092-11f8bc6a8242.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/c5b8af35-755c-4a08-8e9d-adaf96e708e5"
    },
    "4eb45701-1c6d-46b7-a427-24f80a43837c": {
      "instructions": [
        "平躺在地板上，双膝弯曲，双脚平放。",
        "双手各握一个哑铃，采用正握，手掌朝前。",
        "将上臂放在地板上，与躯干呈45度角。",
        "将哑铃向上推，直到手臂完全伸展在胸部上方。",
        "在顶部稍作停顿，然后慢慢将哑铃放回，直到上臂触地。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/7895fbde-160a-41c5-9723-3637c51a175e.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/80f0869c-5251-4f57-9d62-306c1ea3e39f"
    },
    "6548ec6b-8ab8-4866-8b80-e2b412937051": {
      "instructions": [
        "调整座椅高度，使握住把手时手臂与地面平行。",
        "坐下时背部紧贴靠垫，双脚平放在地面上。",
        "用中立握法握住把手，肘部微微弯曲。",
        "吸气，通过收缩胸肌缓慢地将把手在胸前合拢。",
        "在峰值收缩时稍作停顿，确保最大限度地激活肌肉。",
        "呼气，缓慢返回到起始位置，保持胸肌的张力。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/9bfa2cc4-879b-4267-8333-945860b7ecb0.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/358dd99e-751b-4c3d-9a34-cf772e9a831a"
    },
    "d8e77fb2-ebb1-4e7c-8e93-fd397a8c290b": {
      "instructions": [
        "坐在划船机的座椅上，双脚稳稳地放在脚踏板上。",
        "用一只手抓住单手柄附件，保持手臂伸直，手掌向内。",
        "收紧核心肌群，整个动作过程中保持背部挺直。",
        "通过收缩肩胛骨和弯曲肘部将手柄拉向躯干，保持肘部靠近身体。",
        "当手柄到达身体侧面时稍作停顿，确保背部肌肉最大程度收缩。",
        "慢慢地以可控的方式将手臂伸回到起始位置。",
        "在换另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/cf2ef09c-6833-44a6-8bcf-4b2c4cb8dcc5.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/efdd8e1e-4a3a-44d5-a0a8-7d46de841f79"
    },
    "4ba860b1-2e76-45b6-8023-c386bc56e65d": {
      "instructions": [
        "调整座椅高度，使肩膀与机器的旋转轴对齐。",
        "坐在机器上，背部紧贴靠垫，双脚平放在地面上。",
        "用正握握住把手，保持肘部微微弯曲。",
        "收紧核心肌群，将把手沿弧形向下拉至靠近大腿。",
        "在动作底部稍作停顿，确保背部肌肉完全收缩。",
        "以可控的方式慢慢返回到起始位置，保持肌肉的张力。",
        "根据需要的重复次数重复动作。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/d68c9e9c-bd9f-4d78-a37d-294325a44c4c.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/7e7139ee-a48b-4265-9f5c-5f53ab4f2b9a"
    },
    "245a9e25-296f-4330-9fb6-82de62ebfaca": {
      "instructions": [
        "调整划船机的座椅和胸垫以适合你的身体尺寸，确保胸部得到牢固支撑。",
        "坐在机器上，双脚平放在地板上，胸部靠在垫子上。",
        "用一只手握住把手，保持手臂完全伸展。",
        "收紧核心，通过收缩肩胛骨和弯曲肘部将把手拉向躯干。",
        "当把手接近身体时稍作停顿，确保背部肌肉最大程度收缩。",
        "缓慢地将手臂以可控的方式伸回到起始位置。",
        "在切换到另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/fe3d0887-3b5a-480d-af0e-fedfa1980a0d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3463db77-d887-4658-bdbc-54e87b2148bc"
    },
    "12838e78-2632-4e2b-87c9-3926e86a7e1a": {
      "instructions": [
        "坐在长凳上，双脚平放在地面上，双手握住哑铃放在身体两侧。",
        "保持背部挺直，收紧核心以保持稳定。",
        "肘部微微弯曲，将哑铃向两侧抬起，直到达到肩膀高度。",
        "在动作的顶端稍作停顿，确保肘部略高于手腕。",
        "缓慢地将哑铃控制放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/d5f919b3-d39f-43bf-85ea-2b0184b3e234.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3cfd38f7-3af4-45c8-b64e-c22d4bd22f5b"
    },
    "6b0ffef6-8dd1-4b89-999a-a11d85d9e16f": {
      "instructions": [
        "调整座椅高度，使把手在肩部水平或略低于肩部时坐下。",
        "坐下时背部紧靠靠背，双脚平放在地板上。",
        "用正握握住把手，手掌向前。",
        "收紧核心，整个练习过程中保持胸部挺起。",
        "向上推把手，直到手臂完全伸展但不过度锁定。",
        "慢慢将把手降低回起始位置，保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/e3afc7f6-e047-4f27-8f17-e63d81a3bab4.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/40713c95-6d14-40c1-9ed9-24b378324172"
    },
    "5ee2a3f3-0b7a-7527-b3ee-d7d87664862b": {
      "instructions": [
        "调整座椅高度，使手柄在坐下时与肩膀齐平。",
        "坐在机器上，胸部靠在垫子上，双脚平放在地面。",
        "用中立握法抓住手柄，手掌相对。",
        "保持肘部微弯，并在整个动作中保持这个角度。",
        "呼气并将手柄向外向后拉动，呈弧形运动，直到手臂与肩膀平行。",
        "在动作的顶点挤压肩胛骨。",
        "吸气并慢慢控制地回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/e4d4ac2d-9697-40cd-acd0-14d0dfc71441.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/1077b9bc-3fb1-4d9b-9dd2-531a2055a0da"
    },
    "084947cf-098f-62f2-36b2-41547577e2b8": {
      "instructions": [
        "坐在腿举机上，背部和头部紧靠在软垫支撑上。",
        "将双脚靠拢放在平台中央，约与髋部同宽。",
        "确保膝盖与脚趾对齐，不要向内塌陷。",
        "握住座椅两侧的把手以稳定上半身。",
        "用腿稍微用力按压以解锁安全机制。",
        "通过弯曲膝盖将平台降低，直到膝盖形成约90度角，保持双脚平放在平台上。",
        "通过脚跟用力将双腿伸回到起始位置，但不要锁住膝盖。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/151f35d6-ea8c-44b2-96a2-d56f24f1e436.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/080d635e-f5c7-48c2-a48c-bdab5c566a32"
    },
    "3ae8ee86-534c-0824-07b6-e9f105b97c1d": {
      "instructions": [
        "调整腿弯举机的座椅和靠背，使你的膝盖与机器的旋转点对齐。",
        "坐在机器上，背部紧贴靠背，将腿放在衬垫杠杆下，固定在脚踝上方。",
        "握住把手或座椅两侧以保持稳定。",
        "开始时双腿完全伸展在你面前。",
        "呼气，慢慢弯曲膝盖，将腿向后卷曲，尽量将脚跟靠近臀部。",
        "在动作的底部保持收缩片刻。",
        "吸气，慢慢以可控的动作回到起始位置，双腿完全伸展。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/2c075cd9-cca2-4c24-b158-7c7e5c6a85cb.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3c695eef-dd5a-47fc-a0f1-d2816abdcecd"
    },
    "d61ba24e-4c00-4c61-9127-08db49a79c32": {
      "instructions": [
        "调整机器座椅和靠背以适应您的身体尺寸，确保肩膀得到舒适的支撑。",
        "坐在机器上，背靠垫子，双脚平放在平台上，与肩同宽。",
        "将腿垫固定在髋部，确保其紧贴但不过紧。",
        "收紧核心，脚跟用力抬起髋部，直到大腿与地面平行，在动作顶端挤压臀肌。",
        "慢慢将髋部降低回到起始位置，整个动作过程中保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/3643eb4a-69f4-45bf-a331-b8b080d0f59a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3d4211b7-835d-4f92-a7d1-e3ccbf5a7597"
    },
    "c0d708f6-00ab-118f-9f7d-e13f27e5458b": {
      "instructions": [
        "调整机器的座椅和靠背，以确保你的膝盖与机器的枢轴点对齐。",
        "坐在机器上，保持背部挺直，双脚平放在脚踏板上。",
        "将膝盖放在衬垫杠杆内侧，保持膝盖并拢。",
        "握住把手或座椅两侧以保持稳定。",
        "呼气，慢慢将膝盖分开到舒适的程度，激活髋外展肌。",
        "在最宽点稍作停顿，确保肌肉有张力。",
        "吸气，慢慢控制地回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/1589b046-6273-4bea-8f24-af00d3f1263d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/e1a5f43d-50fa-45c1-84bc-b29337f2c3a9"
    },
    "174978b8-1b92-4700-96d0-98d1835628dd": {
      "instructions": [
        "将斜板设置为45度角。",
        "面朝下躺在板上，胸部和腹部得到支撑。",
        "双手各握一个哑铃，采用反握姿势，手臂完全伸向地面。",
        "保持肘部靠近身体，通过收缩肱二头肌将哑铃向上弯曲。",
        "在动作的顶端暂停，确保最大收缩。",
        "慢慢将哑铃放回起始位置，始终保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b1a2e639-b1d1-4c45-9f7e-b135970ce9b8.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/1cfd64aa-0e84-49f0-8b74-e5f278aec809"
    },
    "ef115bce-70a8-4db5-b917-3e9fc3a89d5c": {
      "instructions": [
        "调整座椅高度，使握住把手时上臂与地面平行。",
        "坐下并用中立握法牢牢握住把手，保持肘部靠近身体。",
        "确保背部挺直并在整个锻炼过程中紧贴靠背。",
        "通过伸展肘部向下按压把手，直到手臂完全伸直。",
        "在动作底部稍作停顿，挤压肱三头肌。",
        "通过弯曲肘部慢慢返回起始位置，保持对重量的控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/31b640b8-3557-40bf-acd9-2406ee324949.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/dde539fb-5c32-4be9-8bc3-c7f10c39931d"
    },
    "ca1dbb25-9c6d-464b-95ca-a55d9b72395a": {
      "instructions": [
        "调整牧师凳的座椅高度，使你的上臂舒适地靠在垫子上。",
        "坐在凳子上，用中立握法（手掌相对）握住一对哑铃。",
        "将上臂放在牧师凳的垫子上，确保肘部略微弯曲以保持张力。",
        "开始时，手臂完全向下伸展，握住哑铃。",
        "通过弯曲肘部将重量向上卷曲，保持上臂固定在垫子上。",
        "将哑铃抬起，直到前臂垂直或刚好在完全收缩之前。",
        "在动作的顶端稍作停顿，以最大化肌肉参与。",
        "慢慢将重量降回起始位置，始终保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/450f836d-3c03-4fda-8e4b-52398a65af4d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/2a94aee3-fe97-4d41-bc29-1ac5f758c653"
    },
    "0f7bb383-5b6c-4065-8d63-21b9925d37f0": {
      "instructions": [
        "将把手连接到绳索交叉机的高滑轮上。",
        "站在机器的中心，双脚与肩同宽。",
        "用正握抓住每个把手，双臂向两侧伸展，保持与地面平行。",
        "稍微向前迈步，以在绳索中产生张力。",
        "肘部微微弯曲，通过伸展肘部将双手在身体前方合拢，专注于挤压肱三头肌。",
        "缓慢控制地返回到起始位置，保持肱三头肌的张力。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/ca84c104-0a6e-4a31-b429-3809ad1fe624.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ee130fb9-eaf6-4a28-8fe9-d700e8e7afa2"
    },
    "cb4adf67-8fc7-4fee-b077-0971132d0c9a": {
      "instructions": [
        "将绳索手柄连接到拉力器的高滑轮上。",
        "坐在长凳或健身球上，面向机器，双脚平放在地板上。",
        "双手握住绳索手柄，将其置于头后或肩部高度。",
        "收紧核心，身体略微前倾以在绳索中产生张力。",
        "呼气并收缩腹肌，将躯干向下拉，使肘部靠近膝盖。",
        "在动作的底部稍作停顿，确保完全收缩。",
        "吸气并慢慢返回到起始位置，始终保持核心的张力。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/16ece5a9-caaa-436b-a112-009839687f59.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/60c46713-0cdb-422e-9db5-7e24c98e990c"
    },
    "0ad57432-b306-46f9-a486-635db0a1080c": {
      "instructions": [
        "调整杠杆机上的座椅高度，使枢轴点与您的中段对齐。",
        "坐下并将双脚固定在脚垫下，确保膝盖微微弯曲。",
        "双手紧握把手，保持肘部微微弯曲。",
        "收紧核心肌肉，并在整个动作过程中保持直立姿势。",
        "缓慢地将躯干旋转到一侧，使用斜肌控制动作。",
        "在旋转结束时稍作停顿，以最大化肌肉参与。",
        "以可控的方式返回到起始位置。",
        "在另一侧重复动作以完成一次完整的重复。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/4b562428-ef16-4851-ab6a-ebc68ed4636a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/a20aabb5-2cec-42b3-8ca6-5e92ba8516fd"
    },
    "2f181b12-c156-48f8-bfb4-efc2ffc650dc": {
      "instructions": [
        "平躺在垫子上，膝盖弯曲，双脚平放在地面上，与臀部同宽。",
        "用双手将一个杠铃片或哑铃紧贴胸部。",
        "收紧核心肌肉，将肚脐向脊柱方向收紧。",
        "呼气时，以可控的方式抬起上半身离开地面，卷曲躯干朝向膝盖。",
        "在动作的顶端稍作停顿，确保核心保持收紧。",
        "吸气时，慢慢地将上半身放回到起始位置，整个下降过程中保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/87231e7a-54f0-41d7-8e8f-93c081509f98.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/78b4d34c-d539-4d90-bc56-08255235d3b3"
    },
    "18d649a8-769d-4722-837f-556903fe81ba": {
      "instructions": [
        "将一个倾斜板凳以30-45度角放置在拉索机前。",
        "将把手连接到机器两侧的低滑轮上。",
        "坐在板凳上，背部紧靠板凳，双脚平放在地面上。",
        "用正握抓住把手，手掌向前。",
        "将手放在胸部水平，肘部弯曲约90度。",
        "将把手向上并略微向内推，直到手臂完全伸展但不锁住。",
        "在动作的顶部稍作停顿，挤压胸肌。",
        "慢慢将把手降低回起始位置，保持控制。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/9604f9a8-3f70-4917-870e-11727a8758f7.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/0451398a-f5df-4ee3-9417-c4662d8b5946"
    },
    "833d7f7c-e6ab-4796-97c7-17ebb035d33d": {
      "instructions": [
        "将长凳设置为大约15-30度的下斜角度。",
        "仰卧在长凳上，双脚固定在脚垫下。",
        "握住杠铃，双手略宽于肩宽。",
        "将杠铃从架上取下，放置在下胸部上方。",
        "缓慢将杠铃降低至下胸部，保持肘部与身体呈45度角。",
        "将杠铃推回到起始位置，完全伸展手臂但不锁住肘部。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/8a7d9cc3-73ac-4450-a2c1-f159aea24e53.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/f91809f4-32f6-4860-85d7-edc054e403ff"
    },
    "7be164bf-92d9-4808-bbf4-2aa207d17205": {
      "instructions": [
        "将斜凳设置为30-45度角。",
        "坐在凳子上，双脚平放在地面上，保持稳定的基础。",
        "用一只手握住哑铃，采用中立握法（手掌朝内）。",
        "躺在凳子上，确保背部完全支撑，肩胛骨收缩。",
        "将哑铃置于肩膀高度，肘部弯曲约90度。",
        "通过伸展手臂将哑铃向上推，直到完全伸展在胸部上方。",
        "在顶部稍作停顿，确保手臂伸直但不过度锁定。",
        "慢慢将哑铃降低回到肩膀高度的起始位置。",
        "完成所需的重复次数后再换手臂。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/9292101a-2cd1-47d7-9857-00b8960068ba.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/b87559de-5ee1-42cd-a2fd-683b37e607e9"
    },
    "80fd9286-0d64-becd-c2c2-83742b0c3974": {
      "instructions": [
        "将斜板凳调整到30-45度角。",
        "坐在板凳上，双手各持一个哑铃，将它们放在大腿上。",
        "躺在板凳上，将哑铃举到胸部上方，掌心相对。",
        "肘部微微弯曲，将哑铃沿宽弧线下降，直到感到胸部有拉伸感。",
        "在整个动作过程中保持肘部微弯，以保护关节。",
        "以可控的方式将哑铃带回到起始位置，在顶部挤压胸部。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/25ed9a1a-6326-450c-8369-e7de1cfe49b1.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/e2da55f3-3a9e-4dae-9297-beb9de67ae68"
    },
    "13a0a404-a40c-4565-b125-29a3c83a2bd6": {
      "instructions": [
        "坐在坐姿划船机上，双脚稳稳地放在脚踏板上，膝盖微微弯曲。",
        "用双手握住宽握把手，手掌向下，手臂完全伸展。",
        "保持背部挺直，胸部抬起，通过收缩肩胛骨将把手拉向躯干。",
        "继续拉动，直到肘部在身体两侧，把手接近腹部。",
        "在动作的顶端稍作停顿，挤压肩胛骨。",
        "缓慢地将手臂伸回到起始位置，同时保持对重量的控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/85ac1f50-a104-413c-8b82-15d9ad720683.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ae353799-3048-4d59-bb3d-6a70d2454782"
    },
    "25472b18-efdc-438a-a2c2-ab72994be361": {
      "instructions": [
        "坐在下拉机上，调整护膝垫以固定双腿。",
        "将宽握中立手柄连接到高滑轮。",
        "用手掌相对的方式握住手柄，手臂完全伸展在头顶上方。",
        "在髋部稍微后倾，保持胸部挺起，核心收紧。",
        "通过将肘部向下和向后驱动，将手柄拉向上胸部。",
        "在动作的底部挤压肩胛骨。",
        "慢慢地在控制下将手臂伸回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/9895325f-8913-4d4f-a729-904b188a8e7c.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/2a07cc60-ae6b-45a9-9d99-a9b9694b08fd"
    },
    "1a9dfa03-6633-4c8e-830e-1c5928b8c0d7": {
      "instructions": [
        "将直杆连接到拉索机上的高滑轮。",
        "面向机器站立，双脚与肩同宽。",
        "用正握抓住杆，双手略宽于肩。",
        "稍微后退以在拉索上产生张力，保持手臂伸直，肘部略微弯曲。",
        "收紧核心，沿弧线将杆拉下，直到达到大腿。",
        "在整个动作中保持手臂伸直，避免肘部弯曲。",
        "以可控的方式慢慢将杆返回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/48967a3e-3da1-4a26-95d6-a16d49de9e98.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/16a1d50a-909f-4d04-ac59-38561e1e05d3"
    },
    "138862a9-3d34-4aa7-86f0-13e35d16e12f": {
      "instructions": [
        "将单个手柄连接到低滑轮电缆机上。",
        "面向机器站立，双脚与肩同宽。",
        "用一只手握住手柄，手掌向内。",
        "稍微后退以在电缆中产生张力，保持膝盖微微弯曲。",
        "在保持背部挺直的同时，髋部稍微向前倾。",
        "将手柄拉向躯干，保持肘部靠近身体。",
        "在动作的顶峰挤压肩胛骨。",
        "缓慢地将手臂在控制下伸回到起始位置。",
        "完成所需次数的重复后再换手臂。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/dab47c85-e0c1-4ce3-acab-0d10102d1815.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/43e98e14-0933-4f74-9999-3fd91a144277"
    },
    "23aaf86c-d27a-4464-88d0-e3f88bb1ba4c": {
      "instructions": [
        "将一个倾斜椅设置为30-45度角。",
        "面朝下躺在椅子上，胸部支撑在椅子上，双脚稳稳地放在地上。",
        "双手各握一个哑铃，保持中立握姿，手臂自然下垂。",
        "收紧核心，保持颈部在中立位置。",
        "呼气时收缩肩胛骨，将哑铃向臀部方向提起。",
        "在动作的顶端稍作停顿，确保斜方肌完全收缩。",
        "吸气时慢慢将哑铃控制地放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/4927b438-fdf8-44f0-8ace-8f12878f95b9.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/e0170bd2-4812-4c99-b13c-c8f1abaed984"
    },
    "05047869-eeb1-4c65-948c-0d85715bacae": {
      "instructions": [
        "双脚与肩同宽站立，用双手握住重量盘，手放在3点和9点钟位置。",
        "从大腿水平开始，手臂完全伸展但不要锁住。",
        "收紧核心，保持背部挺直。",
        "将重量盘抬至肩高，保持手臂伸直。",
        "到达肩高时，扭转躯干至一侧，同时保持重量盘的高度。",
        "回到中心位置，然后将重量盘放回起始位置。",
        "重复抬起并旋转至另一侧。",
        "根据需要的次数重复动作，交替两侧。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/afcbc6ae-9a9d-455a-ad60-d8b66c508541.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/7660a838-7ea9-489c-8f58-47a27f682898"
    },
    "0ea2687b-5d78-4041-8ad4-66a6a8848da1": {
      "instructions": [
        "站在拉力器旁边，双脚与肩同宽。",
        "将滑轮设置到最低位置，并连接一个单手柄。",
        "用离机器最远的手握住手柄，保持手臂伸直并靠近身体。",
        "收紧核心，膝盖微微弯曲。",
        "慢慢将手柄向侧面抬起，直到手臂与地面平行。",
        "在动作的顶端稍作停顿，确保感受到肩部的收缩。",
        "以可控的方式将手柄放回起始位置。",
        "在换手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b46dd071-ddf5-4be9-bb59-13981d69d672.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/2b52f255-4c72-4006-874a-96ab5eb0f816"
    },
    "5b2bdea5-ceee-a837-596c-fd2f6138ffff": {
      "instructions": [
        "坐在有靠背的长凳上，双脚平放在地面上，双手各握一个哑铃，哑铃置于肩膀高度，手掌向前。",
        "收紧核心以稳定躯干，并保持背部紧贴长凳。",
        "向上推举哑铃，直到手臂完全伸展在头顶上方，但不要锁住肘部。",
        "在动作的顶端稍作停顿，然后慢慢将哑铃降低回肩膀高度的起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/67d1710e-987a-44b4-9e88-fa5cedea34b8.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/5ffbe496-fcfd-4165-acd4-c7befff71510"
    },
    "3ac761ff-672b-488c-bd22-3ded2b757e13": {
      "instructions": [
        "将绳索手柄连接到拉力器上的高滑轮。",
        "面向机器站立，双脚与肩同宽。",
        "用反手握住绳索，手掌朝上。",
        "稍微后退以在电缆中产生张力，保持手臂伸直。",
        "收紧核心，保持膝盖微弯。",
        "将绳索拉向面部，以肘部为主导并保持肘部抬高。",
        "在拉动时专注于将肩胛骨挤压在一起。",
        "当绳索接近面部时稍作停顿，确保后肩肌肉完全收缩。",
        "慢慢将手臂伸回到起始位置，保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/6feb69b2-9e89-41d6-aa91-38a4e22e6572.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/298802cd-cf16-484c-b1d5-4f29789d1cc3"
    },
    "2f8af6f8-5cd3-821e-ec81-1314359d9cfc": {
      "instructions": [
        "将直杆或窄握把手连接到拉力器的低滑轮上。",
        "面向机器站立，双脚与肩同宽，膝盖微微弯曲。",
        "用正握握住把手，双手靠近，让手臂自然下垂。",
        "收紧核心，保持背部挺直。",
        "沿着身体向上拉动把手，肘部带动，直到肘部与肩同高。",
        "在动作的顶端稍作停顿，确保肘部高于手腕。",
        "缓慢地将把手控制放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/288e77ed-4ae8-4bb8-99bd-20acb089fd2a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/55293c79-4e49-46f7-bd2d-98cf27695d0f"
    },
    "8dcc0b41-7486-485d-aa85-c09fa57537eb": {
      "instructions": [
        "首先将你的脚固定在臀腿训练器（GHD）机器的脚踏板下，膝盖放在垫子上。",
        "确保你的身体从头到膝盖保持笔直，双手交叉放在胸前或放在头后。",
        "收紧核心和臀部肌肉，慢慢通过膝盖伸展将上半身向前降低，保持背部挺直。",
        "降低身体直到与地面平行或略低，保持腿后肌群的紧张感。",
        "在底部位置稍作停顿，以最大化肌肉参与。",
        "通过收缩腿后肌群和臀部肌肉开始向上运动，将身体抬回到起始位置的一半。",
        "在这个半程位置停留片刻，然后重复下降阶段。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/5508d19d-a1c7-4f56-8d35-a9b00bd47522.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/4d63d0cc-08b1-42db-a844-5fc24294615d"
    },
    "9202e88a-111c-40f8-8464-d567a7fff830": {
      "instructions": [
        "调整腿弯举机的座椅和靠背，使你的膝盖与机器的旋转点对齐。",
        "坐在机器上，背部紧靠靠背，将一条腿放在衬垫杠杆下，确保脚踝正好在杠杆上方。",
        "通过握住侧面的把手来固定你的位置。",
        "开始时屈膝，将脚跟向臀部方向拉动，保持动作的可控性。",
        "在动作的底部稍作停顿，确保腿筋完全收缩。",
        "慢慢地将腿伸回到起始位置，但不要锁住膝盖。",
        "在换另一条腿之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/410e179f-d67a-44b9-ab42-5453d9006d25.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/b66a7a98-b98b-4210-a45f-696dc8113590"
    },
    "0b59dd85-d65d-4e28-bad1-2a74fc204504": {
      "instructions": [
        "坐在地上，上背靠在长凳或抬高的表面上。",
        "弯曲一只膝盖，将脚平放在地面上，同时将另一条腿伸直。",
        "将哑铃放在弯曲腿的髋部，用手牢牢握住。",
        "收紧核心，通过弯曲腿的脚跟向上推动臀部。",
        "在动作的顶端，身体应从肩膀到膝盖形成一条直线。",
        "在顶端挤压臀肌并保持片刻，然后再放低。",
        "在切换腿之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/4f0036e0-1655-47ef-9312-546e09c1e6b2.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/7e159b58-a169-43b4-bcfe-135b65e78926"
    },
    "142bd4e5-6755-42e2-83ad-cbfcf6388dab": {
      "instructions": [
        "调整髋内收机的座椅和靠背，以确保舒适和正确对齐。",
        "坐在机器上，背部紧靠靠背，双脚放在脚踏板上。",
        "将双腿分开，将膝盖放在衬垫杠杆上。",
        "握住座椅两侧的把手以保持稳定。",
        "呼气，慢慢收拢膝盖，收缩大腿内侧肌肉。",
        "在收缩的最高点稍作停顿，确保全范围运动。",
        "吸气，逐渐回到起始位置，始终控制阻力。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b45b76ff-f6ae-45d5-bdbb-7db2dd4e1797.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ec151943-f29c-42aa-901f-0111c28d952f"
    },
    "12c994b1-6251-4d3e-96e6-8186ee6a0afd": {
      "instructions": [
        "坐在小腿提拉机上，调整膝垫以舒适地放在大腿上。",
        "将脚掌的前半部分放在平台上，脚跟悬空。",
        "选择合适的重量并释放安全杆。",
        "慢慢降低脚跟，直到感觉到小腿的拉伸。",
        "通过尽可能伸展脚踝抬高脚跟。",
        "在动作的顶端暂停片刻，以最大化收缩。",
        "以可控的方式将脚跟降低回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/4987ca57-82e6-41af-b103-cfa708626db4.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/f643cf39-9145-4d1b-980f-c336c93ddd90"
    },
    "127dc619-8078-4148-907b-e08a49f1676a": {
      "instructions": [
        "站在一个台阶或平台上，双脚与髋同宽，双手持哑铃放在身体两侧。",
        "收紧核心，向后迈出一只脚，身体下降成弓步，直到前腿大腿与地面平行。",
        "确保前膝与脚踝对齐，后膝刚好悬在地面上方。",
        "通过前脚跟的力量推动身体回到台阶上的起始位置。",
        "换另一条腿重复，交替双腿进行所需次数的重复。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/51fd4126-8bc3-4d9e-afbb-7bd935c2ac59.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ff5e68b2-41f5-43e1-9ee4-af83cc762e10"
    },
    "293c61e4-0955-4504-a40d-3b671498ad97": {
      "instructions": [
        "调整牧师凳，使你的上臂舒适地靠在垫子上，腋窝位于顶边。",
        "坐下，用一只手以仰卧握法（手掌朝上）握住哑铃。",
        "完全伸展手臂，让哑铃下垂，但不要锁住肘部。",
        "通过收缩肱二头肌将哑铃向上弯曲，保持上臂固定在垫子上。",
        "继续弯曲直到肱二头肌完全收缩，哑铃达到肩部水平。",
        "在动作的顶端稍作停顿，挤压肱二头肌。",
        "慢慢将哑铃放回起始位置，始终保持控制。",
        "重复所需次数，然后换手。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/bf40ad83-287f-4d1e-9734-4dd7dbc84b16.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/d0984e14-0f8c-482b-9e39-bfe58a57b019"
    },
    "89d00daa-f73b-4391-84d1-803ac433363e": {
      "instructions": [
        "将斜凳调整到30-45度角。",
        "坐在凳子上，背部紧贴靠垫，双脚平放在地面上。",
        "双手各握一个哑铃，手臂完全伸展，手掌向前（仰握）。",
        "保持肘部靠近躯干，通过收缩肱二头肌将一个哑铃卷曲向肩部。",
        "在动作的顶端稍作停顿，确保最大收缩。",
        "慢慢将哑铃放回起始位置。",
        "用另一只手臂重复动作。",
        "交替进行手臂动作，达到所需的重复次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/66e33518-216e-46dc-9dbe-1dfe1cd3041a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/811fb764-7618-483a-a2f3-3aaa33d2d8a2"
    },
    "b866a8c1-4083-403a-9a68-ba6846f85a87": {
      "instructions": [
        "坐在长凳上，双脚平放在地面上，双腿略微分开。",
        "用一只手握住哑铃，采用中立握法（拇指朝上）。",
        "身体稍微前倾，将工作臂的肘部靠在同侧腿的内侧大腿上。",
        "在整个动作过程中保持背部挺直，核心收紧。",
        "通过弯曲肘部慢慢向上卷起哑铃，保持手腕直立。",
        "在动作的顶端短暂停留，当前臂垂直或略微超过垂直时。",
        "以可控的方式将哑铃降低回起始位置。",
        "在换臂之前完成所需的重复次数。"
      ],
      "videoLightUrl": "",
      "thumbnail": ""
    },
    "427c150b-3c0d-4010-9476-0787cfc84514": {
      "instructions": [
        "双脚与肩同宽站立，一只手握住哑铃。",
        "将哑铃举过头顶，手臂完全伸直。",
        "保持肘部靠近头部，手掌向前。",
        "通过弯曲肘部慢慢将哑铃放到头后。",
        "当你感到肱三头肌有拉伸感时，稍作停顿。",
        "通过收缩肱三头肌将手臂伸回到起始位置。",
        "在切换手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/aa8d87e8-c6ed-47b6-96a7-70a8d4a91fc3.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/a0385d50-4923-45f5-9c37-79ae992d2ca9"
    },
    "83d39870-dd41-c0dc-5115-5067cb98c3dc": {
      "instructions": [
        "平躺在长凳上，双脚稳稳地踩在地板上。",
        "双手握住哑铃，采用正握姿势，手臂完全伸展在胸部上方。",
        "在整个动作过程中保持肘部不动，并靠近头部。",
        "慢慢弯曲肘部，将哑铃降低至刚好在前额上方。",
        "在动作底部稍作停顿。",
        "通过收缩肱三头肌将手臂伸回到起始位置。",
        "重复所需的次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/764ea87b-cc3f-4e5a-9846-aabcbeffb99a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/0543f579-8e02-4f61-aab0-11fcde566d82"
    },
    "27433624-9149-4eba-b527-9314b99d8a2c": {
      "instructions": [
        "平躺在长凳上，双脚稳稳地踩在地上。",
        "用窄握握住EZ杠铃，手掌向前，将手臂伸展在胸部上方。",
        "保持肘部不动，慢慢弯曲肘部将杠铃向额头方向降低。",
        "当杠铃接近额头时稍作停顿，确保肱三头肌保持紧张。",
        "通过收缩肱三头肌将手臂伸回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/e241a10a-869e-45f0-b825-43913f06dee9.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/a480e7e6-cf06-46cb-a66f-b8ebbe166952"
    },
    "73240447-5323-4b6d-99ce-cffbffb19a07": {
      "instructions": [
        "开始时采用标准平板支撑姿势，前臂放在地面上，肘部直接位于肩膀下方。",
        "确保身体从头到脚跟形成一条直线，收紧核心和臀部肌肉。",
        "让伙伴小心地将一个重量盘放在你的下背部，确保其居中且稳定。",
        "保持平板支撑姿势，收紧核心，避免背部下垂或拱起。",
        "保持该姿势达到所需时间，然后让伙伴移除重量盘，再将膝盖放到地面上。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/dc44806d-e8b6-49e1-9b7c-a6becdd91e88.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/06ed41ad-431a-438a-a533-a0f2ac16dfb5"
    },
    "11abe949-7bce-4971-95c0-f754772ee813": {
      "instructions": [
        "将斜板设置为中等角度，通常在30到45度之间。",
        "坐在板凳上，将双脚固定在脚垫下以确保稳定性。",
        "用双手将一个杠铃片或哑铃放在胸前。",
        "躺下直到上半身与板凳平行，保持膝盖微微弯曲。",
        "收紧核心肌肉，以可控的方式将上半身抬向膝盖。",
        "在动作的顶端稍作停顿，确保腹肌最大程度收缩。",
        "缓慢地将上半身放回起始位置，避免背部过度拱起。",
        "重复所需次数，整个过程中保持控制。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/ea509259-3dc8-442f-ad24-3582117839ba.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/5ad51e91-9741-443b-92bd-f11db3c2ed2e"
    },
    "149f6670-3321-4e86-a231-796f1c26a1a4": {
      "instructions": [
        "开始时跪在垫子上以保护膝盖。",
        "用双手牢牢握住腹肌轮的把手。",
        "将轮子放在你面前的地板上，直接在肩膀下方。",
        "收紧核心，保持背部挺直。",
        "慢慢向前滚动轮子，尽量伸展身体而不失去姿势。",
        "在伸展位置稍作停顿，确保核心保持紧绷。",
        "通过将轮子拉回膝盖方向来反向运动，始终保持控制。",
        "返回到起始位置，并根据需要重复指定次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/6139e3c4-6c3d-4991-84cc-5f08dcbb729c.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/25b967dc-d5f9-4ca7-9b56-8612b8597ad8"
    },
    "03d73a15-6288-4c26-922f-dfc877f44128": {
      "instructions": [
        "站直，双脚与髋同宽，双臂向前伸展以保持平衡。",
        "将体重转移到一条腿上，同时抬起另一条腿离地，保持前伸。",
        "收紧核心，慢慢将身体降低到站立腿的下蹲位置，保持抬起的腿伸直。",
        "下降直到大腿与地面平行或根据你的柔韧性尽可能低。",
        "通过站立腿的脚跟推回到起始位置。",
        "在切换腿之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/e3a5df1c-3dd6-462b-9d70-50be48a0e7a6.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/6bb97447-ac51-41d4-b17c-c9b9ebb9f79c"
    },
    "04035dba-efc3-4736-9b1b-bc4fd23d9695": {
      "instructions": [
        "调整缆绳机的座椅高度和膝垫，以确保在锻炼过程中稳定。",
        "将单手柄连接到缆绳机的高滑轮上。",
        "坐下，面向机器，双脚平放在地上，膝盖固定在垫下。",
        "用一只手握住手柄，使用中立或仰卧握法，保持手臂完全伸展。",
        "稍微向后倾斜，保持脊柱挺直，并收紧核心肌肉。",
        "呼气时，将手柄向下拉向胸部，以肘部为主导，挤压肩胛骨向下和向后。",
        "在动作底部短暂停顿，确保背阔肌完全收缩。",
        "吸气时，慢慢返回起始位置，让手臂完全伸展，同时保持背部的张力。",
        "完成所需次数后，换另一只手臂进行。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/3c05a6c7-0e56-49ae-bc66-346045ccf267.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/e512896b-b490-4a64-a832-ce870b866548"
    },
    "081d6aee-e878-4d7e-adda-925768ebf2bc": {
      "instructions": [
        "双脚与肩同宽站立，一只手握住哑铃。",
        "微微弯曲膝盖，髋部向前倾斜，保持背部挺直，核心收紧。",
        "让握哑铃的手臂从肩膀垂直向下。",
        "通过将肩胛骨向脊柱方向拉动来收缩肩胛骨，同时保持手臂伸直。",
        "在动作的顶端稍作停顿，确保肩胛骨完全收缩。",
        "慢慢将肩胛骨释放回到起始位置。",
        "在换另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/794816b1-5726-4414-b04c-37adf1cb1001.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/02025f4a-4c9d-4dec-bd3d-3f91287f70cc"
    },
    "09aed7e3-7a9c-4e38-81a6-bb7675692cbf": {
      "instructions": [
        "坐在长凳上，双脚平放在地板上，前臂放在大腿上，手掌朝内。",
        "用一只手握住哑铃，保持中立握姿，大拇指朝上。",
        "保持前臂稳定，让哑铃滚到手指上。",
        "通过弯曲手腕将哑铃向上卷曲，回到起始位置。",
        "在动作的顶端暂停片刻，以最大化收缩。",
        "慢慢将哑铃降低回到起始位置，始终保持控制。",
        "在换到另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/5f45f168-0a11-45a4-9eb9-c2bdf66e9db3.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/4b82d9d2-79ce-4716-8ba8-656665d92f4b"
    },
    "0c179dee-0e67-473f-84ce-02a48a1e0513": {
      "instructions": [
        "开始时四肢着地，双手直接在肩膀下方，双膝在臀部下方。",
        "将阻力带环绕在右脚的足弓上，并将其固定在左膝下。",
        "收紧核心以在整个动作中保持脊柱中立。",
        "将右腿向后伸直，保持脚背绷紧并通过脚跟发力。",
        "在动作的顶端挤压臀肌，确保完全伸展而不拱起下背部。",
        "缓慢返回到起始位置，保持阻力带的张力。",
        "在换另一条腿之前，完成所需次数的重复。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/f747f435-29eb-4c27-84b8-501f63fc35fb.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/43504309-5fa6-4d0c-b250-bcda7dc48939"
    },
    "0d99097d-9865-470d-823e-a6170baf0631": {
      "instructions": [
        "将直杆或单手柄连接到拉力器的低滑轮上。",
        "面朝远离机器站立，双脚与肩同宽，用正握握住手柄。",
        "将手臂放在大腿前方，肘部微微弯曲。",
        "收紧核心，保持背部在整个动作中挺直。",
        "呼气时，将手柄向前和向上抬起，直到手臂与地面平行。",
        "在动作的顶端稍作停顿，确保肩部有张力。",
        "吸气时，慢慢地将手柄控制地放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b84b750d-56d5-4470-9a32-45728d60ab45.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/d01435ec-efeb-42ce-b802-4f19bde9d622"
    },
    "1bf3fec3-3ec8-48b8-bb5c-7439876c7aab": {
      "instructions": [
        "双脚与肩同宽站立，一只手握住哑铃，哑铃置于肩部高度，手掌向前。",
        "收紧核心，保持背部挺直。",
        "通过伸展肘部将哑铃向上推举，直到手臂完全伸直。",
        "在动作的顶端稍作停顿，确保手臂伸直但不过度锁死。",
        "缓慢将哑铃降低回肩部高度的起始位置。",
        "在换另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/37feffd4-da42-4e29-85e3-c17624b6eac3.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/82a56ec1-885f-4a96-b8d5-9243854520f7"
    },
    "20afacad-4d93-423b-8d48-7fd05134b702": {
      "instructions": [
        "站在拉力器前，双脚与肩同宽。",
        "将单手柄连接到低滑轮上，并设置适当的重量。",
        "用一只手握住手柄，手掌向下，并稍微后退以在电缆中产生张力。",
        "保持手臂伸直但不过度伸展，肘部略微弯曲。",
        "收紧核心，保持背部挺直。",
        "慢慢将手柄抬到肩膀高度，保持手臂伸展。",
        "在动作的顶端稍作停顿，确保肩部肌肉完全收缩。",
        "以可控的方式将手柄放回起始位置。",
        "在切换到另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/0c9e153e-e304-4b72-876a-c32f4a7312da.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/c22041dd-1baa-4bf5-a9e5-61bb27d552b0"
    },
    "214c92ad-dfe0-40a9-a697-d492de526d44": {
      "instructions": [
        "首先设置一个稳定的平台或长凳，平台高度与膝盖齐平。",
        "给杠铃加载适当的重量，并将其放在上背部，双手牢牢握住。",
        "站直，双脚与肩同宽，站在平台前。",
        "用右脚踩上平台，通过脚跟用力将身体向上抬起。",
        "将左脚抬起，与右脚在平台上相遇。",
        "先用左脚下台，然后右脚跟上，回到起始位置。",
        "从左脚开始重复动作，以确保每侧重复次数相等。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/33794ffa-8132-41d8-987c-ebd9662af591.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/547d0f41-1b47-4be0-af56-6277e279388e"
    },
    "2187784c-77b0-4106-9b6f-cd5938da82b8": {
      "instructions": [
        "仰卧在垫子上，双腿伸直，双臂放在身体两侧。",
        "将哑铃稳固地夹在双脚的足弓之间。",
        "收紧核心，将一条腿抬向天花板，同时保持另一条腿伸直在地面上。",
        "在动作的顶端稍作停顿，确保抬起的腿与地面垂直。",
        "慢慢将腿放回起始位置，但不要让它触地。",
        "重复所需次数，然后换腿。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/998700b0-c7d8-47eb-a2ab-4614e9d3be0e.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/c016a236-b1bf-44f3-81b2-508809fc556a"
    },
    "229f5259-a671-48c4-acd0-dd109e3744ab": {
      "instructions": [
        "将拉力器设置为高滑轮位置，并连接一个单手柄。",
        "侧身站在机器旁，双脚与肩同宽，用外侧手握住手柄。",
        "远离机器一步，以在电缆上产生张力，保持手臂微弯。",
        "收紧核心，保持膝盖微弯以保持稳定。",
        "将手柄沿着身体以宽弧线拉过，整个动作中保持肘部微弯。",
        "在动作结束时挤压胸部，然后慢慢返回到起始位置。",
        "在切换到另一只手臂之前，完成所需次数的重复。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/51baf84a-10e1-4333-9e6f-2e61463ea01d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/b21e0425-2cf4-454f-9351-343872514fe1"
    },
    "2340824d-e207-4561-bdcd-8752070c06da": {
      "instructions": [
        "将单手柄连接到拉索机的高滑轮上。",
        "站在机器前，双脚与肩同宽。",
        "用一只手握住手柄，手掌朝下，稍微向后退一步以在拉索中产生张力。",
        "在髋部稍微向前弯曲躯干，同时保持背部挺直。",
        "将手柄向髋部方向拉下，同时保持手臂伸直，收紧背阔肌并挤压肩胛骨。",
        "在动作底部稍作停顿，然后慢慢返回到起始位置。",
        "完成所需次数的重复后，换另一只手臂。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/1edaebc4-5863-4b82-b666-3d79f5369b4a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3d53e434-06bb-4b9b-94f5-d51a7dcb70bc"
    },
    "245e0727-1c35-4965-aa28-0456d8969828": {
      "instructions": [
        "将脚踝带固定在绳索机的低滑轮上。",
        "将带子固定在你的脚踝上。",
        "侧身站立，带子腿远离机器。",
        "抓住机器或稳定的表面以获得支撑。",
        "保持躯干挺直并收紧核心。",
        "慢慢将腿从身体外侧抬起，保持腿部伸直。",
        "在动作的顶端稍作停顿以达到最大收缩。",
        "以可控的方式返回到起始位置。",
        "重复所需次数，然后换腿。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/bc00856c-54fb-4ae1-96dc-5f35a9017861.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3783db7c-d763-44e4-82ed-eb9630b63072"
    },
    "26268881-afd6-445d-9a8b-a149d8dafdaa": {
      "instructions": [
        "站直，双脚与肩同宽，用一只手以反握的方式握住哑铃。",
        "保持肘部靠近躯干，手掌朝前。",
        "呼气时，通过弯曲肘部将哑铃向上卷起，保持上臂不动。",
        "继续抬起，直到肱二头肌完全收缩，哑铃达到肩部高度。",
        "保持收缩片刻，然后吸气，慢慢将哑铃放回起始位置。",
        "在换到另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/608a0b2a-f4e2-4a10-b7ee-6c989f5e30b0.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/024eb957-76b5-4b46-81fe-83c4a9e41d39"
    },
    "27149543-dc50-48eb-86f7-022e7ab1b591": {
      "instructions": [
        "面对一个坚固的箱子或平台站立，双脚与髋同宽。",
        "将右脚稳固地放在箱子上，确保整个脚掌安全。",
        "通过右脚跟用力将身体抬到箱子上，同时将左脚抬起与右脚并齐。",
        "在箱子上站直，双脚平放，膝盖微微弯曲。",
        "先用左脚下台阶，然后用右脚回到起始位置。",
        "重复所需次数，然后换腿。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/d3a3e7a9-ea32-4b4c-a324-a716e1d6e538.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/effdbf20-8841-4303-b9f4-2dc0dd1700b9"
    },
    "272ee53c-baf9-4a84-a909-e7370543dd8a": {
      "instructions": [
        "坐在低位拉力器划船机上，双脚稳稳放在脚踏板上，膝盖微微弯曲。",
        "用一只手用中立握法握住把手，保持手臂完全伸展。",
        "收紧核心，整个动作过程中保持背部挺直。",
        "通过收缩肩胛骨和弯曲肘部将把手拉向腰部。",
        "当把手到达躯干时稍作停顿，确保背部肌肉最大收缩。",
        "慢慢将手臂伸回到起始位置，保持对重量的控制。",
        "完成所需次数的重复后，换另一只手进行。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/99938d93-4f9b-4b5e-afcd-89a1d07adb86.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/7f1152a9-ce48-4dfe-ad1b-e277cf913d3a"
    },
    "2b8538c5-03b4-4f4f-b178-11dd9b8ad4f3": {
      "instructions": [
        "调整牧师弯举机的座椅高度，使你的上臂舒适地靠在垫子上。",
        "在机器上选择合适的重量。",
        "坐下并将手臂放在垫子上，腋窝紧贴上缘。",
        "用反手握住把手（手掌朝上）。",
        "保持背部挺直，双脚平放在地面上。",
        "通过收缩肱二头肌慢慢向上弯举把手，保持上臂不动。",
        "在动作的顶端稍作停顿，确保最大收缩。",
        "慢慢将把手放回起始位置，完全伸展手臂但不要锁住肘部。",
        "在切换手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/e9c5144c-e064-4c26-9411-e4af8fa3c5db.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/d1a00a30-38fc-4410-ab9f-a96d92f95c35"
    },
    "2d243c0b-02d2-4e67-8a63-dca09e86b55a": {
      "instructions": [
        "双脚与肩同宽站立，双手用正握握住壶铃。",
        "微微弯曲膝盖，髋部向后折叠，使上身几乎与地面平行。",
        "在整个动作过程中保持背部挺直和核心收紧。",
        "让壶铃从肩膀处自然下垂。",
        "通过弯曲肘部并挤压肩胛骨，将壶铃拉向肋骨。",
        "在动作的顶端稍作停顿。",
        "慢慢地将壶铃控制地放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/a5227ab1-4130-48b8-a30e-9966ebb5cd35.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/b4b7b98b-9603-414c-8457-afa7decaf48c"
    },
    "30fec8f3-59a5-4d4f-9988-972018248c9f": {
      "instructions": [
        "站直，双脚与髋同宽，双手持哑铃放在身体两侧。",
        "向前迈出一只脚进入弓步姿势，确保双脚错开并与髋同宽。",
        "通过弯曲双膝将后膝降低至地面，直到前大腿与地面平行。",
        "确保前膝直接位于脚踝上方，不超过脚趾。",
        "通过前脚跟推地回到起始位置。",
        "在换腿之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/28203ef1-9025-42a0-a481-40875faec4a3.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/9daf86a9-166e-4df9-acbc-dc96bddeeb6d"
    },
    "0349439c-c56e-4bd8-88b9-7bf9b00f3811": {
      "instructions": [
        "双脚与肩同宽站立，双手持哑铃于肩部高度，掌心向前。",
        "收紧核心，保持背部挺直。",
        "稍微弯曲膝盖，进行一个小幅度的下蹲。",
        "迅速伸展双腿，同时将哑铃推举至头顶。",
        "在动作顶端完全伸展手臂，但不要锁住肘部。",
        "缓慢将哑铃控制下降至肩部高度。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/fd78dbd2-f9d1-4bd8-846a-ec6951dd8d36.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ecb24107-722a-4a82-8135-647be3af40d5"
    },
    "0a75e037-9658-4706-a497-d7efe844e10b": {
      "instructions": [
        "站立时双脚稍微比肩宽，脚趾稍微向外指。",
        "将手臂伸展到两侧，与肩同高，身体形成T形。",
        "将重心转移到右腿，右膝微微弯曲，同时保持左腿伸直。",
        "将躯干向右旋转，左手向右脚方向降低，同时保持右臂向上伸展。",
        "在髋部处折叠，保持背部挺直，目光注视右手。",
        "在动作的底部稍作停顿，然后通过反向动作回到起始位置。",
        "在另一侧重复动作，将重心转移到左腿，右手向左脚方向降低。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/95bba6e0-f678-4cfc-9af6-eea838d12b9e.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/d2742155-97c0-41ae-ac84-579906bcf6a5"
    },
    "15f450f0-f4f1-4391-b59e-c79cd37956ac": {
      "instructions": [
        "首先侧躺在健身垫上，将双脚叠放在一起并完全伸直双腿。",
        "将底部的肘部直接放在肩膀下，前臂平放在地面上，并将上方的手放在髋部。",
        "用上方的手握住哑铃，将其靠在髋部。",
        "收紧核心肌肉，将髋部抬离地面，形成从头到脚跟的直线。",
        "保持这个姿势，同时保持哑铃稳定，持续到所需的时间。",
        "以可控的方式将髋部降低回到起始位置。",
        "在切换侧面之前，按照指定的次数重复。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b7cf733f-8a9e-4a3f-b83d-99ace38c2e4f.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/9563e9dd-e9b2-40b9-b22b-03b118e2abe6"
    },
    "19862249-cbd3-4104-bcc0-b5ad1c21bd73": {
      "instructions": [
        "双脚与肩同宽站立，双手略宽于肩宽握住杠铃。",
        "将杠铃置于肩高，放在上胸和前三角肌上。",
        "收紧核心，保持胸部挺起。",
        "稍微弯曲膝盖开始下蹲，然后迅速伸展双腿将杠铃向上推。",
        "当杠铃经过头部时，完全伸展双臂至头顶。",
        "控制杠铃下降回到肩高的起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/8f9dfa88-385c-4cd2-b2ba-f34415c22083.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/1753a088-5405-4c1c-88f4-56c90cca93e3"
    },
    "1a6fdebd-5789-415d-9724-bda20c1c846e": {
      "instructions": [
        "从俯卧撑姿势开始，双手与肩同宽。",
        "将重心前移到双手上，保持手臂伸直。",
        "收紧核心，将双腿抬离地面，分开成劈叉姿势。",
        "从头到脚保持一条直线，身体与地面平行。",
        "在保持正确姿势的同时，尽可能长时间地保持这个姿势。",
        "慢慢将双腿放回地面，回到起始位置。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/c5f1e3d5-0edf-43cd-bebd-39ba40bb283a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ff5eeac7-c4dd-483e-a686-5223e0ef8b8e"
    },
    "20995c61-3541-47c8-be8d-e1db17c6bffc": {
      "instructions": [
        "从头到脚保持身体成一条直线，开始标准的俯卧撑姿势。",
        "将拳头放在地上，与肩同宽，指关节朝下。",
        "收紧核心，当你向地面降低身体时，保持肘部靠近身体。",
        "降低胸部，直到它刚好在地面上方，保持身体直线。",
        "通过指关节推回到起始位置，完全伸展手臂。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b2f315d9-d3d7-4c95-a065-650d2e524218.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/139ab672-8521-4e53-aa35-391d3f083d5e"
    },
    "03b44dbb-7517-432a-8906-17069ed494b2": {
      "instructions": [
        "将安全销设置在一个高度，当你处于下蹲位置时，大腿与地面平行。",
        "将杠铃放在安全销上，并加载适当的重量。",
        "站在杠铃下方，将其放在上背部，并将双脚与肩同宽。",
        "收紧核心，用双手牢牢握住杠铃。",
        "通过脚跟发力，将杠铃从销上抬起，伸展髋部和膝盖，直到达到站立位置。",
        "在顶部稍作停顿，然后控制地将杠铃放回销上。",
        "重置你的姿势，并根据需要重复指定次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/1ce39e38-49c7-4a5f-877b-229375351d36.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/93ca7120-1441-4150-8fce-b88dff63da64"
    },
    "07747821-38bb-4522-9f6b-b4ae4abf2282": {
      "instructions": [
        "仰卧在地板上，双腿弯曲，双脚平放。",
        "将杠铃置于胸部上方，握距略宽于肩宽。",
        "收紧核心，将上背部压入地板。",
        "将杠铃下放至上臂触地，肘部保持与身体呈45度角。",
        "稍作停顿，然后通过伸展手臂将杠铃推回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/4b5c07c2-9b1d-40a1-9b2a-19cfc02ab108.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3058459c-9445-4ab7-938e-f155a1e9bd96"
    },
    "085cfcf8-548d-44df-8e92-eb9936752382": {
      "instructions": [
        "将杠铃放在你的上背部，类似于背蹲的设置。确保它平衡且安全。",
        "双脚与肩同宽站立在平坦的地面上或一个抬高的平台上，以获得更大的运动范围。",
        "在整个动作过程中保持核心收紧和背部挺直。",
        "通过脚掌的力量慢慢抬起脚跟离地，完全伸展你的脚踝。",
        "在动作的顶端暂停，挤压你的小腿肌肉。",
        "以可控的方式将脚跟降回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/f70044ba-021f-4738-822b-397e291e6906.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/114c9291-1988-4d93-a45b-0ed01fafc9a1"
    },
    "0c3e27ed-e95b-7611-a3e8-7dab63585d21": {
      "instructions": [
        "双脚与肩同宽站立，用正握握住杠铃，双手略宽于肩。",
        "微微弯曲膝盖，髋部向后倾斜，保持背部挺直，躯干几乎与地面平行。",
        "收紧核心，通过收缩肩胛骨和弯曲肘部将杠铃拉向下胸部或上腹部。",
        "在动作的顶端稍作停顿，然后缓慢地将杠铃控制地放回起始位置。",
        "重复所需次数，始终保持正确的姿势。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/ac4082f0-5a8d-467d-b5ff-6e7405d902f9.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/5efdde37-25c5-4745-ad71-e7de26d12e27"
    },
    "10544e2e-3765-1ba9-b753-c9ccd60b06d4": {
      "instructions": [
        "将斜板凳设置为15-30度角，并将其放置在杠铃架下。",
        "仰卧在板凳上，双脚平放在地面上以保持稳定。",
        "握住杠铃，双手略宽于肩宽。",
        "将杠铃从架上取下，双臂完全伸展，直接握在胸部上方。",
        "缓慢将杠铃降低至上胸部，肘部保持与身体呈45度角。",
        "当杠铃接近胸部时稍作停顿，然后将其推回到起始位置。",
        "重复所需次数，整个动作过程中保持控制。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/ebb7da79-d436-44ec-b918-421af85df45d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/1281ad7e-dfaa-4e13-984b-720b49ce5494"
    },
    "114ad863-9971-40c3-8108-2a983fe656ae": {
      "instructions": [
        "在地板上放置一个平台或杠铃片，以创造1-3英寸的高度差。",
        "站在平台上，双脚与髋同宽，脚趾向前。",
        "将杠铃放在双脚中间，双手握住杠铃，手的位置在膝盖外侧。",
        "收紧核心，收回肩胛骨，保持背部挺直。",
        "深吸一口气，然后通过脚跟用力将杠铃从地面抬起。",
        "同时伸展髋部和膝盖，直到站直，杠铃位于大腿前方。",
        "通过髋部铰链和弯曲膝盖，以可控的方式将杠铃放回地面。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/1327c7da-fcc4-4559-90ef-5856e8de95b0.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/67f378a1-4978-4b36-96ec-c4f3d2b7488a"
    },
    "145b65df-1575-4204-852c-0e3f24b29139": {
      "instructions": [
        "将杠铃放置在大约肩高的深蹲架上。",
        "走到杠铃下方，将其放在上背部，确保其舒适地放在斜方肌上。",
        "双手握住杠铃，握距略宽于肩宽。",
        "通过伸直双腿小心地将杠铃从架子上抬起并后退。",
        "双脚与肩同宽站立，脚趾略微向外。",
        "在整个动作过程中收紧核心，保持胸部挺起。",
        "开始下蹲时，髋部和膝盖弯曲，降低身体，直到大腿与地面平行或略低。",
        "确保膝盖在脚趾上方移动，不要向内塌陷。",
        "通过脚跟发力返回站立位置，完全伸展髋部和膝盖。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/8464b254-bc7b-4565-a9c3-d2194740461d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/b64c28a7-4c2b-4a62-80eb-4d144ee30cf1"
    },
    "17325fc8-61c6-4697-9fe1-17e7ece44254": {
      "instructions": [
        "将安全销设置在动力架上所需的高度，通常在或略低于你的深蹲深度。",
        "将杠铃放在销上，并加载适当的重量。",
        "站在杠铃下，双脚与肩同宽，并将杠铃放在上背部，确保居中。",
        "用双手握住杠铃，握距略宽于肩。",
        "收紧核心，收回肩胛骨，保持脊柱中立。",
        "通过脚跟发力，同时伸展髋部和膝盖，将杠铃从销上抬起。",
        "在顶部稍作停顿，然后通过弯曲髋部和膝盖将杠铃降低回销上，始终保持控制。",
        "确保每次重复动作都从销上的静止状态开始，以最大化效果。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/b5108703-7f91-4104-b7e3-6ef7864b7d11.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/edbb3a52-34aa-44d2-9c8d-c11989463bf1"
    },
    "17d168cd-9745-60f3-f30f-7ec574eaf8a3": {
      "instructions": [
        "平躺在长凳上，双脚稳稳地踩在地上。",
        "用肩宽的握距握住杠铃，手掌向前。",
        "将杠铃从架子上取下，双臂完全伸展，将其举在胸部上方。",
        "将杠铃向上胸部方向降低，弯曲肘部，同时保持肘部靠近身体。",
        "当杠铃距离胸部约一英寸或稍低时停止，具体取决于舒适度。",
        "通过伸展肘部将杠铃推回上方，专注于使用三头肌驱动动作。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/1269bb30-0177-4dfc-81fc-9c93f7a53018.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/a0d4c056-b05c-41a8-aa72-eb4d6956ebbc"
    },
    "c30468f2-024b-79d4-df35-0c937e391555": {
      "instructions": [
        "将凳子设置为大约15到30度的下斜角度。",
        "仰卧在凳子上，双脚固定在脚垫下。",
        "用双手握住哑铃，掌心向前，采用正握。",
        "将手臂伸直在胸部上方，保持肘部略微弯曲。",
        "缓慢地将哑铃降低到胸部两侧，整个动作保持控制。",
        "在底部稍作停顿，然后通过伸展手臂将哑铃推回到起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/07f52ddb-9433-4cad-89f2-7f3a9153f79e.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ff0e88d8-fd9e-47e4-a8eb-4f7fa932e38a"
    },
    "241b716d-5fcd-42ca-b987-5e78239d4ea2": {
      "instructions": [
        "双脚与肩同宽站立，双手各握一个哑铃。",
        "髋部弯曲，保持背部挺直，膝盖微微弯曲，直到躯干几乎与地面平行。",
        "让哑铃直接垂在肩膀下方，手掌相对。",
        "收紧核心，保持颈部与脊柱对齐。",
        "将哑铃向两侧抬起，直到手臂与地面平行，肘部保持微微弯曲。",
        "在动作的顶端稍作停顿，然后慢慢将哑铃放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/7a3e3e78-92ad-455e-a1f8-5b572808f279.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/7b9b94f6-ddc1-4565-9612-f2a3cf66b23d"
    },
    "3c28f1b2-7cb3-4c6a-9d73-64730de893e6": {
      "instructions": [
        "将绳索机设置为高滑轮位置，并连接绳索把手。",
        "坐在面向绳索机的长凳上，双脚平放在地板上。",
        "用双手握住绳索，采用正握，手掌朝下。",
        "稍微向后倾斜，确保背部挺直，核心收紧。",
        "将绳索拉向面部，以肘部为主导，并保持肘部抬高。",
        "在动作的顶点挤压肩胛骨。",
        "慢慢地将手臂伸回到起始位置，保持控制。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/8cc6ebd9-8393-4a74-9035-52ac4a0cef4b.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/76769d0f-e0af-43ab-88bf-a86157e7bf3c"
    },
    "61fb6b76-1d67-48f8-abba-bca2c60db1f9": {
      "instructions": [
        "站直，双脚与肩同宽，双手握住哑铃放在身体两侧。",
        "保持手臂伸直，让哑铃自然下垂。",
        "深吸一口气，然后呼气时将肩膀向上提至耳朵方向。",
        "在顶部收缩时停留片刻，确保感受到斜方肌的紧张感。",
        "慢慢将肩膀放回起始位置，同时吸气。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/86cb506f-e630-4b58-8df9-b8d0780d47e9.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/4b6b3473-25c1-4904-813e-830c94642878"
    },
    "d919d4f3-6cb0-4e11-b70a-3788dcc0a371": {
      "instructions": [
        "面对低滑轮绳索机站立，双脚与肩同宽。",
        "将直杆或绳索手柄连接到低滑轮。",
        "用双手握住手柄，采用正握，站直，手臂完全伸展。",
        "在整个练习过程中保持背部挺直和核心收紧。",
        "耸肩向上抬起肩膀，靠近耳朵，顶部动作时挤压斜方肌。",
        "在收缩时保持片刻，然后慢慢将肩膀降低回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/17057260-866d-4a28-a6c2-1265cc0c246f.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/2561ea29-61ee-4bf9-9fcc-a308cd5bb817"
    },
    "c72d1396-05a3-4254-a62e-dbbba9813472": {
      "instructions": [
        "调整腿部弯举机以适应你的身体尺寸，确保滚轮垫位于脚踝正上方。",
        "面朝下躺在机器上，确保臀部与机器的旋转点对齐。",
        "握住把手或长凳的两侧以保持稳定。",
        "从一条腿伸直开始，慢慢弯曲膝盖，将脚跟向臀部方向卷起。",
        "在动作的顶端稍作停顿，确保腿后肌群的最大收缩。",
        "以可控的方式慢慢将腿放回起始位置。",
        "完成所需次数后，换另一条腿进行。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/7b6b3b20-56f1-4e0a-8a56-b1ed5e34b3f1.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/31cae457-bdcb-4d8b-b579-02bde4212311"
    },
    "99704170-da3e-48e5-bb24-33f8193d2892": {
      "instructions": [
        "将脚踝带固定在拉力机的低滑轮上。",
        "将带子固定在脚踝上，侧身站在机器旁。",
        "调整位置，使工作腿靠近机器。",
        "抓住机器或稳定的表面以获得支撑。",
        "从工作腿向外侧伸展开始。",
        "慢慢将腿横过身体，保持腿部伸直。",
        "在动作结束时稍作停顿，感受大腿内侧的收缩。",
        "以可控的方式返回到起始位置。",
        "在换腿之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/6d0187c7-e7a6-4d0f-b8a5-8b03572a9e93.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/6558f1e4-b103-462a-9f7b-48483336b1c5"
    },
    "b2c6ca4b-db03-4553-8d9f-6e5e87bbd118": {
      "instructions": [
        "站直，双脚与肩同宽，用双手握住哑铃，采用正握。",
        "保持手臂靠近身体，完全向下伸展，手掌朝向大腿。",
        "保持肘部不动，通过收缩前臂伸肌向上弯曲手腕。",
        "在顶部位置停留片刻，确保最大收缩。",
        "通过伸展手腕，慢慢将哑铃放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/e58d52a6-2d26-4e29-8f19-4662e91d1b9b.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/3174e7c3-8827-4b3d-8cda-e2ddefba775e"
    },
    "bd7b2836-8bd5-4dd6-8645-2bad2da1c2db": {
      "instructions": [
        "站立时双脚与肩同宽，用中立握法单手持哑铃。",
        "保持核心收紧，膝盖微微弯曲。",
        "将工作臂肘部微微弯曲，哑铃靠在大腿外侧。",
        "呼气时将哑铃向侧面抬起，直到手臂与地面平行。",
        "在动作的顶端稍作停顿，确保手腕与肩膀在一条直线上。",
        "吸气时慢慢将哑铃放回起始位置。",
        "完成所需次数后换另一只手臂。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/ebef6545-f73b-4384-98a5-e7431a9cb0c3.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/b7491d5d-4c53-42dc-bb47-5254ec8a96ff"
    },
    "12b4858c-6c84-43b4-964d-cfd590ff7958": {
      "instructions": [
        "坐在长凳上，双脚平放在地面上，一只手握住哑铃。",
        "将前臂放在大腿或长凳上，手腕悬在边缘，手掌朝上。",
        "牢牢握住哑铃，让手腕向下伸展，慢慢降低重量。",
        "通过弯曲手腕将哑铃向上卷曲，在动作的顶端用力挤压。",
        "以可控的方式将哑铃降低回起始位置。",
        "在换到另一只手臂之前，重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/3d813a06-a0bb-4563-9d4f-db32e72ef066.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/f477c9e6-0f1f-494c-8a5a-de7af42d2452"
    },
    "08cde7c0-5988-4190-b12b-b0b565d113f6": {
      "instructions": [
        "双脚与肩同宽站立，双臂自然放在身体两侧。",
        "耸肩，将肩膀抬向耳朵。",
        "开始做圆周运动，先向前、向上、向后、向下移动肩膀。",
        "完成预定次数的向前方向运动。",
        "反转圆周方向，向后、向上、向前、向下移动肩膀。",
        "在整个练习过程中保持平稳和可控的动作。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/76a4129b-1cee-45c1-99cf-127cae211d5d.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/bec75d12-0b9f-40c8-90e6-ebb241532113"
    },
    "6d2a3622-980f-4d8f-aa00-852652cdd1d5": {
      "instructions": [
        "双脚与肩同宽站立，双手握住阻力带。阻力带应保持紧绷但不过度拉伸。",
        "从大腿前方开始，保持手臂伸直并保持阻力带的张力。",
        "慢慢将手臂抬过头顶，保持手臂伸直并保持阻力带的张力。",
        "继续将手臂向后移动，直到阻力带到达背后，或根据肩部灵活性尽可能向后。",
        "反向动作，将手臂从头顶带回到大腿前方的起始位置。",
        "缓慢且有控制地进行动作，专注于在整个过程中保持阻力带的张力。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/36c43abf-8dbe-460b-9531-f34ced98172a.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/a1b8b67c-da1b-498e-98ef-5ba831fb7746"
    },
    "77e949b2-df71-4560-b72c-f79eaa7966dc": {
      "instructions": [
        "坐在长凳或椅子上，背部挺直，双脚平放在地面上。",
        "将阻力带固定或将拉力器设置在肘部高度。",
        "用工作臂握住手柄或带子，保持肘部弯曲90度并靠近身体。",
        "从前臂横过腹部开始，然后慢慢将手臂向外旋转，保持肘部固定不动。",
        "继续旋转，直到前臂与躯干垂直或在无痛的情况下尽可能远。",
        "在动作结束时稍作停顿，然后慢慢回到起始位置。",
        "完成所需的重复次数，然后在必要时换臂。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/4aaaaead-ad47-413a-8600-957189ba867b.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/205c2f74-32f5-44e6-b8d6-ef6a06aaac83"
    },
    "4a5f1411-75cd-4485-bbcb-d408f76f0a93": {
      "instructions": [
        "首先站直，双脚与髋同宽。",
        "右脚向前迈步，降低臀部，直到双膝弯曲成大约90度角。",
        "确保右膝直接在脚踝上方，左膝刚好悬在地面上方。",
        "保持上身挺直，并在整个动作过程中收紧核心。",
        "保持伸展几秒钟，然后用右脚推回到起始位置。",
        "换另一侧，左脚向前迈步。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/13f6300b-f58f-42e4-8f4a-79338bc9c138.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/fd4563ff-da98-4432-b478-1e34d46f14e1"
    },
    "4ec535de-1f4a-451a-9dc5-dab2920b51f4": {
      "instructions": [
        "坐在地板上，双腿伸直在你面前。",
        "弯曲右膝，将右脚踝放在左膝上，双腿形成一个“4”字形。",
        "保持背部挺直，从髋部轻轻向前倾，将胸部靠向双腿。",
        "保持伸展20-30秒，感受右臀部和臀肌的拉伸。",
        "换腿并在另一侧重复伸展。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/9e3043d8-3ddd-4650-bcf6-579ca03e43d5.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/ff4be793-8d51-48d9-a477-6aab4459b5e2"
    },
    "085df570-92e9-46b5-ad8c-fd6650a4a498": {
      "instructions": [
        "坐在地板上，双腿向前伸直。",
        "弯曲右膝，将右脚的脚掌放在左腿的内侧大腿上。",
        "保持左腿伸直，脚趾指向天花板。",
        "深吸一口气，然后慢慢呼气，从臀部向前倾，双手伸向左脚。",
        "保持背部挺直，避免在伸展时耸肩。",
        "保持伸展15-30秒，感受左大腿后侧的轻微拉伸。",
        "慢慢回到起始位置，换腿重复另一侧。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/8d7d8ac6-8d62-44fb-8938-b9efc972f8e5.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/16c9f873-4359-464a-871a-abca9ab310c5"
    },
    "183cf14a-3214-4b69-8047-c5ddb4fa0f08": {
      "instructions": [
        "双脚与臀同宽站立，双臂放在身体两侧。",
        "深吸一口气，然后呼气时从髋部折叠向前。",
        "如果需要，可以稍微弯曲膝盖以避免下背部紧张。",
        "让头部自然下垂，放松颈部。",
        "将双手放在地板上、瑜伽砖上，或握住相对的肘部。",
        "保持这个姿势15-30秒，深呼吸。",
        "要起来时，收紧核心，逐节脊椎慢慢卷起。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/dca30aaf-9435-4b2e-b1df-78c564f37857.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/827bf737-a32b-40f5-9341-5e2c7b4bf675"
    },
    "1fcb8c2c-1f5c-4623-91b4-5f2f946ade06": {
      "instructions": [
        "平躺在垫子上，双腿伸直。",
        "弯曲膝盖，将脚掌合拢，让膝盖向两侧打开。",
        "将脚跟舒适地靠近骨盆。",
        "将手臂放在身体两侧，手掌朝上，或放在腹部。",
        "闭上眼睛，缓慢深呼吸，让身体放松进入这个姿势。",
        "保持这个姿势3-5分钟或尽可能长时间。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/cb028c3c-e5dc-4b7c-8a7b-e38dcb538599.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/1f7a89e8-0aa1-4a01-8a00-e6682a48aede"
    },
    "3ba7a9b4-88ba-4390-9593-de658b6668e6": {
      "instructions": [
        "双脚与肩同宽站立，双手各握一个哑铃，采用俯握姿势。",
        "将手臂抬至肩高，保持肘部弯曲90度，上臂与地面平行。",
        "通过外旋肩膀将前臂向上旋转，保持肘部不动。",
        "在动作的顶端稍作停顿，确保前臂垂直。",
        "通过反向旋转慢慢将哑铃放回起始位置。",
        "重复所需次数。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/f7ac6bf7-938b-4040-b150-0613694529ad.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/c09bbc07-b498-486c-956a-5e290f4d3112"
    },
    "291593e2-7736-4028-9bf2-77192645930b": {
      "instructions": [
        "坐着或站着，保持背部挺直，肩膀放松。",
        "轻轻地将头倾向一侧，将耳朵靠向肩膀，但不要抬起肩膀。",
        "保持伸展15-30秒，感受颈部侧面的轻微拉伸。",
        "将头部恢复到中立位置，然后在另一侧重复。",
        "每侧进行2-3组。"
      ],
      "videoLightUrl": "https://api.smartworkout.app/asset/video/1117270c-2f79-46b4-a8fb-e9a465350417.mp4",
      "thumbnail": "https://api.smartworkout.app/asset/image/2ec9600b-07a6-43bc-b495-ac855836a570"
    }
  }
