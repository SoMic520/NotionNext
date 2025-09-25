// /pages/links.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import getLinksAndCategories from '@/lib/links'
import { useRef, useState } from 'react'

function safeHost(u) { try { return new URL(u).hostname.toLowerCase() } catch { return '' } }

/** 计算基于鼠标的最佳预览位置与尺寸（选择面积最大的一侧） */
function computePreviewPlacement(clientX, clientY) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const m = 12 // 边距
  // 四个方向可用矩形
  const areas = [
    { side: 'right', w: Math.max(0, vw - clientX - m), h: Math.max(0, vh - 2 * m) },
    { side: 'left',  w: Math.max(0, clientX - m),      h: Math.max(0, vh - 2 * m) },
    { side: 'bottom',w: Math.max(0, vw - 2 * m),       h: Math.max(0, vh - clientY - m) },
    { side: 'top',   w: Math.max(0, vw - 2 * m),       h: Math.max(0, clientY - m) }
  ]
  const best = areas.sort((a, b) => (b.w * b.h) - (a.w * a.h))[0] || areas[0]

  // 尺寸上限（避免过大）：按视口比例取“舒适值”，再不超过该侧可用面积
  const capW = Math.min(Math.max(Math.floor(vw * 0.40), 420), 720) // 约 40% 视口，420~720
  const capH = Math.min(Math.max(Math.floor(vh * 0.36), 260), 440) // 约 36% 视口，260~440
  const w = Math.max(260, Math.min(best.w - m, capW))
  const h = Math.max(200, Math.min(best.h - m, capH))

  // 坐标：围绕鼠标就近摆放，同时保证不越界
  let left = m, top = m
  if (best.side === 'right') {
    left = Math.min(clientX + m, vw - w - m)
    top  = Math.min(Math.max(clientY - h / 2, m), vh - h - m)
  } else if (best.side === 'left') {
    left = Math.max(clientX - w - m, m)
    top  = Math.min(Math.max(clientY - h / 2, m), vh - h - m)
  } else if (best.side === 'bottom') {
    left = Math.min(Math.max(clientX - w / 2, m), vw - w - m)
    top  = Math.min(clientY + m, vh - h - m)
  } else { // top
    left = Math.min(Math.max(clientX - w / 2, m), vw - w - m)
    top  = Math.max(clientY - h - m, m)
  }

  return { left, top, w, h }
}

