import { useMemo, useState } from 'react'

/**
 * 诊断&容错增强版 Recommend 布局
 * - 同时尝试从 p.recommend、p.ext?.recommend 读取
 * - 只展示 {type: 'Post', status: 'Published'}（可按需改）
 * - 支持 string / string[] / 逗号分隔字符串
 * - 页面顶部显示命中统计 & 失败原因
 */
export default function LayoutRecommend (props) {
  const { posts = [] } = props

  // 统一把 recommend 取出来，并做标准化（=> string[]）
  const normalizeRecommend = (p) => {
    let v = p?.recommend
    if (!v && p?.ext && typeof p.ext === 'object') {
      v = p.ext.recommend // 兼容有人把 recommend 放进 ext 的情况
    }
    if (!v) return []

    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean)
    if (typeof v === 'string') {
      // 兼容“标签1, 标签2”写法
      if (v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean)
      return [v.trim()].filter(Boolean)
    }
    // 其它类型（比如 boolean）直接忽略
    return []
  }

  // 统计信息（用于诊断）
  const stat = useMemo(() => {
    let total = posts.length
    let hasRecommend = 0
    let wrongTypeOrStatus = 0
    let ok = 0

    posts.forEach(p => {
      const list = normalizeRecommend(p)
      const isPost = p?.type === 'Post'
      const isPublish = p?.status === 'Published'
      if (list.length > 0) hasRecommend++
      if (list.length > 0 && (!isPost || !isPublish)) wrongTypeOrStatus++
      if (list.length > 0 && isPost && isPublish) ok++
    })

    return { total, hasRecommend, wrongTypeOrStatus, ok }
  }, [posts])

  // 只要“已发布的博文 & 有 recommend”
  const recPosts = useMemo(() => {
    return (posts || []).filter(p => {
      const list = normalizeRecommend(p)
      const isPost = p?.type === 'Post'
      const isPublish = p?.status === 'Published'
      return list.length > 0 && isPost && isPublish
    })
  }, [posts])

  // 收集所有推荐类别，生成 tabs
  const tabs = useMemo(() => {
    const s = new Set()
    recPosts.forEach(p => normalizeRecommend(p).forEach(x => s.add(x)))
    return Array.from(s)
  }, [recPosts])

  const [selected, setSelected] = useState(null) // null=全部

  // 就地筛选（不跳转）
  const list = useMemo(() => {
    if (!selected) return recPosts
    return recPosts.filter(p => normalizeRecommend(p).includes(selected))
  }, [recPosts, selected])

  const getDate = p =>
    p?.publishDay || p?.date?.start_date || p?.lastEditedDay || ''

  return (
    <div className='max-w-3xl mx-auto px-4 py-6'>
      <h1 className='text-2xl font-semibold mb-3'>推荐文章</h1>

      {/* 诊断条：一眼看出问题在哪 */}
      <div className='text-sm mb-4 rounded-md border px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'>
        <div>
          全部文章：<b>{stat.total}</b>，
          含 recommend：<b>{stat.hasRecommend}</b>，
          其中非 Post/未 Published：<b>{stat.wrongTypeOrStatus}</b>，
          最终可展示：<b>{stat.ok}</b>
        </div>
        {stat.hasRecommend === 0 && (
          <div className='mt-1'>
            🔎 没检测到任何 <code>recommend</code>。请确认：
            ① Notion 列名确实叫 <code>recommend</code>；
            ② 至少给一篇文章填了这个列；
            ③ 若填在 <code>ext</code> 里，请把 key 也叫 <code>recommend</code>。
          </div>
        )}
        {stat.hasRecommend > 0 && stat.ok === 0 && (
          <div className='mt-1'>
            ⚠️ 检测到 recommend，但都被类型/状态过滤。
            需要文章满足 <code>type === 'Post'</code> 且 <code>status === 'Published'</code>。
            （若要放开 Page，请把代码里 <code>isPost</code> 改成 <code>['Post','Page'].includes(p?.type)</code>）
          </div>
        )}
      </div>

      {/* 顶部推荐类别（不跳转按钮） */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <button
          onClick={() => setSelected(null)}
          className={`px-3 py-1 rounded-2xl border text-sm ${
            !selected
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-200'
          }`}
        >
          全部
        </button>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`px-3 py-1 rounded-2xl border text-sm ${
              selected === t
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-200'
            }`}
            title={t}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 列表：标题 + 时间 */}
      <ul className='divide-y divide-gray-200 dark:divide-gray-700'>
        {list.map(p => (
          <li key={p.id} className='py-2 flex justify-between'>
            <a
              href={p?.slug ? `/${p.slug}` : `/post/${p.id}`}
              className='text-blue-600 hover:underline dark:text-blue-400'
            >
              {p.title}
            </a>
            <span className='text-sm text-gray-500 dark:text-gray-400 ml-4 whitespace-nowrap'>
              {getDate(p)}
            </span>
          </li>
        ))}

        {list.length === 0 && (
          <li className='py-10 text-center text-sm text-gray-500 dark:text-gray-400'>
            暂无推荐文章
          </li>
        )}
      </ul>
    </div>
  )
}
