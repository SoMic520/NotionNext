import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { getServerSideSitemap } from 'next-sitemap'

/**
 * 规范化域名链接，移除尾部斜杠
 */
function normalizeLink(link) {
  if (!link) return ''
  return link.endsWith('/') ? link.slice(0, -1) : link
}

/**
 * 获取当前请求的完整域名
 */
function getRuntimeLink(req) {
  const host = req?.headers?.host
  const proto =
    req?.headers?.['x-forwarded-proto'] ||
    req?.headers?.['x-real-proto'] ||
    'https'
  return host ? `${proto}://${host}` : ''
}

/**
 * 将 URL 编码并转义为可在 XML 中安全使用的字符串
 * @param {string} url
 * @returns {string}
 */
function formatSitemapUrl(url) {
  if (!url) return ''
  // 去除 XML 不允许的控制字符
  const sanitized = url.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
  if (!sanitized) return ''
  const encodedUrl = encodeURI(sanitized)
  return encodedUrl
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 如果配置的域名与当前访问域名不一致，优先使用当前请求域名，避免生成不被允许的 URL
 */
function resolveSiteLink(configLink, req) {
  const normalizedConfig = normalizeLink(configLink)
  const normalizedRuntime = normalizeLink(getRuntimeLink(req))

  // 只要有当前请求域名，就优先使用它，避免谷歌提示“不允许的网址”
  if (normalizedRuntime) {
    return normalizedRuntime
  }

  return normalizedConfig
}

export const getServerSideProps = async (ctx) => {
  let fields = [] // 用于存储所有 URL 数据
  const siteIds = BLOG.NOTION_PAGE_ID.split(',') // 处理多个站点ID

  for (let index = 0; index < siteIds.length; index++) {
    const siteId = siteIds[index]
    const id = extractLangId(siteId)
    const locale = extractLangPrefix(siteId)
    let siteData

    try {
      // 获取站点的全局数据
      siteData = await getGlobalData({ pageId: id, from: 'sitemap.xml' })
    } catch (error) {
      console.error('Error fetching site data for:', siteId)
      continue; // 如果出错，跳过该站点
    }

    // 获取站点的 URL 配置
    const configLink = siteConfig(
      'LINK',
      siteData?.siteInfo?.link,
      siteData.NOTION_CONFIG
    )
    const link = resolveSiteLink(configLink, ctx.req)

    // 生成本地化的站点地图
    const localeFields = generateLocalesSitemap(link, siteData.allPages, locale)
    fields = fields.concat(localeFields) // 合并到最终的字段
  }

  // 如果没有任何可用链接，则兜底返回当前域名的根路径，避免 500
  if (!fields.length) {
    const fallback = normalizeLink(getRuntimeLink(ctx.req))
    if (fallback) {
      const today = new Date().toISOString().split('T')[0]
      fields = [
        {
          loc: formatSitemapUrl(fallback),
          lastmod: today,
          changefreq: 'daily',
          priority: '0.7'
        }
      ]
    }
  }

  // 确保 URL 唯一性
  fields = getUniqueFields(fields)

  // 设置响应头，确保以 XML 返回且可缓存（1小时有效，59秒过期）
  ctx.res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  ctx.res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=59')

  // 返回站点地图数据
  return getServerSideSitemap(ctx, fields)
}

function generateLocalesSitemap(link, allPages, locale) {
  // 确保链接不以斜杠结尾
  if (link && link.endsWith('/')) {
    link = link.slice(0, -1)
  }

  // 确保 locale 以斜杠开头
  if (locale && locale.length > 0 && !locale.startsWith('/')) {
    locale = '/' + locale
  }

  const dateNow = new Date().toISOString().split('T')[0]

  // 默认页面 URL 配置
  const defaultFields = [
    {
      loc: formatSitemapUrl(`${link}${locale}`),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: formatSitemapUrl(`${link}${locale}/archive`),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: formatSitemapUrl(`${link}${locale}/category`),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: formatSitemapUrl(`${link}${locale}/rss/feed.xml`),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: formatSitemapUrl(`${link}${locale}/search`),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: formatSitemapUrl(`${link}${locale}/tag`),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    }
  ]

  // 为每篇发布的文章生成站点地图 URL
  const postFields =
    allPages
      ?.filter(p => p.status === BLOG.NOTION_PROPERTY_NAME.status_publish)
      ?.map(post => {
        const slugWithoutLeadingSlash = post?.slug.startsWith('/')
          ? post?.slug?.slice(1)
          : post.slug
        const lastmod = post?.publishDay ? new Date(post?.publishDay).toISOString().split('T')[0] : dateNow
        return {
          loc: formatSitemapUrl(`${link}${locale}/${slugWithoutLeadingSlash}`),
          lastmod,
          changefreq: 'daily',
          priority: '0.7'
        }
      }) ?? []

  return defaultFields.concat(postFields) // 合并所有 URL
}

function getUniqueFields(fields) {
  const uniqueFieldsMap = new Map()

  fields.forEach(field => {
    const existingField = uniqueFieldsMap.get(field.loc)

    if (!existingField || new Date(field.lastmod) > new Date(existingField.lastmod)) {
      uniqueFieldsMap.set(field.loc, field)
    }
  })

  return Array.from(uniqueFieldsMap.values()) // 返回唯一的 URL
}

export default () => {}
