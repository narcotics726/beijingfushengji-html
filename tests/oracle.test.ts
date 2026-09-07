// Oracle 测试套件：用注入式可控随机数，把每条规则钉在源码公式上。
// 用注入的 Random 序列（[0,1)），确保 randInt 行为确定 → 可逐条断言。
// 覆盖 PLAN §4 的易错点：950/1000 除数、break 语义、整型除法、makeDrugPrices 重复置0、住院。
import { describe, it, expect } from 'vitest'
import type { Random } from '../src/core/rng'
import {
  makeDrugPrices,
  applyInterest,
  runCommercialEvents,
  runHealthEvent,
  runStealEvent,
  runDebtPenalty,
  runEndOfGame,
  getScore,
} from '../src/core/engine'
import {
  GOODS,
} from '../src/core/data/goods'
import {
  COMMERCIAL_EVENTS,
  HEALTH_EVENTS,
  STEAL_EVENTS,
  LOC_NAMES,
  COFFEE,
} from '../src/core/data/events'
import { createInitialState } from '../src/core/state'

// 注入一个按给定序列循环返回 [0,1) 的 Random（耗尽后回到开头）。
// 循环是为了在事件遍历/循环多次消耗同一随机值时行为可预期（避免耗尽后 returning 0 导致 0%freq==0 恒真）。
function stub(values: number[]): Random {
  let i = 0
  return () => values[i++ % values.length]
}

// 让单个 randInt(upper) 精确落在 target（0..upper-1）
// target/upper 可能因浮点取整落到 target-1，这里返回一个安全的 [target, target+1)/upper 中点。
function rv(upper: number, target: number): number {
  return (target + 0.5) / upper
}

function defaultState(overrides: Partial<ReturnType<typeof createInitialState>> = {}) {
  return { ...createInitialState(), ...overrides }
}

describe('数据表保真（以源码为唯一真理）', () => {
  it('商业事件 18 条，关键行与源码一致', () => {
    expect(COMMERCIAL_EVENTS.length).toBe(18)
    expect(COMMERCIAL_EVENTS[0]).toEqual({ freq: 170, msg: '专家提议提高大学生“动手素质”，进口玩具颇受欢迎!', drug: 5, plus: 2, minus: 0, add: 0 })
    expect(COMMERCIAL_EVENTS[11]).toEqual({ freq: 17, msg: '市场上充斥着来自福建的走私香烟!', drug: 0, plus: 0, minus: 8, add: 0 })
    expect(COMMERCIAL_EVENTS[17]).toEqual({ freq: 140, msg: '媒体报道：又有日本出口到中国的产品出事了! 出事后日本人死不认帐,拒绝赔偿。村长得知此消息，托人把他用的水货手机（无任何厂商标识）硬卖给您，收您2500元。', drug: 6, plus: 0, minus: 0, add: 1 })
  })
  it('健康事件 12 条，sound 名与源码一致', () => {
    expect(HEALTH_EVENTS.length).toBe(12)
    expect(HEALTH_EVENTS[0]).toEqual({ freq: 117, msg: '大街上两个流氓打了俺!', hunt: 3, sound: 'kill.wav' })
    expect(HEALTH_EVENTS[1]).toEqual({ freq: 157, msg: '俺在过街地道被人打了蒙棍! ', hunt: 20, sound: 'death.wav' })
    expect(HEALTH_EVENTS[5]).toEqual({ freq: 313, msg: '一群民工打了俺!', hunt: 10, sound: 'flee.wav' })
  })
  it('抢钱事件 7 条', () => {
    expect(STEAL_EVENTS.length).toBe(7)
    expect(STEAL_EVENTS[0]).toEqual({ freq: 60, msg: '俺怜悯地铁口扮演成乞丐的老太太。', ratoi: 10 })
    expect(STEAL_EVENTS[3]).toEqual({ freq: 65, msg: '三个带红袖章的老太太揪住俺：“你是外地人?罚款!”', ratoi: 20 })
  })
  it('货物 8 条，base/range 与源码一致', () => {
    expect(GOODS.length).toBe(8)
    expect(GOODS[0]).toEqual({ id: 0, name: '进口香烟', base: 100, range: 350 })
    expect(GOODS[3]).toEqual({ id: 3, name: '假白酒（剧毒！）', base: 1000, range: 2500 })
    expect(GOODS[6]).toEqual({ id: 6, name: '水货手机', base: 750, range: 750 })
  })
  it('loc[21]/coffee[30] 关键索引与源码一致', () => {
    expect(LOC_NAMES[0]).toBe('建国门')
    expect(LOC_NAMES[2]).toBe('西直门')
    expect(LOC_NAMES[10]).toBe('永安里')
    expect(COFFEE[0]).toBe('发廊里')
    expect(COFFEE[29]).toBe('')
  })
})

describe('价格生成（base + floor(frac*range)，循环 leaveout 次可重复置0）', () => {
  it('leaveout=3 且三次都命中同一物品：价格=base+floor(0.5*range)，该物被置0', () => {
    const s = createInitialState()
    // 8 次价格抽奖：0.5 → randInt(range)=floor(0.5*range)；之后 3 次 leaveout：0.25 → randInt(8)=2
    makeDrugPrices(s, 3, stub([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25]))
    expect(s.prices[0]).toBe(100 + Math.floor(0.5 * 350)) // 275
    expect(s.prices[1]).toBe(15000 + Math.floor(0.5 * 15000)) // 22500
    expect(s.prices[2]).toBe(0) // 被 leaveout 置0
    expect(s.prices[3]).toBe(1000 + Math.floor(0.5 * 2500)) // 2250
    expect(s.prices[4]).toBe(5000 + Math.floor(0.5 * 9000)) // 9500
    expect(s.prices[6]).toBe(750 + Math.floor(0.5 * 750)) // 1125
  })
  it('leaveout=0 不置0', () => {
    const s = createInitialState()
    makeDrugPrices(s, 0, stub([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]))
    expect(s.prices.every((p) => p > 0)).toBe(true)
  })
})

