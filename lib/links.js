// /lib/links.js
// Env: NOTION_TOKEN (required), FRIENDS_DB_ID (optional)
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID || '2755906f3c428088928dfc62610854dc'
const NOTION_VERSION = '2022-06-28'

// helpers
const pick = (props, names) => { for (const n of names) if (props && props[n]) return props[n] }
const t    = p => ((p && p.title) || []).map(x => (x && x.plain_text) || '').join('')
const rich = p => ((p && p.rich_text) || []).map(x => (x && x.plain_text) || '').join('')
const url  = p => (p && p.url) || ''
const sel  = p => (p && p.select && p.select.name) || ''
const num  = p => (typeof (p && p.number) === 'number' ? p.number : 0)

// ensure https://
const withHttps = u => {
  if (!u) return ''
  const s = String(u).trim()
  return /^https?:\/\//i.test(s) ? s : 'https://' + s.replace(/^\/+/, '')
}

// favicon fallback (DuckDuckGo)
const getFavicon = site => {
  try {
    const { hostname } = new URL(withHttps(site))
    return 'https://icons.duckduckgo.com/ip3/' + hostname + '.ico'
  } catch {
    return '/favicon.ico'
  }
}

// avatar priority: Avatar(files/external) -> Avatar(url) -> domain favicon
function resolveAvatar(avatarProp, siteUrl) {
  const f = avatarProp && avatarProp.files && avatarProp.files[0]
  if (f) {
    if (f.type === 'external' && f.external && f.external.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file && f.file.url) return f.file.url
  }
  if (avatarProp && avatarProp.url) return withHttps(avatarProp.url)
  return getFavicon(siteUrl)
}

// Notion request with timeout + retries
async function notion(path, init = {}, { timeout = 10000, retries = 2 } = {}) {
  if (!NOTION_TOKEN) throw new Error('Missing NOTION_TOKEN')
  let lastErr
  for (let i = 0; i <= retries; i++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort('timeout'), timeout)
    try {
      const res = await fetch('https://api.notion.com/v1' + path, {
        ...init,
        headers: {
          'Authorization': 'Bearer ' + NOTION_TOKEN,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
          ...(init.headers || {})
        },
        signal: ac.signal
      })
      clearTimeout(timer)
      if (!res.ok) {
        const txt = await res.text()
        if ((res.status === 429 || res.status >= 500) && i < retries) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)))
          continue
        }
        throw new Error('Notion ' + res.status + ': ' + txt)
      }
      return await res.json()
    } catch (e) {
      clearTimeout(timer)
      lastErr = e
      if (i < retries) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)))
        continue
      }
      throw lastErr
    }
  }
}

export async function getLinksAndCategories() {
  const db = await notion('/databases/' + DB_ID)

  const opt = (db.properties && (
    (db.properties.Category && db.properties.Category.select && db.properties.Category.select.options) ||
    (db.properties.Category && db.properties.Category.multi_select && db.properties.Category.multi_select.options)
  )) || []
  const optionOrder = opt.map(o => o.name)

  const statusKey = ['Status', '\u72b6\u6001', 'Visible', '\u53d1\u5e03', 'Published', '\u516c\u5f00'].find(k => db.properties && db.properties[k])
  const filter = statusKey ? {
    or: [
      { property: statusKey, select: { equals: '\u6b63\u5e38' } },
      { property: statusKey, select: { equals: 'Normal' } },
      { property: statusKey, select: { equals: 'Published' } },
      { property: statusKey, select: { equals: '\u516c\u5f00' } }
    ]
  } : undefined

  const sorts = []
  if (db.properties && db.properties.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db.properties && db.properties.Name)   sorts.push({ property: 'Name',   direction: 'ascending'  })

  const items = []
  let start_cursor, has_more = true

  while (has_more) {
    const body = { page_size: 100, start_cursor }
    if (filter) body.filter = filter
    if (sorts.length) body.sorts = sorts

    const data = await notion('/databases/' + DB_ID + '/query', { method: 'POST', body: JSON.stringify(body) })

    for (const page of data.results) {
      const p = page.properties
      const pName = pick(p, ['Name', '\u540d\u79f0', '\u6807\u9898'])
      const pURL  = pick(p, ['URL', 'Link', '\u94fe\u63a5'])
      const pDesc = pick(p, ['Description', '\u63cf\u8ff0', '\u7b80\u4ecb', 'Desc'])
      const pAvat = pick(p, ['Avatar', 'Icon', '\u56fe\u6807'])
      const pCat  = pick(p, ['Category', '\u5206\u7c7b'])
      const pW    = pick(p, ['Weight', '\u6743\u91cd'])
      const pLang = pick(p, ['Language', '\u8bed\u8a00'])
      const pRSS  = pick(p, ['RSS'])

      const site   = withHttps(url(pURL))
      const avatar = resolveAvatar(pAvat, site)

      const cats = []
      if (pCat && pCat.multi_select) cats.push(...pCat.multi_select.map(s => s.name))
      else if (pCat && pCat.select)  cats.push(pCat.select.name)

      items.push({
        Name: t(pName),
        URL: site,
        Avatar: avatar,
        Logo: avatar,
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
  if (items.some(i => !(i.Categories && i.Categories.length))) categories = [...categories, '\u672a\u5206\u7c7b']

  return { items, categories }
}
