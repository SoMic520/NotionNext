// /pages/links.js
import Head from 'next/head'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { getLinksAndCategories } from '@/lib/links'
import { useState, useEffect } from 'react'

/* ---------- URL 规范化 ---------- */
function normalizeUrl(u) {
  if (!u) return ''
  let s = String(u).trim()
  s = s.replace(/[)\]\}，。；、？！,.;:]+$/g, '')
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '')
  return s
}

function safeHost(u) {
  try { return new URL(normalizeUrl(u)).hostname.toLowerCase() } catch { return '' }
}

/* ---------- 图标获取：并发竞速各类 favicon ---------- */
function IconRace({ url, name }) {
  const host = safeHost(url)
  const nameInitial = (name || '').trim().charAt(0)
  const hostInitial = (host || '').charAt(0)
  const initial = (nameInitial || hostInitial || 'L').toUpperCase()
  const letter = `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="#888"/><text x="50%" y="50%" font-size="32" text-anchor="middle" fill="white" dy=".3em">${initial}</text></svg>`

  const [src, setSrc] = useState(letter)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const els = []
    const add = h => {
      if (!h) return
      const dns = document.createElement('link'); dns.rel = 'dns-prefetch'; dns.href = '//' + h
      const pre = document.createElement('link'); pre.rel = 'preconnect'; pre.href = 'https://' + h; pre.crossOrigin = ''
      document.head.appendChild(dns); document.head.appendChild(pre)
      els.push(dns, pre)
    }
    add(host)
    return () => { els.forEach(e => { try { document.head.removeChild(e) } catch {} }) }
  }, [host])

  useEffect(() => {
    let settled = false
    const imgs = []
    const done = (u) => { if (!settled) { settled = true; setSrc(u) } }

    const startRace = () => {
      const candidates = []
      if (host) {
        candidates.push(
          `https://${host}/favicon.ico`,
          `https://${host}/apple-touch-icon.png`,
          `https://${host}/favicon.png`,
          `https://www.google.com/s2/favicons?sz=64&domain=${host}`,
          `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./, '')}.ico`
        )
      }
      for (const u of candidates) {
        const im = new Image()
        im.decoding = 'async'
        im.referrerPolicy = 'no-referrer'
        im.onload = () => done(u)
        im.onerror = () => {}
        im.src = u
        imgs.push(im)
      }
    }
    startRace()
    const cap = setTimeout(() => { if (!settled) done(letter) }, 2200)
    return () => { settled = true; clearTimeout(cap); imgs.forEach(i => { i.onload = null; i.onerror = null }) }
  }, [url, name])

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}

/* ---------- 链接列表主体 ---------- */
function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类'
        ? !(x.Categories && x.Categories.length)
        : (x.Categories && x.Categories.includes(cat))
      ))
      .sort((a, b) => ((b.Weight || 0) - (a.Weight || 0)) || a.Name.localeCompare(b.Name))
  }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>友情链接</h1>

      {(!data || data.length === 0) ? (
        <div style={{ opacity: 0.7 }}>暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
      ) : (
        <div style={{ display: 'grid', gap: 40 }}>
          {groups.map(({ cat, items }) => (
            <section key={cat}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>{cat}</h2>
              {items.length === 0 ? (
                <div style={{ opacity: 0.6, fontSize: 14 }}>此分类暂无条目</div>
              ) : (
                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'grid', gap: 16,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))'
                }}>
                  {items.map(it => (
                    <li key={cat + '-' + it.URL} style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 14 }}>
                      <a
                        href={normalizeUrl(it.URL)}
                        target="_blank"
                        rel="noopener noreferrer nofollow external"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', cursor: 'pointer' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <IconRace url={it.URL} name={it.Name} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{it.Name}</div>
                          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>{it.Description}</div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 页面导出：标题 & 预连接 ---------- */
export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)
  const siteTitle = siteConfig('TITLE', BLOG.TITLE, props?.NOTION_CONFIG) || BLOG?.TITLE || 'Site'
  const pageTitle = `${siteTitle} | Links`

  useEffect(() => {
    if (props.__hasSlug && typeof document !== 'undefined') {
      document.documentElement.classList.add('__links_hide_notion')
      return () => document.documentElement.classList.remove('__links_hide_notion')
    }
  }, [props.__hasSlug])

  const body = <LinksBody data={props.items} categories={props.categories} />

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      {props.__hasSlug
        ? <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>{body}</DynamicLayout>
        : body}
    </>
  )
}

/* ---------- ISR & 占位页探测 ---------- */
export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let hasSlug = false

  try {
    base = await getGlobalData({ from: 'links', locale })
    const pages = base?.allPages || base?.pages || []
    hasSlug = Array.isArray(pages) && pages.some(p =>
      (p?.slug === 'links' || p?.slug?.value === 'links') &&
      (p?.type === 'Page' || p?.type?.value === 'Page') &&
      (p?.status === 'Published' || p?.status?.value === 'Published' || p?.status === '公开' || p?.status === '已发布')
    )
  } catch (e) {
    base = { NOTION_CONFIG: base?.NOTION_CONFIG || {} }
  }

  try {
    const r = await getLinksAndCategories({ debug: false })
    items = r?.items || []
    categories = r?.categories || []
  } catch (e) {
    items = []
    categories = []
  }

  return { props: { ...base, items, categories, __hasSlug: hasSlug }, revalidate: 120 } // 页面2分钟刷新一次
}
