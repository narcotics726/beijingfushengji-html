# AGENTS.md — beijing_fushengji_html

北京浮生记 (v1.2.2, C++/MFC 单机) → 纯静态网页版复刻。**行为 1:1**（规则/数值/事件/文本/同一随机流可复现演化），技术栈换 Web，架构不必复刻 MFC。项目契约见 `PLAN.md` §0。

## 现状（M1 可玩核心已实现）
- `src/core/`：纯 TS 规则引擎（state/rng/engine/actions/storage + data/），框架无关可在 Node 测。
- `src/ui/`：`game.ts`（Svelte store 接线）、`sound.ts`（相对路径音频）、`App.svelte`（主界面）。
- `tests/`：oracle（规则）+ actions + store（完整一局）+ App SSR，全部通过。
- `reference/`（GBK 源码，git 忽略，勿改）；`public/assets/`（**只放被代码真正引用的白名单素材**——背景图 + 16 个音效，Vite 拷到 dist/assets）；`dist/`（构建产物，git 忽略）；`scripts/convert-assets.mjs`（转档管线：默认白名单，`--all` 全量重建到 gitignore 的 `_assets_all/`）。
- 里程碑：M1 完成 → M2 移动皮肤/复古质感 → M3 延后（上海模式/纯文案框/帮助页）。

## ⚠️ 编码（最重要，先看这个）

`reference/` 下的 C++ 源码（`*.cpp/*.h`）与 `Tips.txt`/`News.txt`/`Ticker.txt` 全部是 **GBK**。
`read` 工具直接读会报 `invalid UTF-8 text` 而失败。**先转再读**：

```bash
mkdir -p _u8tmp
iconv -f GBK -t UTF-8 reference/SelectionDlg.cpp > _u8tmp/SelectionDlg.cpp
# 再 read _u8tmp/SelectionDlg.cpp
```

用后删 `_u8tmp/`。`reference/` 已被 `.gitignore` 忽略，仅作参考，**勿改**。

## 行为 1:1 的准则（以源码为准，勿发明）

- 规则：`PLAN.md` §3（已逐条核对）。数据表（货物/事件表/台词/文本）**从源码逐字提取**，不要二次编写。
- 非显然语义（易错，别想当然）：商业事件除数 **950**，健康/抢钱/黑客 **1000**；商业事件**命中不 break**，健康/抢钱**命中即 break**；整型除法一律 `Math.floor`；`makeDrugPrices` 循环 `leaveout` 次**可重复置 0**；强制住院叠加为 `1+delay_day`。
- 验证：`tests/oracle.test.ts`——**可播种 RNG**，固定种子下对照源码公式断言（Node 跑，不依赖浏览器）。

## 架构与构建

- `src/core/`：规则引擎，**框架无关纯 TS/JS**（可在 Node 测）。`src/ui/`：Svelte 表现层 + `skins/`（可换肤；默认 `retro`，移动优化是皮肤变体）。
- **单文件自包含**：Vite 把 JS/CSS 内联进 `index.html`；资源（图片/音频/文本）放 **`public/assets/`**，Vite 原样拷到 `dist/assets/`，运行时用**相对路径**引用（`new URL('assets/audio/x.wav', document.baseURI)`）。`file://` 下跨文件 ES module 会被浏览器 CORS 拦，**故必须内联 JS/CSS**；资源用相对路径即可 file:// 加载。库存列显示的是**加权平均进价** `holdCost`，非当日市价。
- core 数据驱动 + 带 hook；**core 只发语义事件，皮肤决定怎么渲染**（为换肤/扩展玩法预留）。买卖/银行/住院等均在 `core/actions`。

## 里程碑（PLAN.md §6）

M1 可玩核心（`core` + 主机制 + 最高分/设置，oracle 达标）→ M2 移动皮肤 + 复古质感 → M3 延后项（上海模式/纯文案框/帮助页）。

## 交付与合规

- 交付 = 单文件 `index.html`（可双击 / 挂静态托管）。部署后定（暂 Cloudflare；国内免备案目标 CloudBase / EdgeOne Pages）。
- **GPL v2**：衍生版须 GPL v2 开源，保留版权与致谢原作者郭祥昊。
