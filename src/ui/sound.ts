// 音效：资产放在 public/audio/（Vite 原样拷到 dist/assets/audio/，保留子目录与文件名）。
// 运行时用相对路径引用（file:// 可加载，且避免 import.meta.glob 产生的绝对 /assets 路径在 file:// 下 404）。
// 播放文件名与源码一致（如 'kill.wav' 'airport.wav'），统一小写匹配。

export function audioUrl(name: string): string {
  // 相对页面 base 解析，file:// 与服务子路径都正确
  return new URL('assets/audio/' + name.toLowerCase(), document.baseURI).href
}

export function playSound(name?: string): void {
  if (!name) return
  try {
    const a = new Audio(audioUrl(name))
    a.volume = 0.8
    a.play().catch(() => {
      /* 自动播放被拦截时忽略 */
    })
  } catch {
    /* 忽略 */
  }
}
