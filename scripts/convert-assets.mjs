#!/usr/bin/env node
// 资产转档管线：把 reference/ 下的 C++/MFC 素材转成 Web 可用的资源。
//   - 图像 (bmp/jpg/gif/ico) → *.png（ImageMagick；文件名统一小写，冲突自动加后缀）
//   - 音效 (wav)           → *.wav（原样复制，文件名小写；Airport.wav→airport.wav）
//   - 文本 (GBK)           → *.txt（转 UTF-8；Tips/News/Ticker）
//   - 帮助 (oldhelp,HTML)  → help.html（转 UTF-8；仅 --all 模式）
//
// 默认只产出「运行时真正引用」的白名单资源，其余原版素材不进仓库、不进发布包；
// 需要时用全量模式重建（输出到 _assets_all/，已 gitignore）：
//   node scripts/convert-assets.mjs          # 只产出白名单 → public/assets + src/core/data/text
//   node scripts/convert-assets.mjs --all    # 全量 → _assets_all/（M3 帮助页/皮肤等按需取用）
// 可重复运行：只转换「输出缺失或源更新的」文件。

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const ROOT = process.cwd()
const REF = path.join(ROOT, 'reference')
const ALL = process.argv.includes('--all')

// ── 白名单：只发布被代码真正引用的素材 ─────────────────────────────────
// 图片：src/ui/skins/retro/theme.ts 的 bg（游戏背景图）
const SHIP_IMG = ['game-backg.png']
// 音效：src/core 事件/引擎里出现的 sound 名（如 'kill.wav'）
const SHIP_AUDIO = [
  'airport.wav',
  'breath.wav',
  'buy.wav',
  'death.wav',
  'dog.wav',
  'el.wav',
  'flee.wav',
  'harley.wav',
  'hit.wav',
  'kill.wav',
  'lan.wav',
  'level.wav',
  'money.wav',
  'opendoor.wav',
  'shutdoor.wav',
  'vomit.wav',
]
// 文本：构建期以 ?raw 导入（src/core/data/texts.ts）
const SHIP_TEXT = ['tips.txt', 'news.txt', 'ticker.txt']

const IMG_EXT = new Set(['.bmp', '.jpg', '.jpeg', '.ico', '.gif', '.png'])
const AUDIO_EXT = new Set(['.wav'])
const TEXT_FILES = ['Tips.txt', 'News.txt', 'Ticker.txt'] // GBK → UTF-8

// 输出位置：默认写进发布目录；--all 模式写到 _assets_all/ 供按需取用
const OUT_IMG = ALL ? path.join(ROOT, '_assets_all', 'img') : path.join(ROOT, 'public', 'assets', 'img')
const OUT_AUDIO = ALL ? path.join(ROOT, '_assets_all', 'audio') : path.join(ROOT, 'public', 'assets', 'audio')
const OUT_TEXT = ALL ? path.join(ROOT, '_assets_all', 'text') : path.join(ROOT, 'src', 'core', 'data', 'text')
const OUT_HELP = path.join(ALL ? path.join(ROOT, '_assets_all') : path.join(ROOT, 'public', 'assets'), 'text')

// reference/ 为上游 GPL 源码，未纳入本仓库（.gitignore）。
// 转换后的白名单素材已随仓库提交，因此缺失 reference/ 时跳过而非报错。
if (!existsSync(REF)) {
  console.log('未找到 reference/（上游 C++ 源码，未纳入本仓库）；白名单素材已在 public/assets 与 src/core/data/text，无需重跑。')
  process.exit(0)
}

for (const dir of new Set([OUT_IMG, OUT_AUDIO, OUT_TEXT, OUT_HELP])) mkdirSync(dir, { recursive: true })

// ---- helper -------------------------------------------------------------
function magickCmd() {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' })
    return 'magick'
  } catch {
    return 'convert'
  }
}

function decodeGbk(buf) {
  try {
    return new TextDecoder('gbk').decode(buf)
  } catch {
    // fallback: iconv
    const { stdout } = execFileSync('iconv', ['-f', 'GBK', '-t', 'UTF-8', '-'], { input: buf })
    return stdout.toString('utf-8')
  }
}

function newerOrMissing(src, out) {
  if (!existsSync(out)) return true
  return statSync(src).mtimeMs > statSync(out).mtimeMs
}

function upToDate(src, out) {
  return !newerOrMissing(src, out)
}

