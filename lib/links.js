// /lib/links.js
// 环境变量：NOTION_TOKEN（必填）; FRIENDS_DB_ID（可不填，默认用你给的这个）
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID || '2755906f3c428088928dfc62610854dc'
const NOTION_VERSION = '2022-06-28'

// ---------- 小工具 ----------
const pick = (props, names) => { for (const n of names) if (props?.[n]) return props[n] }
const t    = p => (p?.title || []).map(x => x?.plain_text || '').join('')
const rich = p => (p?.rich_text || []).map(x => x?.plain_text || '').join('')
const url  = p => p?.url || ''
const sel  = p => p?.select?.name || ''
const num  = p => typeof p?.number === 'number' ? p.number : 0

const withHttps = u => {
  if (!u) return ''
  const s = String(u).trim()
  return /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, '')}`
}

const getFavicon = (site) => {
  try {
    const { hostname } = new URL(withHttps(site))
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`
  } catch {
    return '/favicon.ico'
  }
}

function resolveAvatar(avatarProp, siteUrl) {
  const f = avatarProp?.files?.[0]
  if (f) {
    if (f.type === 'external' && f.external?.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file?.url) return f.file.url // 可能过期，前端再兜底
  }
  if (avatarProp?.url) return withHttps(avatarProp.url)
  return getFavicon(siteUrl)
}

// ---------- Notion 基础请求（10s 超时 + 429/5xx 重试） ----------
async function notion(path, init = {}, { timeout = 10000, retries = 2 } = {}) {
  if (!NOTION_TOKEN) throw new Error('Missing NOTION_TOKEN')
  let lastErr
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort('timeout'), timeout)
    try {
      const res = await fetch(`https://api.notion.com/v1${path}`, {
        ...init,
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
          ...(init.headers || {})
        },
        signal: ac.signal
      })
      clearTimeout(t)
      if (!res.ok) {
        const txt = await res.text()
        if ((res.status === 429 || res.status >= 500) && i < retries) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)))
          continue
        }
        throw new Error(`Notion ${res.status}: ${txt}`)
      }
      return res.json()
    } catch (e) {
      clearTimeout(t)
      lastErr = e
      if (i < retries) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)))
        continue
      }
      throw lastErr
    }
  }
}

// ---------- 公开方法 ----------
export async function getLinksAndCategories() {
  const db = await notion(`/databases/${DB_ID}`)

  const opt = db.properties?.Category?.select?.options
          || db.properties?.Category?.multi_select?.options
          || []
  const optionOrder = opt.map(o => o.name)

  const statusKey = ['Status','状态','Visible','发布','Published','公开'].find(k => db.properties?.[k])
  const filter = statusKey ? {
    or: [
      { property: statusKey, select: { equals: '正常' } },
      { property: statusKey, select: { equals: 'Normal' } },
      { property: statusKey, select: { equals: 'Published' } },
      { property: statusKey, select: { equals: '公开' } }
    ]
  } : undefined

  const sorts = []
  if (db.properties?.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db.properties?.Name)   sorts.push({ property: 'Name',   direction: 'ascending'  })

  const items = []
  let start_cursor, has_more = true
  while (has_more) {
    const body = { page_size: 100, start_cursor }
    if (filter) body.filter = filter
    if (sorts.length) body.sorts = sorts

    const data = await notion(`/databases/${DB_ID}/query`, { method: 'POST', body: JSON.stringify(body) })

    for (const page of data.results) {
      const p = page.properties
      const pName = pick(p, ['Name','名称','标题'])
      const pURL  = pick(p, ['URL','Link','链接'])
      const pDesc = pick(p, ['Description','描述','简介','Desc'])
      const pAvat = pick(p, ['Avatar','Icon','图标'])
      const pCat  = pick(p, ['Category','分类'])
      const pW    = pick(p, ['Weight','权重'])
      const pLang = pick(p, ['Language','语言'])
      const pRSS  = pick(p, ['RSS'])

      const site   = withHttps(url(pURL))
      const avatar = resolveAvatar(pAvat, site)

      const cats = []
      if (pCat?.multi_select) cats.push(...pCat.multi_select.map(s => s.name))
      else if (pCat?.select)  cats.push(pCat.select.name)

      items.push({
        Name: t(pName),
        URL: site,                 // ✅ 已补全 https:// ，点击必能跳
        Avatar: avatar,
        Logo: avatar,              // ✅ 前端优先用
        Description: rich(pDesc),
        Categories: cats,
        Weight: num(pW),
        Language: sel(pLang),
        RSS: withHttps(url(pRSS))
      })
    }

    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  const used = Array.from(new Set(items.flatMap(i => i.Categories || []).filter(Boolean)))
  let categories = optionOrder.filter(n => used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c)
  if (items.some(i => !i.Categories?.length)) categories = [...categories, '未分类']

  return { items, categories }
}
