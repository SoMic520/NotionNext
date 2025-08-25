// 这里编写自定义js脚本；将被静态引入到页面中

// ===== 光标动效：只保留涟漪 + 词条 =====

const COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];
const WORDS  = ['加油','今天会更好','保持专注','Nice!','冲！'];

const onClick = (e) => {
  const color = COLORS[(Math.random()*COLORS.length)|0];

  // 涟漪
  const n = document.createElement('div');
  n.className = 'fx-ripple';
  n.style.setProperty('--x', e.clientX+'px');
  n.style.setProperty('--y', e.clientY+'px');
  n.style.setProperty('--color', color);
  n.style.setProperty('--dur', '300ms');
  n.style.setProperty('--scale', '13');
  document.body.appendChild(n);
  setTimeout(()=>n.remove(), 380);

  // 词条
  const s = document.createElement('span');
  s.className = 'fx-word';
  s.textContent = WORDS[(Math.random()*WORDS.length)|0];
  s.style.left = e.clientX+'px';
  s.style.top  = e.clientY+'px';
  s.style.setProperty('--color', color);
  document.body.appendChild(s);
  setTimeout(()=>s.remove(), 760);
};

document.addEventListener('click', onClick);
