// /pages/links.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import getLinksAndCategories from '@/lib/links' // 默认导入最稳
import { useRef, useState } from 'react'

function safeHost(u) { try { return new URL(u).hostname.toLowerCase() } catch { return '' } }

/** 单个卡片组件：负责自适应预览位置 & 预览失败截图兜底 */
function LinkCard({ it }) {
  const aRef = useRef(null)
  const [pv, setPv] = useState({ left: 0, top: 0, w: 640, h: 400 })
  const [loaded, setLoaded] = useState(false)   // iframe 是否成功加载
  const [failed, setFailed] = useState(false)   // 认为被站点限制，显示截图
  const timerRef = useRef(null)

  const host = it.URL ? safeHost(it.URL) : ''
  // 图标兜底：Avatar → DuckDuckGo → /favicon.ico → Google S2 → 本地
  const iconDuck = host ? `https://icons.duckduckgo.com/ip3/${host.replace(/^www\./,'')}.ico` : '/favicon.ico'
  const iconRoot = host ? `https://${host}/favicon.ico` : '/favicon.ico'
  const iconS2   = host ? `https://www.google.com/s2/favicons?sz=64&domain=${host}` : '/favicon.ico'
  const initial  = it.Avatar || iconDuck

  // 进入时计算最佳位置 + 启动兜底计时器
  const onEnter = () => {
    if (!aRef.current || typeof window === 'undefined') return
    const rect = aRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 12

    // 自适应尺寸（更大，但不超过视口）
    const w = Math.min(860, Math.max(520, Math.floor(vw * 0.58)))
    const h = Math.min(520, Math.max(300, Math.floor(vh * 0.5)))

    // 优先右侧 → 左侧 → 下方 → 上方
    let left = rect.right + margin
    let top  = rect.top
    let pos  = 'right'
    if (left + w > vw - margin) {
      // 尝试左侧
      const tryLeft = rect.left - w - margin
      if (tryLeft >= margin) { left = tryLeft; pos = 'left' }
      else {
        // 尝试下方
        const tryBottom = rect.bottom + margin
        if (tryBottom + h <= vh - margin) { left = Math.min(rect.left, vw - w - margin); top = tryBottom; pos = 'bottom' }
        else {
          // 放上方
          left = Math.min(rect.left, vw - w - margin); top = rect.top - h - margin; pos = 'top'
        }
      }
    }
    // 垂直方向防越界
    top = Math.max(margin, Math.min(top, vh - h - margin))
    left = Math.max(margin, Math.min(left, vw - w - margin))

    setPv({ left, top, w, h })

    // 启动“预览受限”兜底：若 2200ms 内未标记 loaded，则认为失败，显示截图
    setLoaded(false)
    setFailed(false)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!loaded) setFailed(true)
    }, 2200)
  }

  const onLeave = () => {
    clearTimeout(timerRef.current)
  }

  // mShots 截图服务（无 Key）：以预览窗口大小生成缩略图
  const shot = it.URL
    ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(it.URL)}?w=${Math.round(pv.w)}&h=${Math.round(pv.h)}`
    : ''

  return (
    <li>
      <a
        ref={aRef}
        className="card"
        href={it.URL || '#'}
        target="_blank"
        rel="noopener noreferrer nofollow external"
        aria-label={it.Name}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
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

        <div className="meta">
          <div className="name">{it.Name}</div>
          {it.Description && <p className="desc">{it.Description}</p>}
          {host && <div className="host">{host.replace(/^www\./, '')}</div>}
        </div>

        {/* 固定定位的大预览窗：靠右优先，自动回避遮挡；移动端隐藏 */}
        {it.URL && (
          <div
            className="preview"
            style={{ left: pv.left, top: pv.top, width: pv.w, height: pv.h }}
            aria-hidden
          >
            {/* 截图兜底层（默认显示；iframe 成功后淡出） */}
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

            {/* 实时网页 iframe（成功后覆盖截图） */}
            <iframe
              className={`frame ${loaded && !failed ? 'show' : ''}`}
              src={it.URL}
              title={it.Name}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-pointer-lock allow-modals"
              onLoad={() => { setLoaded(true); clearTimeout(timerRef.current) }}
            />

            {/* 预览受限提示（当 failed=true 时显示） */}
            {failed && (
              <div className="limited">该站点禁止内嵌预览，已显示截图。点击卡片访问完整页面。</div>
            )}
          </div>
        )}
      </a>

      <style jsx>{`
        li { display:block; height:100% }
        .card{
          position:relative; display:flex; gap:12px; align-items:flex-start;
          height:100%;
          padding:14px; border:1px solid var(--box); border-radius:var(--radius);
          text-decoration:none; background: transparent;
          transform: translateZ(0) scale(1); will-change: transform, box-shadow;
          transition: transform .22s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease;
          min-height: 96px;
        }
        .card:hover{
          transform: translateY(-1px) scale(1.015);
          box-shadow: 0 0 0 1px var(--ring), 0 10px 28px rgba(0,0,0,.10);
        }
        .icon{
          flex:0 0 auto; width:44px; height:44px; border-radius:10px; overflow:hidden;
          border:1px solid var(--box);
        }
        .icon img{ width:100%; height:100%; object-fit:cover; display:block }

        .meta{ min-width:0 }
        .name{ color:var(--txt); font-weight:800; font-size:16px; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
        .desc{ margin:4px 0 0; color:var(--sub); font-size:13px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden }
        .host{ margin-top:6px; font-size:12px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }

        /* —— 预览窗（fixed 定位，自适应位置 & 尺寸） —— */
        .preview{
          position: fixed;
          z-index: 60;
          pointer-events: none; /* 只预览，不交互 */
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 18px 48px rgba(0,0,0,.28);
          border: 1px solid var(--ring);
          backdrop-filter: blur(8px) saturate(130%);
          isolation: isolate;
          display: none; /* 移动端默认隐藏 */
          opacity: 0;
          transform: translateY(-6px) scale(.985);
          transition: opacity .18s ease, transform .18s ease;
        }
        /* 仅大屏启用预览，并在 hover 时显现 */
        @media (min-width: 900px){
          .card:hover .preview{ display:block; opacity: 1; transform: translateY(-10px) scale(1) }
        }

        .frame, .shot{
          position:absolute; inset:0; width:100%; height:100%; border:0; display:block;
          background:#0b1220; object-fit: cover;
          transition: opacity .18s ease;
        }
        .shot.hide{ opacity:0; }
        .frame{ opacity:0 }
        .frame.show{ opacity:1 }

        .limited{
          position:absolute; left:0; right:0; bottom:0;
          padding: 6px 10px;
          font-size: 12px; color:#e5e7eb;
          background: linear-gradient(to top, rgba(11,18,32,.9), rgba(11,18,32,.0));
        }
      `}</style>
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
        <p>悬停卡片预览网页，点击新标签打开。</p>
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

        /* 同排宽度一致：固定最小列宽，等分剩余空间 */
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
