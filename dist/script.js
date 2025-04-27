// Referenzen
const canvas      = document.getElementById('patternCanvas');
const widthInput  = document.getElementById('canvasWidth');
const heightInput = document.getElementById('canvasHeight');
const detailInput = document.getElementById('detailLevel');
const generateBtn = document.getElementById('generateBtn');
const exportBtn   = document.getElementById('exportBtn');

const colors = ['#FFF100', '#F8F0DD'];

// Zufalls‐Integer inclusiv
function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Splitte lange 1×N/N×1‐Regionen in max. 3er‐Streifen
function preSplitLong(regions) {
  const out = [];
  regions.forEach(reg => {
    if (reg.w > 3 && reg.h === 1) {
      let rem = reg.w, cc = reg.c;
      while (rem > 3) {
        out.push({ r: reg.r, c: cc, h: 1, w: 3 });
        cc += 3; rem -= 3;
      }
      out.push({ r: reg.r, c: cc, h: 1, w: rem });
    } else if (reg.h > 3 && reg.w === 1) {
      let rem = reg.h, rr = reg.r;
      while (rem > 3) {
        out.push({ r: rr, c: reg.c, h: 3, w: 1 });
        rr += 3; rem -= 3;
      }
      out.push({ r: rr, c: reg.c, h: rem, w: 1 });
    } else {
      out.push(reg);
    }
  });
  return out;
}

// Erzeugt exakt count Regionen per Splits
function generateRegions(rows, cols, count) {
  let regions = preSplitLong([{ r: 0, c: 0, h: rows, w: cols }]);
  const history = [];

  for (let i = 1; i < count; i++) {
    regions.sort((a, b) => b.w * b.h - a.w * a.h);
    const reg = regions.shift();

    if (reg.w === 1 && reg.h === 1) {
      regions.push(reg);
      continue;
    }

    let orientation = reg.w > reg.h
      ? (Math.random() < 0.7 ? 'vertical' : 'horizontal')
      : (Math.random() < 0.7 ? 'horizontal' : 'vertical');

    if (history.length >= 2 &&
        history.at(-1) === history.at(-2)) {
      orientation = history.at(-1) === 'vertical'
        ? 'horizontal'
        : 'vertical';
    }
    history.push(orientation);

    let didSplit = false;
    if (orientation === 'vertical' && reg.w > 1) {
      const minS = Math.max(1, Math.floor(reg.w * 0.4));
      const maxS = Math.min(reg.w - 1, Math.ceil(reg.w * 0.6));
      const split = randomInt(minS, maxS);
      regions.push(
        { r: reg.r, c: reg.c,       h: reg.h, w: split },
        { r: reg.r, c: reg.c + split, h: reg.h, w: reg.w - split }
      );
      didSplit = true;
    } else if (orientation === 'horizontal' && reg.h > 1) {
      const minS = Math.max(1, Math.floor(reg.h * 0.4));
      const maxS = Math.min(reg.h - 1, Math.ceil(reg.h * 0.6));
      const split = randomInt(minS, maxS);
      regions.push(
        { r: reg.r,       c: reg.c, h: split,       w: reg.w },
        { r: reg.r + split, c: reg.c, h: reg.h - split, w: reg.w }
      );
      didSplit = true;
    }

    if (!didSplit) regions.push(reg);
    regions = preSplitLong(regions);
  }
  return regions;
}