/** 单张卡片（含：丝滑缩放 + 自适应预览 + 失败截图兜底） */
function LinkCard({ it }) {
  const aRef = useRef(null)
  const rafRef = useRef(null)
  const failTimerRef = useRef(null)
  const [pv, setPv] = useState({ left: 0, top: 0, w: 560, h: 340, visible: false })
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const host = it.URL ? safeHost(it.URL) : ''
  // 图标兜底：Avatar → DuckDuckGo → /favicon.ico → Google S2 → 本地
  const iconDuck = host ? `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./,'')}.ico` : '/favicon.ico'
  const iconRoot = host ? `https://${host}/favicon.ico` : '/favicon.ico'
  const iconS2   = host ? `https://www.google.com/s2/favicons?sz=64&domain=${host}` : '/favicon.ico'
  const initial  = it.Avatar || iconDuck

  const shot = it.URL
    ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(it.URL)}?w=${Math.round(pv.w)}&h=${Math.round(pv.h)}`
    : ''

  const openPreview = (e) => {
    if (!it.URL) return
    // 初次进入：计算一次并显示（带一点延迟更“丝滑”）
    const { clientX, clientY } = e
    setPv(prev => ({ ...computePreviewPlacement(clientX, clientY), visible: true }))
    setLoaded(false)
    setFailed(false)
    clearTimeout(failTimerRef.current)
    // 2.4s 内没 onLoad 认为受限 → 截图兜底
    failTimerRef.current = setTimeout(() => {
      setFailed(prev => prev || !loaded)
    }, 2400)
  }

  const movePreview = (e) => {
    if (!pv.visible || !it.URL) return
    cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    // rAF 节流，避免抖动；移动时缓缓跟随
    rafRef.current = requestAnimationFrame(() => {
      setPv(prev => {
        const pos = computePreviewPlacement(clientX, clientY)
        return { ...prev, ...pos, visible: true }
      })
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
        ref={aRef}
        className="card"
        href={it.URL || '#'}
        target="_blank"
        rel="noopener noreferrer nofollow external"
        aria-label={it.Name}
        onMouseEnter={openPreview}
        onMouseMove={movePreview}
        onMouseLeave={closePreview}
      >
        {/* 左侧统一尺寸的小图标 */}
        <div className="icon">
          <img
            src={initial}
            alt={it.Name}
            title={host || it.Name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            data-fallback="0"
            onError={e => {
              const step = Number(e.currentTarget.dataset.fallback || '0')
              if (step === 0) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = iconRoot }
              else if (step === 1) { e.currentTarget.dataset.fallback = '2'; e.currentTarget.src = iconS2 }
              else if (step === 2) { e.currentTarget.dataset.fallback = '3'; e.currentTarget.src = '/favicon.ico' }
            }}
          />
        </div>

        {/* 文本信息 */}
        <div className="meta">
          <div className="name">{it.Name}</div>
          {it.Description && <p className="desc">{it.Description}</p>}
          {host && <div className="host">{host.replace(/^www\./, '')}</div>}
        </div>

        {/* 固定定位的预览窗：围绕鼠标，择最大区域显示；小屏隐藏 */}
        {it.URL && (
          <div
            className={`preview ${pv.visible ? 'visible' : ''}`}
            style={{ left: pv.left, top: pv.top, width: pv.w, height: pv.h }}
            aria-hidden
          >
            {/* 截图兜底（iframe 成功后自动淡出） */}
            {shot && (
              <img
                className={`shot ${loaded && !failed ? 'hide' : ''}`}
                src={shot}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
              />
            )}
            {/* 实时网页 */}
            <iframe
              className={`frame ${loaded && !failed ? 'show' : ''}`}
              src={it.URL}
              title={it.Name}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-modals"
              onLoad={() => { setLoaded(true); clearTimeout(failTimerRef.current) }}
            />
            {failed && <div className="limited">该站点禁止内嵌预览，已显示截图。点击卡片访问完整页面。</div>}
          </div>
        )}

        <style jsx>{`
          li { display:block; height:100% }
          .card{
            position:relative; display:flex; gap:12px; align-items:flex-start;
            height:100%; min-height: 96px;
            padding:14px; border:1px solid var(--box); border-radius:var(--radius);
            text-decoration:none; background: transparent;
            transform: translateZ(0) scale(1);
            will-change: transform, box-shadow;
            transition: transform .30s cubic-bezier(.22,.61,.36,1), box-shadow .30s ease;
          }
          .card:hover{ transform: translateY(-2px) scale(1.018); box-shadow: 0 0 0 1px var(--ring), 0 12px 32px rgba(0,0,0,.10) }

          .icon{ flex:0 0 auto; width:44px; height:44px; border-radius:10px; overflow:hidden; border:1px solid var(--box) }
          .icon img{ width:100%; height:100%; object-fit:cover; display:block }

          .meta{ min-width:0 }
          .name{ color:var(--txt); font-weight:800; font-size:16px; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
          .desc{ margin:4px 0 0; color:var(--sub); font-size:13px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
          .host{ margin-top:6px; font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

          /* —— 预览窗：fixed 定位，围绕鼠标选择最大区域；更“丝滑”的动效 —— */
          .preview{
            position: fixed;
            z-index: 60;
            pointer-events: none; /* 仅预览不交互（如需可打开） */
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 18px 48px rgba(0,0,0,.28);
            border: 1px solid var(--ring);
            backdrop-filter: blur(8px) saturate(130%);
            isolation: isolate;
            display: none; /* 小屏隐藏 */
            opacity: 0;
            transform: translateY(-8px) scale(.985);
            transition:
              left .34s cubic-bezier(.22,.61,.36,1),
              top .34s cubic-bezier(.22,.61,.36,1),
              width .34s cubic-bezier(.22,.61,.36,1),
              height .34s cubic-bezier(.22,.61,.36,1),
              opacity .34s ease,
              transform .34s cubic-bezier(.22,.61,.36,1);
          }
          @media (min-width: 900px){
            .preview{ display:block }
            .preview.visible{ opacity:1; transform: translateY(-2px) scale(1) }
          }

          .frame, .shot{
            position:absolute; inset:0; width:100%; height:100%; border:0; display:block;
            background:#0b1220; object-fit: cover;
            transition: opacity .32s ease;
          }
          .shot.hide{ opacity:0 }
          .frame{ opacity:0 }
          .frame.show{ opacity:1 }

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
                  {items.map(it => <LinkCard key={`${cat}-${it.URL || it.Name}`} it={it} />)}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <style jsx>{`
        :root{
          --txt:#0b1220; --sub:#334155; --muted:#64748b;
          --box:#cfd6e3; --ring:#7aa2ff; --radius:12px;
        }
        @media (prefers-color-scheme: dark){
          :root{ --txt:#e5e7eb; --sub:#cbd5e1; --muted:#94a3b8; --box:#273448; --ring:#4aa8ff }
        }

        .wrap{ max-width:1100px; margin:0 auto; padding:28px 16px 56px; }
        .hd h1{ margin:0; font-size:28px; font-weight:800; color:var(--txt) }
        .hd p{ margin:8px 0 0; font-size:14px; color:var(--muted) }

        .empty{ margin-top:16px; padding:18px; border:1px dashed var(--box); border-radius:var(--radius); color:var(--muted); text-align:center }

        .groups{ display:flex; flex-direction:column; gap:28px; margin-top:12px }
        .group-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
        .group-title{ margin:0; font-size:18px; font-weight:700; color:var(--txt) }
        .group-count{ font-size:12px; color:var(--muted) }

        /* 同排宽度一致：固定最小列宽、其余等分 */
        .cards{
          list-style:none; padding:0; margin:0;
          display:grid; gap:14px;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          align-items: stretch;
        }
        .group-empty{ border:1px solid var(--box); border-radius:var(--radius); padding:12px 14px; color:var(--muted); font-size:14px }
      `}</style>
    </div>
  )
}

export default function Links(props) {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)
  if (props.__hasSlug) {
    if (typeof document !== 'undefined') document.documentElement.classList.add('__links_hide_notion')
    return (
      <DynamicLayout theme={theme} layoutName="LayoutSlug" {...props}>
        <LinksBody data={props.items} categories={props.categories} />
      </DynamicLayout>
    )
  }
  return <LinksBody data={props.items} categories={props.categories} />
}

// ISR：稳定；并探测是否存在 slug=links 占位页
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
