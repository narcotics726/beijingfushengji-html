// 8 种货物（顺序即 makeDrugPrices 中 price[] 的 index）。
// 数值逐字来自 reference/SelectionDlg.cpp makeDrugPrices：
//   price[i] = base + RandomNum(range)
export interface Good {
  id: number
  name: string
  base: number
  range: number
}

export const GOODS: Good[] = [
  { id: 0, name: '进口香烟', base: 100, range: 350 },
  { id: 1, name: '走私汽车', base: 15000, range: 15000 },
  { id: 2, name: '盗版VCD、游戏', base: 5, range: 50 },
  { id: 3, name: '假白酒（剧毒！）', base: 1000, range: 2500 },
  { id: 4, name: '《上海小宝贝》（禁书）', base: 5000, range: 9000 },
  { id: 5, name: '进口玩具', base: 250, range: 600 },
  { id: 6, name: '水货手机', base: 750, range: 750 },
  { id: 7, name: '伪劣化妆品', base: 65, range: 180 },
]

export const GOODS_COUNT = GOODS.length
