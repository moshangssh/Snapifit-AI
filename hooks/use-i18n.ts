'use client';

import { useTranslations } from 'next-intl';

// 便捷的翻译钩子
export function useTranslation(namespace?: string) {
  try {
    return useTranslations(namespace);
  } catch (error) {
    // 如果上下文不可用，返回一个默认函数
    return (key: string) => key;
  }
}
