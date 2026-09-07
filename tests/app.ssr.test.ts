// App 主界面 SSR 冒烟：验证组件能真实 render，界面文案/区块存在（不依赖浏览器）。
import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import App from '../src/App.svelte'

describe('App 主界面', () => {
  it('能渲染出主界面关键区块', () => {
    const { html } = render(App as never)
    expect(html).toContain('北京浮生')
    expect(html).toContain('地铁口黑市')
    expect(html).toContain('北京地图')
    expect(html).toContain('我的状态')
  })
})
