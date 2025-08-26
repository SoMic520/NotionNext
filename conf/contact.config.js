/**
 * 社交按钮相关的配置统一放这
 */
module.exports = {
  // 社交链接，不需要可留空白，例如 CONTACT_WEIBO:''
  CONTACT_EMAIL:
    (process.env.NEXT_PUBLIC_CONTACT_EMAIL &&
      Buffer.from(process.env.NEXT_PUBLIC_CONTACT_EMAIL, 'utf-8').toString('base64')) ||
    'jhzhou520@gmail.com', // 邮箱地址 例如mail@tangly1024.com

  CONTACT_WEIBO: process.env.NEXT_PUBLIC_CONTACT_WEIBO || 'https://weibo.com/u/5948437518',
  CONTACT_TWITTER: process.env.NEXT_PUBLIC_CONTACT_TWITTER || 'https://x.com/jhzhou1997',
  CONTACT_GITHUB: process.env.NEXT_PUBLIC_CONTACT_GITHUB || 'https://github.com/SoMic520',
  CONTACT_TELEGRAM: process.env.NEXT_PUBLIC_CONTACT_TELEGRAM || 'https://t.me/SoMic520',
  CONTACT_LINKEDIN: process.env.NEXT_PUBLIC_CONTACT_LINKEDIN || '',
  CONTACT_INSTAGRAM: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM || 'https://www.instagram.com/jhzhou1997',
  CONTACT_BILIBILI: process.env.NEXT_PUBLIC_CONTACT_BILIBILI || 'https://space.bilibili.com/315880856',
  CONTACT_YOUTUBE: process.env.NEXT_PUBLIC_CONTACT_YOUTUBE || 'https://www.youtube.com/@jhzhou520',
  CONTACT_XIAOHONGSHU: process.env.NEXT_PUBLIC_CONTACT_XIAOHONGSHU || 'https://xhslink.com/m/ATPpnX69yFu',
  CONTACT_ZHISHIXINGQIU: process.env.NEXT_PUBLIC_CONTACT_ZHISHIXINGQIU || '',
  CONTACT_WEHCHAT_PUBLIC:
    process.env.NEXT_PUBLIC_CONTACT_WEHCHAT_PUBLIC ||
    'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=Mzg2MjgyMjYyOA==&scene=124#wechat_redirect',
};
