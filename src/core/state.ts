// 游戏状态。字段名对应原版 SelectionDlg.cpp 的成员变量。
// 初始值逐字来自源码 OnNewGame / 构造函数（见 PLAN §3.1）。

export const START_CASH = 2000
export const START_DEBT = 5000
export const START_BANK = 0
export const START_COAT = 100
export const START_HEALTH = 100
export const START_FAME = 100
export const START_TIME_LEFT = 40
export const START_LOCATION = -1
export const CITY_BEIJING = 1
export const CITY_SHANGHAI = 2

export interface GameState {
  cash: number // MyCash
  debt: number // MyDebt
  bank: number // MyBank
  total: number // myTotal（当前占用仓位 = sum(holdings)）
  coat: number // myCoat（仓容，可租房扩容）
  health: number // m_nMyHealth
  fame: number // m_MyFame
  wangba: number // m_nVisitWangba（防刷网吧）
  timeLeft: number // m_nTimeLeft
  loc: number // m_MyCurrentLoc（-1 = 未在任何地点；1..10）
  city: number // m_City（1 北京 / 2 上海）
  prices: number[] // 当日黑市价（8 个，0 表示当日不出售）
  holdings: number[] // 各货物数量（8 个，sum = total）
  holdCost: number[] // 各货物加权平均进价（m_list2「买进价格」）
  soundEnabled: boolean // 声音开关（m_bCloseSound 取反）
  hack: boolean // m_bHackActs（是否允许黑客事件）
  over: boolean // 游戏是否已结束
  soldBookOnce: boolean // 卖禁书名声警告是否已弹过（bad_fame1）
  soldWineOnce: boolean // 卖假酒名声警告是否已弹过（bad_fame2）
}

/** 生成本局起始的纯初始状态（不含开局利息/价格，那些由 engine.newGame 施加）。 */
export function createInitialState(): GameState {
  return {
    cash: START_CASH,
    debt: START_DEBT,
    bank: START_BANK,
    total: 0,
    coat: START_COAT,
    health: START_HEALTH,
    fame: START_FAME,
    wangba: 0,
    timeLeft: START_TIME_LEFT,
    loc: START_LOCATION,
    city: CITY_BEIJING,
    prices: new Array(8).fill(0),
    holdings: new Array(8).fill(0),
    holdCost: new Array(8).fill(0),
    soundEnabled: true,
    hack: false,
    over: false,
    soldBookOnce: false,
    soldWineOnce: false,
  }
}
