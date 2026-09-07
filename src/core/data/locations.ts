// 10 个地铁口地点（北京，m_MyCurrentLoc 用 1..10）。
// 索引与名称逐字来自 reference/SelectionDlg.cpp 各 OnLoc* 处理器：
//   1 建国门 2 北京站 3 西直门 4 崇文门 5 东直门 6 复兴门 7 积水潭 8 长椿街 9 公主坟 10 苹果园
export interface Location {
  id: number
  name: string
  key: string // 与源码 IDC_LOC_* 对应的英文键，供 UI 布局复用
}

export const LOCATIONS: Location[] = [
  { id: 1, name: '建国门', key: 'XIZHIMEN_GUOMEN' },
  { id: 2, name: '北京站', key: 'BEIJINGZHAN' },
  { id: 3, name: '西直门', key: 'XIZHIMEN' },
  { id: 4, name: '崇文门', key: 'CHONGWENMEN' },
  { id: 5, name: '东直门', key: 'DONGZHIMEN' },
  { id: 6, name: '复兴门', key: 'FUXINGMEN' },
  { id: 7, name: '积水潭', key: 'JISHUITAN' },
  { id: 8, name: '长椿街', key: 'CHANGCHUNJIE' },
  { id: 9, name: '公主坟', key: 'GONGZHUFEN' },
  { id: 10, name: '苹果园', key: 'PINGGUOYUAN' },
]

export const LOCATION_NONE = -1
