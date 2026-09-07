// 玩家发起的、不消耗回合的操作（买卖/银行/医院/邮局/房源/网吧）。
// 机制逐字对照 reference/SelectionDlg.cpp 的 OnHospital / OnPostoffice / OnHouseAgency /
// OnWangba，以及 CBuyDlg/CSellDlg 的量限制逻辑（见 PLAN §3.7）。

import type { GameState } from './state'
import type { Random } from './rng'
import { randInt } from './rng'

export interface ActionEvent {
  kind: 'news' | 'dialog'
  text: string
  sound?: string
}

const evDialog = (text: string, sound?: string): ActionEvent => ({ kind: 'dialog', text, sound })

const evNews = (text: string): ActionEvent => ({ kind: 'news', text })

// 买入数量上限：受「现金/单价」与「仓容-已装」双重限制（CBuyDlg m_nMaxCount）
export function maxBuyQty(state: GameState, goodId: number): number {
  const price = state.prices[goodId]
  if (price <= 0) return 0
  const byCash = Math.floor(state.cash / price)
  const byCoat = state.coat - state.total
  return Math.max(0, Math.min(byCash, byCoat))
}

/** 以当前黑市价买入 qty（自动截断到可买上限）。返回实际买入量。 */
export function buy(state: GameState, goodId: number, qty: number): number {
  const n = Math.max(0, Math.min(qty, maxBuyQty(state, goodId)))
  if (n === 0) return 0
  const price = state.prices[goodId]
  // 进价记为加权平均（源码 MoveListItems：新价 = (price*新量 + 旧均价*旧量) / 总量）
  if (state.holdings[goodId] === 0) {
    state.holdCost[goodId] = price
  } else {
    const old = state.holdings[goodId]
    state.holdCost[goodId] = Math.floor((price * n + state.holdCost[goodId] * old) / (n + old))
  }
  state.cash -= price * n
  state.holdings[goodId] += n
  state.total += n
  return n
}

/** 当天是否可卖：既要有持仓，且该货物当天在黑市(价格>0)（源码 left_has 判断）。 */
export function maxSellQty(state: GameState, goodId: number): number {
  if (state.prices[goodId] <= 0) return 0
  return Math.max(0, state.holdings[goodId])
}

/** 以当前黑市价卖出 qty（自动截断到可卖/持仓上限；当天不在黑市则不可卖）。返回实际卖出量。 */
export function sell(state: GameState, goodId: number, qty: number): number {
  const n = Math.max(0, Math.min(qty, maxSellQty(state, goodId)))
  if (n === 0) return 0
  if (state.prices[goodId] <= 0) return 0 // 当天不在黑市，无法卖出
  state.cash += n * state.prices[goodId]
  state.holdings[goodId] -= n
  state.total -= n
  // 卖违禁品扣名声（源码：禁书 -7、假酒 -10，下限 0）
  if (goodId === 4) state.fame = Math.max(0, state.fame - 7)
  else if (goodId === 3) state.fame = Math.max(0, state.fame - 10)
  return n
}

/** 存入现金→存款（CEnterBank::OnOK）。返回本次存入额。 */
export function bankDeposit(state: GameState, amount: number): number {
  const n = Math.max(0, Math.min(amount, state.cash))
  if (n === 0) return 0
  state.cash -= n
  state.bank += n
  return n
}

/** 提取存款→现金（CEnterBank::OnCancel）。返回本次提取额。 */
export function bankWithdraw(state: GameState, amount: number): number {
  const n = Math.max(0, Math.min(amount, state.bank))
  if (n === 0) return 0
  state.cash += n
  state.bank -= n
  return n
}

/** 去医院治疗 points 点（3500元/点）；现金不足拒绝治疗（OnHospital）。 */
export function hospitalTreat(state: GameState, points: number): ActionEvent[] {
  if (state.health >= 100) {
    return [evDialog('小护士笑咪咪地望着俺："大哥！神经科这边挂号."')]
  }
  const pts = Math.max(1, Math.min(Math.floor(points), 100 - state.health))
  if (pts * 3500 > state.cash) {
    return [evDialog('医生说，"钱不够哎! 拒绝治疗。"')]
  }
  state.health += pts
  state.cash -= pts * 3500
  return [
    evDialog(
      `大夫高兴地拍着手：“您的健康点数是${state.health - pts}，需要治疗的点数是${pts}。治疗完毕，健康恢复。`, // 简版，UI 可再细调
    ),
  ]
}

/** 邮局：无欠债按财富档位给台词；有欠债还款（OnPostoffice）。 */
export function postOffice(state: GameState): ActionEvent[] {
  if (state.debt === 0) {
    const wealth = state.cash + state.bank
    if (wealth < 1000) return [evDialog('村长嘿嘿笑道：“你没钱,有神经病!”')]
    if (wealth < 100000) return [evDialog('村长朝俺点头："兄弟,您想支援家乡1000元吗？"')]
    if (wealth < 10000000) return [evDialog('村长在电话中朝俺鞠躬:"富豪!我想把我女儿嫁给您."...')]
    return [evDialog('村长在电话中朝俺下跪，说："您简直是我亲爹！"')]
  }
  // 有欠债：提示还款（还款额上限=min(债务,现金)）
  return [
    evDialog(`村长在电话中说："铁牛，你欠俺${state.debt}元，快还!"`),
  ]
}

/** 还款（邮局有欠债时）。金额超过现金则拒绝。 */
export function repayDebt(state: GameState, amount: number): ActionEvent[] {
  if (amount > state.cash) {
    return [evDialog('村长老婆狂吞"雪中丐"补钙片，冷笑道："你还得起吗?"')]
  }
  const n = Math.max(0, Math.min(amount, state.debt, state.cash))
  if (n === 0) return []
  state.debt -= n
  state.cash -= n
  return [evDialog(`已还${n}元，还欠${state.debt}元。`)]
}

/** 租房扩仓容（OnHouseAgency）：myCoat==140 不放；现金<30000 不放；否则出租并 +10 仓容。 */
export function rentHouse(state: GameState): ActionEvent[] {
  if (state.coat >= 140) {
    return [evDialog('中介说，您的房子比局长的还大!还租房?')]
  }
  if (state.cash < 30000) {
    return [evDialog('中介说，您没有三万现金就想租房? 一边凉快去!')]
  }
  if (state.cash <= 30000) {
    state.cash -= 25000
  } else {
    state.cash = Math.floor(state.cash / 2)
    state.cash -= 2000
  }
  state.coat += 10
  return [evDialog(`我的房子可以放${state.coat}个物品了!可是，好象中介公司骗了我一些钱...`)]
}

/** 网吧（OnWangba）：最多访问 3 次；现金不足 15 元拒绝；访问得 1+rand(10) 元。 */
export function visitWangba(state: GameState, rnd: Random): ActionEvent[] {
  if (state.wangba > 2) {
    return [evDialog('村长放出话来：你别总是在网吧里鬼混，快去做正经买卖! ')]
  }
  if (state.cash < 15) {
    return [evDialog('进网吧至少身上要带15元，呵呵，取钱再来。')]
  }
  state.wangba += 1
  const i = randInt(10, rnd) // 0..9
  state.cash += 1 + i
  return [evDialog(`感谢电信改革，可以免费上网! 还挣了美国网络广告费${i + 1}元，嘿嘿!`)]
}

/** 机场/网络俱乐部：播 airport.wav（音效由 UI 播），查看联网内容。 */
export function visitAirport(state: GameState): ActionEvent[] {
  return [evNews('已到达首都国际机场，欢迎接入网络俱乐部。')]
}
