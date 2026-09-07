// 三套事件表 + 住院地点/场景文本。
// 全部逐字来自 reference/SelectionDlg.cpp（gameMessages / random_event / random_steal_event / loc / coffee）。

export interface CommercialEvent {
  freq: number
  msg: string
  drug: number
  plus: number
  minus: number
  add: number
}

// 商业事件（DoRandomStuff）：命中条件 RandomNum(950) % freq == 0，命中不 break；price==0 跳过。
export const COMMERCIAL_EVENTS: CommercialEvent[] = [
  { freq: 170, msg: '专家提议提高大学生“动手素质”，进口玩具颇受欢迎!', drug: 5, plus: 2, minus: 0, add: 0 },
  { freq: 139, msg: '有人自豪地说：生病不用打针吃药，喝假白酒（剧毒）就可以!', drug: 3, plus: 3, minus: 0, add: 0 },
  { freq: 100, msg: '医院的秘密报告：“《上海小宝贝》功效甚过伟哥”!', drug: 4, plus: 5, minus: 0, add: 0 },
  { freq: 41, msg: '文盲说：“2000年诺贝尔文学奖？呸！不如盗版VCD港台片。”', drug: 2, plus: 4, minus: 0, add: 0 },
  { freq: 37, msg: '《北京经济小报》社论：“走私汽车大力推进汽车消费!”', drug: 1, plus: 3, minus: 0, add: 0 },
  { freq: 23, msg: '《北京真理报》社论：“提倡爱美，落到实处”，伪劣化妆品大受欢迎!', drug: 7, plus: 4, minus: 0, add: 0 },
  { freq: 37, msg: '8858.com电子书店也不敢卖《上海小宝贝》，黑市一册可卖天价!', drug: 4, plus: 8, minus: 0, add: 0 },
  { freq: 15, msg: '谢不疯在晚会上说：“我酷!我使用伪劣化妆品!”，伪劣化妆品供不应求!', drug: 7, plus: 7, minus: 0, add: 0 },
  { freq: 40, msg: '北京有人狂饮山西假酒，可以卖出天价!', drug: 3, plus: 7, minus: 0, add: 0 },
  { freq: 29, msg: '北京的大学生们开始找工作，水货手机大受欢迎！!', drug: 6, plus: 7, minus: 0, add: 0 },
  { freq: 35, msg: '北京的富人疯狂地购买走私汽车！价格狂升!', drug: 1, plus: 8, minus: 0, add: 0 },
  { freq: 17, msg: '市场上充斥着来自福建的走私香烟!', drug: 0, plus: 0, minus: 8, add: 0 },
  { freq: 24, msg: '北京的孩子们都忙于上网学习，进口玩具没人愿意买。', drug: 5, plus: 0, minus: 5, add: 0 },
  { freq: 18, msg: '盗版业十分兴旺，“中国硅谷”——中关村全是卖盗版VCD的村姑!', drug: 2, plus: 0, minus: 8, add: 0 },
  { freq: 160, msg: '厦门的老同学资助俺两部走私汽车！发了！！', drug: 1, plus: 0, minus: 0, add: 2 },
  { freq: 45, msg: '工商局扫荡后，俺在黑暗角落里发现了老乡丢失的进口香烟。', drug: 0, plus: 0, minus: 0, add: 6 },
  { freq: 35, msg: '俺老乡回家前把一些山西假白酒（剧毒）给俺!', drug: 3, plus: 0, minus: 0, add: 4 },
  { freq: 140, msg: '媒体报道：又有日本出口到中国的产品出事了! 出事后日本人死不认帐,拒绝赔偿。村长得知此消息，托人把他用的水货手机（无任何厂商标识）硬卖给您，收您2500元。', drug: 6, plus: 0, minus: 0, add: 1 },
]

export interface HealthEvent {
  freq: number
  msg: string
  hunt: number
  sound: string
}

