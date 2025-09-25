// /lib/links.js
const NOTION_TOKEN = process.env.NOTION_TOKEN
const DB_ID = process.env.FRIENDS_DB_ID
const NOTION_VERSION = '2022-06-28' // 支持 status 属性

// 可选：设置 FRIENDS_NO_FILTER=1 可彻底关闭“发布状态”过滤；FRIENDS_DEBUG=1 输出调试信息
const DISABLE_FILTER = String(process.env.FRIENDS_NO_FILTER || '').toLowerCase() === '1'
const FRIENDS_DEBUG  = String(process.env.FRIENDS_DEBUG  || '').toLowerCase() === '1'

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

// 生成“发布状态”过滤（status/select），若不可用或被关闭则返回 undefined
function buildStatusFilter(db, dbg) {
  if (DISABLE_FILTER) { dbg.filterDisabledByEnv = true; return undefined }
  const candidateKeys = ['Status', '状态', 'Visible', '发布', 'Published', '公开', '发布状态', '显示']
  const key = candidateKeys.find(k => db.properties?.[k])
  dbg.filterKey = key || null
  if (!key) return undefined

  const prop = db.properties[key]
  const ALLOW = ['正常','Normal','Published','公开','已发布','显示','可见','Enable','Enabled','On']

  if (prop?.type === 'status') {
    const options = prop.status?.options?.map(o => o.name) || []
    const usable  = ALLOW.filter(v => options.includes(v))
    dbg.filterType = 'status'
    dbg.filterOptions = options
    dbg.filterUsable  = usable
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, status: { equals: v } })) }
  }
  if (prop?.type === 'select') {
    const options = prop.select?.options?.map(o => o.name) || []
    const usable  = ALLOW.filter(v => options.includes(v))
    dbg.filterType = 'select'
    dbg.filterOptions = options
    dbg.filterUsable  = usable
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, select: { equals: v } })) }
  }
  dbg.filterType = prop?.type || 'unknown'
  return undefined
}

export async function getLinksAndCategories(opts = {}) {
  if (!NOTION_TOKEN || !DB_ID) {
    const err = `Missing env: ${!NOTION_TOKEN ? 'NOTION_TOKEN ' : ''}${!DB_ID ? 'FRIENDS_DB_ID' : ''}`.trim()
    const e = new Error(err)
    e.code = 'ENV_MISSING'
    throw e
  }

  const debug = { DISABLE_FILTER, NOTION_VERSION }
  const db = await notion(`/databases/${DB_ID}`)
  debug.dbHasCategory = !!db.properties?.Category
  debug.dbTitle = db.title?.[0]?.plain_text || ''

  // 分类选项顺序（有则用）
  const opt = db.properties?.Category?.select?.options || db.properties?.Category?.multi_select?.options || []
  const optionOrder = opt.map(o => o.name)

  // 更智能的发布过滤器
  const safeFilter = buildStatusFilter(db, debug)

  const sorts = []
  if (db.properties?.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db.properties?.Name)   sorts.push({ property: 'Name',   direction: 'ascending'  })

  const pullAll = async (filterOrUndefined) => {
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

  // 若带过滤为 0，则无过滤再查一次，避免空白页
  if (safeFilter && pages.length === 0) {
    debug.fallbackNoFilter = true
    pages = await pullAll(undefined)
  }
  debug.countNoFilter = pages.length

  const items = []
  for (const page of pages) {
    const p = page.properties
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

  return FRIENDS_DEBUG || opts.debug
    ? { items, categories, __debug: debug }
    : { items, categories }
}

// 同时提供默认导出，避免“不是函数”的导入不匹配问题
export default getLinksAndCategories
