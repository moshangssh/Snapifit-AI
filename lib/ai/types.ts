// 模型列表接口(来自 OpenAI 兼容 /v1/models 响应)
export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface OpenAIModelList {
  object: string
  data: OpenAIModel[]
}
