# 北京浮生记 · 静态网页版 · 实施计划（修订版）

> 目标：把 `chrisguo/beijing_fushengji`（北京浮生记 v1.2.2，C++/MFC 单机游戏）复刻成**纯静态、自包含、单文件的网页版**。
>
> 复刻原则（正式决定）：**行为 1:1**（规则/数值/事件/文本/同一随机流下可复现演化）——技术栈换成 Web 是必然，系统**架构不必复刻** MFC 原代码；但 **UI 层为移动可用性而优化**，不因复刻牺牲易用性（保留复古风格 + 针对手机做 UI/操控优化）。
>
> 本文件是**实施参考**，规则部分以 `reference/` 下原版源码为准（条文已逐条与源码核对）。

---

## 0. 项目契约（正式决定，随讨论持续修订）

| # | 项 | 决定 |
|---|---|---|
| ① | 行为契约 | 1:1（规则/数值/事件/文本/同一随机流可复现演化） |
| ② | 技术栈 | Svelte + Vite；**core 框架无关**（纯 TS/JS，可在 Node 跑测试）；**单文件自包含构建**（`index.html` 内联 JS/CSS，图片/音频/文本走相对路径） |
| ③ | 架构 | **core 规则引擎 + ui 表现层**；ui 为**可换肤 skin**（默认 `retro`）；core **数据驱动 + 带 hook**（为未来换肤/扩展玩法预留） |
| ④ | 外观 | 行为 1:1 + **复古质感观感一致**（Win2000/LED/背景图氛围用 CSS 还原，不逐像素仿 chrome） |
| ⑤ | UI 目标 | core 行为 1:1；UI 保留复古风格 + **移动 UI/操控优化**（移动皮肤变体，不牺牲易用性） |
| ⑥ | 验证 | **可播种 RNG**（默认 `Date.now()`，支持固定种子/调试）+ **oracle 测试套件**（同一随机流对照原版 C++ 公式做断言） |
| ⑦ | 交付 | **自包含单文件**，单文件分发确定；部署方案后定（暂用 Cloudflare Pages 临时跑；国内免备案目标 = CloudBase 静态托管 / EdgeOne Pages） |
| ⑧ | 范围 | **核心优先**：做核心玩法闭环 + 主机制 + 最高分/设置；**推迟/可砍**上海模式、纯文案展示框 |

> 备注：engram 项目 `beijing_fushengji_html` 已建档，决策可回溯。本 PLAN 第 17 行的旧源码路径已废弃——**实际源码在 `reference/`**。

---

## 1. 授权与合规

- 原仓库协议：**GPL v2**（`reference/license.txt`），作者郭祥昊。
- 本衍生版**以 GPL v2 发布**，保留版权与开源义务，在页面/仓库注明来源与许可证。
- 素材（位图/图标/音效/文本）随原仓库同以 GPL v2 授权，可复用。

## 2. 源码与素材位置（更新）

- 原版 C++ 源码 + 全部素材已迁入本仓库 **`reference/`**（已去掉嵌套 `.git`）。**新增 `.gitignore` 忽略 `reference/` 等**，仅作开发参考。
- 素材核对（与原 `.rc`/代码一一对应）：

| 类别 | 位置 | 备注 |
|---|---|---|
| 图像 | `reference/res/*.bmp`、`res/*.jpg`、`res/*.ico`、根目录 `backblue.gif` `email.bmp` `news.bmp` `riji.bmp` `old-cover.bmp` | 全部在场 |
| 音效 | `reference/sound/`（42 个 wav） | 注意 `airport.wav` 实为 `Airport.wav`（Windows 大小写不敏感），Web 复制时存为 `airport.wav` |
| 文本 | `reference/Tips.txt`、`News.txt`、`Ticker.txt` | 均 **GBK**，需转 UTF-8 |
| 帮助 | `reference/oldhelp`（HTML，`backblue.gif` 背景） | 转 `help.html`；`helpinfo` 为不可读二进制块，忽略 |
| 无关 | `sound/sound.cfg`（Angband 模板）、`Thumbs.db` | 忽略 |

