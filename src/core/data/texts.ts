// 文本数据：构建期以 ?raw 导入（UTF-8，逐字来自原版 Tips/News/Ticker）。详见 PLAN §5.3。
import tickerRaw from './text/ticker.txt?raw'
import tipsRaw from './text/tips.txt?raw'
import newsRaw from './text/news.txt?raw'

export const TICKER_RAW = tickerRaw
export const TIPS_RAW = tipsRaw
export const NEWS_RAW = newsRaw

// Ticker 原格式：「新闻文本 | 时间 | 新闻文本 | 时间 | …」
// 解析成若干新闻条目（去掉纯时间片段，保留文本）。
export function parseTicker(raw: string = TICKER_RAW): string[] {
  const parts = raw.split('|').map((s) => s.trim()).filter(Boolean)
  const items: string[] = []
  let cur = ''
  for (const p of parts) {
    if (/^\d{1,2}[:.]\d{1,2}/.test(p)) {
      // 时间片段：结束上一条
      if (cur) {
        items.push(cur)
        cur = ''
      }
    } else {
      cur = p
    }
  }
  if (cur) items.push(cur)
  return items
}

// Tips：每行 = 「内容 \t 出处 \t 署名]，按行拆分
export function parseTips(raw: string = TIPS_RAW): { text: string; from: string }[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [text, from] = l.split('\t')
      return { text: (text || '').trim(), from: (from || '').trim() }
    })
}
