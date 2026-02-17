import BLOG from '@/blog.config'
import useNotification from '@/components/Notification'
import OpenWrite from '@/components/OpenWrite'
import { siteConfig } from '@/lib/config'
import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { getPageTableOfContents } from '@/lib/db/notion/getPageTableOfContents'
import { useGlobal } from '@/lib/global'
import { getPasswordQuery } from '@/lib/utils/password'
import { DynamicLayout } from '@/themes/theme'
import md5 from 'js-md5'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'

const LinksPage = props => {
  const { post } = props
  const router = useRouter()
  const { locale } = useGlobal()

  const [lock, setLock] = useState(post?.password && post?.password !== '')
  const { showNotification, Notification } = useNotification()

  const validPassword = useCallback(
    passInput => {
      if (!post) return false
      const encrypt = md5(post?.slug + passInput)
      if (passInput && encrypt === post?.password) {
        setLock(false)
        localStorage.setItem('password_' + router.asPath, passInput)
        showNotification(locale.COMMON.ARTICLE_UNLOCK_TIPS)
        return true
      }
      return false
    },
    [locale.COMMON.ARTICLE_UNLOCK_TIPS, post, router.asPath, showNotification]
  )

  useEffect(() => {
    if (post?.password && post?.password !== '') {
      setLock(true)
    } else {
      setLock(false)
    }

    const passInputs = getPasswordQuery(router.asPath)
    if (passInputs.length > 0) {
      for (const passInput of passInputs) {
        if (validPassword(passInput)) break
      }
    }
  }, [post, router.asPath, validPassword])

  useEffect(() => {
    if (lock) return
    if (post?.blockMap?.block) {
      post.content = Object.keys(post.blockMap.block).filter(
        key => post.blockMap.block[key]?.value?.parent_id === post.id
      )
      post.toc = getPageTableOfContents(post, post.blockMap)
    }
  }, [lock, post])

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return (
    <>
      <DynamicLayout
        theme={theme}
        layoutName='LayoutSlug'
        {...props}
        lock={lock}
        validPassword={validPassword}
      />
      {post?.password && post?.password !== '' && !lock && <Notification />}
      <OpenWrite />
    </>
  )
}

export async function getStaticProps({ locale }) {
  const candidates = ['links', 'friend-links', 'friends', 'link', 'friend']

  for (const prefix of candidates) {
    const props = await resolvePostProps({
      prefix,
      locale,
      from: `links-alias-${prefix}`
    })

    if (props?.post) {
      return {
        props,
        revalidate: process.env.EXPORT
          ? undefined
          : siteConfig(
            'NEXT_REVALIDATE_SECOND',
            BLOG.NEXT_REVALIDATE_SECOND,
            props.NOTION_CONFIG
          )
      }
    }
  }

  return { notFound: true }
}

export default LinksPage