## 3. 游戏规则精确说明（行为 1:1 的契约，已逐条核对）

### 3.1 状态变量

| 变量 | 初始 | 说明 |
|---|---|---|
| 现金 `MyCash` | 2000 | |
| 欠债 `MyDebt` | 5000 | |
| 存款 `MyBank` | 0 | |
| 携带量 `myTotal` | 0 | 当前占用仓位 |
| 仓容 `myCoat` | 100 | 房屋可容纳总量（可租房扩容） |
| 健康 `m_nMyHealth` | 100 | |
| 名声 `m_MyFame` | 100 | |
| 网吧次数 `m_nVisitWangba` | 0 | 防刷网吧 |
| 剩余回合 `m_nTimeLeft` | 40 | |
| 当前地点 `m_MyCurrentLoc` | -1 | 10 地点，用 1..10 |
| 城市 `m_City` | 1=北京 | 2=上海（**范围=推迟 M3**） |

可选项（设置对话框）：`m_bCloseSound`（声音开关）、`m_bHackActs`（是否允许黑客事件）。

### 3.2 货物与黑市价格（`makeDrugPrices`）

```text
index  名称                基础价 + Random(区间)
0      进口香烟             100  + rand(350)
1      走私汽车             15000+ rand(15000)
2      盗版VCD、游戏         5   + rand(50)
3      假白酒（剧毒！）      1000 + rand(2500)
4      《上海小宝贝》（禁书） 5000 + rand(9000)
5      进口玩具             250  + rand(600)
6      水货手机             750  + rand(750)
7      伪劣化妆品           65   + rand(180)
```

- `makeDrugPrices(leaveout)`：先生成 8 个价格，再 **`for(i=0;i<leaveout;i++)` 循环 `leaveout` 次，每次 `j=RandomNum(8); price[j]=0`**。注意：**允许重复置 0**，故 `leaveout=3` 时当天实际可能只剩 ≥5 种货物（重复命中导致置 0 数 <3）。初始化用 `makeDrugPrices(3)`；剩余回合 ≤2 用 `makeDrugPrices(0)`（强制全部出现）。
- 价格为 0 的货物不显示在黑市列表中；商业事件命中 `price==0` 的货物会跳过。
- **oracle 要点**：严格按「循环 leaveout 次、允许重复」实现，不要做成「置 0 恰好 leaveout 个不同商品」。

### 3.3 每次移动（到新地点）触发 `HandleNormalEvents()` —— 顺序固定

1. `makeDrugPrices`（`m_nTimeLeft<=2` → leaveout=0，否则 leaveout=3）
2. `HandleCashAndDebt()`：`MyDebt += floor(MyDebt*0.10)`；`MyBank += floor(MyBank*0.01)`
3. `DoRandomStuff()`：18 个**商业**事件（见 3.4）
4. `DisplayDrugs()`：刷新黑市列表
5. `DoRandomEvent()`：**健康**事件 + 健康分支（见 3.5）
6. `OnSteal()`：7 个**抢钱**事件 + 黑客事件（见 3.6）
7. 若 `MyDebt > 100000`：被村长揍，健康 −30，播 `sound\kill.wav`
8. `m_nTimeLeft--`
9. 若 `m_nTimeLeft == 1`：提示「明天回家乡，快把全部货物卖掉」
10. 若 `m_nTimeLeft == 0`：末日出清——未卖货物按当前黑市价自动卖出，弹总账，`OnExit()`（最高分判定）

> 注：玩家「换到某地点」才算移动；在同一地点反复买卖/去银行/医院/邮局等**不消耗回合**。

### 3.4 商业事件 `gameMessages[18]`（`DoRandomStuff`，freq=触发权重）

