import React from 'react'

// 基础主题配置与组件的轻量级模拟
export const THEME_CONFIG = {}

export const LayoutBase = ({ children }) => <>{children}</>
export const LayoutSlug = ({ children }) => <>{children}</>

// 导出默认对象以兼容潜在的默认导入用法
export default {
  THEME_CONFIG,
  LayoutBase,
  LayoutSlug
}
