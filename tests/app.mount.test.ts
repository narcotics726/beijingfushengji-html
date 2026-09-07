// @vitest-environment jsdom
// App 客户端挂载冒烟：在 jsdom 里真实 mount，验证主界面渲染 + 打开地点弹窗 + 点地点推进回合。
// 这能捕获 SSR 测不到的服务端/客户端运行期错误。
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, tick } from 'svelte'
import App from '../src/App.svelte'

const LOC_NAMES = ['建国门', '北京站', '西直门', '崇文门', '东直门', '复兴门', '积水潭', '长椿街', '公主坟', '苹果园']

describe('App 客户端挂载（jsdom）', () => {
  beforeEach(() => {
    try {
      localStorage.clear()
    } catch {
      /* 忽略 */
    }
  })

  it('挂载后主界面渲染 + 打开地点弹窗 + 点地点推进回合', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mount(App as never, { target })

    expect(target.innerHTML).toContain('北京浮生')
    expect(target.querySelectorAll('input[type="range"]').length).toBeGreaterThan(0)

    const locBtn = Array.from(target.querySelectorAll('button')).find((b) => b.textContent === '去别处…')
    expect(locBtn).toBeTruthy()
    ;(locBtn as HTMLButtonElement).click()
    await tick()

    // 地点弹窗里应有 10 个地点按钮
    const locButtons = Array.from(target.querySelectorAll('button')).filter((b) =>
      LOC_NAMES.includes(b.textContent ?? ''),
    )
    expect(locButtons.length).toBe(10)

    // 点「建国门」→ 移动过天 → 位置条显示当前位置
    const jgm = locButtons.find((b) => b.textContent === '建国门') as HTMLButtonElement
    jgm.click()
    await tick()
    expect(target.innerHTML).toContain('📍 建国门')

    // 等动态音效 import 落地（jsdom 无 Audio，被 sound.ts 的 try/catch 吞掉，不应抛错）
    await new Promise((r) => setTimeout(r, 20))
  })
})