规则：遍历 18 条，若 **`RandomNum(950) % freq == 0`** 则命中（**注意是 950，非 1000**）；命中后：
- 若 `price[drug]==0`（当天不出现）→ `continue` 跳过
- 若 `plus>0`：`price[drug] *= plus`
- 若 `minus>0`：`price[drug] = floor(price[drug] / minus)`（**整型除法**）
- 若 `add>0`：送礼（受仓容 `myCoat` 限制；不足则提示「可惜!俺租的房子太小，只能放…」并 `return`）
- 第 18 条（index 17）：额外 `MyDebt += 2500`
- **命中不 break**（可一条移动触发多条商业事件）

完整 18 条数据（见 `reference/SelectionDlg.cpp`）：

```text
{170,"专家提议提高大学生“动手素质”，进口玩具颇受欢迎!",5,2,0,0}
{139,"有人自豪地说：生病不用打针吃药，喝假白酒（剧毒）就可以!",3,3,0,0}
{100,"医院的秘密报告：“《上海小宝贝》功效甚过伟哥”!",4,5,0,0}
{41, "文盲说：“2000年诺贝尔文学奖？呸！不如盗版VCD港台片。”",2,4,0,0}
{37, "《北京经济小报》社论：“走私汽车大力推进汽车消费!”",1,3,0,0}
{23, "《北京真理报》社论：“提倡爱美，落到实处”，伪劣化妆品大受欢迎!",7,4,0,0}
{37, "8858.com电子书店也不敢卖《上海小宝贝》，黑市一册可卖天价!",4,8,0,0}
{15, "谢不疯在晚会上说：“我酷!我使用伪劣化妆品!”，伪劣化妆品供不应求!",7,7,0,0}
{40, "北京有人狂饮山西假酒，可以卖出天价!",3,7,0,0}
{29, "北京的大学生们开始找工作，水货手机大受欢迎！!",6,7,0,0}
{35, "北京的富人疯狂地购买走私汽车！价格狂升!",1,8,0,0}
{17, "市场上充斥着来自福建的走私香烟!",0,0,8,0}
{24, "北京的孩子们都忙于上网学习，进口玩具没人愿意买。",5,0,5,0}
{18, "盗版业十分兴旺，“中国硅谷”——中关村全是卖盗版VCD的村姑!",2,0,8,0}
{160,"厦门的老同学资助俺两部走私汽车！发了！！",1,0,0,2}
{45, "工商局扫荡后，俺在黑暗角落里发现了老乡丢失的进口香烟。",0,0,0,6}
{35, "俺老乡回家前把一些山西假白酒（剧毒）给俺!",3,0,0,4}
{140,"媒体报道：又有日本出口到中国的产品出事了! 出事后日本人死不认帐,拒绝赔偿。村长得知此消息，托人把他用的水货手机（无任何厂商标识）硬卖给您，收您2500元。",6,0,0,1}
```

### 3.5 健康事件 `random_event[12]`（`DoRandomEvent`）

规则：遍历 12 条，若 **`RandomNum(1000) % freq == 0`** 命中；命中后扣 `hunt` 健康、播 `sound\xxx.wav`，**命中即 break**（一次只触发一个）：

```text
{freq, "消息", hunt, "sound"}
{117,"大街上两个流氓打了俺!",3,"kill.wav"}
{157,"俺在过街地道被人打了蒙棍! ",20,"death.wav"}
{21, "工商局的追俺超过三个胡同。 ",1,"dog.wav"}
{100,"北京拥挤的交通让俺心焦! ",1,"harley.wav"}
{35, "开小巴的打俺一耳光!",1,"hit.wav"}
{313,"一群民工打了俺!", 10,"flee.wav"}
{120,"附近胡同的一个小青年砸俺一砖头!", 5,"death.wav"}
{29, "附近写字楼一个假保安用电棍电击俺!",3,"el.wav"}
{43, "北京臭黑的小河熏着我了! ",1,"vomit.wav"}
{45, "守自行车的王大婶嘲笑俺没北京户口!",1,"level.wav"}
{48, "北京高温40度!俺热...",1,"lan.wav"}
{33, "申奥添了新风景，北京又来沙尘暴!",1,"breath.wav"}
```

