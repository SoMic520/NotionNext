import Head from 'next/head'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import getLinksAndCategories from '@/lib/links'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_LINKS_DB_ID = '2755906f3c428088928dfc62610854dc'

function normalizeUrl(value) {
  const raw = String(value || '').trim().replace(/[)\]\}，。；、？！,.;:]+$/g, '')
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\/\//.test(raw)) return `https:${raw}`
  return `https://${raw.replace(/^\/+/, '')}`
}

function getHost(value) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function getFallbackIcon(value) {
  const host = getHost(value)
  if (!host) return '/favicon.ico'
  return `https://icons.duckduckgo.com/ip3/${host}.ico`
}

function getPreviewShot(value) {
  const url = normalizeUrl(value)
  if (!url) return ''
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=960`
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function computePreviewPlacement(rect) {
  if (typeof window === 'undefined' || !rect) {
    return { left: 0, top: 0, width: 460, height: 300 }
  }

  const margin = 18
  const gap = 22
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = clamp(Math.round(vw * 0.32), 390, 520)
  const height = clamp(Math.round(vh * 0.38), 260, 380)
  const canRight = vw - rect.right - gap - margin >= width
  const canLeft = rect.left - gap - margin >= width

  let left
  if (canRight) {
    left = rect.right + gap
  } else if (canLeft) {
    left = rect.left - width - gap
  } else {
    left = clamp(rect.left + rect.width / 2 - width / 2, margin, vw - width - margin)
  }

  let top = clamp(rect.top + rect.height / 2 - height / 2, margin, vh - height - margin)
  if (!canRight && !canLeft) {
    top = clamp(rect.bottom + gap, margin, vh - height - margin)
  }

  return { left, top, width, height }
}

function sortItems(list = []) {
  return [...list].sort((a, b) => {
    const weight = (b.Weight || 0) - (a.Weight || 0)
    if (weight !== 0) return weight
    return String(a.Name || '').localeCompare(String(b.Name || ''), 'zh-Hans-CN')
  })
}

function LinkIcon({ item }) {
  const src = item.Avatar || item.Logo || getFallbackIcon(item.URL)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.Name || ''}
      loading='lazy'
      referrerPolicy='no-referrer'
      onError={event => {
        const img = event.currentTarget
        if (img.dataset.fallback === 'local') return
        if (img.dataset.fallback === 'remote') {
          img.dataset.fallback = 'local'
          img.src = '/favicon.ico'
          return
        }
        img.dataset.fallback = 'remote'
        img.src = getFallbackIcon(item.URL)
      }}
    />
  )
}

function PreviewPortal({ item, url, host, shot, placement, visible }) {
  const [mounted, setMounted] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible || !shot) return
    setLoaded(false)
    const img = new Image()
    img.decoding = 'async'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => setLoaded(true)
    img.src = shot
    return () => {
      img.onload = null
    }
  }, [visible, shot])

  if (!mounted || !visible) return null

  return createPortal(
    <div
      className='links-preview-layer'
      style={{
        '--preview-left': `${placement.left}px`,
        '--preview-top': `${placement.top}px`,
        '--preview-width': `${placement.width}px`,
        '--preview-height': `${placement.height}px`
      }}>
      <div className='preview-glow' />
      <div className='preview-shell'>
        <div className='preview-bar'>
          <span className='preview-dot red' />
          <span className='preview-dot yellow' />
          <span className='preview-dot green' />
          <span className='preview-url'>{host || url}</span>
        </div>
        <div className='preview-screen'>
          {!loaded && (
            <div className='preview-skeleton'>
              <span />
              <span />
              <span />
            </div>
          )}
          {shot && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot}
              alt=''
              loading='eager'
              referrerPolicy='no-referrer'
              className={loaded ? 'is-loaded' : ''}
            />
          )}
        </div>
        <div className='preview-footer'>
          <strong>{item.Name}</strong>
          <span>{item.Description || '点击卡片访问完整页面'}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

function LinkCard({ item }) {
  const cardRef = useRef(null)
  const rafRef = useRef(null)
  const closeTimerRef = useRef(null)
  const url = normalizeUrl(item.URL)
  const host = getHost(item.URL)
  const shot = useMemo(() => getPreviewShot(item.URL), [item.URL])
  const [preview, setPreview] = useState({
    visible: false,
    placement: { left: 0, top: 0, width: 460, height: 300 }
  })

  const updatePlacement = () => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setPreview(prev => ({
      ...prev,
      placement: computePreviewPlacement(rect)
    }))
  }

  const openPreview = () => {
    if (!url) return
    clearTimeout(closeTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      setPreview({
        visible: true,
        placement: computePreviewPlacement(rect)
      })
    })
  }

  const closePreview = () => {
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setPreview(prev => ({ ...prev, visible: false }))
    }, 90)
  }

  useEffect(() => {
    if (!preview.visible) return
    const onScrollOrResize = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updatePlacement)
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [preview.visible])

  useEffect(() => {
    return () => {
      clearTimeout(closeTimerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <a
        ref={cardRef}
        className='link-card'
        href={url || '#'}
        target='_blank'
        rel='noopener noreferrer nofollow external'
        title={item.Name}
        onMouseEnter={openPreview}
        onMouseMove={openPreview}
        onMouseLeave={closePreview}
        onFocus={openPreview}
        onBlur={closePreview}>
        <span className='link-icon'>
          <LinkIcon item={item} />
        </span>
        <span className='link-main'>
          <strong>{item.Name}</strong>
          {item.Description && <small className='desc'>{item.Description}</small>}
          {host && <small className='host'>{host}</small>}
        </span>
      </a>
      <PreviewPortal
        item={item}
        url={url}
        host={host}
        shot={shot}
        visible={preview.visible}
        placement={preview.placement}
      />
    </>
  )
}

function LinksBody({ data = [], categories = [], debug }) {
  const safeData = Array.isArray(data) ? data : []
  const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : []
  const visibleCategories = safeCategories.length > 0
    ? safeCategories
    : Array.from(new Set(safeData.flatMap(item => item.Categories || []).filter(Boolean)))

  const groups = visibleCategories.map(category => ({
    category,
    items: sortItems(
      safeData.filter(item =>
        category === '未分类'
          ? !(item.Categories && item.Categories.length)
          : (item.Categories || []).includes(category)
      )
    )
  }))

  return (
    <div className='links-page'>
      <header className='links-header'>
        <h1>友情链接</h1>
        <p>悬停查看站点信息，点击卡片在新标签打开。</p>
      </header>

      {safeData.length === 0 ? (
        <div className='links-empty'>
          暂无数据。请检查 Notion 友链库授权与字段（Name / URL / Category），以及 FRIENDS_DB_ID / NOTION_LINKS_DB_ID 配置。
          {debug?.error && <pre>{debug.error}</pre>}
          {debug?.__debug && <pre>{JSON.stringify(debug.__debug, null, 2)}</pre>}
        </div>
      ) : (
        <div className='links-groups'>
          {groups.map(({ category, items }) => (
            <section key={category} className='links-group'>
              <div className='group-head'>
                <h2>{category}</h2>
                <span>共 {items.length} 个</span>
              </div>
              {items.length > 0 ? (
                <div className='cards'>
                  {items.map(item => (
                    <LinkCard key={`${category}-${item.id || item.URL || item.Name}`} item={item} />
                  ))}
                </div>
              ) : (
                <div className='group-empty'>此分类暂无条目</div>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        .links-page {
          width: 100%;
          padding: 2rem 0 4rem;
          color: #0f172a;
        }
        :global(.dark) .links-page {
          color: #e5e7eb;
        }
        .links-header {
          margin-bottom: 22px;
        }
        .links-header h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.25;
          font-weight: 900;
          letter-spacing: .02em;
        }
        .links-header p {
          margin: 8px 0 0;
          font-size: 14px;
          color: #64748b;
        }
        :global(.dark) .links-header p {
          color: #94a3b8;
        }
        .links-groups {
          display: flex;
          flex-direction: column;
          gap: 34px;
        }
        .group-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .group-head h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.35;
          font-weight: 850;
        }
        .group-head span {
          flex: none;
          font-size: 12px;
          color: #64748b;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(220px, 1fr));
          gap: 18px 24px;
        }
        .links-empty,
        .group-empty {
          padding: 18px 20px;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          color: #64748b;
          line-height: 1.8;
        }
        .links-empty pre {
          margin: 14px 0 0;
          overflow: auto;
          text-align: left;
          white-space: pre-wrap;
          font-size: 12px;
        }
        :global(.link-card) {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-height: 88px;
          padding: 12px 14px;
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          background: transparent;
          outline: none;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease, background .22s ease;
          will-change: transform;
        }
        :global(.link-card:hover),
        :global(.link-card:focus-visible) {
          transform: translateY(-3px) scale(1.012);
          background: rgba(255,255,255,.78);
          box-shadow: 0 14px 34px rgba(15, 23, 42, .10);
        }
        :global(.dark .link-card:hover),
        :global(.dark .link-card:focus-visible) {
          background: rgba(15,23,42,.65);
          box-shadow: 0 14px 34px rgba(0, 0, 0, .26);
        }
        :global(.link-icon) {
          flex: 0 0 auto;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          overflow: hidden;
          background: #f1f5f9;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        :global(.link-icon img) {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        :global(.link-main) {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        :global(.link-main strong) {
          font-size: 16px;
          line-height: 1.35;
          font-weight: 850;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.link-main small) {
          display: block;
          line-height: 1.55;
          color: #64748b;
        }
        :global(.link-main .desc) {
          font-size: 13px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        :global(.link-main .host) {
          margin-top: 1px;
          font-size: 12px;
          letter-spacing: .01em;
        }
        :global(.dark .link-main small) {
          color: #94a3b8;
        }
        :global(.links-preview-layer) {
          position: fixed;
          left: var(--preview-left);
          top: var(--preview-top);
          width: var(--preview-width);
          height: var(--preview-height);
          z-index: 2147483000;
          pointer-events: none;
          opacity: 0;
          transform: translate3d(0, 10px, 0) scale(.975);
          animation: linksPreviewIn .24s cubic-bezier(.2,.8,.2,1) forwards;
          filter: drop-shadow(0 24px 42px rgba(15, 23, 42, .22));
        }
        :global(.preview-glow) {
          position: absolute;
          inset: -18px;
          border-radius: 30px;
          background: radial-gradient(circle at 50% 20%, rgba(120, 119, 255, .24), transparent 58%);
          filter: blur(18px);
          opacity: .8;
        }
        :global(.preview-shell) {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(148, 163, 184, .38);
          background: rgba(255,255,255,.86);
          backdrop-filter: blur(14px) saturate(150%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
        }
        :global(.dark .preview-shell) {
          background: rgba(15, 23, 42, .88);
          border-color: rgba(71, 85, 105, .72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }
        :global(.preview-bar) {
          height: 36px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(148, 163, 184, .25);
        }
        :global(.preview-dot) {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          flex: 0 0 auto;
        }
        :global(.preview-dot.red) { background: #ff5f57; }
        :global(.preview-dot.yellow) { background: #ffbd2e; }
        :global(.preview-dot.green) { background: #28c840; }
        :global(.preview-url) {
          margin-left: 6px;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 12px;
          color: #64748b;
        }
        :global(.dark .preview-url) { color: #94a3b8; }
        :global(.preview-screen) {
          position: relative;
          height: calc(100% - 92px);
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          overflow: hidden;
        }
        :global(.dark .preview-screen) {
          background: linear-gradient(135deg, #111827, #020617);
        }
        :global(.preview-screen img) {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: top center;
          opacity: 0;
          transform: scale(1.015);
          transition: opacity .28s ease, transform .46s cubic-bezier(.2,.8,.2,1);
        }
        :global(.preview-screen img.is-loaded) {
          opacity: 1;
          transform: scale(1);
        }
        :global(.preview-skeleton) {
          position: absolute;
          inset: 18px;
          display: grid;
          grid-template-rows: 40px 1fr 1fr;
          gap: 12px;
        }
        :global(.preview-skeleton span) {
          border-radius: 14px;
          background: linear-gradient(90deg, rgba(148,163,184,.16), rgba(148,163,184,.34), rgba(148,163,184,.16));
          background-size: 260% 100%;
          animation: linksSkeleton 1.1s ease-in-out infinite;
        }
        :global(.preview-footer) {
          height: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          padding: 0 14px;
        }
        :global(.preview-footer strong) {
          font-size: 14px;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.preview-footer span) {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.dark .preview-footer strong) { color: #e5e7eb; }
        :global(.dark .preview-footer span) { color: #94a3b8; }
        @keyframes linksPreviewIn {
          from { opacity: 0; transform: translate3d(0, 12px, 0) scale(.972); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes linksSkeleton {
          0% { background-position: 120% 0; }
          100% { background-position: -120% 0; }
        }
        @media (max-width: 900px) {
          .cards {
            grid-template-columns: 1fr;
          }
          :global(.links-preview-layer) {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const siteTitle = siteConfig('TITLE', BLOG.TITLE, props?.NOTION_CONFIG) || BLOG?.TITLE || 'Site'
  const pageTitle = `${siteTitle} | 友情链接`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content='友情链接' />
        <link rel='preconnect' href='https://s.wordpress.com' crossOrigin='' />
        <link rel='dns-prefetch' href='//s.wordpress.com' />
      </Head>
      <LinksBody data={props.items} categories={props.categories} debug={props.debug} />
    </>
  )
}

export async function getStaticProps({ locale }) {
  let base = {}
  let items = []
  let categories = []
  let debug = null

  try {
    base = await fetchGlobalAllData({ from: 'links', locale })
  } catch (error) {
    console.warn('[links] fetchGlobalAllData failed', error)
    base = { NOTION_CONFIG: {} }
  }

  const notionConfig = base?.NOTION_CONFIG || {}
  const linksDbId =
    notionConfig.FRIENDS_DB_ID ||
    notionConfig.NOTION_LINKS_DB_ID ||
    process.env.FRIENDS_DB_ID ||
    process.env.NOTION_LINKS_DB_ID ||
    DEFAULT_LINKS_DB_ID

  try {
    const result = await getLinksAndCategories({
      debug: process.env.FRIENDS_DEBUG === '1',
      FRIENDS_DB_ID: linksDbId,
      NOTION_LINKS_DB_ID: linksDbId
    })
    items = result?.items || []
    categories = result?.categories || []
    debug = result?.__debug ? { __debug: result.__debug } : null
  } catch (error) {
    console.warn('[links] getLinksAndCategories failed', error)
    debug = process.env.NODE_ENV !== 'production' ? { error: error.message } : null
  }

  return {
    props: {
      ...base,
      items,
      categories,
      debug
    },
    revalidate: 600
  }
}