/** 删除输出目录里不在白名单内的残留（避免发布包/仓库被死资源重新污染） */
function prune(outDir, keep) {
  let removed = 0
  for (const f of readdirSync(outDir)) {
    if (keep.has(f)) continue
    rmSync(path.join(outDir, f), { recursive: true, force: true })
    removed++
  }
  return removed
}

// ---- 1. images ----------------------------------------------------------
// 先按与源码一致的小写+去冲突规则算出每个源文件的输出名，再按白名单过滤，
// 保证两种模式下的文件名完全一致。
const used = new Set()
function uniqueBase(base) {
  let b = base
  let i = 1
  while (used.has(b)) b = `${base}-${i++}`
  used.add(b)
  return b
}

const imgSources = []
for (const f of readdirSync(path.join(REF, 'res'))) {
  if (IMG_EXT.has(path.extname(f).toLowerCase())) imgSources.push({ src: path.join(REF, 'res', f), name: f })
}
for (const f of readdirSync(REF)) {
  if (IMG_EXT.has(path.extname(f).toLowerCase())) imgSources.push({ src: path.join(REF, f), name: f })
}

let imgCount = 0
const shipImg = new Set(SHIP_IMG)
for (const { src, name } of imgSources) {
  const base = path.basename(name, path.extname(name)).toLowerCase()
  const outName = uniqueBase(base) + '.png'
  if (!ALL && !shipImg.has(outName)) continue
  const out = path.join(OUT_IMG, outName)
  if (upToDate(src, out)) continue
  execFileSync(magickCmd(), [src, out], { stdio: 'ignore' })
  imgCount++
}
if (!ALL) prune(OUT_IMG, shipImg)
console.log(
  `图像 → ${ALL ? '_assets_all' : 'public/assets'}/img/: 源 ${imgSources.length} 个，白名单 ${ALL ? imgSources.length : shipImg.size} 个，本次转换 ${imgCount} 个`,
)

// ---- 2. audio ------------------------------------------------------------
let audioCount = 0
const audioSources = []
for (const f of readdirSync(path.join(REF, 'sound'))) {
  if (AUDIO_EXT.has(path.extname(f).toLowerCase())) audioSources.push(path.join(REF, 'sound', f))
}
const shipAudio = new Set(SHIP_AUDIO)
for (const src of audioSources) {
  const outName = path.basename(src).toLowerCase() // Airport.wav → airport.wav
  if (!ALL && !shipAudio.has(outName)) continue
  const out = path.join(OUT_AUDIO, outName)
  if (upToDate(src, out)) continue
  copyFileSync(src, out)
  audioCount++
}
if (!ALL) prune(OUT_AUDIO, shipAudio)
console.log(
  `音效 → ${ALL ? '_assets_all' : 'public/assets'}/audio/: 源 ${audioSources.length} 个，白名单 ${ALL ? audioSources.length : shipAudio.size} 个，本次复制 ${audioCount} 个`,
)

// ---- 3. text (GBK → UTF-8) ----------------------------------------------
let textCount = 0
const shipText = new Set(SHIP_TEXT)
for (const name of TEXT_FILES) {
  const src = path.join(REF, name)
  if (!existsSync(src)) continue
  const outName = name.toLowerCase() // Tips.txt → tips.txt
  if (!ALL && !shipText.has(outName)) continue
  const out = path.join(OUT_TEXT, outName)
  if (upToDate(src, out)) continue
  writeFileSync(out, decodeGbk(readFileSync(src)), 'utf-8')
  textCount++
}
if (!ALL) prune(OUT_TEXT, shipText)
console.log(`文本 → ${ALL ? '_assets_all' : 'src/core/data'}/text/: 本次转换 ${textCount} 个`)

// ---- 4. help (oldhelp HTML，仅 --all：M3 帮助页用) -----------------------
if (ALL) {
  const helpSrc = path.join(REF, 'oldhelp')
  if (existsSync(helpSrc)) {
    const out = path.join(OUT_HELP, 'help.html')
    if (newerOrMissing(helpSrc, out)) {
      // 原样转码；HTML 内仍引用 backblue.gif，接入时按 assets/img/backblue.png 核对
      writeFileSync(out, decodeGbk(readFileSync(helpSrc)), 'utf-8')
      console.log('帮助 → _assets_all/text/help.html')
    }
  }
} else {
  // 帮助页尚未接入（M3），发布目录里不保留
  prune(OUT_HELP, new Set())
}

console.log(ALL ? 'done（全量素材在 _assets_all/，不参与构建）' : 'done（只产出白名单资源）')