健康分支（**按此优先级**，在事件判定之后）：

- `健康<85 && 剩余回合>3`：**强制住院**——`delay_day=1+RandomNum(2)` 天；`load=delay_day*(1000+RandomNum(8500))` 元垫付（**加进欠债**）；健康 +10（上限 100）；`m_nTimeLeft -= delay_day`。地点/场景文本从 `loc[21]` 与 `coffee[30]` 随机拼接。**此分支 `return`，不再做下两档判断。**
- `健康<20 && 健康>0`：弹「健康危机」警告，不扣回合。
- `健康<0`：**死亡**，播 `death.wav`，弹「俺倒在街头,身边日记本上写着："北京，我将再来!"」，退出。

> **oracle 要点**：住院的 `delay_day` 是在**本次移动的 `timeLeft--` 之前**扣除的（`DoRandomEvent` 在 `HandleNormalEvents` 的 `timeLeft--` 之前执行），故该次移动总消耗 = `1 + delay_day` 回合；且判断用的是「本次移动开始前的 timeLeft」(`>3`)。

### 3.6 抢钱事件 `random_steal_event[7]`（`OnSteal`）

规则：遍历 7 条，若 **`RandomNum(1000) % freq == 0`** 命中，**命中即 break**：

```text
{freq, "消息", ratoi(损失百分比)}
{60, "俺怜悯地铁口扮演成乞丐的老太太。", 10}
{125,"一个汉子在街头拦住俺：“哥们，给点钱用!”。",10}
{100,"一个大个子碰了俺一下，说：“别挤了!”。",40}
{65, "三个带红袖章的老太太揪住俺：“你是外地人?罚款!”",20}
{35, "两个猛男揪住俺：“交长话附加费、上网费。”", 15}
{27, "副主任说：“办经商证?晚上不要去我家给我送钱哦。”", 10}
{40, "北京空气污染得厉害,俺去氧吧吸氧...", 5}
```

- 对**现金**生效（`i!=4 && i!=5`）：`MyCash = floor((MyCash/100) * (100-ratoi))`（**整型除法**，先 `MyCash/100` 再乘）
- 对**存款**生效（`i==4||i==5` 且 `MyBank>0`）：`MyBank = floor((MyBank/100)*(100-ratoi))`
- **黑客事件**（`RandomNum(1000)%25==0 && m_bHackActs`）：
  - `MyBank<1000`：无事
  - `MyBank>100000`：`num=MyBank/(2+RandomNum(20))`；`RandomNum(20)%3!=0`（2/3）→ 减少，否则（1/3）→ 增加
  - 否则：`num=MyBank/(1+RandomNum(15))`；增加
- 若 `MyCash<0`：修正为 0，弹「俺不好办了。」

### 3.7 子系统行为（标注范围）

| 子系统 | 行为要点 | 范围 |
|---|---|---|
| 银行 | 存取款、贷款/还款（利率见 `HandleCashAndDebt`） | **M1** |
| 医院 | `健康<100` 可治，`点数×3500` 元/点；现金不足拒治（「钱不够哎! 拒绝治疗」）；健康满则调侃「大哥！神经科这边挂号」 | **M1** |
| 邮局 | 无欠债按 `现金+存款` 档位给台词；有欠债给还款对话框（上限=可还数；现金不足「你还得起吗?」） | **M1** |
| 房屋中介 | 扩仓容 `myCoat`（租房） | **M1** |
| 网吧 | `m_nVisitWangba` 计数，防刷 | **M1** |
| 机场/网络俱乐部 | 播 `airport.wav`，开联网对话框（排行榜等） | **M1** |
| 排行榜 | 最高分 top10 | **M1** |
| 设置 | `m_bCloseSound` / `m_bHackActs` | **M1** |
| 上海模式 | `m_City` 切换，第二套地点/价格/事件文本（`loc` 按 `10*(m_City-1)+loc` 索引） | **M3（推迟/可砍）** |
| 关于/北京介绍/故事/声明/赞助 | 纯文案展示型 | **M3（推迟/可砍）** |

