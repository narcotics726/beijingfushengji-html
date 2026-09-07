// Svelte store：把 core 规则引擎/actions/storage 接到 UI。
// 用 writable 简化；每次操作后把 game 设为深拷贝快照以触发组件渲染。
import { writable } from 'svelte/store'
import type { GameState } from '../core/state'
import { createRng, type Random } from '../core/rng'
import { newGame, moveTo, getScore, type GameEvent } from '../core/engine'
import * as A from '../core/actions'
import {
  getTop10,
  insertScore,
  saveTop10,
  getMyOrder,
  getSettings,
  saveSettings,
  fameStr,
  type Settings,
} from '../core/storage'

function snap(s: GameState): GameState {
  return { ...s, prices: [...s.prices], holdings: [...s.holdings], holdCost: [...s.holdCost] }
}

let state: GameState = newGame(createRng())
let rng: Random = createRng()

export const game = writable<GameState>(snap(state))
export const events = writable<GameEvent[]>([])

export interface EndResult {
  score: number
  entered: boolean
  order: number
  top10: ReturnType<typeof getTop10>
  name: string
  message: string
}
export const endResult = writable<EndResult | null>(null)

export const settings = writable<Settings>(getSettings())

function refresh() {
  game.set(snap(state))
}

function pushEvents(evs: { kind: string; text: string; sound?: string }[]) {
  if (!evs.length) return
  events.update((e) => [...e, ...(evs as GameEvent[])])
  // 播第一个非空 sound（事件音效，受声音开关控制）
  const withSnd = evs.find((e) => e.sound)
  if (state.soundEnabled && withSnd?.sound) {
    import('./sound').then((m) => m.playSound(withSnd.sound!))
  }
}

export function startNewGame() {
  rng = createRng()
  state = newGame(rng)
  finished = false
  events.set([])
  endResult.set(null)
  refresh()
}

export function moveToLoc(loc: number) {
  if (state.over) return
  if (loc === state.loc) return
  if (!state.soundEnabled) {
    // 静音仍要推进
  } else {
    import('./sound').then((m) => m.playSound('shutdoor.wav'))
  }
  const evs = moveTo(state, loc, rng)
  pushEvents(evs)
  if (state.over) finish()
  refresh()
}

let finished = false

function finish() {
  if (finished) return
  finished = true
  const score = getScore(state)
  const list = getTop10()
  const order = getMyOrder(score, list)
  const entered = order !== 100
  const name = '无名氏'
  if (entered) {
    const next = insertScore(list, { name, score, health: state.health, fame: fameStr(state.fame) })
    saveTop10(next)
  }
  // 三则结算台词（源码 OnExit）
  let message: string
  if (score <= 0) message = '《北京游戏报》报道: 玩家“无名氏”在北京没挣着钱，被遣送回家。'
  else if (!entered) message = `您挣的钱${score}元人民币太少，没能进入富人前10名，下次努力哦!`
  else if (score > 10000000) message = `您挣的钱${score}元人民币很高，建议您发给作者进行高手排行。`
  else message = ''
  endResult.set({ score, entered, order, top10: getTop10(), name, message })
}

// 进榜后改玩家名：新条目位于 order（insertScore 在第一个 score>= 处插入）
export function setEndName(nm: string) {
  endResult.update((er) => {
    if (!er) return er
    const finalName = nm.trim() || '无名氏'
    const top10 = [...er.top10]
    if (er.entered && er.order >= 0 && er.order < top10.length) {
      top10[er.order] = { ...top10[er.order], name: finalName }
      saveTop10(top10)
    }
    return { ...er, name: finalName, top10 }
  })
}

export function exitGame() {
  if (finished) return
  finish()
}

// ---- actions ------------------------------------------------------------
export function buyAction(goodId: number, qty: number) {
  const n = A.buy(state, goodId, qty)
  if (n > 0 && state.soundEnabled) import('./sound').then((m) => m.playSound('buy.wav'))
  refresh()
}
export function sellAction(goodId: number, qty: number) {
  const n = A.sell(state, goodId, qty)
  if (n <= 0) {
    refresh()
    return
  }
  if (state.soundEnabled) import('./sound').then((m) => m.playSound('money.wav'))
  // 卖违禁品的一次性名声警告（源码 bad_fame1/2）
  if (goodId === 4 && !state.soldBookOnce) {
    state.soldBookOnce = true
    pushEvents([{ kind: 'dialog', text: '买卖《上海小宝贝》（禁书）,污染社会,俺的名声变坏了啊!' }])
  } else if (goodId === 3 && !state.soldWineOnce) {
    state.soldWineOnce = true
    pushEvents([{ kind: 'dialog', text: '买卖假白酒（剧毒！）,危害社会，俺的名声下降了.' }])
  }
  refresh()
}
export function bankDepositAction(amt: number) {
  A.bankDeposit(state, amt)
  refresh()
}
export function bankWithdrawAction(amt: number) {
  A.bankWithdraw(state, amt)
  refresh()
}
export function hospitalAction(points: number) {
  pushEvents(A.hospitalTreat(state, points) as unknown as GameEvent[])
  if (state.soundEnabled) import('./sound').then((m) => m.playSound('opendoor.wav'))
  refresh()
}
export function postOfficeAction() {
  pushEvents(A.postOffice(state) as unknown as GameEvent[])
  if (state.soundEnabled) import('./sound').then((m) => m.playSound('opendoor.wav'))
  refresh()
}
export function repayAction(amt: number) {
  pushEvents(A.repayDebt(state, amt) as unknown as GameEvent[])
  refresh()
}
export function rentAction() {
  pushEvents(A.rentHouse(state) as unknown as GameEvent[])
  refresh()
}
export function wangbaAction() {
  pushEvents(A.visitWangba(state, rng) as unknown as GameEvent[])
  refresh()
}
export function airportAction() {
  pushEvents(A.visitAirport(state) as unknown as GameEvent[])
  if (state.soundEnabled) import('./sound').then((m) => m.playSound('airport.wav'))
  refresh()
}
export function advanceEvent() {
  events.update((e) => e.slice(1))
  // 播下一个事件音效（受声音开关控制）
  events.update((e) => {
    const withSnd = e.find((x) => x.sound)
    if (state.soundEnabled && withSnd?.sound) import('./sound').then((m) => m.playSound(withSnd.sound!))
    return e
  })
}

export function updateSettings(s: Partial<Settings>) {
  const next = { ...getSettings(), ...s }
  saveSettings(next)
  settings.set(next)
  state.soundEnabled = next.sound
  state.hack = next.hack
  refresh()
}

export { getSettings }
