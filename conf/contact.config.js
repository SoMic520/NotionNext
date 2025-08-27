// conf/contact.config.js
'use strict';

/**
 * 社交按钮相关的配置统一放这
 * 注意：
 * - 本文件仅使用 ASCII 字符，避免全角符号导致构建错误
 * - CONTACT_EMAIL 使用 Node.js Buffer 做 base64 编码，兼容 Vercel 构建环境
 * - 如果 package.json 里是 "type": "module"，请将 `module.exports` 改为 `export default`
 */
module.exports = {
  /**
   * 邮箱（base64 编码），避免直接明文展示
   * - 优先读取 NEXT_PUBLIC_CONTACT_EMAIL 环境变量
   * - 如果没设置，默认值为 jhzhou520@gmail.com
   */
  CONTACT_EMAIL:
    (process.env.NEXT_PUBLIC_CONTACT_EMAIL &&
      Buffer.from(process.env.NEXT_PUBLIC_CONTACT_EMAIL, 'utf-8').toString('base64')) ||
    'jhzhou520@gmail.com',

  /** 微博主页 */
  CONTACT_WEIBO: process.env.NEXT_PUBLIC_CONTACT_WEIBO || 'https://weibo.com/u/5948437518',

  /** Twitter / X 主页 */
  CONTACT_TWITTER: process.env.NEXT_PUBLIC_CONTACT_TWITTER || 'https://x.com/jhzhou1997',

  /** GitHub 主页 */
  CONTACT_GITHUB: process.env.NEXT_PUBLIC_CONTACT_GITHUB || 'https://github.com/SoMic520',

  /** Telegram 主页 */
  CONTACT_TELEGRAM: process.env.NEXT_PUBLIC_CONTACT_TELEGRAM || 'https://t.me/SoMic520',

  /** LinkedIn 主页（默认留空，可自行填写） */
  CONTACT_LINKEDIN: process.env.NEXT_PUBLIC_CONTACT_LINKEDIN || '',

  /** Instagram 主页 */
  CONTACT_INSTAGRAM: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM || 'https://www.instagram.com/jhzhou1997',

  /** Bilibili 主页 */
  CONTACT_BILIBILI: process.env.NEXT_PUBLIC_CONTACT_BILIBILI || 'https://space.bilibili.com/315880856',

  /** YouTube 主页 */
  CONTACT_YOUTUBE: process.env.NEXT_PUBLIC_CONTACT_YOUTUBE || 'https://www.youtube.com/@jhzhou520',

  /** 小红书主页 */
  CONTACT_XIAOHONGSHU: process.env.NEXT_PUBLIC_CONTACT_XIAOHONGSHU || 'https://xhslink.com/m/ATPpnX69yFu',

  /** 知识星球主页（默认留空，可自行填写） */
  CONTACT_ZHISHIXINGQIU: process.env.NEXT_PUBLIC_CONTACT_ZHISHIXINGQIU || '',

  /**
   * 微信公众号主页
   * - 必须使用微信官方格式：https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=【xxxxxx】==#wechat_redirect
   */
  CONTACT_WEHCHAT_PUBLIC:
    process.env.NEXT_PUBLIC_CONTACT_WEHCHAT_PUBLIC ||
    'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=Mzg2MjgyMjYyOA==&scene=124#wechat_redirect',
}
