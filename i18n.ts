// 支持的语言列表
export const locales = ['zh'] as const;
export type Locale = typeof locales[number];

// 默认语言
export const defaultLocale: Locale = 'zh';
