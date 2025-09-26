// /pages/links.js
import Head from 'next/head'
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import getLinksAndCategories from '@/lib/links'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/* ---------- URL 规范化 ---------- */
function normalizeUrl(u) {
  if (!u) return ''
  let s = String(u).trim()
  s = s.replace(/[)\]\}，。；、？！,.;:]+$/g, '')
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '')
  return s
}
function safeHost(u) { try { return new URL(normalizeUrl(u)).hostname.toLowerCase() } catch { return '' } }

/* ---------- 字母头像（优先名称首字母大写） ---------- */
function hashColor(text = '') {
  let h = 0
  for (let i = 0; i < text.length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0
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

/* ---------- 图标获取：Notion Avatar 优先；随后从 GitHub /public/links-ico 回退 ---------- */
function IconRace({ avatar, url, name }) {
  const host = safeHost(url)
  const nameInitial = (name || '').trim().charAt(0)
  const hostInitial = (host || '').charAt(0)
  const initial = (nameInitial || hostInitial || 'L').toUpperCase()
  const letter = letterAvatarDataURI(initial, hashColor(name || host))
  const [src, setSrc] = useState(letter)

  // 根据头像值解析出最终可用 src（本地或远程）
  const avatarSrc = resolveAvatarSrc(avatar)

  // 预连接到站点域 & 远程 Avatar 域（本地头像无需预连）
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
    if (isHttpUrl(avatarSrc)) add(safeHost(avatarSrc))
    return () => { els.forEach(e => { try { document.head.removeChild(e) } catch {} }) }
  }, [host, avatarSrc])

  useEffect(() => {
    let settled = false
    const imgs = []
    const done = (u) => { if (!settled) { settled = true; setSrc(u) } }

    // Avatar URL 获取失败后回退到 GitHub /public/links-ico
    const fallbackAvatarSrc = avatarSrc ? avatarSrc : `https://github.com/SoMic520/NotionNext/raw/main/public/links-ico/${name?.toLowerCase() || 'default'}.png`

    const startRace = () => {
      const candidates = []
      if (host) {
        candidates.push(
          `https://${host}/favicon.ico`,
          `https://${host}/apple-touch-icon.png`,
          `https://${host}/favicon.png`,
          `https://${host}/favicon.svg`,
          `https://www.google.com/s2/favicons?sz=64&domain=${host}`,
          `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./,'')}.ico`
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

    // 若 Avatar URL 存在且可用，则使用它；否则回退到 GitHub 图标
    if (avatarSrc) {
      const im = new Image()
      im.decoding = 'async'
      im.referrerPolicy = 'no-referrer'
      im.onload = () => done(avatarSrc)
      im.onerror = () => done(fallbackAvatarSrc)
      im.src = avatarSrc
      imgs.push(im)
      // 给 Avatar 600ms 领先窗口；若未成功则开启竞速（Avatar 若后到仍可覆盖）
      const lead = setTimeout(() => { if (!settled) startRace() }, 600)
      const cap = setTimeout(() => { if (!settled) done(letter) }, 2600)
      return () => { settled = true; clearTimeout(lead); clearTimeout(cap); imgs.forEach(i => { i.onload = null; i.onerror = null }) }
    } else {
      // 如果 Avatar URL 不可用，直接使用 GitHub 图标路径
      done(fallbackAvatarSrc)
      startRace()
      const cap = setTimeout(() => { if (!settled) done(letter) }, 2200)
      return () => { settled = true; clearTimeout(cap); imgs.forEach(i => { i.onload = null; i.onerror = null }) }
    }
  }, [avatarSrc, url, name])

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ width:'100%', height:'100%', display:'block', objectFit:'cover' }}
    />
  )
}

/* ---------- Portal：把预览窗放到 <body> ---------- */
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
    return () => { try { document.body.removeChild(el) } catch {} }
  }, [])
  if (!mounted || !elRef.current) return null
  return createPortal(children, elRef.current)
}

