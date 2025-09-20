import Head from 'next/head'
import { getAllFriends } from '@/lib/notion-friends'

export async function getStaticProps() {
  const friends = await getAllFriends()
  return { props: { friends }, revalidate: 3600 } // 每小时更新
}

export default function FriendsPage({ friends }) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <Head><title>友情链接</title></Head>
      <h1 className="text-3xl font-bold mb-4">友情链接</h1>
      <p className="text-sm text-gray-600 mb-6">
        互链标准：学术 / 教育 / 科研相关；失联 30 天下架；提交：站点名 / 链接 / 简介 / 图标 / 分类。
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {friends.map(f => (
          <li key={f.url} className="border rounded-xl p-4 hover:shadow transition">
            <a href={f.url} target="_blank" rel="noreferrer" className="flex gap-3 items-center">
              <img src={f.avatar} alt="" className="w-10 h-10 rounded-lg"/>
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="text-xs opacity-70">{f.desc}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
