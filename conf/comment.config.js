/**
 * 挂件组件相关
 * 可同时开启多个支持 WALINE VALINE GISCUS CUSDIS UTTERRANCES GITALK
 */
module.exports = {
  COMMENT_HIDE_SINGLE_TAB:
    process.env.NEXT_PUBLIC_COMMENT_HIDE_SINGLE_TAB || true, // 只有一个评论组件时是否隐藏切换标签

  // artalk 评论插件
  COMMENT_ARTALK_SERVER: process.env.NEXT_PUBLIC_COMMENT_ARTALK_SERVER || '', // Artalk 后端地址
  COMMENT_ARTALK_JS:
    process.env.NEXT_PUBLIC_COMMENT_ARTALK_JS ||
    'https://cdnjs.cloudflare.com/ajax/libs/artalk/2.5.5/Artalk.js',
  COMMENT_ARTALK_CSS:
    process.env.NEXT_PUBLIC_COMMENT_ARTALK_CSS ||
    'https://cdnjs.cloudflare.com/ajax/libs/artalk/2.5.5/Artalk.css',

  // twikoo
  COMMENT_TWIKOO_ENV_ID: process.env.NEXT_PUBLIC_COMMENT_ENV_ID || '',
  COMMENT_TWIKOO_COUNT_ENABLE:
    process.env.NEXT_PUBLIC_COMMENT_TWIKOO_COUNT_ENABLE || false,
  COMMENT_TWIKOO_CDN_URL:
    process.env.NEXT_PUBLIC_COMMENT_TWIKOO_CDN_URL ||
    'https://s4.zstatic.net/npm/twikoo@1.6.44/dist/twikoo.min.js',

  // utterances
  COMMENT_UTTERRANCES_REPO:
    process.env.NEXT_PUBLIC_COMMENT_UTTERRANCES_REPO || '',

  // giscus @see https://giscus.app/
  COMMENT_GISCUS_REPO: process.env.NEXT_PUBLIC_COMMENT_GISCUS_REPO || '',
  COMMENT_GISCUS_REPO_ID: process.env.NEXT_PUBLIC_COMMENT_GISCUS_REPO_ID || '',
  COMMENT_GISCUS_CATEGORY_ID:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_CATEGORY_ID || '',
  COMMENT_GISCUS_MAPPING:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_MAPPING || 'pathname',
  COMMENT_GISCUS_REACTIONS_ENABLED:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_REACTIONS_ENABLED || '1',
  COMMENT_GISCUS_EMIT_METADATA:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_EMIT_METADATA || '0',
  COMMENT_GISCUS_INPUT_POSITION:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_INPUT_POSITION || 'bottom',
  COMMENT_GISCUS_LANG: process.env.NEXT_PUBLIC_COMMENT_GISCUS_LANG || 'zh-CN',
  COMMENT_GISCUS_LOADING:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_LOADING || 'lazy',
  COMMENT_GISCUS_CROSSORIGIN:
    process.env.NEXT_PUBLIC_COMMENT_GISCUS_CROSSORIGIN || 'anonymous',

  // cusdis
  COMMENT_CUSDIS_APP_ID: process.env.NEXT_PUBLIC_COMMENT_CUSDIS_APP_ID || '',
  COMMENT_CUSDIS_HOST:
    process.env.NEXT_PUBLIC_COMMENT_CUSDIS_HOST || 'https://cusdis.com',
  COMMENT_CUSDIS_SCRIPT_SRC:
    process.env.NEXT_PUBLIC_COMMENT_CUSDIS_SCRIPT_SRC || '/js/cusdis.es.js',

  // gitalk
  COMMENT_GITALK_REPO: process.env.NEXT_PUBLIC_COMMENT_GITALK_REPO || '',
  COMMENT_GITALK_OWNER: process.env.NEXT_PUBLIC_COMMENT_GITALK_OWNER || '',
  COMMENT_GITALK_ADMIN: process.env.NEXT_PUBLIC_COMMENT_GITALK_ADMIN || '',
  COMMENT_GITALK_CLIENT_ID:
    process.env.NEXT_PUBLIC_COMMENT_GITALK_CLIENT_ID || '',
  COMMENT_GITALK_CLIENT_SECRET:
    process.env.NEXT_PUBLIC_COMMENT_GITALK_CLIENT_SECRET || '',
  COMMENT_GITALK_DISTRACTION_FREE_MODE: false,
  COMMENT_GITALK_JS_CDN_URL:
    process.env.NEXT_PUBLIC_COMMENT_GITALK_JS_CDN_URL ||
    'https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.min.js',
  COMMENT_GITALK_CSS_CDN_URL:
    process.env.NEXT_PUBLIC_COMMENT_GITALK_CSS_CDN_URL ||
    'https://cdn.jsdelivr.net/npm/gitalk@1/dist/gitalk.css',

  COMMENT_GITTER_ROOM: process.env.NEXT_PUBLIC_COMMENT_GITTER_ROOM || '',
  COMMENT_DAO_VOICE_ID: process.env.NEXT_PUBLIC_COMMENT_DAO_VOICE_ID || '',
  COMMENT_TIDIO_ID: process.env.NEXT_PUBLIC_COMMENT_TIDIO_ID || '',

  // valine
  COMMENT_VALINE_CDN:
    process.env.NEXT_PUBLIC_VALINE_CDN ||
    'https://unpkg.com/valine@1.5.1/dist/Valine.min.js',
  COMMENT_VALINE_APP_ID: process.env.NEXT_PUBLIC_VALINE_ID || '',
  COMMENT_VALINE_APP_KEY: process.env.NEXT_PUBLIC_VALINE_KEY || '',
  COMMENT_VALINE_SERVER_URLS:
    process.env.NEXT_PUBLIC_VALINE_SERVER_URLS || '',
  COMMENT_VALINE_PLACEHOLDER:
    process.env.NEXT_PUBLIC_VALINE_PLACEHOLDER || '抢个沙发吧~',

  /**
   * Waline —— 关键改动：默认走“同域 /api/waline”
   * 如果你想改回独立域名（如 https://waline.somac.top），
   * 只需在 Vercel 环境变量里设置：NEXT_PUBLIC_WALINE_SERVER_URL=https://waline.somac.top
   */
  COMMENT_WALINE_SERVER_URL:
    process.env.NEXT_PUBLIC_WALINE_SERVER_URL || '/api/waline',
  COMMENT_WALINE_RECENT: process.env.NEXT_PUBLIC_WALINE_RECENT || false,

  // WebMention
  COMMENT_WEBMENTION_ENABLE: process.env.NEXT_PUBLIC_WEBMENTION_ENABLE || false,
  COMMENT_WEBMENTION_AUTH: process.env.NEXT_PUBLIC_WEBMENTION_AUTH || '',
  COMMENT_WEBMENTION_HOSTNAME:
    process.env.NEXT_PUBLIC_WEBMENTION_HOSTNAME || '',
  COMMENT_WEBMENTION_TWITTER_USERNAME:
    process.env.NEXT_PUBLIC_TWITTER_USERNAME || '',
  COMMENT_WEBMENTION_TOKEN: process.env.NEXT_PUBLIC_WEBMENTION_TOKEN || ''
}
