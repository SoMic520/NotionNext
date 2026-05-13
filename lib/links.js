const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const REQUEST_TIMEOUT = 10000
const RETRY_COUNT = 2

const DISABLE_FILTER = String(process.env.FRIENDS_NO_FILTER || '').toLowerCase() === '1'
const FRIENDS_DEBUG = String(process.env.FRIENDS_DEBUG || '').toLowerCase() === '1'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function getDatabaseId(opts = {}) {
  return (
    opts.dbId ||
    opts.FRIENDS_DB_ID ||
    opts.NOTION_LINKS_DB_ID ||
    process.env.FRIENDS_DB_ID ||
    process.env.NOTION_LINKS_DB_ID ||
    process.env.NOTION_DATABASE_ID ||
    process.env.LINKS_DB_ID ||
    process.env.DB_ID ||
    ''
  )
}

function pick(properties = {}, keys = []) {
  for (const key of keys) {
    if (properties?.[key]) return properties[key]
  }
  return null
}

function getTextValue(prop) {
  if (!prop) return ''
  if (prop.type === 'title') {
    return (prop.title || []).map(it => it.plain_text || '').join('').trim()
  }
  if (prop.type === 'rich_text') {
    return (prop.rich_text || []).map(it => it.plain_text || '').join('').trim()
  }
  if (prop.type === 'url') {
    return (prop.url || '').trim()
  }
  if (prop.type === 'select') {
    return prop.select?.name?.trim() || ''
  }
  if (prop.type === 'multi_select') {
    return (prop.multi_select || [])
      .map(it => it.name || '')
      .filter(Boolean)
      .join(',')
      .trim()
  }
  if (prop.type === 'email' || prop.type === 'phone_number') {
    return (prop[prop.type] || '').trim()
  }
  if (prop.type === 'status') {
    return prop.status?.name?.trim() || ''
  }
  return ''
}

function getNumberValue(prop) {
  if (!prop) return 0
  if (prop.type === 'number') return Number(prop.number || 0)
  const n = Number(getTextValue(prop))
  return Number.isFinite(n) ? n : 0
}

function getCategoryValues(prop) {
  if (!prop) return []
  if (prop.type === 'multi_select') {
    return (prop.multi_select || []).map(it => it.name).filter(Boolean)
  }
  if (prop.type === 'select') {
    return prop.select?.name ? [prop.select.name] : []
  }
  const text = getTextValue(prop)
  if (!text) return []
  return text
    .split(/[，,|/]/)
    .map(s => s.trim())
    .filter(Boolean)
}

function withHttps(url = '') {
  const value = String(url || '').trim().replace(/[)\]\}，。；、？！,.;:]+$/g, '')
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (/^\/\//.test(value)) return `https:${value}`
  return `https://${value.replace(/^\/+/, '')}`
}

function getFavicon(url = '') {
  try {
    const normalized = withHttps(url)
    if (!normalized) return '/favicon.ico'
    const { hostname } = new URL(normalized)
    if (!hostname) return '/favicon.ico'
    return `https://icons.duckduckgo.com/ip3/${hostname.replace(/^www\./, '')}.ico`
  } catch (error) {
    return '/favicon.ico'
  }
}

function resolveAvatar(avatarProp, url) {
  if (avatarProp?.type === 'url' && avatarProp.url) {
    return withHttps(avatarProp.url)
  }
  if (avatarProp?.type === 'files') {
    const file = avatarProp.files?.[0]
    if (file?.type === 'external' && file.external?.url) return withHttps(file.external.url)
    if (file?.type === 'file' && file.file?.url) return file.file.url
  }
  return getFavicon(url)
}

