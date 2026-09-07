import { describe, it, expect } from 'vitest'
import { createRng } from '../src/core/rng'

describe('RNG 可存档（getState/setState 续玩随机序列）', () => {
  it('存下内部状态后可无缝续玩（序列接上，非重头）', () => {
    const r1 = createRng(7)
    r1()
    r1() // 消耗两次
    const st = r1.getState()

    const r2 = createRng(12345) // 任意新种子
    r2.setState(st)
    // r2 应从 r1 中断处继续：下一次输出等于 r1 的下一次输出
    expect(r2()).toBe(r1())
    expect(r2()).toBe(r1())
  })

  it('不同种子给出不同序列', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect(a()).not.toBe(b())
  })
})
