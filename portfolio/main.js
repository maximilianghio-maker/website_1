(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ── Reveal on scroll ─────────────────────────────── */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ── Statement: split into words that light up as you scroll ── */
  const statement = document.getElementById('statement');
  let words = [];
  if (statement && !reduce.matches) {
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.append(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    };
    walk(statement);
    words = [...statement.querySelectorAll('.w')];
  }

  /* ── Scroll-driven bits: progress, timecode, nav, parallax ── */
  const nav = document.getElementById('nav');
  const bar = document.getElementById('progress-bar');
  const tc = document.getElementById('timecode');
  const parallax = [...document.querySelectorAll('[data-speed]')];
  const pad = (n) => String(n).padStart(2, '0');
  const RUNTIME_FRAMES = 24 * 150; // the page "runs" 2m30s at 24fps

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const p = max > 0 ? clamp(y / max) : 0;

    nav.classList.toggle('scrolled', y > 24);
    bar.style.transform = `scaleX(${p})`;

    const f = Math.round(p * RUNTIME_FRAMES);
    tc.textContent = `00:${pad(Math.floor(f / 1440))}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;

    if (words.length) {
      const r = statement.getBoundingClientRect();
      const prog = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.4));
      const lit = prog * (words.length + 2);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    }

    if (!reduce.matches) {
      for (const el of parallax) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const offset = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.dataset.speed);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ── Hero light: a small WebGL shader, with the CSS gradient as fallback ── */
  const canvas = document.getElementById('light');
  const gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { if (canvas) canvas.remove(); return; }

  const vsrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fsrc = `
    precision mediump float;
    uniform vec2 r; uniform float t; uniform vec2 m;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(3.1,1.7);a*=.5;}return v;}
    void main(){
      vec2 uv=gl_FragCoord.xy/r;
      vec2 p=(gl_FragCoord.xy-.5*r)/r.y;
      float tt=t*.035;
      vec2 q=vec2(fbm(p*1.1+tt),fbm(p*1.1-tt+4.3));
      float f=fbm(p*1.4+q*2.+vec2(tt*.7,-tt*.3));
      vec2 src=vec2(.5*r.x/r.y-.42,.2)+m*.1;
      float d=length(p-src);
      vec3 c=vec3(.018,.017,.024);
      c+=vec3(1.,.62,.26)*exp(-d*1.7)*pow(f,1.5)*1.9;
      c+=vec3(.8,.2,.07)*pow(f,2.6)*smoothstep(1.5,0.,d)*.55;
      c+=vec3(1.,.9,.75)*exp(-d*9.)*.35;
      c+=vec3(.07,.11,.26)*pow(q.y,2.)*(1.-uv.x)*.5;
      c*=smoothstep(1.5,.25,length(p*vec2(.75,1.)));
      gl_FragColor=vec4(c,1.);
    }`;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, vsrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsrc);
  const prog = gl.createProgram();
  if (!vs || !fs) { canvas.remove(); return; }
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, 'r');
  const uT = gl.getUniformLocation(prog, 't');
  const uM = gl.getUniformLocation(prog, 'm');

  // The image is soft, so render at reduced resolution and let CSS scale it up.
  const SCALE = 0.5;
  const resize = () => {
    const w = Math.max(2, Math.round(canvas.clientWidth * SCALE));
    const hh = Math.max(2, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== hh) {
      canvas.width = w; canvas.height = hh;
      gl.viewport(0, 0, w, hh);
    }
  };

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = 0.5 - e.clientY / window.innerHeight;
  }, { passive: true });

  let visible = true, raf = 0;
  const draw = (now) => {
    resize();
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, 40 + now / 1000);
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now) => { draw(now); raf = requestAnimationFrame(loop); };
  const sync = () => {
    cancelAnimationFrame(raf);
    if (reduce.matches) { draw(0); return; }
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  window.addEventListener('resize', () => { if (reduce.matches) draw(0); });
  sync();
})();
