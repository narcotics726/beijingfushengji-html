// App 主界面 SSR 冒烟：验证组件能真实 render，界面文案/区块存在（不依赖浏览器）。
import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import App from '../src/App.svelte'

describe('App 主界面', () => {
  it('能渲染出主界面关键区块（M2 单列结构）', () => {
    const { html } = render(App as never)
    // 顶部标题(含天数) + 状态条
    expect(html).toContain('北京浮生')
    expect(html).toMatch(/北京浮生\(\d+\/40天\)/)
    // 交易区上下分区（黑市买上 / 出租屋卖下）
    expect(html).toContain('地铁口黑市')
    expect(html).toContain('您在海淀的出租屋')
    // 位置条(去别处) + 子系统平铺
    expect(html).toContain('去别处')
    expect(html).toContain('银行')
    expect(html).toContain('排行榜')
    // 数量滑杆 + 底部 Ticker
    expect(html).toContain('type="range"')
    expect(html).toContain('ticker-track')
  })
})
