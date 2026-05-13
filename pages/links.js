import Head from 'next/head'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import getLinksAndCategories from '@/lib/links'
import { DynamicLayout } from '@/themes/theme'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_LINKS_DB_ID = '2755906f3c428088928dfc62610854dc'

function normalizeUrl(u) {
  if (!u) return ''
  let s = String(u).trim()
  s = s.replace(/[)\]\}，。；、？！,.;:]+$/g, '')
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '')
  return s
}

function safeHost(u) {
  try {
    return new URL(normalizeUrl(u)).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function hashColor(text = '') {
  let h = 0
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  }
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 70% 45%)`
}

function letterAvatarDataURI(label = 'L', bg = '#888') {
  const txt = (label || 'L').toUpperCase().slice(0, 1)
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
      <rect width='100%' height='100%' rx='12' ry='12' fill='${bg}'/>
      <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle'
            font-family='system-ui,Segoe UI,Roboto,Helvetica,Arial'
            font-size='32' fill='white' font-weight='700'>${txt}</text>
    </svg>`
  )
  return `data:image/svg+xml;charset=utf-8,${svg}`
}

function IconRace({ avatar, url, name }) {
  const host = safeHost(url)
  const nameInitial = (name || '').trim().charAt(0)
  const hostInitial = (host || '').charAt(0)
  const initial = (nameInitial || hostInitial || 'L').toUpperCase()
  const letter = letterAvatarDataURI(initial, hashColor(name || host))
  const [src, setSrc] = useState(letter)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const els = []
    const add = h => {
      if (!h) return
      const dns = document.createElement('link')
      dns.rel = 'dns-prefetch'
      dns.href = '//' + h
      const pre = document.createElement('link')
      pre.rel = 'preconnect'
      pre.href = 'https://' + h
      pre.crossOrigin = ''
      document.head.appendChild(dns)
      document.head.appendChild(pre)
      els.push(dns, pre)
    }
    add(host)
    add(safeHost(avatar))
    return () => {
      els.forEach(e => {
        try {
          document.head.removeChild(e)
        } catch {}
      })
    }
  }, [host, avatar])

  useEffect(() => {
    let settled = false
    const imgs = []
    const done = u => {
      if (!settled) {
        settled = true
        setSrc(u)
      }
    }

    const startRace = () => {
      const candidates = []
      if (host) {
        candidates.push(
          `https://${host}/favicon.ico`,
          `https://${host}/apple-touch-icon.png`,
          `https://${host}/favicon.png`,
          `https://${host}/favicon.svg`,
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

    const avatarSrc = avatar ? normalizeUrl(avatar) : ''
    if (avatarSrc) {
      const im = new Image()
      im.decoding = 'async'
      im.referrerPolicy = 'no-referrer'
      im.onload = () => done(avatarSrc)
      im.onerror = () => startRace()
      im.src = avatarSrc
      imgs.push(im)
      const lead = setTimeout(() => {
        if (!settled) startRace()
      }, 600)
      const cap = setTimeout(() => {
        if (!settled) done(letter)
      }, 2600)
      return () => {
        settled = true
        clearTimeout(lead)
        clearTimeout(cap)
        imgs.forEach(i => {
          i.onload = null
          i.onerror = null
        })
      }
    }

    startRace()
    const cap = setTimeout(() => {
      if (!settled) done(letter)
    }, 2200)
    return () => {
      settled = true
      clearTimeout(cap)
      imgs.forEach(i => {
        i.onload = null
        i.onerror = null
      })
    }
  }, [avatar, url, name, host, letter])

  return (
    <img
      src={src}
      alt={name}
      loading='lazy'
      decoding='async'
      referrerPolicy='no-referrer'
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}

function PreviewPortal({ children }) {
  const [mounted, setMounted] = useState(false)
  const elRef = useRef(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const el = document.createElement('div')
    el.id = 'links-preview-root'
    document.body.appendChild(el)
    elRef.current = el
    setMounted(true)
    return () => {
      try {
        document.body.removeChild(el)
      } catch {}
    }
  }, [])

  if (!mounted || !elRef.current) return null
  return createPortal(children, elRef.current)
}

const MOUSE_GAP = 40
function computePreviewPlacement(clientX, clientY) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const m = MOUSE_GAP
  const candidates = [
    { side: 'right', w: Math.max(0, vw - clientX - m), h: Math.max(0, vh - 2 * m) },
    { side: 'left', w: Math.max(0, clientX - m), h: Math.max(0, vh - 2 * m) },
    { side: 'bottom', w: Math.max(0, vw - 2 * m), h: Math.max(0, vh - clientY - m) },
    { side: 'top', w: Math.max(0, vw - 2 * m), h: Math.max(0, clientY - m) }
  ].sort((a, b) => b.w * b.h - a.w * a.h)[0]
  const capW = Math.min(Math.max(Math.floor(vw * 0.35), 360), 520)
  const capH = Math.min(Math.max(Math.floor(vh * 0.4), 240), 420)
  const w = Math.max(320, Math.min(candidates.w - m, capW))
  const h = Math.max(220, Math.min(candidates.h - m, capH))
  let left = m
  let top = m

  if (candidates.side === 'right') {
    left = Math.min(clientX + m, vw - w - m)
    top = Math.min(Math.max(clientY - h / 2, m), vh - h - m)
  } else if (candidates.side === 'left') {
    left = Math.max(clientX - w - m, m)
    top = Math.min(Math.max(clientY - h / 2, m), vh - h - m)
  } else if (candidates.side === 'bottom') {
    left = Math.min(Math.max(clientX - w / 2, m), vw - w - m)
    top = Math.min(clientY + m, vh - h - m)
  } else {
    left = Math.min(Math.max(clientX - w / 2, m), vw - w - m)
    top = Math.max(clientY - h - m, m)
  }

  return { left, top, w, h }
}

function LinkCard({ it }) {
  const rafRef = useRef(null)
  const failTimerRef = useRef(null)
  const [pv, setPv] = useState({ left: 0, top: 0, w: 480, h: 320, visible: false })
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const url = normalizeUrl(it.URL)
  const host = safeHost(it.URL)
  const shot = url
    ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=${Math.round(pv.w)}&h=${Math.round(pv.h)}`
    : ''

  const openPreview = e => {
    if (!url) return
    const { clientX, clientY } = e
    setPv({ ...computePreviewPlacement(clientX, clientY), visible: true })
    setLoaded(false)
    setFailed(false)
    clearTimeout(failTimerRef.current)
    failTimerRef.current = setTimeout(() => {
      setFailed(prev => prev || !loaded)
    }, 1900)
  }

  const movePreview = e => {
    if (!pv.visible || !url) return
    cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      setPv(prev => ({ ...prev, ...computePreviewPlacement(clientX, clientY), visible: true }))
    })
  }

  const closePreview = () => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(failTimerRef.current)
    setPv(prev => ({ ...prev, visible: false }))
  }

  return (
    <li>
      <a
        className='card'
        href={url || '#'}
        target='_blank'
        rel='noopener noreferrer nofollow external'
        aria-label={it.Name}
        onMouseEnter={openPreview}
        onMouseMove={movePreview}
        onMouseLeave={closePreview}>
        <div className='icon' aria-hidden>
          <IconRace avatar={it.Avatar || it.Logo} url={url} name={it.Name} />
        </div>

        <div className='meta'>
          <div className='name'>{it.Name}</div>
          {it.Description && <p className='desc'>{it.Description}</p>}
          {host && <div className='host'>{host.replace(/^www\./, '')}</div>}
        </div>

        {url && (
          <PreviewPortal>
            <div
              className={`preview ${pv.visible ? 'visible' : ''}`}
              style={{ left: pv.left, top: pv.top, width: pv.w, height: pv.h }}
              aria-hidden>
              {shot && <img className={`shot ${loaded && !failed ? 'hide' : ''}`} src={shot} alt='' aria-hidden />}
              <iframe
                className={`frame ${loaded && !failed ? 'show' : ''}`}
                src={url}
                title={it.Name}
                loading='lazy'
                referrerPolicy='no-referrer'
                sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-modals'
                onLoad={() => {
                  setLoaded(true)
                  clearTimeout(failTimerRef.current)
                }}
              />
              {failed && <div className='limited'>该站点禁止内嵌预览，已显示截图。点击卡片访问完整页面。</div>}
            </div>
          </PreviewPortal>
        )}

        <style jsx>{`
          li { display:block; height:100% }
          .card{
            position:relative; display:flex; gap:14px; align-items:flex-start;
            height:100%; min-height:100px;
            padding:16px; border:1px solid var(--links-box); border-radius:14px;
            text-decoration:none; background: var(--links-card-bg);
            transform: translateZ(0) scale(1);
            will-change: transform, box-shadow;
            transition: transform .34s cubic-bezier(.22,.61,.36,1), box-shadow .34s ease, border-color .34s ease, background .34s ease;
          }
          .card:hover{
            transform: translateY(-2px) scale(1.016);
            border-color: var(--links-ring);
            box-shadow: 0 0 0 1px var(--links-ring), 0 14px 34px rgba(0,0,0,.10);
          }
          .icon{
            flex:0 0 auto; width:48px; height:48px;
            border-radius:12px; overflow:hidden;
            border:1px solid var(--links-box);
            background:#fff;
          }
          .meta{ min-width:0; display:flex; flex-direction:column; gap:6px }
          .name{
            color:var(--links-txt); font-weight:900; font-size:17px; line-height:1.25;
            letter-spacing:.1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis
          }
          .desc{
            margin:0; color:var(--links-sub); font-size:13.5px; line-height:1.6;
            display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden
          }
          .host{
            margin-top:2px; font-size:12px; color:var(--links-muted);
            letter-spacing:.2px; text-transform:lowercase;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis
          }
          .preview{
            position: fixed;
            z-index: 2147483000;
            pointer-events: none;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 18px 48px rgba(0,0,0,.28);
            border: 1px solid var(--links-ring);
            background: var(--links-panel-bg);
            opacity: 0;
            transform: translateY(-8px) scale(.985);
            transition:
              left .36s cubic-bezier(.22,.61,.36,1),
              top .36s cubic-bezier(.22,.61,.36,1),
              width .36s cubic-bezier(.22,.61,.36,1),
              height .36s cubic-bezier(.22,.61,.36,1),
              opacity .36s ease,
              transform .36s cubic-bezier(.22,.61,.36,1);
            display: none;
          }
          @media (min-width: 900px){ .preview{ display:block } }
          .preview.visible{ opacity:1; transform: translateY(-2px) scale(1) }
          .frame, .shot{
            position:absolute; inset:0; width:100%; height:100%; border:0; display:block;
            background: var(--links-panel-bg);
            transition: opacity .28s ease;
          }
          .shot.hide{ opacity:0; }
          .frame{ opacity:0; }
          .frame.show{ opacity:1; }
          .limited{
            position:absolute; left:0; right:0; bottom:0;
            padding: 6px 10px; font-size: 12px; color:#e5e7eb;
            background: linear-gradient(to top, rgba(11,18,32,.9), rgba(11,18,32,.0));
          }
        `}</style>
      </a>
    </li>
  )
}

function LinksBody({ data = [], categories = [], debug }) {
  const groups = (categories || [])
    .filter(Boolean)
    .map(cat => ({
      cat,
      items: (data || [])
        .filter(x => (cat === '未分类' ? !(x.Categories && x.Categories.length) : (x.Categories || []).includes(cat)))
        .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || String(a.Name || '').localeCompare(String(b.Name || '')))
    }))

  return (
    <div className='links-wrap'>
      <header className='links-hd'>
        <h1>友情链接</h1>
        <p>悬停卡片显示网页预览，点击卡片在新标签打开。</p>
      </header>

      {(!data || data.length === 0) ? (
        <div className='links-empty'>
          暂无数据。请检查 Notion 友链库授权与字段（Name / URL / Category），以及环境变量 FRIENDS_DB_ID 或 NOTION_LINKS_DB_ID。
          {debug?.__debug && (
            <pre>{JSON.stringify(debug.__debug, null, 2)}</pre>
          )}
          {debug?.error && <pre>{debug.error}</pre>}
        </div>
      ) : (
        <div className='links-groups'>
          {groups.map(({ cat, items }) => (
            <section key={cat} className='links-group'>
              <div className='links-group-head'>
                <h2 className='links-group-title'>{cat}</h2>
                <span className='links-group-count'>共 {items.length} 个</span>
              </div>

              {items.length === 0 ? (
                <div className='links-group-empty'>此分类暂无条目</div>
              ) : (
                <ul className='links-cards'>
                  {items.map(it => <LinkCard key={`${cat}-${normalizeUrl(it.URL) || it.Name}`} it={it} />)}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        .links-wrap{
          --links-txt:#0b1220;
          --links-sub:#334155;
          --links-muted:#64748b;
          --links-box:#cfd6e3;
          --links-ring:#7aa2ff;
          --links-card-bg:transparent;
          --links-panel-bg:#ffffff;
          width:100%;
          max-width:100%;
          margin:0 auto;
          padding:0 0 60px;
        }
        :global(.dark) .links-wrap{
          --links-txt:#e5e7eb;
          --links-sub:#cbd5e1;
          --links-muted:#94a3b8;
          --links-box:#273448;
          --links-ring:#4aa8ff;
          --links-card-bg:transparent;
          --links-panel-bg:#0f172a;
        }
        .links-hd h1{ margin:0; font-size:30px; font-weight:900; letter-spacing:.2px; color:var(--links-txt) }
        .links-hd p{ margin:10px 0 0; font-size:14px; color:var(--links-muted) }
        .links-empty{
          margin-top:18px; padding:22px;
          border:1px dashed var(--links-box); border-radius:14px;
          color:var(--links-muted); text-align:center; line-height:1.8;
        }
        .links-empty pre{
          margin:16px auto 0;
          text-align:left;
          max-width:720px;
          white-space:pre-wrap;
          font-size:12px;
        }
        .links-groups{ display:flex; flex-direction:column; gap:30px; margin-top:20px }
        .links-group-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px }
        .links-group-title{ margin:0; font-size:19px; font-weight:800; color:var(--links-txt); letter-spacing:.2px }
        .links-group-count{ font-size:12px; color:var(--links-muted) }
        .links-cards{
          list-style:none; padding:0; margin:0;
          display:grid; gap:14px 24px;
          grid-template-columns: repeat(2, minmax(260px, 1fr));
          align-items: stretch;
        }
        .links-group-empty{
          border:1px solid var(--links-box); border-radius:14px;
          padding:12px 14px; color:var(--links-muted); font-size:14px
        }
        @media (max-width: 900px){
          .links-cards{ grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)
  const siteTitle = siteConfig('TITLE', BLOG.TITLE, props?.NOTION_CONFIG) || BLOG?.TITLE || 'Site'
  const pageTitle = `${siteTitle} | 友情链接`
  const body = <LinksBody data={props.items} categories={props.categories} debug={props.debug} />

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name='description' content='友情链接' />
        <link rel='preconnect' href='https://www.google.com' crossOrigin='' />
        <link rel='preconnect' href='https://icons.duckduckgo.com' crossOrigin='' />
        <link rel='preconnect' href='https://s.wordpress.com' crossOrigin='' />
      </Head>
      <DynamicLayout theme={theme} layoutName='LayoutBase' {...props}>
        {body}
      </DynamicLayout>
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
    siteConfig('FRIENDS_DB_ID', null, notionConfig) ||
    siteConfig('NOTION_LINKS_DB_ID', null, notionConfig) ||
    notionConfig.FRIENDS_DB_ID ||
    notionConfig.NOTION_LINKS_DB_ID ||
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
    items = []
    categories = []
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
