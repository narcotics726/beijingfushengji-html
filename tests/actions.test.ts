import { describe, it, expect } from 'vitest'
import type { Random } from '../src/core/rng'
import { createRng } from '../src/core/rng'
import { createInitialState, START_CASH, START_DEBT, START_TIME_LEFT } from '../src/core/state'
import { newGame, moveTo, getScore } from '../src/core/engine'
import {
  maxBuyQty,
  maxSellQty,
  buy,
  sell,
  rentHouse,
  visitWangba,
  bankDeposit,
  bankWithdraw,
  postOffice,
  repayDebt,
} from '../src/core/actions'
import { fameStr, getTop10, insertScore, getMyOrder, DEFAULT_TOP10 } from '../src/core/storage'

function stub(values: number[]): Random {
  let i = 0
  return () => values[i++ % values.length]
}

describe('买入（受现金与仓容限制）', () => {
  it('maxBuyQty = min(floor(cash/price), coat-total)', () => {
    const s = createInitialState()
    s.cash = 1000
    s.prices[0] = 100
    expect(maxBuyQty(s, 0)).toBe(10)
  })
  it('buy 扣现金、加持仓，量被上限截断', () => {
    const s = createInitialState()
    s.cash = 1000
    s.prices[0] = 100
    expect(buy(s, 0, 3)).toBe(3)
    expect(s.cash).toBe(700)
    expect(s.holdings[0]).toBe(3)
    expect(s.total).toBe(3)
    expect(buy(s, 0, 99)).toBe(7) // 容量 100，已装 3，剩 97；但现金只够 7
  })
  it('buy 记录加权平均进价', () => {
    const s = createInitialState()
    s.cash = 10000
    s.prices[0] = 100
    buy(s, 0, 2) // 2 件 @100
    expect(s.holdCost[0]).toBe(100)
    s.prices[0] = 200
    s.cash = 10000
    buy(s, 0, 3) // 再加 3 件 @200 → (200*3+100*2)/5 = 160
    expect(s.holdCost[0]).toBe(160)
    expect(s.holdings[0]).toBe(5)
  })
})

describe('卖出（按当前价）', () => {
  it('卖 2 件，现金增加、持仓减少', () => {
    const s = createInitialState()
    s.cash = 0
    s.holdings[0] = 3
    s.total = 3
    s.prices[0] = 100
    expect(sell(s, 0, 2)).toBe(2)
    expect(s.cash).toBe(200)
    expect(s.holdings[0]).toBe(1)
    expect(s.total).toBe(1)
  })
})

describe('可卖上限与「当天不可卖」', () => {
  it('当日在黑市且持仓>0 → 可卖量=持仓', () => {
    const s = createInitialState()
    s.prices[0] = 100
    s.holdings[0] = 3
    expect(maxSellQty(s, 0)).toBe(3)
  })
  it('当日价格0(不在黑市) → 不可卖，卖出为0', () => {
    const s = createInitialState()
    s.prices[0] = 0
    s.holdings[0] = 3
    expect(maxSellQty(s, 0)).toBe(0)
    expect(sell(s, 0, 2)).toBe(0)
    expect(s.holdings[0]).toBe(3)
  })
})

describe('卖违禁品扣名声（源码：禁书-7，假酒-10，下限0）', () => {
  it('卖禁书(4)名声-7，卖假酒(3)名声-10', () => {
    const s = createInitialState()
    s.cash = 100000
    s.fame = 100
    s.prices[4] = 1000
    s.prices[3] = 1000
    s.holdings[4] = 2
    s.holdings[3] = 2
    expect(sell(s, 4, 1)).toBe(1)
    expect(s.fame).toBe(93)
    expect(sell(s, 3, 1)).toBe(1)
    expect(s.fame).toBe(83)
  })
})

describe('存取款', () => {
  it('存入/提取', () => {
    const s = createInitialState()
    s.cash = 1000
    expect(bankDeposit(s, 300)).toBe(300)
    expect(s.cash).toBe(700)
    expect(s.bank).toBe(300)
    expect(bankWithdraw(s, 100)).toBe(100)
    expect(s.cash).toBe(800)
    expect(s.bank).toBe(200)
  })
})

describe('邮局还款', () => {
  it('有欠债且现金足够：还款并扣除', () => {
    const s = createInitialState()
    s.cash = 3000
    s.debt = 2000
    repayDebt(s, 1000)
    expect(s.debt).toBe(1000)
    expect(s.cash).toBe(2000)
  })
  it('还款额超过现金：拒绝', () => {
    const s = createInitialState()
    s.cash = 500
    s.debt = 2000
    repayDebt(s, 1000)
    expect(s.debt).toBe(2000)
    expect(s.cash).toBe(500)
  })
  it('有欠债时 postOffice 给出还款提示', () => {
    const s = createInitialState()
    s.debt = 2000
    const evs = postOffice(s)
    expect(evs[0].text).toContain('铁牛，你欠俺2000元，快还!')
  })
  it('无欠债时按财富档位给台词', () => {
    const s = createInitialState()
    s.cash = 500
    s.bank = 0
    s.debt = 0
    expect(postOffice(s)[0].text).toContain('你没钱')
  })
  it('财富正好等于边界值(1000/100000/10000000)落「典范」分支', () => {
    for (const w of [1000, 100000, 10000000]) {
      const s = createInitialState()
      s.cash = w
      s.bank = 0
      s.debt = 0
      expect(postOffice(s)[0].text).toContain('典范')
    }
  })
})

