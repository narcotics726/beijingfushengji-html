// 可播种 RNG。默认用 Date.now() 播种；测试/调试可固定种子以获得确定性序列。
// 返回 [0,1) 均匀分布：randInt(n) = floor(next()*n) 等价原版 rand()%n（0..n-1 均匀）。
// 采用 mulberry32（小而稳，无需外部依赖）。额外暴露 getState/setState 以便存档续玩。

export type Random = () => number // 返回 [0,1)

export interface SeedableRandom extends Random {
  getState(): number // 当前 mulberry32 内部种子（存盘用）
  setState(a: number): void // 恢复内部种子（续玩用）
}

export function createRng(seed?: number): SeedableRandom {
  let a = (seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0

  const next: Random = function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // 把状态读写挂到生成器上（Random 是函数，可直接挂属性）
  ;(next as SeedableRandom).getState = () => a
  ;(next as SeedableRandom).setState = (v: number) => {
    a = v >>> 0
  }
  return next as SeedableRandom
}

// 等价原版 RandomNum(upper)：0..upper-1
export function randInt(upper: number, rnd: Random): number {
  return Math.floor(rnd() * upper)
}
