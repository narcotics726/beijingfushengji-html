// 规则引擎：纯函数式操作 GameState（框架无关，可在 Node 测试）。
// 行为完全对照 reference/SelectionDlg.cpp 的 HandleNormalEvents / DoRandomStuff /
// DoRandomEvent / OnSteal / HandleCashAndDebt / OnExit（见 PLAN §3）。
// 每个规则函数接受一个 Random（[0,1) 源），便于 oracle 测试注入确定性序列。

import { GOODS, GOODS_COUNT } from './data/goods'
import {
  COMMERCIAL_EVENTS,
  HEALTH_EVENTS,
  STEAL_EVENTS,
  LOC_NAMES,
  COFFEE,
} from './data/events'
import type { GameState } from './state'
import { createInitialState } from './state'
import type { Random } from './rng'
import { randInt } from './rng'

export interface GameEvent {
  kind: 'news' | 'dialog' // CNewsDlg / CRijiDlg 之别（UI 据此渲染）
  text: string
  sound?: string // 音效文件名，如 'kill.wav'
}

const evNews = (text: string, sound?: string): GameEvent => ({ kind: 'news', text, sound })
const evDialog = (text: string, sound?: string): GameEvent => ({ kind: 'dialog', text, sound })

// ---- 价格生成 -----------------------------------------------------------
export function makeDrugPrices(state: GameState, leaveout: number, rnd: Random): void {
  for (let i = 0; i < GOODS_COUNT; i++) {
    state.prices[i] = GOODS[i].base + randInt(GOODS[i].range, rnd)
  }
  // 循环 leaveout 次、每次随机挑一个置 0（允许重复 → 可能少于 leaveout 个不同的 0）
  for (let i = 0; i < leaveout; i++) {
    const j = randInt(8, rnd)
    state.prices[j] = 0
  }
}

// ---- 利息 ---------------------------------------------------------------
export function applyInterest(state: GameState): void {
  state.debt = state.debt + Math.floor(state.debt * 0.1)
  state.bank = state.bank + Math.floor(state.bank * 0.01)
}

// ---- 商业事件（DoRandomStuff）-----------------------------------------
export function runCommercialEvents(state: GameState, rnd: Random): GameEvent[] {
  const events: GameEvent[] = []
  for (let i = 0; i < COMMERCIAL_EVENTS.length; i++) {
    const e = COMMERCIAL_EVENTS[i]
    if (randInt(950, rnd) % e.freq !== 0) continue
    if (state.prices[e.drug] === 0) continue
    events.push(evNews(e.msg))
    if (i === COMMERCIAL_EVENTS.length - 1) state.debt += 2500
    if (e.plus > 0) state.prices[e.drug] *= e.plus
    if (e.minus > 0) state.prices[e.drug] = Math.floor(state.prices[e.drug] / e.minus)
    if (e.add > 0) {
      const addcount = e.add + state.total > state.coat ? state.coat - state.total : e.add
      if (addcount === 0) {
        events.push(evDialog(`可惜!俺租的房子太小，只能放${state.coat}个物品。`))
        return events
      }
      // 赠送：已在库则只叠数量、成本不变；新入库则成本记 0（源码行为）
      if (state.holdings[e.drug] > 0) {
        state.holdings[e.drug] += addcount
      } else {
        state.holdings[e.drug] = addcount
        state.holdCost[e.drug] = 0
      }
      state.total += addcount
    }
  }
  return events
}

// ---- 健康事件（DoRandomEvent）-----------------------------------------
export function runHealthEvent(
  state: GameState,
  rnd: Random,
): { events: GameEvent[]; dead: boolean } {
  const events: GameEvent[] = []
  let dead = false
  for (let i = 0; i < HEALTH_EVENTS.length; i++) {
    const e = HEALTH_EVENTS[i]
    if (randInt(1000, rnd) % e.freq !== 0) continue
    events.push(evDialog(`${e.msg}俺的健康减少了${e.hunt}点。`, e.sound))
    state.health -= e.hunt
    break
  }
  // 健康分支（优先级：住院 > 健康危机 > 死亡）
  if (state.health < 85 && state.timeLeft > 3) {
    const delay_day = 1 + randInt(2, rnd)
    const msg1 = `好心的市民把我抬到医院，医生让我治疗${delay_day}天。`
    const locName = LOC_NAMES[10 * (state.city - 1) + state.loc - 1]
    const scn = COFFEE[randInt(29, rnd)]
    const msg2 = `由于不注意身体,我被人发现昏迷在${locName}附近的${scn}。`
    const load = delay_day * (1000 + randInt(8500, rnd))
    const msg3 = `村长让人为我垫付了住院费用${load}元。`
    events.push(evDialog(msg1 + '\n' + msg2 + '\n' + msg3))
    state.debt += load
    state.health += 10
    if (state.health > 100) state.health = 100
    state.timeLeft -= delay_day
    return { events, dead }
  }
  if (state.health < 20 && state.health > 0) {
    events.push(evDialog('俺的健康..健康危机..快去医..'))
    return { events, dead }
  }
  if (state.health < 0) {
    events.push(evDialog('俺倒在街头,身边日记本上写着："北京，我将再来!"', 'death.wav'))
    dead = true
    state.over = true
  }
  return { events, dead }
}

