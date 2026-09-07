import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 单文件自包含构建：把 JS/CSS 全部内联进单个 dist/index.html。
// 这样双击即可玩（file:// 下跨文件 ES module 会被 CORS 拦，故必须内联 JS/CSS）。
// 图片/音频/文本放在 assets/ 走相对路径，file:// 下可正常加载。
// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
