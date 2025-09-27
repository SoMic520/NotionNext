import { useEffect } from 'react';

export default function LayoutRecommend(props) {
  useEffect(() => {
    // 设置页面标题为 SoMic Studio | Hots，防止被覆盖
    document.title = 'SoMic Studio | Hots';

    // 确保后续代码不会修改标题
    const originalTitle = document.title;
    const intervalId = setInterval(() => {
      if (document.title === 'SoMic Studio | loading') {
        document.title = originalTitle;
      }
    }, 100);

    // 清理 setInterval，避免内存泄漏
    return () => clearInterval(intervalId);
  }, []); // 空依赖数组，确保只在组件挂载时执行

  return (
    <>
      {/* 渲染页面的内容 */}
      <DynamicLayout
        theme={siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)}
        layoutName="LayoutRecommend"
        {...props}
      />
    </>
  );
}
