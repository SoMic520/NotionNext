// pages/recommend/index.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import Head from 'next/head' // 引入 Head 组件
import { useEffect } from 'react'

export default function LayoutRecommend(props) {
  useEffect(() => {
    // 设置页面标题为 SoMic Studio | Hots，防止被覆盖
    document.title = 'SoMic Studio | Hots';

    // 确保后续代码不会修改标题
    const originalTitle = document.title;
    const intervalId = setInterval(() => {
      // 如果标题被修改为 "loading"，则恢复为原始标题
      if (document.title === 'SoMic Studio | loading') {
        document.title = originalTitle;
      }
    }, 100); // 每100ms检查一次标题

    // 清理 setInterval，避免内存泄漏
    return () => clearInterval(intervalId);
  }, []); // 空依赖数组，确保只在组件挂载时执行

  return (
    <>
      {/* 设置页面头部标题为 SoMic Studio | Hots */}
      <Head>
        <title>SoMic Studio | Hots</title>
      </Head>

      {/* 渲染页面的内容 */}
      <DynamicLayout
        theme={siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)}
        layoutName="LayoutRecommend"
        {...props}
      />
    </>
  );
}

export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({ from: 'Recommend', locale })

  // ✅ 兜底：如果 posts 为空，就从 allPages 抽出已发布的博文
  if ((!props.posts || props.posts.length === 0) && Array.isArray(props.allPages)) {
    props.posts = props.allPages.filter(p => p?.type === 'Post' && p?.status === 'Published')
  }

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND, props.NOTION_CONFIG)
  }
}
