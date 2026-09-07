// persistence: localStorage 最高分 top10 + 设置。
// 榜结构/默认榜/fame 称号映射逐字对照 reference/TopPlayerDlg.cpp（见 PLAN §3.7/3.8）。

export interface HighScore {
  name: string
  score: number
  health: number
  fame: string
}

export interface Settings {
  sound: boolean // 声音开关（m_bCloseSound 取反，默认开）
  hack: boolean // m_bHackActs 黑客事件，默认关
}

const TOP10_KEY = 'fsj:top10'
const SETTINGS_KEY = 'fsj:settings'

// fame 数值→称号（GetFameStr，含源码 `<20>=10` 恒假 bug：10<=fame<20 落到 else → 江湖唾弃）
export function fameStr(fame: number): string {
  if (fame >= 100) return '德高望重'
  if (fame < 100 && fame >= 90) return '杰出青年'
  if (fame < 90 && fame >= 80) return '一般般'
  if (fame < 80 && fame >= 60) return '不佳'
  if (fame < 60 && fame >= 40) return '争议人物'
  if (fame < 40 && fame >= 20) return '差'
  if (fame < 10) return '江湖唾弃'
  return '江湖唾弃'
}

// 源码默认榜（无 score.txt 时）
export const DEFAULT_TOP10: HighScore[] = [
  { name: '赖皮张', score: 12500720, health: 98, fame: '争议人物' },
  { name: '萧峰', score: 830050, health: 100, fame: '杰出青年' },
  { name: '二黑', score: 500447, health: 78, fame: '德高望重' },
  { name: 'Andy Rocky', score: 239403, health: 97, fame: '很差' },
  { name: 'li xing', score: 34900, health: 35, fame: '江湖唾弃' },
  { name: 'li xing', score: 13400, health: 100, fame: '江湖唾弃' },
  { name: 'li ', score: 2300, health: 77, fame: '不佳' },
  { name: 'li ', score: 45, health: 12, fame: '杰出青年' },
  { name: 'li', score: 34, health: 100, fame: '一般般' },
  { name: 'li', score: 3, health: 100, fame: '杰出青年' },
]

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function getTop10(): HighScore[] {
  if (!hasStorage()) return [...DEFAULT_TOP10]
  try {
    const raw = localStorage.getItem(TOP10_KEY)
    if (!raw) return [...DEFAULT_TOP10]
    const list = JSON.parse(raw) as HighScore[]
    return Array.isArray(list) && list.length ? list : [...DEFAULT_TOP10]
  } catch {
    return [...DEFAULT_TOP10]
  }
}

export function saveTop10(list: HighScore[]): void {
  if (!hasStorage()) return
  try {
    localStorage.setItem(TOP10_KEY, JSON.stringify(list))
  } catch {
    /* 忽略 */
  }
}

// 新分数在榜中的名次（0-based）；不在前 10 则返回 100（源码 GetMyOrder）
export function getMyOrder(score: number, list: HighScore[]): number {
  for (let i = 0; i < list.length; i++) {
    if (score >= list[i].score) return i
  }
  return 100
}

// 按分降序插入，保持前 10（源码 InsertScore）
export function insertScore(list: HighScore[], entry: HighScore): HighScore[] {
  const next = [...list]
  let i = 0
  while (i < next.length && next[i].score >= entry.score) i++
  next.splice(i, 0, entry)
  return next.slice(0, 10)
}

export function getSettings(): Settings {
  const def: Settings = { sound: true, hack: false }
  if (!hasStorage()) return def
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...def, ...(JSON.parse(raw) as Partial<Settings>) } : def
  } catch {
    return def
  }
}

export function saveSettings(s: Settings): void {
  if (!hasStorage()) return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* 忽略 */
  }
}