### 3.8 彩蛋（标注范围）

| # | 彩蛋 | 范围 |
|---|---|---|
| 1 | 关于框右键 >5 次：第 6 次弹作者简介一，>10 次弹简介二并重置 | M3 |
| 2 | 双击作者图弹「Programmed by Guo xianghao...2000/12」 | M3 |
| 3 | Boss「老板来了」保护窗 | M1（核心趣味） |
| 4 | 欠债>10万：被村长揍（健康−30） | **M1（核心行为）** |
| 5 | 健康<85 强制住院 | **M1（核心行为）** |
| 6 | 健康<0 死亡（日记本台词） | **M1（核心行为）** |
| 7 | 网吧滥用防护 | **M1** |
| 8 | 黑客事件（`m_bHackActs`） | **M1** |
| 9 | 邮局按财富档位给台词 | **M1** |
| 10 | 末日出清剩余货物 | **M1（核心行为）** |
| 11 | 大量幽默台词逐字保留 | **M1** |

---

## 4. 行为复刻的保证机制（核心方法）

行为 1:1 不只靠「写对」，要靠**机制**。三层：

### 4.1 数据表逐字提取（以源码为唯一真理）
货物、18/12/7 事件表、地点名、`loc[21]`/`coffee[30]`、Tips/News/Ticker、所有台词——**从源码和 GBK 文本机械提取为 UTF-8 结构化数据**，不做「二次编写」。提取物即行为数据，人肉转录是 bug 高发区。

### 4.2 行为 spec（OpenSpec 风格，Given/When/Then）
把**易错的、非显然的行为**转写成行为场景（`Given 初始状态 / When 一次移动 / Then 数值与文本`），**从源码推导、不发明**。每个场景对应一条 oracle 测试用例。
- **OpenSpec 工具取舍**：采用其**场景格式与「行为=文档」的心法**；但它是面向团队/PR 的工作流，对本「个人、已具备 oracle 测试」的项目偏重——**不必装全量 OpenSpec CLI**，手写 `spec/`（`spec.md`）即可，把精力放在数据提取与 oracle 上。若你想体验完整 OpenSpec 工作流也可，不影响契约。
- 覆盖重点（非显然语义）清单：
  - 事件触发**除数不一致**：商业=**950**，健康/抢钱/黑客=**1000**
  - 商业事件**命中不 break** / 健康、抢钱事件**命中即 break**
  - **整型除法**：价格 `/=`、`floor(MyCash/100)*(100-ratoi)`、`MyBank/(1+RandomNum(15))`
  - `makeDrugPrices` **循环 leaveout 次、允许重复置 0**
  - 强制住院**在 `timeLeft--` 前**扣 `delay_day`，总消耗 `1+delay_day`；且判断用移动前的 timeLeft
  - 「移动到地点才算回合」「同地点反复操作不消耗回合」

### 4.3 oracle 测试套件（自动验证契约）
- `tests/oracle.test.ts`（Node 跑，不依赖浏览器）。
- **可播种 RNG**：`rng.ts` 实现可注入种子的 `random(n)`（等价 `rand()%n` 的 0..n-1 均匀），默认 `Date.now()`，调试/测试传固定种子。
- 用**固定种子**跑 `core`，与**同种子下按源码公式手算的参照值**做断言（价格序列、事件命中、利息、住院天数与费用、清仓金额）。针对每条 4.2 的场景写用例。
- 结论：**oracle 通过 = 行为 1:1 达标**（逻辑层）。UI 层另验（见 M2）。

---

## 5. 技术选型与架构（修订）

