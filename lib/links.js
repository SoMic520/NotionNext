// /lib/links.js
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28' // 支持 status 属性

const DISABLE_FILTER = String(process.env.FRIENDS_NO_FILTER || '').toLowerCase() === '1'
const FRIENDS_DEBUG  = String(process.env.FRIENDS_DEBUG  || '').toLowerCase() === '1'

// 通用请求（超时 + 重试）
async function notion(path, init = {}, { timeout = 10000, retries = 2 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort('timeout'), timeout)
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
      clearTimeout(timer)
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
      clearTimeout(timer)
      lastErr = e
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      throw lastErr
    }
  }
}

const pick = (props, names) => { for (const n of names) if (props && props[n]) return props[n] }
const readTitle = p => ((p && p.title) || []).map(x => (x && x.plain_text) || '').join('').trim()
const readRich  = p => ((p && p.rich_text) || []).map(x => (x && x.plain_text) || '').join('').trim()
const readURL   = p => ((p && p.url) || readRich(p) || readTitle(p) || '').trim()
const readSel   = p => (p && p.select && p.select.name ? p.select.name.trim() : '')
const readNum   = p => (p && typeof p.number === 'number' ? p.number : 0)

function withHttps(u) {
  if (!u) return ''
  const s = String(u).trim()
  if (/^https?:\/\//i.test(s)) return s
  if (/^\/\//.test(s)) return `https:${s}`
  return `https://${s.replace(/^\/+/, '')}`
}

function resolveAvatar(avatarProp, siteUrl) {
  const f = avatarProp && avatarProp.files && avatarProp.files[0]
  if (f) {
    if (f.type === 'external' && f.external && f.external.url) return withHttps(f.external.url)
    if (f.type === 'file' && f.file && f.file.url) return f.file.url
  }
  if (avatarProp && avatarProp.url) return withHttps(avatarProp.url)
  try {
    const u = new URL(siteUrl)
    return `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`
  } catch (_) {}
  return '/favicon.ico'
}

function buildStatusFilter(db, dbg) {
  if (DISABLE_FILTER) { dbg.filterDisabledByEnv = true; return undefined }
  const keys = ['Status','状态','Visible','发布','Published','公开','发布状态','显示']
  const key = keys.find(k => db.properties && db.properties[k])
  dbg.filterKey = key || null
  if (!key) return undefined
  const prop = db.properties[key]
  const ALLOW = ['正常','Normal','Published','公开','已发布','显示','可见','Enable','Enabled','On']

  if (prop && prop.type === 'status') {
    const options = (prop.status && prop.status.options ? prop.status.options.map(o => o.name) : []) || []
    const usable  = ALLOW.filter(v => options.includes(v))
    dbg.filterType = 'status'; dbg.filterOptions = options; dbg.filterUsable = usable
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, status: { equals: v } })) }
  }
  if (prop && prop.type === 'select') {
    const options = (prop.select && prop.select.options ? prop.select.options.map(o => o.name) : []) || []
    const usable  = ALLOW.filter(v => options.includes(v))
    dbg.filterType = 'select'; dbg.filterOptions = options; dbg.filterUsable = usable
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, select: { equals: v } })) }
  }
  dbg.filterType = (prop && prop.type) || 'unknown'
  return undefined
}

async function getLinksAndCategories(opts = {}) {
  if (!NOTION_TOKEN || !DB_ID) {
    const err = `Missing env: ${!NOTION_TOKEN ? 'NOTION_TOKEN ' : ''}${!DB_ID ? 'FRIENDS_DB_ID' : ''}`.trim()
    const e = new Error(err); e.code = 'ENV_MISSING'; throw e
  }

  const debug = { DISABLE_FILTER, NOTION_VERSION }
  const db = await notion(`/databases/${DB_ID}`)
  debug.dbHasCategory = !!(db.properties && db.properties.Category)
  debug.dbTitle = (db.title && db.title[0] && db.title[0].plain_text) || ''

  const opt = (db.properties && db.properties.Category && (
    (db.properties.Category.select && db.properties.Category.select.options) ||
    (db.properties.Category.multi_select && db.properties.Category.multi_select.options)
  )) || []
  const optionOrder = opt.map(o => o.name)

  const safeFilter = buildStatusFilter(db, debug)

  const sorts = []
  if (db.properties && db.properties.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db.properties && db.properties.Name)   sorts.push({ property: 'Name',   direction: 'ascending'  })

  async function pullAll(filterOrUndefined) {
    const pages = []
    let start_cursor, has_more = true
    while (has_more) {
      const body = { page_size: 100, start_cursor }
      if (filterOrUndefined) body.filter = filterOrUndefined
      if (sorts.length) body.sorts = sorts
      const data = await notion(`/databases/${DB_ID}/query`, { method: 'POST', body: JSON.stringify(body) })
      pages.push(...data.results)
      has_more = data.has_more
      start_cursor = data.next_cursor
    }
    return pages
  }

  let pages = await pullAll(safeFilter)
  debug.countWithFilter = pages.length
  if (safeFilter && pages.length === 0) { debug.fallbackNoFilter = true; pages = await pullAll(undefined) }
  debug.countNoFilter = pages.length

  const items = []
  for (const page of pages) {
    const p = page.properties || {}
    const pName = pick(p, ['Name','名称','标题'])
    const pURL  = pick(p, ['URL','Url','Link','链接','网址','网站','Homepage','Home','Site'])
    const pDesc = pick(p, ['Description','描述','简介','Desc'])
    const pAvat = pick(p, ['Avatar','Icon','图标'])
    const pLang = pick(p, ['Language','语言'])
    const pCat  = pick(p, ['Category','分类'])
    const pW    = pick(p, ['Weight','权重'])
    const pRSS  = pick(p, ['RSS','Feed'])

    const site = withHttps(readURL(pURL))
    const avatar = resolveAvatar(pAvat, site)

    const cats = []
    if (pCat && pCat.multi_select) cats.push(...pCat.multi_select.map(s => s.name))
    else if (pCat && pCat.select)  cats.push(pCat.select.name)

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

  const used = Array.from(new Set(items.flatMap(i => (i.Categories || [])).filter(Boolean)))
  let categories = optionOrder.filter(n => used.includes(n))
  for (const c of used) if (!categories.includes(c)) categories.push(c)
  if (items.some(i => !(i.Categories && i.Categories.length))) categories = categories.concat('未分类')

  return (FRIENDS_DEBUG || opts.debug) ? { items, categories, __debug: debug } : { items, categories }
}

// 同时提供命名导出与默认导出
export { getLinksAndCategories }
export default getLinksAndCategories
