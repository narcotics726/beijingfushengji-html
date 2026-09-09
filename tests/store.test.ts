// UI store 接线冒烟：在 Node 中驱动完整一局，验证 core/actions/storage 经 store 调用无运行时错。
// sound.ts 只在声音开启时动态 import；测试里关掉声音以规避 import.meta.glob/Audio。
import { describe, it, expect } from 'vitest'
import { get } from 'svelte/store'
import {
  startNewGame,
  moveToLoc,
  moveElsewhere,
  buyAction,
  sellAction,
  bankDepositAction,
  bankWithdrawAction,
  hospitalAction,
  rentAction,
  wangbaAction,
  postOfficeAction,
  airportAction,
  updateSettings,
  events,
  endResult,
  game,
} from '../src/ui/game'

describe('UI store（core 接线）', () => {
  it('开新局 → 走满 40 回合 → 结算进榜，全程不抛错', () => {
    updateSettings({ sound: false })
    startNewGame()

    let guard = 0
    while (guard < 120) {
      const s = get(game)
      if (s.over) break
      // 在地点 1..10 间循环移动
      const next = s.loc <= 0 ? 1 : s.loc >= 10 ? 1 : s.loc + 1
      moveToLoc(next)
      // 顺手走几个子系统 + 买卖
      buyAction(0, 1)
      sellAction(0, 1)
      bankDepositAction(10)
      bankWithdrawAction(5)
      hospitalAction(1)
      rentAction()
      wangbaAction()
      postOfficeAction()
      airportAction()
      guard++
    }

    const er = get(endResult)
    expect(get(game).over).toBe(true)
    expect(er).not.toBeNull()
    expect(er!.top10.length).toBe(10)
    expect(Array.isArray(get(events))).toBe(true)
  })

  // 「去别处」= 随机换一个别的地点并过天（不再弹地图选点）
  it('moveElsewhere：每次换到不同地点且推进 1 天', () => {
    updateSettings({ sound: false })
    startNewGame()
    for (let i = 0; i < 20; i++) {
      const before = get(game)
      if (before.over) break
      moveElsewhere()
      const after = get(game)
      expect(after.loc).not.toBe(before.loc) // 必定换地点（否则 moveTo 不推进）
      expect(after.loc).toBeGreaterThanOrEqual(1)
      expect(after.loc).toBeLessThanOrEqual(10)
      if (after.over) break // 死亡分支提前 return，不扣天（源码语义）
      // 必定过天（强制住院可额外扣 1..2 天，故只断言「推进了」）
      expect(after.timeLeft).toBeLessThan(before.timeLeft)
      expect(before.timeLeft - after.timeLeft).toBeLessThanOrEqual(3)
    }
  })
})