### 5.1 架构分层
```
core（规则引擎，框架无关，纯 TS/JS，可 Node 测）
 ├─ state / rng / engine(移动流水线) / actions(buy,sell,bank,hospital,...)
 └─ data/(goods,locations,events,texts)
ui（表现层，Svelte）
 ├─ scene-model（core 吐出的归一化场景：面板/文本/数值/可用操作）
 ├─ skins/retro（默认皮肤：CSS 变量 + 素材 + 组件）
 └─ screens/主界面 + 各对话框组件
```
- core 只发**语义事件**（priceChange / healthDrop / openDialog#bank…），皮肤决定怎么画 → **可换肤**。
- core **数据驱动 + 带 hook**（price → cash&debt → 商业 → display → 健康 → 抢钱 → 欠债惩罚 → 日结 每步可挂扩展）→ **可扩展玩法**。

### 5.2 构建与交付
- **Svelte + Vite**；`core` 为框架无关模块。
- **单文件自包含**：Vite 配置将 JS/CSS 全部内联进单个 `index.html`；图片/音频/文本保留为**相对路径的独立文件**（`file://` 下这些能加载，只有跨文件 ES module 会被浏览器 CORS 拦，故必须内联 JS/CSS）。
- 这样：**双击 `index.html` 即玩**，同时**可直接上传到静态托管**（Cloudflare/CloudBase/EdgeOne）。

### 5.3 目录结构（更新）
```text
beijing_fushengji_html/
├── index.html            # 构建产物（自包含单文件）
├── src/
│   ├── core/
│   │   ├── state.ts      # GameState 类型+初始
│   │   ├── rng.ts        # 可播种 RNG
│   │   ├── engine.ts     # 移动流水线 + 三套事件
│   │   ├── actions.ts    # buy/sell/bank/hospital/house/wangba/airport...
│   │   └── data/         # goods.ts / locations.ts / events.ts / texts.ts（UTF-8）
│   ├── ui/
│   │   ├── skins/retro/
│   │   ├── screens/
│   │   └── main.ts
│   └── main.ts           # Svelte mount 入口
├── public/assets/ img/ audio/ text/
├── tests/ oracle.test.ts
├── scripts/ convert-assets.*
├── spec/  behavior.md    # 行为场景（Given/When/Then）
├── PLAN.md  README.md
```

### 5.4 资产管线（一次性脚本）
- 图像：`res/*.bmp`(8位调色板)/`*.jpg`/`*.ico`/`backblue.gif` → `assets/img/*.png`（ImageMagick）
- 音效：`sound/*.wav` → `assets/audio/`（保留 wav；个别老编码必要时 `ffmpeg ... libvorbis .ogg`）；`Airport.wav`→`airport.wav`
- 文本：`iconv -f GBK -t UTF-8 Tips/News/Ticker`；`oldhelp` → `help.html`
- 大小写：统一小写，避免 Web 大小写敏感问题

### 5.5 随机数策略
- 用 `Math.floor(Math.random()*n)` 等价原作 `rand()%n`（0..n-1 均匀）。
- 事件命中统一 `Math.floor(Math.random()*1000/950) % freq === 0`（注意商业=950）。
- 价格 `base + Math.floor(Math.random()*range)`。
- **所有整型除法用 `Math.floor` 保住完全一致**。
- 原作 `srand(time(NULL))`，每次运行不同 → 复刻不追求逐字节重现 RNG 序列，只保证「同一随机流下行为一致」（由可播种 RNG 支撑）。

---

## 6. 里程碑与验收（重排）

### M1 — 可玩核心（`core` + 桌面标签页验证逻辑）

