// vitest 用：分两个 project（各自是独立 vite 实例，都必须挂 svelte 插件）。
//  - node：core 规则 / actions / 存读档 / App SSR 渲染（svelte server 构建）
//  - jsdom：App 客户端挂载冒烟（svelte 需解析为 browser 构建 + jsdom）
import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [svelte()],
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/app.mount.test.ts'],
        },
      },
      {
        plugins: [svelte()],
        resolve: { conditions: ['browser'] },
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['tests/app.mount.test.ts'],
        },
      },
    ],
  },
})
