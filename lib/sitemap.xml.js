import BLOG from '@/blog.config'
import fs from 'fs'
import { siteConfig } from './config'

/**
 * 移除 XML 不允许的控制字符
 * @param {string} value
 * @returns {string}
 */
function stripInvalidXmlChars(value) {
  if (!value) return ''
  return value.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
}

/**
 * 将 URL 编码并转义为可在 XML 中安全使用的字符串
 * @param {string} url
 * @returns {string}
 */
function formatSitemapUrl(url) {
  const sanitized = stripInvalidXmlChars(url)
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
 * 生成站点地图
 * @param {*} param0
 */
export function generateSitemapXml({ allPages, NOTION_CONFIG }) {
  let link = siteConfig('LINK', BLOG.LINK, NOTION_CONFIG)
  // 确保链接不以斜杠结尾
  if (link && link.endsWith('/')) {
    link = link.slice(0, -1)
  }
  const urls = [
    {
      loc: formatSitemapUrl(`${link}`),
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: formatSitemapUrl(`${link}/archive`),
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: formatSitemapUrl(`${link}/category`),
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily'
    },
    {
      loc: formatSitemapUrl(`${link}/tag`),
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily'
    }
  ]
  // 循环页面生成
  allPages?.forEach(post => {
    const slugWithoutLeadingSlash = post?.slug?.startsWith('/')
      ? post?.slug?.slice(1)
      : post.slug
    urls.push({
      loc: formatSitemapUrl(`${link}/${slugWithoutLeadingSlash}`),
      lastmod: new Date(post?.publishDay || Date.now()).toISOString().split('T')[0],
      changefreq: 'daily'
    })
  })
  const xml = createSitemapXml(urls)
  try {
    fs.writeFileSync('sitemap.xml', xml)
    fs.writeFileSync('./public/sitemap.xml', xml)
  } catch (error) {
    console.warn('无法写入文件', error)
  }
}

/**
 * 生成站点地图
 * @param {*} urls
 * @returns
 */
function createSitemapXml(urls) {
  let urlsXml = ''
  urls.forEach(u => {
    if (!u?.loc) return
    urlsXml += `<url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    </url>
    `
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
xmlns:xhtml="http://www.w3.org/1999/xhtml"
xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>`
}
