// /pages/links.js   （如果你是 src 结构，就放 /src/pages/links.js）
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'

const Links = (props) => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return (
    <DynamicLayout theme={theme} layoutName='LayoutSlug' {...props}>
      {/* 👇 你的自定义 UI 放这里；容器尺寸与站内一致 */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">友情链接</h1>
        <p className="text-sm opacity-70 mb-6">
          学术 / 教育 / 科研相关；失联 30 天暂时下架；提交：站点名 / 链接 / 简介 / 图标 / 分类。
        </p>

        {/* TODO: 把这里替换为你之前那套 Links 列表 UI */}
        <div className="text-sm opacity-70">（这里渲染你的列表组件）</div>
      </main>
    </DynamicLayout>
  )
}

// 复用和首页一样的全局数据，这样主题能正常渲染头部/侧栏/页脚等
export async function getStaticProps({ locale }) {
  const props = await getGlobalData({ from: 'links', locale })
  // 这里不做 Notion 内容渲染，只是拿全局配置给 DynamicLayout 用
  return {
    props,
    revalidate: siteConfig(
      'NEXT_REVALIDATE_SECOND',
      BLOG.NEXT_REVALIDATE_SECOND,
      props.NOTION_CONFIG
    )
  }
}

export default Links
