#!/usr/bin/env node
/**
 * parse-intel.js
 * clone https://github.com/rockbenben/free-llm-intel 并解析其 README：
 *   1) "常见免费 API" 表（### 7 节，一键接入表）
 *   2) 全部 "### N. 厂商" 小节的字段表（Part 1~4）
 * 解析结果按 schema 追加到 data/deals.json，去重规则：同厂商只留一条（种子 > 常见表 > 厂商小节），
 * 所有新增条目 状态/验真 均标 "待验证"。
 *
 * 用法：node scripts/parse-intel.js [--offline /path/to/free-llm-intel]
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REPO_URL = 'https://github.com/rockbenben/free-llm-intel'

// ---------------------------------------------------------------- utils

/** 去掉 markdown 语法，压平成可读文本 */
function cleanText(s) {
  return s
    .replace(/<br\s*\/?>/gi, '；')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[•·]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/；{2,}/g, '；')
    .replace(/^[；,.\s]+|[；,\s]+$/g, '')
    .trim()
}

/** 截断（多打一个 …） */
function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/** 厂商名归一化：取 "(" 前部分、去空格、转小写 */
function normalizeVendor(s) {
  return s.replace(/\(.*$/, '').replace(/（.*$/, '').replace(/\s+/g, '').toLowerCase()
}

/** 取第一个 markdown 链接 [text](url) */
function firstLink(s) {
  const m = s.match(/\[([^\]]+)\]\(([^)]+)\)/)
  return m ? { text: m[1], url: m[2] } : null
}

