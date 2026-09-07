/// <reference types="vite/client" />

// 构建期以 ?raw 导入的文本（Ticker/Tips/News）
declare module '*.txt?raw' {
  const content: string
  export default content
}
