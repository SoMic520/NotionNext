// /lib/links.js  （若用 src 结构放 /src/lib/links.js）
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

// ---- 字段读取：兼容 title / rich_text / url 三种 ----
const readTitle = p => (p?.title || []).map(x => x?.plain_text || '').join('').trim()
const readRich  = p => (p?.rich_text || []).map(x => x?.plain_text || '').join('').trim()
const readURL   = p => {
  if (!p) return ''
  // 优先 Notion 的 url 字段；否则容错 rich_text/title 中直接填的链接或域名
  return (p.url || readRich(p) || readTitle(p) || '').trim()
}
const readSel   = p => (p?.select?.name || '').trim()
const readNum   = p => (typeof p?.number === 'number' ? p.number : 0)

const withHttps = u => {
  if (!u) return ''
  const s = String(u).trim()
  // 支持 // 开头、裸域名、带路径的域名
  if (/^https?:\/\//i.test(s)) return s
  if (/^\/\//.test(s)) return `https:${s}`
  return `https://${s.replace(/^\/+/, '')}`
}

// 头像：优先 Avatar；失败 → DuckDuckGo 域名图标；再兜底 /favicon.ico
function resolveAvatar(avatarProp, siteUrl) {
  const f = avatarProp?.files?.[0]
  if (f) {
    if (f.type === 'external' && f.external?.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file?.url) return f.file.url
  }
  if (avatarProp?.url) return withHttps(avatarProp.url)
  try {
    const u = new URL(siteUrl)
    return `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
  } catch {}
  return '/favicon.ico'
}

export async function getLinksAndCategories() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  const db = await notion(`/databases/${DB_ID}`)
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const optionOrder = opt.map(o => o.name)

  // 宽松发布状态过滤（没有该列就不筛）
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
  if (d