// ---- 抢钱事件（OnSteal）------------------------------------------------
export function runStealEvent(state: GameState, rnd: Random): GameEvent[] {
  const events: GameEvent[] = []
  for (let i = 0; i < STEAL_EVENTS.length; i++) {
    const e = STEAL_EVENTS[i]
    if (randInt(1000, rnd) % e.freq !== 0) continue
    if (i !== 4 && i !== 5) {
      events.push(evDialog(`${e.msg}俺的银子减少了${e.ratoi}%。`))
      // 源码 (MyCash/100)*(100-ratoi)：MyCash/100 是整数(截断)除法
      state.cash = Math.floor(state.cash / 100) * (100 - e.ratoi)
    } else if (state.bank > 0) {
      events.push(evDialog(`${e.msg}俺的存款减少了${e.ratoi}%。，哎呀!`))
      state.bank = Math.floor(state.bank / 100) * (100 - e.ratoi)
    }
    break
  }
  // 黑客事件（需 m_bHackActs）
  if (randInt(1000, rnd) % 25 === 0 && state.hack) {
    let num = 0
    if (state.bank >= 1000) {
      if (state.bank > 100000) {
        num = Math.floor(state.bank / (2 + randInt(20, rnd)))
        if (randInt(20, rnd) % 3 !== 0) {
          events.push(evDialog(`黑客入侵银行网络，疯狂修改数据库，我的存款减少了${num}`))
          state.bank -= num
        } else {
          events.push(evDialog(`黑客入侵银行网络，疯狂修改数据库，我的存款增加了${num}`))
          state.bank += num
        }
      } else {
        num = Math.floor(state.bank / (1 + randInt(15, rnd)))
        events.push(evDialog(`黑客入侵银行网络，疯狂修改数据库，我的存款增加了${num}`))
        state.bank += num
      }
    }
  }
  if (state.cash < 0) {
    state.cash = 0
    events.push(evDialog('俺不好办了。'))
  }
  return events
}

// ---- 欠债 >10 万惩罚 ----------------------------------------------------
export function runDebtPenalty(state: GameState): GameEvent[] {
  if (state.debt > 100000) {
    state.health -= 30
    return [evDialog('俺欠钱太多，村长叫一群老乡揍了俺一顿!', 'kill.wav')]
  }
  return []
}

// ---- 末日（timeLeft==0）清仓 + 结束 ------------------------------------
export function runEndOfGame(state: GameState): GameEvent[] {
  const events: GameEvent[] = []
  events.push(evDialog('俺已经在北京40天了，该回去结婚去了。'))
  let anyLeft = false
  let goodsLeft = '系统替我卖了剩余货物: '
  for (let i = 0; i < GOODS_COUNT; i++) {
    if (state.holdings[i] > 0) {
      goodsLeft += GOODS[i].name
      anyLeft = true
    }
  }
  if (anyLeft) {
    goodsLeft += '。'
    events.push(evDialog(goodsLeft))
    for (let i = 0; i < GOODS_COUNT; i++) {
      const qty = state.holdings[i]
      if (qty > 0) {
        state.cash += qty * state.prices[i] // 按当前黑市(买)价自动卖出
        state.holdings[i] = 0
      }
    }
    state.total = 0
  }
  state.over = true
  return events
}

// ---- 移动一次（HandleNormalEvents）-------------------------------------
export function moveTo(state: GameState, loc: number, rnd: Random): GameEvent[] {
  if (state.over) return []
  if (loc === state.loc) return [] // 原地不推进回合
  const events: GameEvent[] = []
  state.loc = loc
  // 1. 价格
  makeDrugPrices(state, state.timeLeft <= 2 ? 0 : 3, rnd)
  // 2. 利息
  applyInterest(state)
  // 3. 商业事件
  events.push(...runCommercialEvents(state, rnd))
  // 5. 健康事件 + 分支
  const hr = runHealthEvent(state, rnd)
  events.push(...hr.events)
  if (hr.dead) return events // 死亡则终止本次移动
  // 6. 抢钱事件
  events.push(...runStealEvent(state, rnd))
  // 7. 欠债 >10 万惩罚
  events.push(...runDebtPenalty(state))
  // 8. 日结
  state.timeLeft--
  // 9. 只剩 1 天提示
  if (state.timeLeft === 1) events.push(evDialog('俺明天回家乡，快把全部货物卖掉。'))
  // 10. 到 0 天：清仓 + 结束
  if (state.timeLeft === 0) {
    events.push(...runEndOfGame(state))
  }
  return events
}

// ---- 新开局（OnNewGame）------------------------------------------------
export function newGame(rnd: Random): GameState {
  const s = createInitialState()
  makeDrugPrices(s, 3, rnd)
  applyInterest(s) // 开局即有一次利息（源行为：初始债务 5000 → 5500）
  return s
}

// ---- 结算分数（OnExit）-------------------------------------------------
export function getScore(state: GameState): number {
  return state.cash + state.bank - state.debt
}
