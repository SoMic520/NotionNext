// /lib/links.js
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28' // 支持 status 属性类型

// 10 秒超时；429/5xx 最多重试 2 次
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

// 读取器（兼容 title / rich_text / url）
const readTitle = p => (p?.title || []).map(x => x?.plain_text || '').join('').trim()
const readRich  = p => (p?.rich_text || []).map(x => x?.plain_text || '').join('').trim()
const readURL   = p => (p?.url || readRich(p) || readTitle(p) || '').trim()
const readSel   = p => (p?.select?.name || '').trim()
const readNum   = p => (typeof p?.number === 'number' ? p.number : 0)

const withHttps = u => {
  if (!u) return ''
  const s = String(u).trim()
  if (/^https?:\/\//i.test(s)) return s
  if (/^\/\//.test(s)) return `https:${s}`
  return `https://${s.replace(/^\/+/, '')}`
}

// 头像兜底：Avatar → DuckDuckGo → /favicon.ico
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

// 根据数据库 schema 构建最安全的发布过滤器；若无匹配则返回 undefined
function buildStatusFilter(db) {
  const candidateKeys = ['Status', '状态', 'Visible', '发布', 'Published', '公开']
  const key = candidateKeys.find(k => db.properties?.[k])
  if (!key) return undefined

  const prop = db.properties[key]
  const ALLOW = ['正常','Normal','Published','公开','已发布','显示','可见','Enable','Enabled','On']

  // status 类型
  if (prop?.type === 'status') {
    const options = prop.status?.options?.map(o => o.name) || []
    const usable = ALLOW.filter(v => options.includes(v))
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, status: { equals: v } })) }
  }

  // select 类型
  if (prop?.type === 'select') {
    const options = prop.select?.options?.map(o => o.name) || []
    const usable = ALLOW.filter(v => options.includes(v))
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, select: { equals: v } })) }
  }

  // 其他类型一律不筛
  return undefined
}

export async function getLinksAndCategories() {
  if (!NOTION_TOKEN || !DB_ID) throw new Error('Missing NOTION_TOKEN or FRIENDS_DB_ID')

  const db = await notion(`/databases/${DB_ID}`)

  // 分类选项顺序（有则用）
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const optionOrder = opt.map(o => o.name)

  // 更智能的发布过滤器
  const safeFilter = buildStatusFilter(db)

  const sorts = []
  if (db.properties?.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db.properties?.Name)   sorts.push({ property: 'Name',   direction: 'ascending'  })

  // 内部工具：分页拉取
  const pullAll = async (filterOrUndefined) => {
    const items = []
    let start_cursor, has_more = true
    while (has_more) {
      const body = { page_size: 100, start_cursor }
      if (filterOrUndefined) body.filter = filterOrUndefined
      if (sorts.length) body.sorts = sorts
      const data = await notion(`/databases/${DB_ID}/query`, { method: 'POST', body: JSON.stringify(body) })
      items.push(...data.results)
      has_more = data.has_more
      start_cursor = data.next_cursor
    }
    return items
  }

  // 先按过滤器查；若 0 条且设置过过滤器，则无过滤再查一次，避免空白页
  let pages = await pullAll(safeFilter)
  if (safeFilter && pages.length === 0) {
    pages = await pullAll(undefined)
  }

  const items = []
  for (const page of pages) {
    const p = page.properties
    const pName = pick(p, ['Name','名称','标题'])
    const pURL  = pick(p, ['URL','Url','Link','链接'])
    const pDesc = pick(p, ['Description','描述','简介','Desc'])
    const pAvat = pick(p, ['Avatar','Icon','图标'])
    const pLang = pick(p, ['Language','语言'])
    const pCat  = pick(p, ['Category','分类'])
    const pW    = pick(p, ['Weight','权重'])
    const pRSS  = pick(p, ['RSS','Feed'])

    const site = withHttps(readURL(pURL))
    const avatar = resolveAvatar(pAvat, site)

    const cats = []
    if (pCat?.multi_select) cats.push(...pCat.multi_select.map(s => s.name))
    else if (pCat?.select)  cats.push(pCat.select.name)

    items.push({
      Name: readTitle(pName) || readRich(pName),
      URL: site,
      Categories: cats,
      Description: readRich(pDesc),
      Avatar: avatar,
      Language: readSel(pLang),
      Weight: readNum(pW),
      RSS: withHttps(readURL(pRSS))
    })
  }

  // 分类顺序：按数据库选项顺序 + 使用过的兜底 + 未分类
  const used = Array.from(new Set(items.flatMap(i => i.Categories || []).filter(Boolean)))
  let categories = optionOrder.filter(n => used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c)
  if (items.some(i => !i.Categories?.length)) categories = [...categories, '未分类']

  return { items, categories }
}
