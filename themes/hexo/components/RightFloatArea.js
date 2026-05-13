import { useCallback, useEffect, useRef, useState } from 'react'
import ButtonDarkModeFloat from './ButtonFloatDarkMode'
import ButtonJumpToTop from './ButtonJumpToTop'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function getScrollState() {
  const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 0
  const documentHeight = Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0,
    document.body?.offsetHeight || 0,
    document.documentElement?.offsetHeight || 0
  )
  const fullHeight = Math.max(1, documentHeight - viewportHeight)
  const percent = clamp(Math.round((scrollY / fullHeight) * 100), 0, 100)

  return {
    percent,
    visible: scrollY > 180 && percent > 0
  }
}

/**
 * 悬浮在右下角的按钮。
 * 使用 requestAnimationFrame 节流，避免滚动时频繁 setState；
 * 进度按整页滚动高度计算，按钮显隐加入轻微位移和缩放，避免闪烁。
 * @param {*} param0
 * @returns
 */
export default function RightFloatArea({ floatSlot }) {
  const frameRef = useRef(null)
  const lastStateRef = useRef({ visible: false, percent: 0 })
  const [floatState, setFloatState] = useState(lastStateRef.current)

  const updateFloatState = useCallback(() => {
    frameRef.current = null
    const nextState = getScrollState()
    const prevState = lastStateRef.current

    if (
      nextState.visible !== prevState.visible ||
      nextState.percent !== prevState.percent
    ) {
      lastStateRef.current = nextState
      setFloatState(nextState)
    }
  }, [])

  useEffect(() => {
    const scheduleUpdate = () => {
      if (frameRef.current) return
      frameRef.current = window.requestAnimationFrame(updateFloatState)
    }

    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [updateFloatState])

  const visibleClass = floatState.visible
    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
    : 'invisible opacity-0 translate-y-3 scale-95 pointer-events-none'

  return (
    <div
      className={
        visibleClass +
        ' duration-300 ease-out transition-all bottom-12 right-1 fixed justify-end z-20 text-white bg-indigo-500 dark:bg-hexo-black-gray rounded-md shadow-lg overflow-hidden'
      }>
      <div className='justify-center flex flex-col items-center cursor-pointer divide-y divide-white/15 dark:divide-gray-700/70'>
        <ButtonDarkModeFloat />
        {floatSlot}
        <ButtonJumpToTop percent={floatState.percent} />
      </div>
    </div>
  )
}
