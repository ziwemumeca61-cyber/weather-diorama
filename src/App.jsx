import { useMemo, useState } from 'react'
import deals from '../data/deals.json'

const CATEGORY = ['API额度', '软件试用', '云credits', '内测资格', '学生优惠']
const REGION = ['国内', '海外']
const STATUS = ['有效', '过期', '待验证']

/** 状态：数据库状态优先；结束日期早于今天的按过期展示（不改数据本身） */
function effectiveStatus(deal) {
  if (deal['结束日期'] && deal['结束日期'] !== '-') {
    const today = new Date().toISOString().slice(0, 10)
    if (deal['结束日期'] < today) return '过期'
  }
  return deal['状态']
}

function Badge({ children, className = '' }) {
  return <span className={`badge ${className}`}>{children}</span>
}

function DealCard({ deal, expanded, onToggle }) {
  const expired = effectiveStatus(deal) === '过期'
  return (
    <li
      className={`card ${expired ? 'card-expired' : ''} ${expanded ? 'card-expanded' : ''}`}
      onClick={onToggle}
    >
      <div className="card-main">
        <h3 className="card-title">
          {expired && <span className="tag tag-expired">已过期</span>}
          {deal['标题']}
        </h3>
        <p className="card-summary">{deal['一句话']}</p>
        <div className="card-badges">
          <Badge>{deal['品类']}</Badge>
          <Badge>{deal['地域']}</Badge>
          {deal['模型'] !== '-' && <Badge className="badge-model">{deal['模型']}</Badge>}
          {expired && <Badge>{effectiveStatus(deal)}</Badge>}
        </div>
      </div>

      {expanded && (
        <div className="card-detail">
          <h4>怎么领</h4>
          <ol className="steps">
            {deal['怎么领'].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <dl className="meta">
            <div>
              <dt>链接</dt>
              <dd>
                {deal['链接'] && deal['链接'] !== '-' ? (
                  <a
                    href={deal['链接']}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {deal['链接']}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>时效</dt>
              <dd>
                {deal['开始日期'] === '-' && deal['结束日期'] === '-'
                  ? '长期 / 以官方为准'
                  : `${deal['开始日期'] === '-' ? '?' : deal['开始日期']} ~ ${
                      deal['结束日期'] === '-' ? '长期' : deal['结束日期']
                    }`}
              </dd>
            </div>
            <div>
              <dt>验真状态</dt>
              <dd>{deal['验真']}</dd>
            </div>
            <div>
              <dt>抓取时间</dt>
              <dd>{deal['抓取时间']}</dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [region, setRegion] = useState('全部')
  const [status, setStatus] = useState('全部')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return deals.filter((d) => {
      if (q && !(d['标题'].toLowerCase().includes(q) || d['一句话'].toLowerCase().includes(q)))
        return false
      if (category !== '全部' && d['品类'] !== category) return false
      if (region !== '全部' && d['地域'] !== region) return false
      if (status !== '全部' && effectiveStatus(d) !== status) return false
      return true
    })
  }, [query, category, region, status])

  return (
    <div className="page">
      <header className="header">
        <h1>AI 羊毛聚合（内测版）</h1>
        <p className="tagline">AI 免费额度 · 试用 · 优惠，一处看全</p>
      </header>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="搜索羊毛：标题 / 一句话…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="全部">全部品类</option>
            {CATEGORY.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="全部">全部地域</option>
            {REGION.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="全部">全部状态</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="count">
          共 {filtered.length} 条{filtered.length !== deals.length && ` / 总 ${deals.length} 条`}
        </p>
      </div>

      <main>
        {filtered.length === 0 ? (
          <p className="empty">没有符合条件的羊毛，换个关键词试试？</p>
        ) : (
          <ul className="list">
            {filtered.map((d) => (
              <DealCard
                key={d.id}
                deal={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              />
            ))}
          </ul>
        )}
      </main>

      <footer className="footer">
        <p>
          数据来源：手动整理 + {''}
          <a href="https://github.com/rockbenben/free-llm-intel" target="_blank" rel="noreferrer">
            free-llm-intel
          </a>{' '}
          抓取。羊毛有时效，下手前请以官方页面为准。
        </p>
      </footer>
    </div>
  )
}