function today() {
  const d = new Date()
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ---------------------------------------------------------------- clone

function getReadme() {
  const offlineIdx = process.argv.indexOf('--offline')
  if (offlineIdx !== -1 && process.argv[offlineIdx + 1]) {
    return readFileSync(join(process.argv[offlineIdx + 1], 'README.md'), 'utf8')
  }
  const dir = join(tmpdir(), `free-llm-intel-${Date.now()}`)
  console.log(`▶ git clone --depth 1 ${REPO_URL}`)
  execSync(`git clone --depth 1 ${REPO_URL} ${JSON.stringify(dir)}`, { stdio: 'inherit' })
  try {
    return readFileSync(join(dir, 'README.md'), 'utf8')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------- parsing

function splitSections(lines) {
  /** 返回 [{level, title, start, end}]，end 为行号（不含） */
  const out = []
  const headingRe = /^(#{2,3}) (.+)$/
  const marks = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe)
    if (m) marks.push({ i, level: m[1].length, title: m[2] })
  }
  for (let k = 0; k < marks.length; k++) {
    out.push({
      level: marks[k].level,
      title: marks[k].title,
      start: marks[k].i,
      end: k + 1 < marks.length ? marks[k + 1].i : lines.length,
    })
  }
  return out
}

/** 解析 "常见免费 API" 一键接入表（### 7 节） */
function parseCommonTable(lines, sections) {
  const sec = sections.find((s) => s.level === 3 && /常见免费\s*API/.test(s.title))
  if (!sec) throw new Error('README 中找不到 "常见免费 API" 小节')
  const rows = []
  for (let i = sec.start; i < sec.end; i++) {
    const m = lines[i].match(/^\|(.+)\|\s*$/)
    if (!m) continue
    const cells = m[1].split('|').map((c) => c.replace(/\*\*/g, '').trim())
    if (cells.length < 5) continue
    if (cells[0] === '平台名称' || /^[-: ]+$/.test(cells[0]) || cells[0] === '') continue
    const [vendor, desc, apply, baseUrl, models] = cells
    rows.push({ vendor: cleanText(vendor), desc: cleanText(desc), apply, baseUrl, models })
  }
  return rows
}

/** 解析 "### N. 厂商" 小节的字段表 */
function parseVendorSections(lines, sections) {
  const partHeadings = sections.filter((s) => s.level === 2 && /^Part \d/.test(s.title))
  const partOf = (line) => {
    let part = null
    for (const p of partHeadings) if (p.start < line) part = p
    return part ? Number(part.title.match(/^Part (\d)/)[1]) : null
  }

  const vendors = []
  for (const sec of sections) {
    const hm = sec.title.match(/^(\d+)\. (.+)$/)
    if (sec.level !== 3 || !hm) continue
    const fields = {}
    for (let i = sec.start + 1; i < sec.end; i++) {
      const rm = lines[i].match(/^\|\s*\*\*(.+?)\*\*\s*\|(.+)\|\s*$/)
      if (rm) fields[rm[1].trim()] = rm[2].trim()
    }
    if (!fields['平台名称']) continue
    vendors.push({ num: Number(hm[1]), title: hm[2].trim(), fields, part: partOf(sec.start) })
  }
  return vendors
}

// ---------------------------------------------------------------- entry builders

const DEAD_PATTERNS = [/^无[。、]/, /无\s*LLM\s*模型服务/, /无免费推理模型/, /不再是\s*LLM/]
const NEGATIVE_PATTERNS = [
  /无(独立)?免费模型层/g,
  /无免费额度/g,
  /无公开(固定)?赠送政策/g,
  /无公开(固定)?赠送额度/g,
  /无新用户赠(金|送)/g,
  /不予采信/g,
]
const POSITIVE_RE = /免费|0 元|0元|免费版|赠送|送\s|券|试用|试用金|[Tt]rial|[Ff]ree|FREE|[Cc]redits?/

/** 判断厂商小节是否有免费羊毛可领（纯文本启发式，宁缺毋滥） */
/** 判断厂商小节是否有免费羊毛可领（纯文本启发式，宁缺勿滥）
 *  1. 清理后的文本命中“无免费/不予采信”等死亡信号 → 排除
 *  2. 先剔除否定句式与引号内的辟谣引用，再找正面关键词
 */
function hasFreeOffer(fields) {
  const cleaned = cleanText(`${fields['免费模型与额度'] || ''}\n${fields['注册福利 / 账户赠送'] || ''}`)
  for (const re of DEAD_PATTERNS) if (re.test(cleaned)) return false
  let stripped = cleaned
  for (const re of NEGATIVE_PATTERNS) stripped = stripped.replace(re, '')
  stripped = stripped
    .replace(/「[^」]*」/g, '')
    .replace(/“[^”]*”/g, '')
    .replace(/"[^"]*"/g, '')
  return POSITIVE_RE.test(stripped)
}

/** 厂商小节的品类 */
function categoryOfPart(part) {
  if (part === 1 || part === 2) return 'API额度'
  if (part === 3) return '云credits'
  return '软件试用'
}

/** 厂商小节的地域 */
function regionOf(num, title, part) {
  if (part === 1) return '国内'
  if (part === 3 && /无问芯穹|Infini/i.test(title)) return '国内'
  if (part === 4 && /腾讯|Trae|通义灵码|文心快码|Comate/i.test(title)) return '国内'
  return '海外'
}

/** 从反引号包裹的文本里取第一个模型名（跳过 ":free" 这类非模型名） */
function firstModelName(text) {
  for (const m of String(text || '').matchAll(/`([^`]+)`/g)) {
    const name = m[1].trim()
    if (name.length >= 2 && !name.startsWith(':')) return name
  }
  return '-'
}

function buildCommonEntry(row, fetched) {
  const apply = firstLink(row.apply) || { text: '官网', url: '-' }
  const model = firstModelName(row.models) === '-' ? row.models.split(/[，,]/)[0].replace(/[`]/g, '').trim() : firstModelName(row.models)
  const modelsAll = row.models.replace(/`/g, '').trim()
  const steps = [
    `申请直达：${apply.text}（${apply.url}）`,
    `Base URL：${cleanText(row.baseUrl)}`,
    `推荐免费模型：${modelsAll}`,
  ]
  return {
    id: `intel-common-${normalizeVendor(row.vendor).replace(/[^\w\u4e00-\u9fff-]+/g, '-')}`,
    标题: truncate(`${row.vendor} ${row.desc}`, 80),
    一句话: truncate(`${row.desc}（OpenAI 兼容，推荐模型：${modelsAll}）`, 160),
    怎么领: steps,
    链接: apply.url,
    品类: 'API额度',
    地域: '海外',
    版本: '-',
    模型: model || '-',
    开始日期: '-',
    结束日期: '-',
    状态: '待验证',
    验真: '待验证',
    抓取时间: fetched,
  }
}

function buildVendorEntry(v, fetched) {
  const f = v.fields
  const platform = cleanText(f['平台名称'] || v.title)
  const freeDesc = cleanText(f['免费模型与额度'] || '')
  const bonusDesc = cleanText(f['注册福利 / 账户赠送'] || '')
  const summary = freeDesc || bonusDesc || '详见官方页面'
  const shortPhrase = truncate(
    (summary.split(/[：。；;]|<br\s*\/?\/?>/i)[0] || summary).trim(),
    40
  )
  const steps = []
  if (f['前置条件 / 限制']) steps.push(`前置条件：${truncate(cleanText(f['前置条件 / 限制']), 90)}`)
  if (f['额度有效期']) steps.push(`额度有效期：${truncate(cleanText(f['额度有效期']), 90)}`)
  const official = firstLink(f['官方直达'] || '')
  if (official) steps.push(`官方入口：${official.text}（${official.url}）`)
  const link = firstLink(f['平台名称'] || '')
  return {
    id: `intel-${v.num}-${normalizeVendor(v.title).replace(/[^\w\u4e00-\u9fff-]+/g, '-').slice(0, 40) || v.num}`,
    标题: truncate(`${platform.split('（')[0]} · ${shortPhrase}`, 80),
    一句话: truncate(summary, 160),
    怎么领: steps.length ? steps : ['见官方直达链接'],
    链接: link ? link.url : '-',
    品类: categoryOfPart(v.part),
    地域: regionOf(v.num, v.title, v.part),
    版本: '-',
    模型: firstModelName(f['免费模型与额度'] || ''),
    开始日期: '-',
    结束日期: '-',
    状态: '待验证',
    验真: '待验证',
    抓取时间: fetched,
  }
}

// ---------------------------------------------------------------- dedup keys

/** 种子数据的厂商别名（id -> 归一化厂商 key），用于与解析结果去重 */
const SEED_VENDOR_KEYS = {
  'wb-intl-ds': ['腾讯云codebuddy/workbuddy', 'codebuddy', 'workbuddy'],
  'zhipu-flash': ['智谱glm'],
  siliconflow: ['硅基流动'],
  qwen: ['通义千问'],
  kimi: ['kimi'],
  groq: ['groqcloud'],
}

function existingVendorKeys(deals) {
  const keys = new Set()
  for (const d of deals) {
    const aliases = SEED_VENDOR_KEYS[d.id]
    if (aliases) {
      for (const a of aliases) keys.add(a)
      continue
    }
    const key = normalizeVendor(String(d.标题 || '').split(/\s/)[0] || '')
    if (key) keys.add(key)
  }
  return keys
}

// ---------------------------------------------------------------- main

const dealsPath = join(ROOT, 'data', 'deals.json')
// 幂等：id 以 "intel-" 开头的条目由本脚本重建，其余（种子/手工数据）保留
const allDeals = JSON.parse(readFileSync(dealsPath, 'utf8'))
const deals = allDeals.filter((d) => !String(d.id).startsWith('intel-'))
const before = allDeals.length

const readme = getReadme()
const lines = readme.split('\n')
const sections = splitSections(lines)

// 常见表 → 常见表条目；厂商小节 → 小节条目（两份分开，便于给常见表优先去重）
const commonRows = parseCommonTable(lines, sections)
const vendorSecs = parseVendorSections(lines, sections)

// 厂商小节标题 → 地域/Part（常见表条目借用其厂商的 Part 判定地域）
const vendorSecByName = new Map()
for (const v of vendorSecs) vendorSecByName.set(normalizeVendor(v.title), v)

const fetched = today()
const seenKeys = existingVendorKeys(deals)
const usedIds = new Set(deals.map((d) => d.id))
const added = []

function tryAdd(entry, vendorKey) {
  if (seenKeys.has(vendorKey)) return false
  let id = entry.id
  let n = 2
  while (usedIds.has(id)) id = `${entry.id}-${n++}`
  entry.id = id
  deals.push(entry)
  usedIds.add(id)
  seenKeys.add(vendorKey)
  added.push(entry)
  return true
}

// 1) 常见免费 API 表
let commonAdded = 0
for (const row of commonRows) {
  const key = normalizeVendor(row.vendor)
  const entry = buildCommonEntry(row, fetched)
  const sec = vendorSecByName.get(key)
  if (sec && sec.part === 1) entry.地域 = '国内' // 常见表本身无地域列，借用厂商所属 Part
  if (tryAdd(entry, key)) commonAdded++
}

// 2) 厂商小节
let vendorAdded = 0
const filteredOut = []
for (const v of vendorSecs) {
  if (!hasFreeOffer(v.fields)) {
    filteredOut.push(v.title + '（无免费羊毛）')
    continue
  }
  const key = normalizeVendor(v.title)
  const entry = buildVendorEntry(v, fetched)
  if (tryAdd(entry, key)) vendorAdded++
  else filteredOut.push(v.title + '（重复厂商）')
}

writeFileSync(dealsPath, JSON.stringify(deals, null, 2) + '\n')

console.log(`\n✅ 解析完成：常见免费 API 表 ${commonRows.length} 行（新增 ${commonAdded} 条），` +
  `厂商小节 ${vendorSecs.length} 个（新增 ${vendorAdded} 条，${filteredOut.length} 条跳过）`)
console.log(`data/deals.json：${before} → ${deals.length} 条`)
if (process.argv.includes('-v') || process.argv.includes('--verbose')) {
  console.log('跳过名单：')
  for (const f of filteredOut) console.log('  - ' + f)
}
