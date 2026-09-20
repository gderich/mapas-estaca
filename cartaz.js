/* ==========================================================================
   CARTAZ — gera o mapa de uma ala (ou de todas) em alta resolução,
   com nomes de ruas, escala, legenda e título, como PDF ou PNG.

   Como funciona: baixa os "tiles" do mapa base, cola todos numa imagem grande
   (canvas) e desenha por cima os limites das alas, os nomes e o rodapé.
   ========================================================================== */
(function (raiz) {
  'use strict';

  // [lado maior mm, lado menor mm, resolução em dpi]
  const PAPEIS = { A4: [297, 210, 250], A3: [420, 297, 200], A2: [594, 420, 150] };

  const FONTES = {
    carto: {
      retina: true, maxZ: 20, credito: '© OpenStreetMap contributors © CARTO',
      url: (z, x, y) => 'https://' + 'abcd'[(x + y) % 4] + '.basemaps.cartocdn.com/rastertiles/voyager/' + z + '/' + x + '/' + y + '@2x.png',
    },
    osm: {
      retina: false, maxZ: 19, credito: '© OpenStreetMap contributors',
      url: (z, x, y) => 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png',
    },
  };
  const MAX_TILES = 400;
  const FONTE_TITULO = '"Bricolage Grotesque", "Trebuchet MS", Arial, sans-serif';
  const FONTE_TEXTO = '"Figtree", Arial, sans-serif';

  /* ---------- Geometria ---------- */
  function proj(lat, lng) { // -> [0..1, 0..1] (Web Mercator normalizado)
    const s = Math.sin((lat * Math.PI) / 180);
    return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
  }
  function latDe(v) { return (Math.atan(Math.sinh(Math.PI * (1 - 2 * v))) * 180) / Math.PI; }
  function poligonos(g) { return g.type === 'Polygon' ? [g.coordinates] : g.coordinates; }

  function escurecer(hex, f) {
    f = f || 0.55;
    return '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.substr(i, 2), 16) * f).toString(16).padStart(2, '0')).join('');
  }
  function rgba(hex, a) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  function noAnel(x, y, anel) {
    let dentro = false;
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const xi = anel[i][0], yi = anel[i][1], xj = anel[j][0], yj = anel[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  function areaAnel(r) {
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    return a / 2;
  }
  function centroide(r) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
    }
    a /= 2;
    return a ? [cx / (6 * a), cy / (6 * a)] : r[0];
  }
  // ponto dentro do polígono maior, o mais perto possível do centroide
  function pontoDeRotulo(polisXY) {
    let melhor = null, area = 0;
    polisXY.forEach((p) => { const a = Math.abs(areaAnel(p[0])); if (a > area) { area = a; melhor = p; } });
    if (!melhor) return null;
    const c = centroide(melhor[0]);
    const dentro = (x, y) => noAnel(x, y, melhor[0]) && !melhor.slice(1).some((h) => noAnel(x, y, h));
    if (dentro(c[0], c[1])) return c;
    let xs = melhor[0].map((p) => p[0]), ys = melhor[0].map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    let best = null, bd = Infinity;
    for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
      const x = x0 + ((x1 - x0) * i) / 40, y = y0 + ((y1 - y0) * j) / 40;
      if (!dentro(x, y)) continue;
      const d = (x - c[0]) ** 2 + (y - c[1]) ** 2;
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best || c;
  }

  /* ---------- Desenho ---------- */
  function rotulo(ctx, texto, x, y, tam, opt) {
    opt = opt || {};
    ctx.save();
    ctx.font = (opt.peso || 700) + ' ' + tam + 'px ' + (opt.fonte || FONTE_TITULO);
    ctx.textAlign = opt.alinhar || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = tam * 0.3;
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = opt.cor || '#13222B';
    ctx.fillText(texto, x, y);
    ctx.restore();
  }
  function tracar(ctx, anel) {
    anel.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }
  function iconeCapela(ctx, x, y, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#5B3A8E'; ctx.fill();
    ctx.lineWidth = r * 0.22; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); // casinha com torre
    ctx.moveTo(x - r * 0.5, y + r * 0.45); ctx.lineTo(x - r * 0.5, y - r * 0.05);
    ctx.lineTo(x - r * 0.05, y - r * 0.05); ctx.lineTo(x - r * 0.05, y - r * 0.55);
    ctx.lineTo(x, y - r * 0.7); ctx.lineTo(x + r * 0.05, y - r * 0.55);
    ctx.lineTo(x + r * 0.05, y - r * 0.05); ctx.lineTo(x + r * 0.5, y - r * 0.05);
    ctx.lineTo(x + r * 0.5, y + r * 0.45); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function fmtDist(m) { return m >= 1000 ? m / 1000 + ' km' : m + ' m'; }

  /* ---------- Renderização principal ---------- */
  async function renderizar(cfg) {
    const features = cfg.features;
    const capelas = cfg.capelas || [];
    const texto = cfg.texto || {};
    const deps = cfg.deps;
    const op = Object.assign({ papel: 'A3', detalhe: 'padrao', fundo: 'carto', outras: true }, cfg.opcoes);
    const fonte = FONTES[op.fundo] || FONTES.carto;
    const [longo, curto, dpi] = PAPEIS[op.papel] || PAPEIS.A3;

    const foco = cfg.foco && cfg.foco.length ? features.filter((f) => cfg.foco.includes(f.id)) : features;
    const outrasFeats = features.filter((f) => !foco.includes(f));
    const unico = foco.length === 1 && outrasFeats.length > 0;

    // caixa envolvente em unidades Mercator
    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    foco.forEach((f) => poligonos(f.geometry).forEach((p) => p[0].forEach(([lng, lat]) => {
      const [u, v] = proj(lat, lng);
      if (u < umin) umin = u; if (u > umax) umax = u; if (v < vmin) vmin = v; if (v > vmax) vmax = v;
    })));
    const cu = (umin + umax) / 2, cv = (vmin + vmax) / 2;
    const bw = Math.max(umax - umin, 1e-7), bh = Math.max(vmax - vmin, 1e-7);

    const mm2px = (mm) => Math.round((mm * dpi) / 25.4);
    function layout(pw, ph) {
      const u = Math.min(pw, ph) / 210;
      const m = 6 * u, fh = 26 * u;
      const mapa = { x: m, y: m, w: pw - 2 * m, h: ph - 2 * m - fh };
      const pad = 0.07;
      const S = Math.min((mapa.w * (1 - 2 * pad)) / bw, (mapa.h * (1 - 2 * pad)) / bh);
      return { pw, ph, u, m, fh, mapa, S };
    }
    // Padroniza todos os cartazes em orientação horizontal (paisagem).
    const L = layout(mm2px(longo), mm2px(curto));
    const paisagem = true;
    const { u, m, fh, mapa, S } = L;
    const cx = mapa.x + mapa.w / 2, cy = mapa.y + mapa.h / 2;
    const toXY = (lat, lng) => { const [a, b] = proj(lat, lng); return [cx + (a - cu) * S, cy + (b - cv) * S]; };

    // nível de zoom dos tiles e lista de tiles
    const T = fonte.retina ? 512 : 256;
    let Zt = Math.round(Math.log2(S / T)) + (op.detalhe === 'alto' ? 1 : 0);
    Zt = Math.max(0, Math.min(fonte.maxZ, Zt));
    function listar(z) {
      const n = 2 ** z;
      const u0 = cu - mapa.w / 2 / S, u1 = cu + mapa.w / 2 / S, v0 = cv - mapa.h / 2 / S, v1 = cv + mapa.h / 2 / S;
      const out = [];
      for (let ty = Math.max(0, Math.floor(v0 * n)); ty <= Math.min(n - 1, Math.floor(v1 * n)); ty++) {
        for (let tx = Math.floor(u0 * n); tx <= Math.floor(u1 * n); tx++) out.push({ tx, ty });
      }
      return out;
    }
    let tiles = listar(Zt);
    while (tiles.length > MAX_TILES && Zt > 0) { Zt--; tiles = listar(Zt); }
    const nT = 2 ** Zt;

    const canvas = deps.criarCanvas(L.pw, L.ph);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, L.pw, L.ph);

    // ---- mapa base ----
    ctx.save();
    ctx.beginPath(); ctx.rect(mapa.x, mapa.y, mapa.w, mapa.h); ctx.clip();
    ctx.fillStyle = '#E9EEF0'; ctx.fillRect(mapa.x, mapa.y, mapa.w, mapa.h);

    let feitos = 0, falhas = 0;
    async function baixar(t) {
      if (deps.cancelado && deps.cancelado()) throw new Error('cancelado');
      const xUrl = ((t.tx % nT) + nT) % nT;
      let img = null;
      for (let tentativa = 0; tentativa < 2 && !img; tentativa++) img = await deps.carregarImagem(fonte.url(Zt, xUrl, t.ty));
      if (img) {
        const [X, Y] = [cx + (t.tx / nT - cu) * S, cy + (t.ty / nT - cv) * S];
        const x0 = Math.floor(X), y0 = Math.floor(Y);
        const x1 = Math.ceil(X + S / nT), y1 = Math.ceil(Y + S / nT);
        ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0);
      } else falhas++;
      feitos++;
      if (deps.aoProgresso) deps.aoProgresso(feitos, tiles.length);
    }
    let prox = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (prox < tiles.length) { const t = tiles[prox++]; await baixar(t); }
    }));

    // ---- limites ----
    const xy = (f) => poligonos(f.geometry).map((p) => p.map((r) => r.map(([lng, lat]) => toXY(lat, lng))));

    if (unico) { // esmaece tudo que está fora da ala em foco
      ctx.beginPath(); ctx.rect(mapa.x, mapa.y, mapa.w, mapa.h);
      xy(foco[0]).forEach((p) => p.forEach((r) => tracar(ctx, r)));
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill('evenodd');
    }
    const rotulosOutras = [];
    if (unico && op.outras) {
      outrasFeats.forEach((f) => {
        const polis = xy(f);
        ctx.beginPath(); polis.forEach((p) => p.forEach((r) => tracar(ctx, r)));
        ctx.fillStyle = 'rgba(70,90,100,0.06)'; ctx.fill('evenodd');
        ctx.setLineDash([2.2 * u, 1.4 * u]); ctx.lineWidth = 0.5 * u; ctx.strokeStyle = '#4E626C'; ctx.stroke();
        ctx.setLineDash([]);
        const pt = pontoDeRotulo(polis);
        if (pt && pt[0] > mapa.x && pt[0] < mapa.x + mapa.w && pt[1] > mapa.y && pt[1] < mapa.y + mapa.h) {
          rotulosOutras.push([f.nome, pt[0], pt[1]]);
        }
      });
    }
    foco.forEach((f) => {
      const polis = xy(f);
      ctx.beginPath(); polis.forEach((p) => p.forEach((r) => tracar(ctx, r)));
      ctx.fillStyle = rgba(f.cor, 0.22); ctx.fill('evenodd');
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.9 * u; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
      ctx.lineWidth = 0.95 * u; ctx.strokeStyle = escurecer(f.cor, 0.5); ctx.stroke();
      // O nome da ala já aparece no rodapé do cartaz.
      // Não desenhar o rótulo central da ala em foco para não encobrir ruas.
    });

    rotulosOutras.forEach((r) => rotulo(ctx, r[0], r[1], r[2], 3.2 * u, { cor: '#4E626C', peso: 600 }));

    // ---- capelas ----
    let capelasVisiveis = 0;
    capelas.forEach((c) => {
      const [X, Y] = toXY(c.lat, c.lng);
      if (X < mapa.x || X > mapa.x + mapa.w || Y < mapa.y || Y > mapa.y + mapa.h) return;
      capelasVisiveis++;
      // O símbolo e a legenda identificam a capela sem encobrir nomes de ruas.
      iconeCapela(ctx, X, Y, 1.8 * u);
    });

    // ---- norte ----
    (function () {
      const nx = mapa.x + mapa.w - 7 * u, ny = mapa.y + 9 * u;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(nx, ny, 5 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#13222B';
      ctx.beginPath(); ctx.moveTo(nx, ny - 3.6 * u); ctx.lineTo(nx + 1.9 * u, ny + 1.2 * u); ctx.lineTo(nx, ny + 0.2 * u); ctx.lineTo(nx - 1.9 * u, ny + 1.2 * u); ctx.closePath(); ctx.fill();
      ctx.font = '700 ' + 2.4 * u + 'px ' + FONTE_TEXTO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('N', nx, ny + 3.3 * u);
    })();

    // ---- aviso de exemplo ----
    if (texto.exemplo) {
      ctx.fillStyle = 'rgba(180,40,20,0.88)'; ctx.fillRect(mapa.x, mapa.y, mapa.w, 8 * u);
      ctx.fillStyle = '#fff'; ctx.font = '700 ' + 4.2 * u + 'px ' + FONTE_TEXTO;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('DADOS DE EXEMPLO — NÃO DIVULGAR', mapa.x + mapa.w / 2, mapa.y + 4 * u);
    }
    ctx.restore(); // fim do clip do mapa

    // ---- moldura e rodapé ----
    const fy = mapa.y + mapa.h;
    ctx.strokeStyle = '#13222B'; ctx.lineWidth = 0.5 * u;
    ctx.strokeRect(m, m, mapa.w, mapa.h + fh);
    ctx.beginPath(); ctx.moveTo(m, fy); ctx.lineTo(m + mapa.w, fy); ctx.stroke();

    const titulo = unico ? foco[0].nome : (foco.length === 1 ? foco[0].nome : 'Alas do novo alinhamento');
    const px0 = m + 5 * u;
    const lx = m + mapa.w * 0.47;               // onde começa a legenda
    const disp = lx - px0 - 4 * u;              // largura disponível para o título
    function ajustar(txt, tam, peso, fonte, minimo) {
      ctx.font = peso + ' ' + tam + 'px ' + fonte;
      while (ctx.measureText(txt).width > disp && tam > minimo) { tam *= 0.95; ctx.font = peso + ' ' + tam + 'px ' + fonte; }
    }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#13222B';
    ajustar(titulo, 8.6 * u, 700, FONTE_TITULO, 4.5 * u);
    ctx.fillText(titulo, px0, fy + 10.2 * u);
    ajustar(texto.unidade || '', 4.3 * u, 600, FONTE_TEXTO, 2.8 * u);
    ctx.fillText(texto.unidade || '', px0, fy + 16.4 * u);
    ctx.fillStyle = '#51636C'; ctx.font = '400 ' + 3.3 * u + 'px ' + FONTE_TEXTO;
    ctx.fillText((texto.subtitulo || '') + (texto.subtitulo ? '  ·  ' : '') + 'Impresso em ' + new Date().toLocaleDateString('pt-BR'), px0, fy + 21.4 * u);
    ctx.font = '400 ' + 2.5 * u + 'px ' + FONTE_TEXTO;
    ctx.textAlign = 'right';
    ctx.fillText('Mapa base: ' + fonte.credito, m + mapa.w - 3 * u, fy + fh - 2.2 * u);
    ctx.textAlign = 'left';

    // legenda
    let ly = fy + 8 * u;
    ctx.font = '500 ' + 3.4 * u + 'px ' + FONTE_TEXTO; ctx.textBaseline = 'middle';
    const corLeg = foco.length === 1 ? foco[0].cor : '#F2A65A';
    ctx.lineCap = 'butt';
    ctx.lineWidth = 0.95 * u; ctx.strokeStyle = escurecer(corLeg, 0.5);
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 9 * u, ly); ctx.stroke();
    ctx.fillStyle = rgba(corLeg, 0.3); ctx.fillRect(lx, ly - 1.3 * u, 9 * u, 2.6 * u);
    ctx.fillStyle = '#13222B';
    ctx.fillText(foco.length === 1 ? 'Limite da ala' : 'Limites das alas', lx + 11.5 * u, ly);
    if (unico && op.outras) {
      ly += 5.6 * u;
      ctx.setLineDash([2.2 * u, 1.4 * u]); ctx.lineWidth = 0.5 * u; ctx.strokeStyle = '#4E626C';
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 9 * u, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#13222B'; ctx.fillText('Outras alas', lx + 11.5 * u, ly);
    }
    if (capelasVisiveis) { ly += 5.6 * u; iconeCapela(ctx, lx + 4.5 * u, ly, 2.2 * u); ctx.fillStyle = '#13222B'; ctx.fillText('Capela', lx + 11.5 * u, ly); }

    // barra de escala
    const mpp = (40075016.686 * Math.cos((latDe(cv) * Math.PI) / 180)) / S; // metros por pixel
    const cand = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
    const alvo = mapa.w * 0.15;
    const barra = cand.filter((d) => d / mpp <= alvo).pop() || cand[0];
    const bwpx = barra / mpp;
    const sx = m + mapa.w - 8 * u - bwpx, sy = fy + 9.5 * u;
    ctx.fillStyle = '#13222B'; ctx.fillRect(sx, sy, bwpx / 2, 1.5 * u);
    ctx.strokeStyle = '#13222B'; ctx.lineWidth = 0.35 * u; ctx.strokeRect(sx, sy, bwpx, 1.5 * u);
    ctx.font = '500 ' + 2.9 * u + 'px ' + FONTE_TEXTO; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('0', sx, sy - 1.2 * u);
    ctx.fillText(fmtDist(barra / 2), sx + bwpx / 2, sy - 1.2 * u);
    ctx.fillText(fmtDist(barra), sx + bwpx, sy - 1.2 * u);

    return {
      canvas, falhas, total: tiles.length, zoom: Zt,
      largura_mm: paisagem ? longo : curto, altura_mm: paisagem ? curto : longo,
    };
  }

  /* ---------- PDF de uma página com a imagem (JPEG) ---------- */
  function montarPdf(jpeg, wpx, hpx, wmm, hmm) {
    const enc = new TextEncoder();
    const wpt = ((wmm * 72) / 25.4).toFixed(2), hpt = ((hmm * 72) / 25.4).toFixed(2);
    const partes = []; const offs = []; let pos = 0;
    const push = (b) => { partes.push(b); pos += b.length; };
    const txt = (s) => push(enc.encode(s));
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    offs[1] = pos; txt('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offs[2] = pos; txt('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    offs[3] = pos; txt('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + wpt + ' ' + hpt + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
    offs[4] = pos;
    txt('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + wpx + ' /Height ' + hpx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
    push(jpeg); txt('\nendstream\nendobj\n');
    const conteudo = 'q ' + wpt + ' 0 0 ' + hpt + ' 0 0 cm /Im0 Do Q';
    offs[5] = pos; txt('5 0 obj\n<< /Length ' + conteudo.length + ' >>\nstream\n' + conteudo + '\nendstream\nendobj\n');
    const xref = pos;
    let x = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    txt(x + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    const out = new Uint8Array(pos); let o = 0;
    partes.forEach((p) => { out.set(p, o); o += p.length; });
    return out;
  }

  const api = { renderizar, montarPdf, PAPEIS, FONTES };
  raiz.Cartaz = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