- [x] 资产转档管线（图像/音效/GBK 文本 → `public/assets/`）
- [x] `core/data`：8 货/10 地点/事件表/Tips/News/Ticker
- [x] `core/rng`(可播种) + `core/engine`（移动流水线、三套事件、利息、住院、死亡、欠债惩罚、末日出清）
- [x] `core/actions`：买卖/银行/医院/邮局/房源/网吧/机场网络俱乐部/排行榜/设置
- [x] `ui` 主界面骨架（黑市/出租屋/状态 LED/10 地点/底栏）+ 主机制交互
- [x] localStorage 最高分 top10 + 设置开关 + 音效
- [x] **验收**：能开新局走完 40 回合、正常结算进榜；**oracle 套件在固定随机流下断言与源码公式等价**（价格/事件/资产）。

### M2 — 移动端皮肤 + 复古质感
- [ ] `ui` 加/做成移动 skin：触控大热区、弹层/卡片式对话框、单手操作、竖屏适配、不溢出
- [ ] Win2000/LED/背景图氛围用 CSS 还原
- [ ] 标题实时天数 + 新闻滚动条
- [ ] **验收**：手机上单手可玩、风格贴近原版、无溢出/操作死角。

### M3 — 延后项（可选，视精力）
- [ ] 上海模式、纯文案展示框（关于/介绍/故事/声明/赞助）、帮助页、彩蛋细项
- [ ] **验收**：按需、可砍。

> **行为 1:1 的硬性达标门** = **M1 的 oracle 测试**；M2/M3 属体验层。

## 7. 交付与部署（更新）

- **交付**：自包含单文件 `index.html` + `public/assets/`；**单文件分发确定**。
- **部署**：具体方案后定。**现暂用 Cloudflare Pages 临时跑**（单文件站零门槛）。**国内免备案长期目标**：
  - 首选 **腾讯云 CloudBase 静态网站托管**（平台默认二级域名 `*.tcloudbaseapp.com`，免备案、国内快、传文件夹即用）——[参考](https://www.w3cschool.cn/cloudbasehandbookpro/cloudbasehandbookpro-tyjd38a2.html)
  - 备选 **腾讯云 EdgeOne Pages**（国内版 Vercel，Git 触发构建，免备案）——[参考](https://developer.cloud.tencent.com/article/2565878)
- **备案结论**：大陆主机 + 绑自有域名需 ICP 备案；且 **2024-01-01 后新建 COS 桶用默认域名不支持静态网站预览**（[官方通知](https://cloud.tencent.com/document/product/436/96243)、[官方实践](https://cloud.tencent.com/document/product/436/9512)）。Gitee Pages **已下线**（[参考](https://www.zhihu.com/question/655233802)）。→ **放弃 COS/OSS + 自定义域名路线。**
- 诚实提醒：免备案默认域名，个别运营商/网络下可能不稳 → 把**站点地址做成可配置**，哪天换平台/挂自己域名（需备案）只改 URL。

## 8. 风险与注意事项

- **整型除法**：价格 `/=`、`MyCash/100*(100-ratoi)`、`Bank/(1+RandomNum(15))` 全部 `Math.floor` 对齐，避免差 1 元。
- **事件除数**：商业=950、健康/抢钱/黑客=1000（旧 PLAN 曾误写为全部 1000——已改正）。
- **住院叠加**：移动消耗 `1+delay_day`，判断用移动前 timeLeft。
- **音效文件名大小写**：`Airport.wav`。
- **GPL v2**：衍生版须 GPL v2 开源。
- **`helpinfo` 不可读**：忽略，帮助用 `oldhelp`。
- **`file://` 双开**：必须内联 JS/CSS，否则 ES module 被 CORS 拦。

## 9. 交付产物

- 一个可双击打开的 `index.html` 自包含静态站 + `public/assets/` + 打包资产
- `core` + `ui/skins` 源码（`src/`）
- `tests/oracle.test.ts` oracle 测试套件 + `spec/` 行为场景
- 资产/文本转档脚本（可重复运行）
- `README.md`（玩法说明 + GPL 声明 + 致谢原作者）

> 关联笔记：Obsidian `default/Projects/202609072000`；engram 项目 `beijing_fushengji_html`。