/* ---------- 预览定位：与鼠标保持 40px ---------- */
const MOUSE_GAP = 40
function computePreviewPlacement(clientX, clientY) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const m = MOUSE_GAP
  const candidates = [
    { side: 'right',  w: Math.max(0, vw - clientX - m), h: Math.max(0, vh - 2*m) },
    { side: 'left',   w: Math.max(0, clientX - m),      h: Math.max(0, vh - 2*m) },
    { side: 'bottom', w: Math.max(0, vw - 2*m),         h: Math.max(0, vh - clientY - m) },
    { side: 'top',    w: Math.max(0, vw - 2*m),         h: Math.max(0, clientY - m) }
  ].sort((a,b)=> b.w*b.h - a.w*a.h)[0]
  const capW = Math.min(Math.max(Math.floor(vw*0.35), 360), 520)
  const capH = Math.min(Math.max(Math.floor(vh*0.40), 240), 420)
  const w = Math.max(320, Math.min(candidates.w - m, capW))
  const h = Math.max(220, Math.min(candidates.h - m, capH))
  let left=m, top=m
  if (candidates.side==='right'){ left=Math.min(clientX+m, vw-w-m); top=Math.min(Math.max(clientY-h/2,m), vh-h-m) }
  else if (candidates.side==='left'){ left=Math.max(clientX-w-m, m); top=Math.min(Math.max(clientY-h/2,m), vh-h-m) }
  else if (candidates.side==='bottom'){ left=Math.min(Math.max(clientX-w/2,m), vw-w-m); top=Math.min(clientY+m, vh-h-m) }
  else { left=Math.min(Math.max(clientX-w/2,m), vw-w-m); top=Math.max(clientY-h-m, m) }
  return { left, top, w, h }
}