describe('利息（debt+=floor(debt*0.1), bank+=floor(bank*0.01)）', () => {
  it('债务 +500、存款 +1', () => {
    const s = defaultState({ debt: 5000, bank: 100 })
    applyInterest(s)
    expect(s.debt).toBe(5500)
    expect(s.bank).toBe(101)
  })
})

describe('商业事件（命中 RandomNum(950)；命中不 break；minus 整型除法）', () => {
  it('事件11（走私香烟，minus=8）：price[0]=floor(原/8)', () => {
    const s = defaultState({ prices: new Array(8).fill(100) })
    // rv(950, 34) → randInt(950)=34；34%17=0 命中 idx11；其余 34%freq≠0
    const events = runCommercialEvents(s, stub([rv(950, 34)]))
    expect(events.length).toBe(1)
    expect(events[0].kind).toBe('news')
    expect(events[0].text).toBe('市场上充斥着来自福建的走私香烟!')
    expect(s.prices[0]).toBe(Math.floor(100 / 8)) // 12
  })
  it('价格==0 的货物命中会被跳过', () => {
    const s = defaultState({ prices: new Array(8).fill(100) })
    s.prices[0] = 0 // 让事件11的 drug0 价格=0
    const events = runCommercialEvents(s, stub([rv(950, 34)]))
    expect(events.length).toBe(0) // 被 continue 跳过
    expect(s.prices[0]).toBe(0)
  })
})

describe('健康事件（命中 RandomNum(1000)；命中即 break；扣 hunt）', () => {
  it('事件0（freq117,hunt3）：健康-3，且只触发一次', () => {
    const s = defaultState({ health: 90, timeLeft: 10 })
    // rv(1000,117) → randInt(1000)=117；117%117=0 命中 idx0；90-3=87，87>=85 不触发住院
    const { events, dead } = runHealthEvent(s, stub([rv(1000, 117)]))
    expect(dead).toBe(false)
    expect(events.length).toBe(1)
    expect(events[0].sound).toBe('kill.wav')
    expect(s.health).toBe(87)
  })
})

describe('住院（health<85 && timeLeft>3；delay_day=1+randInt(2)；load=delay_day*(1000+randInt(8500))）', () => {
  it('强制住院：债务 +=load、健康+10、timeLeft-=delay_day、住院早退不做死亡判断', () => {
    const s = defaultState({ debt: 2000, health: 50, timeLeft: 10, loc: 3 })
    // rnd 恒 0.001：10 次 randInt(1000)=1 全 miss；randInt(2)=0 → delay=1；
    // randInt(8500)=8 → load=1008；randInt(29)=0 → coffee=发廊里
    const { events, dead } = runHealthEvent(s, stub([0.001]))
    expect(dead).toBe(false)
    expect(s.debt).toBe(2000 + 1008)
    expect(s.health).toBe(60) // 50+10
    expect(s.timeLeft).toBe(9) // 10-1
    const txt = events[events.length - 1].text
    expect(txt).toContain('西直门') // LOC_NAMES[2]
    expect(txt).toContain('发廊里') // COFFEE[0]
  })
})

describe('抢钱事件（命中 RandomNum(1000)；现金整型除法）', () => {
  it('事件0（ratoi10）：cash=floor((cash/100)*(100-10))', () => {
    const s = defaultState({ cash: 1000 })
    const events = runStealEvent(s, stub([rv(1000, 60)])) // randInt(1000)=60 → 60%60=0 命中
    expect(events.length).toBe(1)
    expect(s.cash).toBe(Math.floor((1000 / 100) * 90)) // 900
  })
})

describe('欠债>10万：健康-30', () => {
  it('debt>100000 → 健康-30 且产生事件', () => {
    const s = defaultState({ debt: 120000, health: 100 })
    const events = runDebtPenalty(s)
    expect(events.length).toBe(1)
    expect(events[0].sound).toBe('kill.wav')
    expect(s.health).toBe(70)
  })
  it('debt<=100000 → 无事', () => {
    const s = defaultState({ debt: 100000, health: 100 })
    expect(runDebtPenalty(s).length).toBe(0)
    expect(s.health).toBe(100)
  })
})

describe('末日出清：按当前黑市价自动卖出', () => {
  it('持仓2件货物，按当前价卖出进现金', () => {
    const s = defaultState({ cash: 0, prices: [10, 20, 30, 40, 50, 60, 70, 80] })
    s.holdings[0] = 3
    s.holdings[1] = 2
    s.total = 5
    const events = runEndOfGame(s)
    expect(events.some((e) => e.text.includes('系统替我卖了剩余货物'))).toBe(true)
    expect(s.cash).toBe(3 * 10 + 2 * 20) // 70
    expect(s.total).toBe(0)
    expect(s.over).toBe(true)
  })
})

describe('结算分数 = cash+bank-debt', () => {
  it('正确求和', () => {
    const s = defaultState({ cash: 1000, bank: 100, debt: 500 })
    expect(getScore(s)).toBe(600)
  })
})
