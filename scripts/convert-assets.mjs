#!/usr/bin/env node
// 资产转档管线（一次性）：把 reference/ 下的 C++/MFC 素材转成 Web 可用的 assets/。
//   - 图像 (bmp/jpg/gif/ico) → assets/img/*.png（ImageMagick；文件名统一小写，冲突自动加后缀）
//   - 音效 (wav)           → assets/audio/*.wav（原样复制，文件名小写；Airport.wav→airport.wav）
//   - 文本 (GBK)           → assets/text/*.txt（转 UTF-8；Tips/News/Ticker）
//   - 帮助 (oldhelp,HTML)  → assets/text/help.html（转 UTF-8）
// 可重复运行：只转换「输出缺失或源更新的」文件。
// 用法：node scripts/convert-assets.mjs

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  statSync,
  readdirSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const ROOT = process.cwd()
const REF = path.join(ROOT, 'reference')
const OUT_IMG = path.join(ROOT, 'assets', 'img')
const OUT_AUDIO = path.join(ROOT, 'assets', 'audio')
const OUT_TEXT = path.join(ROOT, 'assets', 'text')

const IMG_EXT = new Set(['.bmp', '.jpg', '.jpeg', '.ico', '.gif', '.png'])
const AUDIO_EXT = new Set(['.wav'])
const TEXT_FILES = ['Tips.txt', 'News.txt', 'Ticker.txt'] // GBK → UTF-8

mkdirSync(OUT_IMG, { recursive: true })
mkdirSync(OUT_AUDIO, { recursive: true })
mkdirSync(OUT_TEXT, { recursive: true })

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

// ---- 1. images ----------------------------------------------------------
const used = new Set()
let imgCount = 0
const imgSources = []

// res/ 下的图像
for (const f of readdirSync(path.join(REF, 'res'))) {
  const ext = path.extname(f).toLowerCase()
  if (!IMG_EXT.has(ext)) continue
  imgSources.push({ src: path.join(REF, 'res', f), name: f })
}
// 仓库根目录的图像
for (const f of readdirSync(REF)) {
  const ext = path.extname(f).toLowerCase()
  if (!IMG_EXT.has(ext)) continue
  imgSources.push({ src: path.join(REF, f), name: f })
}

function uniqueBase(base) {
  let b = base
  let i = 1
  while (used.has(b)) b = `${base}-${i++}`
  used.add(b)
  return b
}

for (const { src, name } of imgSources) {
  const base = path.basename(name, path.extname(name)).toLowerCase()
  const outName = uniqueBase(base) + '.png'
  const out = path.join(OUT_IMG, outName)
  if (upToDate(src, out)) continue
  execFileSync(magickCmd(), [src, out], { stdio: 'ignore' })
  imgCount++
}
console.log(`图像 → assets/img/: 共 ${imgSources.length} 个，本次转换 ${imgCount} 个`)

// ---- 2. audio ------------------------------------------------------------
let audioCount = 0
const audioSources = []
for (const f of readdirSync(path.join(REF, 'sound'))) {
  if (!AUDIO_EXT.has(path.extname(f).toLowerCase())) continue
  audioSources.push(path.join(REF, 'sound', f))
}
for (const src of audioSources) {
  const outName = path.basename(src).toLowerCase() // Airport.wav → airport.wav
  const out = path.join(OUT_AUDIO, outName)
  if (upToDate(src, out)) continue
  copyFileSync(src, out)
  audioCount++
}
console.log(`音效 → assets/audio/: 共 ${audioSources.length} 个，本次复制 ${audioCount} 个`)

// ---- 3. text (GBK → UTF-8) ----------------------------------------------
let textCount = 0
for (const name of TEXT_FILES) {
  const src = path.join(REF, name)
  if (!existsSync(src)) continue
  const outName = name.toLowerCase() // Tips.txt → tips.txt
  const out = path.join(OUT_TEXT, outName)
  if (upToDate(src, out)) continue
  const utf8 = decodeGbk(readFileSync(src))
  writeFileSync(out, utf8, 'utf-8')
  textCount++
}
console.log(`文本 → assets/text/: 本次转换 ${textCount} 个`)

// ---- 4. help (oldhelp HTML) ----------------------------------------------
const helpSrc = path.join(REF, 'oldhelp')
if (existsSync(helpSrc)) {
  const out = path.join(OUT_TEXT, 'help.html')
  if (newerOrMissing(helpSrc, out)) {
    const utf8 = decodeGbk(readFileSync(helpSrc))
    // Help HTML 里原样引用 backblue.gif；浏览器按 assets/img/backblue.png 用，
    // 这里不强改引用（help 属 M3，到时链接真实资源时再核对）。
    writeFileSync(out, utf8, 'utf-8')
    console.log('帮助 → assets/text/help.html')
  }
}

console.log('done.')