describe('租房扩仓容（OnHouseAgency）', () => {
  it('现金>30000：cash=floor(cash/2)-2000，coat+10', () => {
    const s = createInitialState()
    s.cash = 50000
    s.coat = 100
    rentHouse(s)
    expect(s.coat).toBe(110)
    expect(s.cash).toBe(Math.floor(50000 / 2) - 2000) // 23000
  })
  it('现金<=30000：减 25000，coat+10', () => {
    const s = createInitialState()
    s.cash = 30000
    s.coat = 100
    rentHouse(s)
    expect(s.coat).toBe(110)
    expect(s.cash).toBe(5000)
  })
  it('coat==140：拒绝', () => {
    const s = createInitialState()
    s.coat = 140
    s.cash = 99999
    rentHouse(s)
    expect(s.coat).toBe(140)
    expect(s.cash).toBe(99999)
  })
  it('现金<30000：拒绝', () => {
    const s = createInitialState()
    s.cash = 100
    rentHouse(s)
    expect(s.coat).toBe(100)
  })
})

describe('网吧（OnWangba）', () => {
  it('访问一次：wangba+1，得 1+rand(10) 元', () => {
    const s = createInitialState()
    s.cash = 100
    visitWangba(s, stub([0.5])) // randInt(10)=5
    expect(s.wangba).toBe(1)
    expect(s.cash).toBe(106)
  })
  it('超过 3 次：拒绝', () => {
    const s = createInitialState()
    s.wangba = 3
    s.cash = 100
    visitWangba(s, stub([0.5]))
    expect(s.cash).toBe(100)
  })
  it('现金<15：拒绝', () => {
    const s = createInitialState()
    s.cash = 10
    visitWangba(s, stub([0.5]))
    expect(s.cash).toBe(10)
  })
})

describe('fame 称号映射（GetFameStr）', () => {
  it('各档位', () => {
    expect(fameStr(100)).toBe('德高望重')
    expect(fameStr(95)).toBe('杰出青年')
    expect(fameStr(85)).toBe('一般般')
    expect(fameStr(70)).toBe('不佳')
    expect(fameStr(50)).toBe('争议人物')
    expect(fameStr(30)).toBe('差')
    expect(fameStr(15)).toBe('江湖唾弃') // 源码 <20>=10 恒假 → else
    expect(fameStr(5)).toBe('江湖唾弃')
  })
})

describe('最高分榜（TopPlayerDlg）', () => {
  it('默认榜有 10 条且降序', () => {
    const list = getTop10()
    expect(list.length).toBe(10)
    for (let i = 1; i < list.length; i++) expect(list[i - 1].score >= list[i].score).toBe(true)
  })
  it('getMyOrder：高分进前十返回名次，否则 100', () => {
    expect(getMyOrder(20000000, DEFAULT_TOP10)).toBe(0)
    expect(getMyOrder(3, DEFAULT_TOP10)).toBe(9)
    expect(getMyOrder(-1, DEFAULT_TOP10)).toBe(100)
  })
  it('insertScore 降序插入并保持前 10', () => {
    const list = insertScore(DEFAULT_TOP10, { name: '测试', score: 1000, health: 90, fame: '不佳' })
    expect(list.length).toBe(10)
    expect(list[0].score).toBe(12500720)
    expect(list[7]).toMatchObject({ name: '测试', score: 1000 })
  })
})

describe('新开局与移动（端到端冒烟）', () => {
  it('newGame：初始债务 5000→5500，timeLeft=40', () => {
    const s = newGame(createRng(1))
    expect(s.cash).toBe(START_CASH)
    expect(s.debt).toBe(5000 + Math.floor(5000 * 0.1)) // 5500
    expect(s.timeLeft).toBe(START_TIME_LEFT)
  })
  it('moveTo：推进到新地点并扣一天', () => {
    const s = newGame(createRng(7))
    const events = moveTo(s, 2, createRng(8))
    expect(s.loc).toBe(2)
    expect(s.timeLeft).toBe(START_TIME_LEFT - 1)
    expect(Array.isArray(events)).toBe(true)
  })
  it('原地不移动：不扣天', () => {
    const s = newGame(createRng(7))
    moveTo(s, 2, createRng(8))
    const before = s.timeLeft
    moveTo(s, 2, createRng(9)) // 回到原地
    expect(s.timeLeft).toBe(before)
  })
  it('getScore = cash+bank-debt', () => {
    const s = createInitialState()
    s.cash = 1000
    s.bank = 100
    s.debt = 500
    expect(getScore(s)).toBe(600)
  })
})
