import { useMemo, useState } from 'react'

export default function LayoutRecommend (props) {
  const { posts = [] } = props

  // 只取含 recommend 的文章（兼容 string / array）
  const recPosts = useMemo(() => {
    return posts.filter(p => {
      const v = p?.recommend
      if (!v) return false
      return Array.isArray(v) ? v.length > 0 : typeof v === 'string'
    })
  }, [posts])

  // 动态收集所有 recommend 取值，生成 tabs
  const tabs = useMemo(() => {
    const s = new Set()
    recPosts.forEach(p => {
      const v = p.recommend
      if (Array.isArray(v)) v.forEach(x => s.add(x))
      else if (typeof v === 'string') s.add(v)
    })
    return Array.from(s)
  }, [recPosts])

  const [selected, setSelected] = useState(null) // null=全部

  const list = useMemo(() => {
    if (!selected) return recPosts
    return recPosts.filter(p => {
      const v = p.recommend
      return Array.isArray(v) ? v.includes(selected) : v === selected
    })
  }, [recPosts, selected])

  const getDate = p => p?.publishDate || p?.date?.start_date || p?.publishDay || ''

  return (
    <div className='max-w-3xl mx-auto px-4 py-6'>
      <h1 className='text-2xl font-semibold mb-4'>推荐文章</h1>

      {/* 顶部推荐类别（不跳转） */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <button
          onClick={() => setSelected(null)}
          className={`px-3 py-1 rounded-2xl border text-sm ${!selected ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
        >
          全部
        </button>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`px-3 py-1 rounded-2xl border text-sm ${selected === t ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
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