/* ---------- 单张卡片 ---------- */
function LinkCard({ it }) {
  const rafRef = useRef(null)
  const failTimerRef = useRef(null)
  const [pv, setPv] = useState({ left: 0, top: 0, w: 480, h: 320, visible: false })
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const url = normalizeUrl(it.URL)
  const host = safeHost(it.URL)
  const shot = url ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=${Math.round(pv.w)}&h=${Math.round(pv.h)}` : ''

  const openPreview = (e) => {
    if (!url) return
    const { clientX, clientY } = e
    setPv(prev => ({ ...computePreviewPlacement(clientX, clientY), visible: true }))
    setLoaded(false); setFailed(false)
    clearTimeout(failTimerRef.current)
    failTimerRef.current = setTimeout(() => { setFailed(prev => prev || !loaded) }, 1900)
  }
  const movePreview = (e) => {
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
        className="card"
        href={url || '#'}
        target="_blank"
        rel="noopener noreferrer nofollow external"
        aria-label={it.Name}
        onMouseEnter={openPreview}
        onMouseMove={movePreview}
        onMouseLeave={closePreview}
      >
        <div className="icon" aria-hidden>
          {/* 头像优先使用 Notion Avatar（可指向 /public/links-ico），再回落 favicon 竞速 */}
          <IconRace avatar={it.Avatar} url={url} name={it.Name} />
        </div>

        <div className="meta">
          <div className="name">{it.Name}</div>
          {it.Description && <p className="desc">{it.Description}</p>}
          {host && <div className="host">{host.replace(/^www\./, '')}</div>}
        </div>

        {url && (
          <PreviewPortal>
            <div
              className={`preview ${pv.visible ? 'visible' : ''}`}
              style={{ left: pv.left, top: pv.top, width: pv.w, height: pv.h }}
              aria-hidden
            >
              {shot && <img className={`shot ${loaded && !failed ? 'hide' : ''}`} src={shot} alt="" aria-hidden />}
              <iframe
                className={`frame ${loaded && !failed ? 'show' : ''}`}
                src={url}
                title={it.Name}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-modals"
                onLoad={() => { setLoaded(true); clearTimeout(failTimerRef.current) }}
              />
              {failed && <div className="limited">该站点禁止内嵌预览，已显示截图。点击卡片访问完整页面。</div>}
            </div>
          </PreviewPortal>
        )}

        <style jsx>{`
          li { display:block; height:100% }
          .card{
            position:relative; display:flex; gap:14px; align-items:flex-start;
            height:100%; min-height:100px;
            padding:16px; border:1px solid var(--box); border-radius:14px;
            text-decoration:none; background: transparent;
            transform: translateZ(0) scale(1);
            will-change: transform, box-shadow;
            transition: transform .34s cubic-bezier(.22,.61,.36,1), box-shadow .34s ease, border-color .34s ease;
          }
          .card:hover{
            transform: translateY(-2px) scale(1.016);
            border-color: var(--ring);
            box-shadow: 0 0 0 1px var(--ring), 0 14px 34px rgba(0,0,0,.10);
          }

          .icon{
            flex:0 0 auto; width:48px; height:48px;
            border-radius:12px; overflow:hidden;
            border:1px solid var(--box);
            background:#fff;
          }
          @media (prefers-color-scheme: dark){ .icon{ background:#0f172a } }

          .meta{ min-width:0; display:flex; flex-direction:column; gap:6px }
          .name{
            color:var(--txt); font-weight:900; font-size:17px; line-height:1.25;
            letter-spacing:.1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis
          }
          .desc{
            margin:0; color:var(--sub); font-size:13.5px; line-height:1.6;
            display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden
          }
          .host{
            margin-top:2px; font-size:12px; color:var(--muted);
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
            border: 1px solid var(--ring);
            background: var(--panelBg);
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
            background: var(--panelBg);
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

/* ---------- 列表主体 ---------- */
function LinksBody({ data = [], categories = [] }) {
  const groups = (categories || []).map(cat => ({
    cat,
    items: (data || [])
      .filter(x => (cat === '未分类' ? !(x.Categories && x.Categories.length) : (x.Categories || []).includes(cat)))
      .sort((a, b) => (b.Weight || 0) - (a.Weight || 0) || String(a.Name || '').localeCompare(String(b.Name || '')))
  }))

  return (
    <div className="wrap">
      <header className="hd">
        <h1>友情链接</h1>
        <p>悬停卡片显示网页预览，点击新标签打开。</p>
      </header>

      {(!data || data.length === 0) ? (
        <div className="empty">暂无数据。请检查 Notion 库授权与字段（Name / URL / Category）。</div>
      ) : (
        <div className="groups">
          {groups.map(({ cat, items }) => (
            <section key={cat} className="group">
              <div className="group-head">
                <h2 className="group-title">{cat}</h2>
                <span className="group-count">共 {items.length} 个</span>
              </div>

              {items.length === 0 ? (
                <div className="group-empty">此分类暂无条目</div>
              ) : (
                <ul className="cards">
                  {items.map(it => <LinkCard key={`${cat}-${normalizeUrl(it.URL) || it.Name}`} it={it} />)}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        :root{
          --txt:#0b1220; --sub:#334155; --muted:#64748b;
          --box:#cfd6e3; --ring:#7aa2ff; --radius:14px;
          --panelBg:#ffffff;
        }
        @media (prefers-color-scheme: dark){
          :root{
            --txt:#e5e7eb; --sub:#cbd5e1; --muted:#94a3b8; --box:#273448; --ring:#4aa8ff;
            --panelBg:#0f172a;
          }
        }

        .wrap{ max-width:1100px; margin:0 auto; padding:30px 16px 60px; }
        .hd h1{
          margin:0; font-size:30px; font-weight:900; letter-spacing:.2px; color:var(--txt)
        }
        .hd p{ margin:10px 0 0; font-size:14px; color:var(--muted) }

        .empty{
          margin-top:16px; padding:20px;
          border:1px dashed var(--box); border-radius:var(--radius);
          color:var(--muted); text-align:center
        }

        .groups{ display:flex; flex-direction:column; gap:30px; margin-top:14px }
        .group-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px }
        .group-title{
          margin:0; font-size:19px; font-weight:800; color:var(--txt); letter-spacing:.2px
        }
        .group-count{ font-size:12px; color:var(--muted) }

        .cards{
          list-style:none; padding:0; margin:0;
          display:grid; gap:14px;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          align-items: stretch;
        }
        .group-empty{
          border:1px solid var(--box); border-radius:var(--radius);
          padding:12px 14px; color:var(--muted); font-size:14px
        }

        /* 隐藏 /links 的 Notion 原文（主题外壳时） */
        :global(html.__links_hide_notion article .notion),
        :global(html.__links_hide_notion article .notion-page){ display:none !important; }
      `}</style>
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
        <link rel="preconnect" href="https://www.google.com" crossOrigin="" />
        <link rel="preconnect" href="https://icons.duckduckgo.com" crossOrigin="" />
        <link rel="preconnect" href="https://s.wordpress.com" crossOrigin="" />
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

  return { props: { ...base, items, categories, __hasSlug: hasSlug }, revalidate: 600 }
}
