#!/usr/bin/env node
/**
 * 校验 data/deals.json 是否符合 data/schema.json
 * 用法：node scripts/validate.js
 * 全过退出码 0，否则退出码 1。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dealsPath = join(root, 'data', 'deals.json')
const schemaPath = join(root, 'data', 'schema.json')

let deals, schema
try {
  deals = JSON.parse(readFileSync(dealsPath, 'utf8'))
  schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
} catch (e) {
  console.error(`❌ JSON 解析失败: ${e.message}`)
  process.exit(1)
}

const errors = []

// ---- 类型定义（简化版 JSON Schema 校验器，无第三方依赖） ----
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** @returns {string[]} */
function checkType(path, value, type) {
  const t = typeof value
  switch (type) {
    case 'string': return t === 'string' ? [] : [`${path}: 应为 string，实际 ${t}`]
    case 'array': return Array.isArray(value) ? [] : [`${path}: 应为 array，实际 ${t}`]
    case 'object': return value && t === 'object' && !Array.isArray(value) ? [] : [`${path}: 应为 object`]
    default: return [`${path}: 未知类型 ${type}`]
  }
}

/** @returns {string[]} */
function validateItem(schemaItem, item, path) {
  const errs = []
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return [`${path}: 应为 object`]
  }
  for (const key of schemaItem.required) {
    if (!(key in item)) {
      errs.push(`${path}: 缺少必填字段 "${key}"`)
    }
  }
  const allowed = new Set(Object.keys(schemaItem.properties))
  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) {
      errs.push(`${path}: 多余字段 "${key}"`)
    }
  }
  for (const [key, prop] of Object.entries(schemaItem.properties)) {
    if (!(key in item)) continue
    const v = item[key]
    const p = `${path}.${key}`
    if (prop.type === 'string') {
      if (typeof v !== 'string') { errs.push(`${p}: 应为 string`); continue }
      if (prop.minLength !== undefined && v.length < prop.minLength) {
        errs.push(`${p}: 长度不足 minLength=${prop.minLength}`)
      }
      if (prop.enum && !prop.enum.includes(v)) {
        errs.push(`${p}: "${v}" 不在枚举 [${prop.enum.join(', ')}] 内`)
      }
    } else if (prop.type === 'array') {
      if (!Array.isArray(v)) { errs.push(`${p}: 应为 array`); continue }
      for (let i = 0; i < v.length; i++) {
        if (typeof v[i] !== 'string') {
          errs.push(`${p}[${i}]: 应为 string`)
        }
      }
    }
  }
  return errs
}

// ---- 顶层：数组 ----
if (!Array.isArray(deals)) {
  console.error('❌ data/deals.json 顶层应为数组')
  process.exit(1)
}

deals.forEach((item, i) => {
  errors.push(...validateItem(schema.items, item, `deals[${i}]`))
  // 附加业务校验
  if (typeof item === 'object' && item !== null) {
    if (item.id && !DATE_RE.test(item['抓取时间'] || '')) {
      errors.push(`deals[${i}].抓取时间: 应为 YYYY-MM-DD 或 "-"`)
    }
  }
})

// ---- ID 唯一性 ----
const ids = deals.filter((d) => d && typeof d.id === 'string').map((d) => d.id)
const seen = new Set()
for (const id of ids) {
  if (seen.has(id)) errors.push(`重复 id: ${id}`)
  seen.add(id)
}

if (errors.length > 0) {
  console.error(`❌ 校验失败，共 ${errors.length} 处：`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`✅ 校验通过：${deals.length} 条数据全部符合 schema（schema 校验 + id 去重）`)
