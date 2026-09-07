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
  let entered = order !== 100
  if (entered) {
    const next = insertScore(list, {
      name: '无名氏',
      score,
      health: state.health,
      fame: fameStr(state.fame),
    })
    saveTop10(next)
  }
  endResult.set({ score, entered, order, top10: getTop10() })
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
  if (n > 0 && state.soundEnabled) import('./sound').then((m) => m.playSound('money.wav'))
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
  if (state.soundEnabled) import('./sound').then((m) => m.playSound('opendoor.wav'))
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
