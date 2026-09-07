// 皮肤定义：默认 retro。换肤 = 换这套 skin 元数据 + 对应 theme.css。core 不动。
export interface Skin {
  id: string
  name: string
  bg: string // 背景图相对路径（相对页面根，file:// 可加载）
  tickerColor: string
}

const theme: Skin = {
  id: 'retro',
  name: 'retro',
  bg: 'assets/img/game-backg.png',
  tickerColor: 'rgb(255, 212, 0)',
}

export default theme
