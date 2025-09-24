// /lib/links.js
// 环境变量：NOTION_TOKEN, FRIENDS_DB_ID
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28'

// 10 秒超时；429/5xx 最多重试 2 次，避免卡死
async function notion(path, init = {}, { timeout = 10000, retries = 2 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
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
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
          continue
        }
        throw new Error(`Notion ${res.status}: ${txt}`)
      }
      return res.json()
    } catch (e) {
      clearTimeout(t)
      lastErr = e
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      throw lastErr
    }
  }
}

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

// 头像：优先 Avatar；失败 → DuckDuckGo 域名图标；再兜底 /favicon.ico
function resolveAvatar(avatarProp, siteUrl) {
  const f = avatarProp?.files?.[0]
  if (f) {
    if (f.type === 'external' && f.external?.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file?.url) return f.file.url // 可能会过期，前端 onError 再兜底
  }
  if (avatarProp?.url) return withHttps(avatarProp.url)
  try {
    const u = new URL(siteUrl)
    return `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
  } catch { /* ignore */ }
  return '/favicon.ico'
}

export async function getLinksAndCategories() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  // 读取数据库元信息，取分类选项顺序（若有）
  const db = await notion(`/databases/${DB_ID}`)
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const optionOrder = opt.map(o => o.name)

  // 宽松的「发布状态」过滤（没有该列就不筛）
  const statusKey = ['Status', '状态', 'Visible', '发布', 'Published', '公开'].find(k => db.properties?.[k])
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
      const pName = pick(p, ['Name', '名称', '标题'])
      const pURL  = pick(p, ['URL', 'Link', '链接'])
      const pDesc = pick(p, ['Description', '描述', '简介', 'Desc'])
      const pAvat = pick(p, ['Avatar', 'Icon', '图标'])
      const pLang = pick(p, ['Language', '语言'])
      const pCat  = pick(p, ['Category', '分类'])
      const pW    = pick(p, ['Weight', '权重'])
      const pRSS  = pick(p, ['RSS'])

      const site = withHttps(url(pURL))
      const avatar = resolveAvatar(pAvat, site)

      const cats = []
      if (pCat?.multi_select) cats.push(...pCat.multi_select.map(s => s.name))
      else if (pCat?.select)  cats.push(pCat.select.name)

      items.push({
        Name: t(pName),
        URL: site,
        Categories: cats,
        Description: rich(pDesc),
        Avatar: avatar,
        Language: sel(pLang),
        Weight: num(pW),
        RSS: withHttps(url(pRSS))
      })
    }

    has_more = data.has_more
    start_cursor = data.next_cursor
  }

  // 分类：优先数据库设置的顺序；补齐实际使用的；没有分类的归「未分类」
  const used = Array.from(new Set(items.flatMap(i => i.Categories || []).filter(Boolean)))
  let categories = optionOrder.filter(n => used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c)
  if (items.some(i => !i.Categories?.length)) categories = [...categories, '未分类']

  return { items, categories }
}