// 健康事件（DoRandomEvent）：命中条件 RandomNum(1000) % freq == 0，命中即 break。
export const HEALTH_EVENTS: HealthEvent[] = [
  { freq: 117, msg: '大街上两个流氓打了俺!', hunt: 3, sound: 'kill.wav' },
  { freq: 157, msg: '俺在过街地道被人打了蒙棍! ', hunt: 20, sound: 'death.wav' },
  { freq: 21, msg: '工商局的追俺超过三个胡同。 ', hunt: 1, sound: 'dog.wav' },
  { freq: 100, msg: '北京拥挤的交通让俺心焦! ', hunt: 1, sound: 'harley.wav' },
  { freq: 35, msg: '开小巴的打俺一耳光!', hunt: 1, sound: 'hit.wav' },
  { freq: 313, msg: '一群民工打了俺!', hunt: 10, sound: 'flee.wav' },
  { freq: 120, msg: '附近胡同的一个小青年砸俺一砖头!', hunt: 5, sound: 'death.wav' },
  { freq: 29, msg: '附近写字楼一个假保安用电棍电击俺!', hunt: 3, sound: 'el.wav' },
  { freq: 43, msg: '北京臭黑的小河熏着我了! ', hunt: 1, sound: 'vomit.wav' },
  { freq: 45, msg: '守自行车的王大婶嘲笑俺没北京户口!', hunt: 1, sound: 'level.wav' },
  { freq: 48, msg: '北京高温40度!俺热...', hunt: 1, sound: 'lan.wav' },
  { freq: 33, msg: '申奥添了新风景，北京又来沙尘暴!', hunt: 1, sound: 'breath.wav' },
]

export interface StealEvent {
  freq: number
  msg: string
  ratoi: number
}

// 抢钱事件（OnSteal）：命中条件 RandomNum(1000) % freq == 0，命中即 break。
export const STEAL_EVENTS: StealEvent[] = [
  { freq: 60, msg: '俺怜悯地铁口扮演成乞丐的老太太。', ratoi: 10 },
  { freq: 125, msg: '一个汉子在街头拦住俺：“哥们，给点钱用!”。', ratoi: 10 },
  { freq: 100, msg: '一个大个子碰了俺一下，说：“别挤了!”。', ratoi: 40 },
  { freq: 65, msg: '三个带红袖章的老太太揪住俺：“你是外地人?罚款!”', ratoi: 20 },
  { freq: 35, msg: '两个猛男揪住俺：“交长话附加费、上网费。”', ratoi: 15 },
  { freq: 27, msg: '副主任说：“办经商证?晚上不要去我家给我送钱哦。”', ratoi: 10 },
  { freq: 40, msg: '北京空气污染得厉害,俺去氧吧吸氧...', ratoi: 5 },
]

// 住院地点名（loc[21]，索引 = 10*(m_City-1)+m_MyCurrentLoc-1）
export const LOC_NAMES: string[] = [
  '建国门', '北京站', '西直门', '崇文门', '东直门', '复兴门', '积水潭', '长椿街', '公主坟', '苹果园',
  '永安里', '方 庄', '海淀大街', '永定门', '三元东桥', '文津街', '北辰西路', '菜户营', '翠微路', '八角地铁',
  '',
]

// 住院具体场景（coffee[30]）
export const COFFEE: string[] = [
  '发廊里', '早点摊上', '报摊上', '烤羊肉摊上', '公共汽车里', '人力车上', '女厕所里',
  '男厕所里', '电话亭里', '三陪女怀里', '出租车里', '小巴里', '美容院里',
  '小商亭里', '小商场门口', '民工脚下', '无照游商摊里', '草地上', '电线杆顶端',
  '小饭馆里', '马路边', '人行道上', '街心公园里', '广告牌下', '公共汽车站里',
  '长途汽车站里', '卖盗版游戏的旁边', '网络公司尸体旁边', '行骗的知本家旁边', '',
]
