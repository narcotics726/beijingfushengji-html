// 音效：用 import.meta.glob(?url) 把 assets/audio/*.wav 打进构建，返回相对 URL（file:// 可加载）。
// 播放文件名与源码一致（如 'kill.wav' 'airport.wav'），内部统一小写匹配。

const audio = import.meta.glob('/assets/audio/*.wav', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName: Record<string, string> = {}
for (const [k, url] of Object.entries(audio)) {
  const base = k.split('/').pop()!.toLowerCase()
  byName[base] = url as string
}

export function playSound(name?: string): void {
  if (!name) return
  const url = byName[name.toLowerCase()]
  if (!url) return
  try {
    const a = new Audio(url)
    a.volume = 0.8
    a.play().catch(() => {
      /* 自动播放被浏览器拦截时忽略 */
    })
  } catch {
    /* 忽略 */
  }
}
