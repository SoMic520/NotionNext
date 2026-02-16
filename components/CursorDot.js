import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

/**
 * 白点鼠标跟随
 * 使用事件委托代替逐元素绑定，大幅减少事件监听器数量
 */
const CursorDot = () => {
    const router = useRouter();
    const animFrameRef = useRef(null);

    useEffect(() => {
        // 创建小白点元素
        const dot = document.createElement('div');
        dot.classList.add('cursor-dot');
        document.body.appendChild(dot);

        // 鼠标坐标和缓动目标坐标
        let mouse = { x: -100, y: -100 };
        let dotPos = { x: mouse.x, y: mouse.y };

        // 监听鼠标移动
        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        document.addEventListener('mousemove', handleMouseMove, { passive: true });

        // 使用事件委托：仅在 document 上监听，判断 target 是否为可点击元素
        const isClickable = (el) => {
            if (!el || el === document.body || el === document.documentElement) return false;
            const tag = el.tagName;
            if (tag === 'A' || tag === 'BUTTON') return true;
            if (el.getAttribute('role') === 'button') return true;
            if (el.hasAttribute('onclick')) return true;
            const style = window.getComputedStyle(el);
            if (style.cursor === 'pointer') return true;
            return false;
        };

        const handleMouseOver = (e) => {
            let target = e.target;
            while (target && target !== document.body) {
                if (isClickable(target)) {
                    dot.classList.add('cursor-dot-hover');
                    return;
                }
                target = target.parentElement;
            }
            dot.classList.remove('cursor-dot-hover');
        };

        document.addEventListener('mouseover', handleMouseOver, { passive: true });

        // 动画循环
        const damping = 0.2;
        const updateDotPosition = () => {
            dotPos.x += (mouse.x - dotPos.x) * damping;
            dotPos.y += (mouse.y - dotPos.y) * damping;
            dot.style.left = `${dotPos.x}px`;
            dot.style.top = `${dotPos.y}px`;
            animFrameRef.current = requestAnimationFrame(updateDotPosition);
        };
        animFrameRef.current = requestAnimationFrame(updateDotPosition);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseover', handleMouseOver);
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            if (dot.parentNode) {
                dot.parentNode.removeChild(dot);
            }
        };
    }, [router]);

    return (
        <style jsx global>{`
            .cursor-dot {
                position: fixed;
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                pointer-events: none;
                transform: translate(-50%, -50%);
                z-index: 9999;
                transition: width 200ms ease, height 200ms ease;
                mix-blend-mode: difference;
                will-change: left, top, width, height;
            }

            .cursor-dot-hover {
                border: 1px solid rgba(167, 167, 167, 0.14);
                width: 60px;
                height: 60px;
                background: hsla(0, 0%, 100%, 0.04);
                -webkit-backdrop-filter: blur(5px);
                backdrop-filter: blur(5px);
            }

            .dark .cursor-dot-hover {
                border: 1px solid rgba(66, 66, 66, 0.66);
            }
        `}</style>
    );
};

export default CursorDot;
