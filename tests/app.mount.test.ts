// @vitest-environment jsdom
// App 客户端挂载冒烟：在 jsdom 里真实 mount，验证主界面渲染、
// 「去别处」直接过天（随机换地点，不再弹地图）、银行弹窗（大按钮 + 右上角 ✕）、
// 金额弹窗点击数字直接编辑（滑杆与数字分置两行）、子系统区按钮清单。
// 这能捕获 SSR 测不到的服务端/客户端运行期错误。
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, tick } from 'svelte'
import App from '../src/App.svelte'

const LOC_NAMES = ['建国门', '北京站', '西直门', '崇文门', '东直门', '复兴门', '积水潭', '长椿街', '公主坟', '苹果园']

function dayOf(html: string): number {
  return Number(/北京浮生\((\d+)\/40天\)/.exec(html)?.[1] ?? -1)
}
function locOf(html: string): string | undefined {
  return LOC_NAMES.find((n) => html.includes(`📍 ${n}`))
}
function button(root: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) as HTMLButtonElement
}
function boxWith(root: HTMLElement, text: string): HTMLElement {
  return Array.from(root.querySelectorAll('.box')).find((b) => b.textContent?.includes(text)) as HTMLElement
}

describe('App 客户端挂载（jsdom）', () => {
  beforeEach(() => {
    try {
      localStorage.clear()
    } catch {
      /* 忽略 */
    }
  })

  it('挂载后主界面渲染 + 「去别处」直接过天并换到随机地点（无地图弹窗）', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mount(App as never, { target })

    expect(target.innerHTML).toContain('北京浮生')
    expect(target.querySelectorAll('input[type="range"]').length).toBeGreaterThan(0)

    const day0 = dayOf(target.innerHTML)
    expect(locOf(target.innerHTML)).toBeUndefined() // 开局不在任何地点（loc = -1）

    const locBtn = button(target, '去别处')
    expect(locBtn).toBeTruthy()
    locBtn.click()
    await tick()

    // 不再有地图弹窗；直接过天：天数推进，位置变为某个具体地点
    expect(target.innerHTML).not.toContain('北京地图')
    const day1 = dayOf(target.innerHTML)
    expect(day1).toBeGreaterThan(day0) // 强制住院可能额外扣天，故不写死 +1
    const loc1 = locOf(target.innerHTML)
    expect(loc1).toBeTruthy()

    // 再点一次必须换到别的地点（保持 moveTo「同地点不推进」语义）
    button(target, '去别处').click()
    await tick()
    expect(dayOf(target.innerHTML)).toBeGreaterThan(day1)
    expect(locOf(target.innerHTML)).not.toBe(loc1)

    // 等动态音效 import 落地（jsdom 无 Audio，被 sound.ts 的 try/catch 吞掉，不应抛错）
    await new Promise((r) => setTimeout(r, 20))
  })

  it('银行弹窗：存/取按钮放大、无「关闭」按钮、右上角 ✕ 关闭；金额可点击直接输入', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mount(App as never, { target })

    button(target, '银行').click()
    await tick()

    const bank = boxWith(target, '客户您好')
    expect(bank).toBeTruthy()
    expect(button(bank, '存款')).toBeTruthy()
    expect(button(bank, '取款')).toBeTruthy()
    expect(button(bank, '关闭')).toBeUndefined()
    const x = bank.querySelector('.box-x') as HTMLButtonElement
    expect(x).toBeTruthy()

    // 点「存款」→ 金额弹窗，数字为可点击按钮，滑杆上限 = 现金
    button(bank, '存款').click()
    await tick()
    const dlg = boxWith(target, '您存多少钱?')
    expect(dlg).toBeTruthy()
    const range = dlg.querySelector('input[type="range"]') as HTMLInputElement
    const qty = dlg.querySelector('.qty') as HTMLButtonElement
    expect(qty).toBeTruthy()
    // 滑杆与数字输入分置两行：滑杆是第一行，数字在独占的第二行（.num-row）
    const sliderRow = dlg.querySelector('.slider-row') as HTMLElement
    expect(sliderRow.querySelector(':scope > input[type="range"]')).toBe(range)
    const numRow = sliderRow.querySelector(':scope > .num-row') as HTMLElement
    expect(numRow).toBeTruthy()
    expect(numRow.contains(range)).toBe(false)
    expect(numRow.contains(qty)).toBe(true)
    const max = Number(range.max)
    expect(max).toBeGreaterThan(0)
    expect(Number(qty.textContent)).toBe(max) // 默认 = 最大（原行为）

    // 点数字 → 变输入框并聚焦；输入与滑杆双向同步
    qty.click()
    await tick()
    const inp = dlg.querySelector('.qty-input') as HTMLInputElement
    expect(inp).toBeTruthy()
    expect(document.activeElement).toBe(inp)
    inp.value = '123'
    inp.dispatchEvent(new Event('input', { bubbles: true }))
    await tick()
    expect(Number(range.value)).toBe(123)

    // 超出上限 → 提交时夹到 max
    inp.value = '99999999'
    inp.dispatchEvent(new Event('input', { bubbles: true }))
    inp.dispatchEvent(new Event('blur'))
    await tick()
    expect(Number(range.value)).toBe(max)
    expect(Number((dlg.querySelector('.qty') as HTMLButtonElement).textContent)).toBe(max)

    // ✕ 关闭银行弹窗
    x.click()
    await tick()
    expect(boxWith(target, '客户您好')).toBeUndefined()

    await new Promise((r) => setTimeout(r, 20))
  })

  it('子系统区已移除「机场 / 老板 / 离开」按钮', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mount(App as never, { target })
    await tick()

    const grid = target.querySelector('.subsys-grid') as HTMLElement
    expect(grid).toBeTruthy()
    expect(Array.from(grid.querySelectorAll('button')).map((b) => b.textContent?.trim())).toEqual([
      '银行',
      '医院',
      '邮局',
      '租房',
      '网吧',
      '排行榜',
    ])
    expect(button(target, '机场')).toBeUndefined()
    expect(button(target, '老板')).toBeUndefined()
    expect(button(target, '离开')).toBeUndefined()
    expect(target.querySelector('.boss-veil')).toBeNull()
  })
})
