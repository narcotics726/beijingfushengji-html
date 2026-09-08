# 北京浮生记 · 网页版（纯静态单文件复刻）

把 1999 年的经典单机游戏《北京浮生记》v1.2.2（C++/MFC）复刻成**纯静态、自包含、单文件**的网页版。
目标是**行为 1:1**：规则、数值、事件、文本、随机流演化与原版一致（同一随机流下可复现）；技术栈换成 Web，架构不必复刻 MFC，UI 为移动端做了易用性优化。

## 玩法

在北京倒买倒卖 40 天，还清 5000 元欠债。

- 10 个地点（西直门、东单、天安门、亚运村……），每天选一处进货出货；同一种货在不同地点价格不同，低买高卖。
- 8 种货物：进口香烟、走私汽车、盗版 VCD/游戏、假白酒（剧毒！）、禁书《上海小宝贝》、进口玩具、水货手机、伪劣化妆品。
- 现金、存款（银行）、欠债、健康、名声、携带量/仓容都会互相牵制；钱不够会被村长老婆堵门催债，健康归零则游戏结束。
- 中途会遭遇各种社会事件（商业、健康、抢钱、黑客等），文本与判定完全照搬原版。

操作：点地点推进一天 → 在黑市/出租屋区买卖 → 银行存钱还款 → 医院看病 → 机场坐 747 飞上海（视版本范围）。

## 在线试玩

构建产物是单个 `index.html`，可双击直接打开（`file://` 亦可，JS/CSS 已内联、资源走相对路径），也可整目录挂到任意静态托管。

## 开发

```bash
npm install
npm run dev       # 本地开发
npm run build     # 产出 dist/（单文件 index.html + assets/）
npm run preview   # 预览构建产物
npm run check     # svelte-check + tsc
npm test          # vitest（含 oracle 规则对照测试）
npm run assets    # 从 reference/ 转档素材（只产出被代码引用的白名单资源）
npm run assets -- --all   # 全量转档到 _assets_all/（M3 帮助页/皮肤等按需取用，不参与构建）
```

### 目录

| 路径 | 说明 |
|---|---|
| `src/core/` | **框架无关**的纯 TS 规则引擎：`state`/`rng`/`engine`/`actions`/`storage` + `data/`（货物、地点、事件、文本） |
| `src/ui/` | Svelte 表现层：`game.ts` 接线、`sound.ts` 音效、`App.svelte` 主界面、`components/`、`skins/`（默认 `retro` 皮肤） |
| `tests/` | oracle（固定种子对照原版公式）+ actions + store（完整一局）+ App SSR/挂载 |
| `public/assets/` | **只含运行时真正引用的素材**（背景图 `game-backg.png` + 16 个音效），Vite 原样拷入 `dist/assets/` |
| `scripts/convert-assets.mjs` | 素材转档管线（ImageMagick / ffmpeg / iconv）；默认只产出白名单，`--all` 全量重建到 `_assets_all/` |
| `reference/` | 原版 C++/MFC 源码（**GBK**，仅本地参考，已 gitignore，勿修改） |
| `PLAN.md` | 实施计划与行为契约（规则逐条核对） |
| `AGENTS.md` | 给 AI 协作者的工程约定 |

> `reference/` 下的 `*.cpp`/`*.h` 与 `Tips.txt`/`News.txt`/`Ticker.txt` 均为 GBK 编码，读取前需 `iconv -f GBK -t UTF-8`。

## 版权与许可

本项目是 [chrisguo/beijing_fushengji](https://github.com/chrisguo/beijing_fushengji)（《北京浮生记》v1.2.2 源代码，作者 **郭祥昊 / Guo xianghao**，© 1999–2001 Guoly Computing）的**衍生作品**，依原版协议以 **GNU General Public License v2.0** 发布，许可证全文见 [`LICENSE`](./LICENSE)。

- 原版游戏代码、图像、音效、文本素材均来自上游仓库，同以 GPL v2 授权。
- 本复刻版保留原作者版权与致谢，并同样以 GPL v2 开源；任何人再分发/修改本衍生作品，须继续以 GPL v2 发布并提供源代码。
- 本仓库不包含原版 C++ 源码（`reference/` 已被 `.gitignore` 忽略），需要参考请访问上游仓库。

## 致谢

- 原作者 **郭祥昊** 与 Guoly Computing 公司，感谢其在 1999 年做出这样一款游戏，并在 2012 年以 GPL v2 开源。
- 所有原版文本（新闻、贴士、事件、台词）均逐字保留，未作二次创作，以保持时代语感与讽刺味道。
