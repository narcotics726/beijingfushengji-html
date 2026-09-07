import { mount } from 'svelte'
import './ui/skins/retro/theme.css' // 全局引入 retro 皮肤（换肤 = 换这一行/这份 css）
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