async function notion(path, options = {}, retry = 0) {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_TOKEN_V2
  if (!token) throw new Error('Missing NOTION_TOKEN or NOTION_TOKEN_V2')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(`${NOTION_API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })

    if ((response.status === 429 || response.status >= 500) && retry < RETRY_COUNT) {
      await sleep(400 * (retry + 1))
      return notion(path, options, retry + 1)
    }

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Notion API ${response.status}: ${text}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function buildStatusFilter(db, debug) {
  if (DISABLE_FILTER) {
    debug.filterDisabledByEnv = true
    return undefined
  }

  const keys = ['Status', '状态', 'Visible', '发布', 'Published', '公开', '发布状态', '显示']
  const key = keys.find(k => db?.properties?.[k])
  debug.filterKey = key || null
  if (!key) return undefined

  const prop = db.properties[key]
  const allow = ['正常', 'Normal', 'Published', '公开', '已发布', '显示', '可见', 'Enable', 'Enabled', 'On']

  if (prop?.type === 'status') {
    const options = (prop.status?.options || []).map(o => o.name)
    const usable = allow.filter(v => options.includes(v))
    debug.filterType = 'status'
    debug.filterOptions = options
    debug.filterUsable = usable
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, status: { equals: v } })) }
  }

  if (prop?.type === 'select') {
    const options = (prop.select?.options || []).map(o => o.name)
    const usable = allow.filter(v => options.includes(v))
    debug.filterType = 'select'
    debug.filterOptions = options
    debug.filterUsable = usable
    if (usable.length === 0) return undefined
    return { or: usable.map(v => ({ property: key, select: { equals: v } })) }
  }

  debug.filterType = prop?.type || 'unknown'
  return undefined
}

function parseItems(results = []) {
  return results
    .map(page => {
      const properties = page?.properties || {}
      const nameProp = pick(properties, ['Name', '名称', '标题', 'Title'])
      const urlProp = pick(properties, ['URL', 'Url', 'Link', '链接', '网址', '网站', 'Homepage', 'Home', 'Site'])
      const categoryProp = pick(properties, ['Category', '分类', 'Categories', '类别'])
      const avatarProp = pick(properties, ['Avatar', 'Icon', 'Logo', '图标', '头像'])
      const descProp = pick(properties, ['Description', '描述', '简介', 'Desc', '说明'])
      const weightProp = pick(properties, ['Weight', '权重', '排序', 'Order'])
      const langProp = pick(properties, ['Language', '语言'])
      const rssProp = pick(properties, ['RSS', 'Feed'])

      const Name = getTextValue(nameProp)
      const URL = withHttps(getTextValue(urlProp))
      if (!Name || !URL) return null

      const Categories = getCategoryValues(categoryProp)
      const Description = getTextValue(descProp)
      const Weight = getNumberValue(weightProp)
      const Avatar = resolveAvatar(avatarProp, URL)

      return {
        id: page.id,
        Name,
        URL,
        Categories,
        Description,
        Avatar,
        Logo: Avatar,
        Language: getTextValue(langProp),
        Weight,
        RSS: withHttps(getTextValue(rssProp))
      }
    })
    .filter(Boolean)
}

async function pullAll(dbId, filter, sorts) {
  const pages = []
  let startCursor
  let hasMore = true

  while (hasMore) {
    const body = { page_size: 100 }
    if (startCursor) body.start_cursor = startCursor
    if (filter) body.filter = filter
    if (sorts?.length) body.sorts = sorts

    const data = await notion(`/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify(body)
    })

    pages.push(...(data.results || []))
    hasMore = Boolean(data.has_more)
    startCursor = data.next_cursor
  }

  return pages
}

export async function getLinksAndCategories(opts = {}) {
  const dbId = getDatabaseId(opts)
  if (!dbId) throw new Error('Missing links database id env/config (FRIENDS_DB_ID/NOTION_LINKS_DB_ID/DB_ID)')

  const debug = { DISABLE_FILTER, NOTION_VERSION, dbId }
  const db = await notion(`/databases/${dbId}`, { method: 'GET' })
  const categoryProperty = pick(db?.properties || {}, ['Category', '分类', 'Categories', '类别'])
  const categoryOptions = (
    categoryProperty?.select?.options ||
    categoryProperty?.multi_select?.options ||
    []
  )
    .map(it => it.name)
    .filter(Boolean)

  const sorts = []
  if (db?.properties?.Weight) sorts.push({ property: 'Weight', direction: 'descending' })
  if (db?.properties?.Name) sorts.push({ property: 'Name', direction: 'ascending' })

  const filter = buildStatusFilter(db, debug)
  let pages = await pullAll(dbId, filter, sorts)
  debug.countWithFilter = pages.length
  if (filter && pages.length === 0) {
    debug.fallbackNoFilter = true
    pages = await pullAll(dbId, undefined, sorts)
  }
  debug.countNoFilter = pages.length

  const items = parseItems(pages)
  const usedCategories = Array.from(
    new Set(items.flatMap(it => it.Categories || []).filter(Boolean))
  )

  const categories = categoryOptions.filter(cat => usedCategories.includes(cat))
  for (const cat of usedCategories) {
    if (!categories.includes(cat)) categories.push(cat)
  }
  if (items.some(it => !it.Categories || it.Categories.length === 0)) {
    categories.push('未分类')
  }

  return (FRIENDS_DEBUG || opts.debug)
    ? { items, categories, __debug: debug }
    : { items, categories }
}

export { getFavicon, resolveAvatar, withHttps }
export default getLinksAndCategories
