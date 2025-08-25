// 这里编写自定义js脚本；将被静态引入到页面中
/* ===== Cursor FX Script =====
   可调配置在 window.CURSOR_FX_OPTS，按需覆盖即可。
*/
window.CURSOR_FX_OPTS = Object.assign({
  enableParticles: true,          // 自然跟随拖尾
  enableRipple: true,             // 点击涟漪
  enableWords: true,              // 点击词条
  words: ['加油','今天会更好','保持专注','Nice!','冲！'],
  colors: ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'],
  count: 24,                      // 粒子数量（20~36）
  disableOnMobile: true           // 移动端关闭（建议开启）
}, window.CURSOR_FX_OPTS || {});

(function () {
  const OPTS = window.CURSOR_FX_OPTS || {};
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const reduced  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ((OPTS.disableOnMobile && isMobile) || reduced) return;

  const COLORS = OPTS.colors.slice();
  const pickColor = () => COLORS[(Math.random()*COLORS.length)|0];
  const WORDS  = OPTS.words.slice();

  // —— 点击：涟漪 + 词条 ——
  const onClick = (e) => {
    const color = pickColor();
    if (OPTS.enableRipple) {
      const n = document.createElement('div');
      n.className = 'fx-ripple';
      n.style.setProperty('--x', e.clientX + 'px');
      n.style.setProperty('--y', e.clientY + 'px');
      n.style.setProperty('--color', color);
      n.style.setProperty('--dur', '280ms');
      n.style.setProperty('--scale', '12');
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 360);
    }
    if (OPTS.enableWords && WORDS.length) {
      const s = document.createElement('span');
      s.className = 'fx-word';
      s.textContent = WORDS[(Math.random()*WORDS.length)|0];
      s.style.left = e.clientX + 'px';
      s.style.top  = e.clientY + 'px';
      s.style.setProperty('--color', color);
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 680);
    }
  };
  document.addEventListener('click', onClick);

  // —— 自然跟随拖尾（不绕圈/不排成线） ——
  if (!OPTS.enableParticles) return;

  // 鼠标状态
  const mouse = { x: innerWidth/2, y: innerHeight/2, vx: 0, vy: 0, t: performance.now() };
  addEventListener('mousemove', e => {
    const now = performance.now();
    const dt = Math.max(1, now - mouse.t);
    mouse.vx = (e.clientX - mouse.x) / dt; // px/ms
    mouse.vy = (e.clientY - mouse.y) / dt;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now;
  }, {passive:true});

  // 工具：线性插值 + 平滑“伪噪声”
  const lerp = (a,b,t)=>a+(b-a)*t;
  const noise = (seed, t)=> Math.sin(t*0.001 + seed*1.7) * 0.6 + Math.cos(t*0.0014 + seed*2.3) * 0.4;

  const COUNT = OPTS.count || 24;
  const particles = [], spans = [];

  class Particle {
    constructor(i){
      this.i = i;
      this.alpha = 0.22 - i*(0.22-0.10)/(COUNT-1); // 跟随平滑系数：前快后慢
      this.size  = 1 + Math.random()*1.5;          // 1 ~ 2.5 px
      this.seed  = Math.random()*1000;
      this.x = mouse.x; this.y = mouse.y;
      const hue = (Math.random()*360)|0;
      this.color = `hsl(${hue},80%,50%)`;
      this.opacity = 0.85 - i*(0.85-0.35)/(COUNT-1); // 前亮后淡
    }
    update(t){
      // 目标点加入极轻噪声，避免完全重叠（不会抖、不会成线）
      const nx = noise(this.seed, t) * 0.8;
      const ny = noise(this.seed+10, t) * 0.8;
      const tx = mouse.x + nx;
      const ty = mouse.y + ny;
      this.x = lerp(this.x, tx, this.alpha);
      this.y = lerp(this.y, ty, this.alpha);
    }
  }

  for (let i=0;i<COUNT;i++) {
    const p = new Particle(i); particles.push(p);
    const sp = document.createElement('span'); sp.className = 'particle';
    sp.style.width = p.size + 'px'; sp.style.height = p.size + 'px';
    sp.style.background = p.color; sp.style.boxShadow = `0 0 1px ${p.color}`;
    document.body.appendChild(sp); spans.push(sp);
  }

  const draw = () => {
    const t = performance.now();
    for (let i=0;i<particles.length;i++) {
      const p = particles[i]; p.update(t);
      const sp = spans[i];
      sp.style.top = p.y + 'px'; sp.style.left = p.x + 'px';
      sp.style.opacity = p.opacity;
      // 轻微速度感：随鼠标速度放大一点点更灵动
      const speed = Math.min(2, Math.hypot(mouse.vx, mouse.vy)*8);
      sp.style.transform = `translateZ(0) scale(${1 + speed*0.06})`;
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