// Skaliert SVG per CSS width/height, ohne Neugenerieren
function updateScale() {
  const W = parseInt(widthInput.value,  10);
  const H = parseInt(heightInput.value, 10);
  const { width: availW, height: availH } =
    document.querySelector('.canvas-wrapper').getBoundingClientRect();
  const scale = Math.min(availW / W, availH / H, 0.9);
  canvas.style.width  = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

// Generiert + zeichnet das Pattern
function generatePattern() {
  const W      = parseInt(widthInput.value,  10);
  const H      = parseInt(heightInput.value, 10);
  const detail = detailInput.value;

  canvas.innerHTML    = '';
  canvas.setAttribute('width',  W);
  canvas.setAttribute('height', H);
  canvas.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const shortSide = Math.min(W, H);
  const gridSize  = detail === 'simple'
    ? shortSide
    : (Math.random() < 0.5 ? shortSide / 2 : shortSide / 3);

  const baseCols = Math.floor(W / gridSize);
  const baseRows = Math.floor(H / gridSize);
  const overX    = W - baseCols * gridSize;
  const overY    = H - baseRows * gridSize;
  const cols     = (overX >= gridSize/2) ? baseCols + 1 : baseCols;
  const rows     = (overY >= gridSize/2) ? baseRows + 1 : baseRows;
  const absorbX  = (overX <  gridSize/2) ? overX : 0;
  const absorbY  = (overY <  gridSize/2) ? overY : 0;

  let moduleCount = detail === 'simple' ? randomInt(4,5) : randomInt(5,6);
  moduleCount     = Math.min(moduleCount, rows * cols);

  const regions = generateRegions(rows, cols, moduleCount);

  regions.forEach((reg, i) => {
    const x = reg.c * gridSize;
    const y = reg.r * gridSize;
    let   w = reg.w * gridSize;
    let   h = reg.h * gridSize;
    if (reg.c + reg.w === cols && absorbX) w += absorbX;
    if (reg.r + reg.h === rows && absorbY) h += absorbY;
    w = Math.min(w, W - x);
    h = Math.min(h, H - y);

    const c1 = Math.random() > 0.5 ? colors[0] : colors[1];
    const c2 = c1 === colors[0] ? colors[1] : colors[0];

    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', c1);
    rect.style.opacity = 0;
    canvas.appendChild(rect);

    const pill = document.createElementNS('http://www.w3.org/2000/svg','rect');
    pill.setAttribute('x', x);
    pill.setAttribute('y', y);
    pill.setAttribute('width', w);
    pill.setAttribute('height', h);
    const rv = Math.min(w,h)/2;
    pill.setAttribute('rx', rv);
    pill.setAttribute('ry', rv);
    pill.setAttribute('fill', c2);
    pill.style.opacity = 0;
    canvas.appendChild(pill);

    // Fade‐In 800ms mit neuem Easing, Delay idx*80
    setTimeout(() => {
      rect.style.transition = 'opacity 0.5s cubic-bezier(0.5, 0.1, 0.5, 0.9)';
      pill.style.transition = 'opacity 0.5s cubic-bezier(0.5, 0.1, 0.5, 0.9)';
      rect.style.opacity = 1;
      pill.style.opacity = 1;
    }, i * 90);
  });

  // am Ende skalieren
  updateScale();
}

// Pressed‐Scale mit 1s und eigenem Easing
generateBtn.addEventListener('mousedown', () => {
  canvas.style.transition = 'transform 1s cubic-bezier(0.20, 0, 0.10, 1)';
  canvas.style.transform = 'scale(0.98)';
});
generateBtn.addEventListener('mouseup', () => {
  canvas.style.transform = '';
  generatePattern();
});
generateBtn.addEventListener('mouseleave', () => {
  canvas.style.transform = '';
});
generateBtn.addEventListener('touchstart', () => {
  canvas.style.transition = 'transform 1s cubic-bezier(0.20, 0, 0.10, 1)';
  canvas.style.transform = 'scale(0.98)';
});
generateBtn.addEventListener('touchend', () => {
  canvas.style.transform = '';
  generatePattern();
});

// Export
exportBtn.addEventListener('click', () => {
  const w    = widthInput.value, h = heightInput.value;
  const xml  = new XMLSerializer().serializeToString(canvas);
  const blob = new Blob([xml], { type:'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url; a.download = `pattern_${w}x${h}.svg`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Resize nur skaliert
window.addEventListener('resize', updateScale);
window.addEventListener('load',   generatePattern);