const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const REQUEST_TIMEOUT = 10000
const RETRY_COUNT = 2

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function getDatabaseId() {
  return (
    process.env.NOTION_LINKS_DB_ID ||
    process.env.NOTION_DATABASE_ID ||
    process.env.LINKS_DB_ID ||
    process.env.DB_ID ||
    ''
  )
}

function pick(properties = {}, keys = []) {
  for (const key of keys) {
    if (properties[key]) return properties[key]
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
  const value = (url || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function getFavicon(url = '') {
  try {
    const normalized = withHttps(url)
    if (!normalized) return '/favicon.ico'
    const { hostname } = new URL(normalized)
    if (!hostname) return '/favicon.ico'
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`
  } catch (error) {
    return '/favicon.ico'
  }
}

function resolveAvatar(avatarProp, url) {
  if (avatarProp?.type === 'url' && avatarProp.url) {
    return avatarProp.url
  }
  if (avatarProp?.type === 'files') {
    const file = avatarProp.files?.[0]
    if (file?.type === 'external' && file.external?.url) return file.external.url
    if (file?.type === 'file' && file.file?.url) return file.file.url
  }
  return getFavicon(url)
}

async function notion(path, options = {}, retry = 0) {
  const token = process.env.NOTION_TOKEN
  if (!token) throw new Error('Missing NOTION_TOKEN')

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

function parseItems(results = []) {
  return results
    .map(page => {
      const properties = page?.properties || {}
      const nameProp = pick(properties, ['Name', '名称', '标题'])
      const urlProp = pick(properties, ['URL', 'Link', '链接'])
      const categoryProp = pick(properties, ['Category', '分类'])
      const avatarProp = pick(properties, ['Avatar', 'Icon', '图标'])
      const descProp = pick(properties, ['Description', '描述', '简介', 'Desc'])
      const weightProp = pick(properties, ['Weight', '权重'])

      const Name = getTextValue(nameProp)
      const URL = withHttps(getTextValue(urlProp))
      if (!Name || !URL) return null

      const Categories = getCategoryValues(categoryProp)
      const Description = getTextValue(descProp)
      const Weight = getNumberValue(weightProp)
      const Logo = resolveAvatar(avatarProp, URL)

      return {
        id: page.id,
        Name,
        URL,
        Categories,
        Description,
        Weight,
        Logo,
        Avatar: Logo
      }
    })
    .filter(Boolean)
}

export async function getLinksAndCategories() {
  const dbId = getDatabaseId()
  if (!dbId) throw new Error('Missing links database id env (NOTION_LINKS_DB_ID/DB_ID)')

  const db = await notion(`/databases/${dbId}`, { method: 'GET' })
  const categoryProperty = pick(db?.properties || {}, ['Category', '分类'])
  const categoryOptions = (categoryProperty?.select?.options || categoryProperty?.multi_select?.options || [])
    .map(it => it.name)
    .filter(Boolean)

  const results = []
  let hasMore = true
  let cursor

  while (hasMore) {
    const body = {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    }
    const data = await notion(`/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify(body)
    })

    results.push(...(data.results || []))
    hasMore = Boolean(data.has_more)
    cursor = data.next_cursor
  }

  const items = parseItems(results)
  const usedCategories = Array.from(
    new Set(items.flatMap(it => it.Categories || []).filter(Boolean))
  )

  const categories = [...categoryOptions]
  for (const cat of usedCategories) {
    if (!categories.includes(cat)) categories.push(cat)
  }

  return { items, categories }
}

export { getFavicon, resolveAvatar, withHttps }
