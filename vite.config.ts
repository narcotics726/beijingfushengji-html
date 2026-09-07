import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 单文件自包含构建：把 JS/CSS 全部内联进单个 dist/index.html。
// 这样双击即可玩（file:// 下跨文件 ES module 会被 CORS 拦，故必须内联 JS/CSS）。
// 图片/音频/文本放在 assets/ 走相对路径，file:// 下可正常加载。
// https://vite.dev/config/
export default defineConfig({
  base: './', // 相对路径，保证 file:// 双击时资源可加载
  plugins: [svelte(), viteSingleFile({ useRecommendedBuildConfig: false })],
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false, // 单份 CSS，便于内联
    // 只把 JS/CSS 内联进 index.html；音频/图片保持为独立文件（相对路径，file:// 可加载）。
    assetsInlineLimit: 4096,
    rollupOptions: { output: { codeSplitting: false } },
  },
})
