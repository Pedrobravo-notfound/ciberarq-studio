/* CiberArq Studio — editor de diagramas de arquitectura de ciberseguridad
 * Vanilla JS + SVG, sin dependencias. */
(function () {
  'use strict';

  var ICONS = window.ICONS, ROLES = window.ROLES, EK = window.EDGE_KINDS, ZV = window.ZONE_VARIANTS;
  var CATALOG = window.CATALOG, CI = window.CATALOG_INDEX;
  var FONT = 'Arial, Helvetica, sans-serif';
  var GRID = 10;
  var LS_AUTO = 'ciberarq.autosave.v1', LS_LIB = 'ciberarq.library.v1', LS_UI = 'ciberarq.ui.v1';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var svg = $('#canvas'), world = $('#world'), wrap = $('#canvas-wrap');

  /* ------------------------------------------------------------------ estado */
  var doc = emptyDoc();
  var sel = new Set();
  var view = { x: 60, y: 40, k: 1 };
  var ui = { connect: false, edgeKind: 'traffic', grid: true, snap: true, nodeStyle: 'card', connectFrom: null };
  var hist = { undo: [], redo: [] };
  var drag = null, clipboard = null, pasteN = 0, spaceDown = false, lastDown = { t: 0, id: null, x: 0, y: 0 };
  var byId = {};
  var linesCache = {};
  var ISO = window.ISO, hiIds = {}, lastView = null;

  function emptyDoc() { return { version: 1, title: 'Diagrama sin título', view: 'flat', items: [], edges: [] }; }
  // Vista 3D isométrica: el modelo sigue en coordenadas de "piso"; solo cambia cómo se dibuja.
  function isIso() { return doc.view === 'iso'; }
  function isoPal() { return doc.isoPalette === 'clasica' ? 'clasica' : 'azul'; }
  function posOf(x, y) { return isIso() ? isoP(x, y) : { x: x, y: y }; }
  // Escala de la vista 3D: separa los objetos sin tocar las coordenadas del diagrama 2D.
  function isoS() { var s = +doc.isoScale; return s > 0 ? s : 1; }
  function isoP(x, y) { var s = isoS(); return ISO.P(x * s, y * s); }
  function isoInv(X, Y) { var s = isoS(), q = ISO.inv(X, Y); return { x: q.x / s, y: q.y / s }; }
  function isoMatrix() { var s = isoS(), c = Math.cos(Math.PI / 6) * s, h = 0.5 * s; return 'matrix(' + c + ',' + h + ',' + (-c) + ',' + h + ',0,0)'; }
  function rr(v) { return Math.round(v * 10) / 10; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 9); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function snapv(v) { return ui.snap ? Math.round(v / GRID) * GRID : Math.round(v); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  try { var su = JSON.parse(localStorage.getItem(LS_UI) || '{}'); ['edgeKind', 'grid', 'snap', 'nodeStyle'].forEach(function (k) { if (su[k] !== undefined) ui[k] = su[k]; }); } catch (e) { }
  function saveUI() { try { localStorage.setItem(LS_UI, JSON.stringify({ edgeKind: ui.edgeKind, grid: ui.grid, snap: ui.snap, nodeStyle: ui.nodeStyle })); } catch (e) { } }

  /* ------------------------------------------------------------ medir texto */
  var mctx = document.createElement('canvas').getContext('2d');
  function tw(text, size, bold, ls) {
    mctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
    return mctx.measureText(text).width + (ls ? ls * text.length : 0);
  }
  function wrapText(text, maxW, size, bold, maxLines, ls) {
    var out = [];
    String(text == null ? '' : text).split('\n').forEach(function (par) {
      var words = par.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (!line || tw(t, size, bold, ls) <= maxW) line = t; else { out.push(line); line = w; }
      });
      if (line) out.push(line);
    });
    if (maxLines && out.length > maxLines) {
      var cut = out.slice(0, maxLines), last = cut[maxLines - 1];
      while (last.length > 1 && tw(last + '…', size, bold, ls) > maxW) last = last.slice(0, -1);
      cut[maxLines - 1] = last + '…';
      return cut;
    }
    return out;
  }

  function iconSvg(name, x, y, size, color, sw) {
    var inner = ICONS[name];
    if (!inner) return '';
    var s = size / 24;
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')" fill="none" stroke="' + color + '" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g>';
  }

  /* ------------------------------------------------------------ geometría */
  var TEXT_STYLES = {
    kicker: { size: 12, bold: true, color: '#E2231A', ls: 2, lh: 16, upper: true },
    title: { size: 24, bold: true, color: '#E2231A', lh: 30 },
    body: { size: 13, bold: false, color: '#262626', lh: 18 },
    note: { size: 13, bold: true, color: '#FFFFFF', lh: 18, box: '#262626', pad: 14 },
    alert: { size: 13, bold: true, color: '#B3141A', lh: 18, box: '#FDECEC', stroke: '#E2231A', pad: 14 }
  };
  var BADGES = {
    num: { fill: '#FFFFFF', stroke: '#E2231A', text: '#E2231A' },
    step: { fill: '#E2231A', stroke: '#E2231A', text: '#FFFFFF' },
    hall: { fill: '#B5700E', stroke: '#B5700E', text: '#FFFFFF' },
    dark: { fill: '#262626', stroke: '#262626', text: '#FFFFFF' }
  };

  function layoutItem(it) {
    if (it.kind === 'node') {
      if (it.shape && it.shape !== 'rect') {
        var dl = wrapText(it.label, it.w - 20, 13, true);
        linesCache[it.id] = dl;
        var nh = Math.max(40, dl.length * 16 + 18);
        if (it.h < nh) it.h = nh;
      } else if (it.style === 'icon') {
        var il = wrapText(it.label, Math.max(it.w, 70), 12, true, 3);
        linesCache[it.id] = il;
        it.h = 56 + 8 + il.length * 14 + (it.sub ? 15 : 0);
      } else {
        var hasIcon = it.icon && ICONS[it.icon];
        var cl = wrapText(it.label, it.w - (hasIcon ? 52 : 20), 13, true);
        linesCache[it.id] = cl;
        var need = Math.max(36, cl.length * 15 + 16);
        if (it.h < need) it.h = need;
      }
    } else if (it.kind === 'text') {
      var S = TEXT_STYLES[it.variant] || TEXT_STYLES.body, pad = S.pad || 0;
      var txt = S.upper ? String(it.label).toUpperCase() : it.label;
      var tl = wrapText(txt, it.w - pad * 2, S.size, S.bold, 0, S.ls);
      linesCache[it.id] = tl;
      it.h = tl.length * S.lh + pad * 2 + (pad ? 0 : 4);
    } else if (it.kind === 'badge') {
      it.w = Math.max(24, tw(String(it.label), 11, true) + 12); it.h = 24;
    } else if (it.kind === 'legend') {
      var L = legendRows();
      it.w = 520; it.h = 44 + Math.max(L.left.length, L.right.length, 1) * 24 + 6;
    }
  }
  function layoutAll() { byId = {}; doc.items.forEach(function (it) { byId[it.id] = it; layoutItem(it); }); doc.edges.forEach(function (e) { byId[e.id] = e; }); }

  function rectOf(it) { return { x: it.x, y: it.y, w: it.w, h: it.h }; }
  function anchorRect(it) {
    // Vista 3D: las tuberías llegan al borde de la plataforma (huella cuadrada de 64 en el piso).
    if (isIso() && it.kind === 'node') { var cc = center(rectOf(it)), hs = 32 / isoS(); return { x: cc.x - hs, y: cc.y - hs, w: hs * 2, h: hs * 2 }; }
    // Estilo ícono: ancho del mosaico, alto completo (mosaico + nombre) para que las líneas no crucen el texto.
    if (it.kind === 'node' && it.style === 'icon' && (!it.shape || it.shape === 'rect')) return { x: it.x + it.w / 2 - 28, y: it.y, w: 56, h: Math.max(56, it.h) };
    return rectOf(it);
  }
  function center(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  function inRect(p, r, m) { m = m || 0; return p.x >= r.x - m && p.x <= r.x + r.w + m && p.y >= r.y - m && p.y <= r.y + r.h + m; }
  function rectInside(a, b) { return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h; }

  function clipToRect(r, to) {
    var c = center(r), dx = to.x - c.x, dy = to.y - c.y;
    if (!dx && !dy) return c;
    var sx = dx ? (r.w / 2) / Math.abs(dx) : Infinity, sy = dy ? (r.h / 2) / Math.abs(dy) : Infinity, s = Math.min(sx, sy);
    return { x: c.x + dx * s, y: c.y + dy * s };
  }

  function route(A, B, mode) {
    var ca = center(A), cb = center(B);
    if (mode === 'straight') return [clipToRect(A, cb), clipToRect(B, ca)];
    if (mode === 'hv' && (cb.x > A.x + A.w || cb.x < A.x)) {
      var sx = cb.x > ca.x ? A.x + A.w : A.x, ey = cb.y > ca.y ? B.y : B.y + B.h;
      return [{ x: sx, y: ca.y }, { x: cb.x, y: ca.y }, { x: cb.x, y: ey }];
    }
    if (mode === 'vh' && (cb.y > A.y + A.h || cb.y < A.y)) {
      var sy = cb.y > ca.y ? A.y + A.h : A.y, ex = cb.x > ca.x ? B.x : B.x + B.w;
      return [{ x: ca.x, y: sy }, { x: ca.x, y: cb.y }, { x: ex, y: cb.y }];
    }
    var ox1 = Math.max(A.x, B.x), ox2 = Math.min(A.x + A.w, B.x + B.w);
    var oy1 = Math.max(A.y, B.y), oy2 = Math.min(A.y + A.h, B.y + B.h);
    var hGap = B.x >= A.x + A.w || A.x >= B.x + B.w, vGap = B.y >= A.y + A.h || A.y >= B.y + B.h;
    if (oy2 - oy1 > 6 && hGap) {
      var y = Math.round((oy1 + oy2) / 2);
      return cb.x > ca.x ? [{ x: A.x + A.w, y: y }, { x: B.x, y: y }] : [{ x: A.x, y: y }, { x: B.x + B.w, y: y }];
    }
    if (ox2 - ox1 > 6 && vGap) {
      var x = Math.round((ox1 + ox2) / 2);
      return cb.y > ca.y ? [{ x: x, y: A.y + A.h }, { x: x, y: B.y }] : [{ x: x, y: A.y }, { x: x, y: B.y + B.h }];
    }
    var dx = cb.x - ca.x, dy = cb.y - ca.y;
    if (mode === 'zv' && vGap) hGap = false;
    if (mode === 'zh' && hGap) vGap = false;
    if (hGap && (Math.abs(dx) >= Math.abs(dy) * 0.6 || !vGap)) {
      var x1 = dx > 0 ? A.x + A.w : A.x, x2 = dx > 0 ? B.x : B.x + B.w, mx = Math.round((x1 + x2) / 2);
      return [{ x: x1, y: ca.y }, { x: mx, y: ca.y }, { x: mx, y: cb.y }, { x: x2, y: cb.y }];
    }
    if (vGap) {
      var y1 = dy > 0 ? A.y + A.h : A.y, y2 = dy > 0 ? B.y : B.y + B.h, my = Math.round((y1 + y2) / 2);
      return [{ x: ca.x, y: y1 }, { x: ca.x, y: my }, { x: cb.x, y: my }, { x: cb.x, y: y2 }];
    }
    return [clipToRect(A, cb), clipToRect(B, ca)];
  }

  function edgePoints(e) {
    var a = byId[e.from], b = byId[e.to];
    if (!a || !b) return null;
    return route(anchorRect(a), anchorRect(b), e.route || 'auto');
  }
  function pointAt(pts, t) {
    var segs = [], total = 0, i;
    for (i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); total += l; }
    var d = total * t;
    for (i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        var r = segs[i] ? Math.min(1, d / segs[i]) : 0;
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * r, y: pts[i].y + (pts[i + 1].y - pts[i].y) * r, dx: pts[i + 1].x - pts[i].x, dy: pts[i + 1].y - pts[i].y };
      }
      d -= segs[i];
    }
    return pts[0];
  }

  /* -------------------------------------------------------------- render */
  function markerId(color) { return 'ar' + color.replace('#', ''); }
  function defsSvg() {
    var colors = {};
    Object.keys(EK).forEach(function (k) { colors[EK[k].color] = 1; });
    colors['#2F7BE5'] = 1;
    var s = '<defs>';
    Object.keys(colors).forEach(function (c) {
      s += '<marker id="' + markerId(c) + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0.5 L10,5 L0,9.5 z" fill="' + c + '"/></marker>';
    });
    return s + '</defs>';
  }

  function renderOrder() {
    var zones = doc.items.filter(function (i) { return i.kind === 'zone'; }).sort(function (a, b) { return b.w * b.h - a.w * a.h; });
    var nodes = doc.items.filter(function (i) { return i.kind === 'node'; });
    // En 3D se dibuja de atrás hacia adelante para que los objetos cercanos tapen a los lejanos.
    if (isIso()) nodes = nodes.slice().sort(function (a, b) { return (a.x + a.w / 2 + a.y + a.h / 2) - (b.x + b.w / 2 + b.y + b.h / 2); });
    var rest = doc.items.filter(function (i) { return i.kind !== 'zone' && i.kind !== 'node'; });
    return { zones: zones, nodes: nodes, rest: rest, all: zones.concat(nodes, rest) };
  }

  function selBox(it, exp) {
    if (exp || !sel.has(it.id)) return '';
    var s = '<rect class="selbox" x="-5" y="-5" width="' + (it.w + 10) + '" height="' + (it.h + 10) + '" rx="6"/>';
    if (it.kind !== 'badge' && it.kind !== 'legend') s += '<rect class="handle" x="' + (it.w - 1) + '" y="' + (it.h - 1) + '" width="10" height="10"/>';
    return s;
  }
  function portsSvg(it, exp) {
    if (exp) return '';
    var r = anchorRect(it), ox = r.x - it.x, oy = r.y - it.y;
    var pts = [[ox + r.w / 2, oy], [ox + r.w, oy + r.h / 2], [ox + r.w / 2, oy + r.h], [ox, oy + r.h / 2]];
    return '<g class="ports">' + pts.map(function (p) { return '<circle class="port" cx="' + p[0] + '" cy="' + p[1] + '" r="5.5"/>'; }).join('') + '</g>';
  }
  function numBadge(cx, cy, label, variant) {
    var B = BADGES[variant || 'num'], w = Math.max(22, tw(String(label), 11, true) + 10);
    return '<g><rect x="' + (cx - w / 2) + '" y="' + (cy - 11) + '" width="' + w + '" height="22" rx="11" fill="' + B.fill + '" stroke="' + B.stroke + '" stroke-width="1.8"/>' +
      '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="11" font-weight="bold" fill="' + B.text + '">' + esc(label) + '</text></g>';
  }

  // Componente en vista 3D: objeto isométrico sobre plataforma, con nombre y línea guía.
  function renderNodeIso(it, exp) {
    var c = center(rectOf(it)), p = isoP(c.x, c.y), R = ROLES[it.role] || ROLES.sol;
    var o = ISO.object(it, isoPal()), top = o.top, s = '';
    s += '<g class="item node isonode' + (ui.connect ? ' connectable' : '') + '" data-id="' + it.id + '" transform="translate(' + rr(p.x) + ',' + rr(p.y) + ')">';
    s += '<rect class="hit" x="-62" y="' + (top - 8) + '" width="124" height="' + (52 - top) + '" fill="transparent"/>';
    if (hiIds[it.id]) s += '<ellipse cx="0" cy="' + ((top + 44) / 2) + '" rx="72" ry="' + ((44 - top) / 2 + 12) + '" fill="rgba(47,123,229,.08)" stroke="#2F7BE5" stroke-width="2.5"/>';
    s += ISO.platform() + o.svg;
    var lines = wrapText(it.label, 132, 11.5, true, 2), ty = top - 6 - (lines.length - 1) * 13;
    s += '<polyline points="-44,' + (top - 2) + ' -16,' + (top + 12) + '" fill="none" stroke="#1E2227" stroke-width="1.1"/><circle cx="-16" cy="' + (top + 12) + '" r="2.6" fill="#1E2227"/>';
    var halo = ' stroke="#FFFFFF" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke"';
    lines.forEach(function (l, i) { s += '<text x="-46" y="' + (ty + i * 13) + '" text-anchor="end" font-size="11.5" font-weight="bold" fill="#1E2227"' + halo + '>' + esc(l) + '</text>'; });
    if (it.sub) s += '<text x="0" y="60" text-anchor="middle" font-size="10.5" font-weight="bold" fill="' + R.sub + '"' + halo + '>' + esc(it.sub) + '</text>';
    if (it.num) s += numBadge(44, top + 12, it.num, 'num');
    if (it.hall) s += numBadge(44, top + 38, it.hall, 'hall');
    if (!exp && sel.has(it.id)) s += '<rect class="selbox" x="-66" y="' + (top - 12) + '" width="132" height="' + (62 - top) + '" rx="10"/>';
    if (!exp) s += '<g class="ports">' + [[-64, 6], [64, 6], [0, top - 14], [0, 50]].map(function (q) { return '<circle class="port" cx="' + q[0] + '" cy="' + q[1] + '" r="5.5"/>'; }).join('') + '</g>';
    return s + '</g>';
  }

  function renderNode(it, exp) {
    if (isIso()) return renderNodeIso(it, exp);
    var R = ROLES[it.role] || ROLES.sol, lines = linesCache[it.id] || [it.label], s = '', i;
    var shape = it.shape || 'rect';
    s += '<g class="item node' + (ui.connect ? ' connectable' : '') + '" data-id="' + it.id + '" transform="translate(' + it.x + ',' + it.y + ')">';
    if (shape !== 'rect') {
      var stroke = it.role === 'neutral' ? '#262626' : R.fill;
      if (shape === 'dfd-entity') s += '<rect width="' + it.w + '" height="' + it.h + '" fill="#fff" stroke="' + stroke + '" stroke-width="2"/>';
      else if (shape === 'dfd-process') s += '<rect width="' + it.w + '" height="' + it.h + '" rx="' + (it.h / 2) + '" fill="#fff" stroke="' + stroke + '" stroke-width="2"/>';
      else s += '<rect width="' + it.w + '" height="' + it.h + '" fill="#fff" stroke="none"/><line x1="0" y1="0" x2="' + it.w + '" y2="0" stroke="' + stroke + '" stroke-width="2"/><line x1="0" y1="' + it.h + '" x2="' + it.w + '" y2="' + it.h + '" stroke="' + stroke + '" stroke-width="2"/>';
      var y0 = it.h / 2 - (lines.length * 16) / 2 + 12;
      for (i = 0; i < lines.length; i++) s += '<text x="' + (it.w / 2) + '" y="' + (y0 + i * 16) + '" text-anchor="middle" font-size="13" font-weight="bold" fill="#262626">' + esc(lines[i]) + '</text>';
      if (it.sub) s += '<text x="' + (it.w / 2) + '" y="' + (it.h + 15) + '" text-anchor="middle" font-size="11" font-weight="bold" fill="' + R.sub + '">' + esc(it.sub) + '</text>';
      if (it.num) s += numBadge(it.w - 2, it.h, it.num, 'num');
      if (it.hall) s += numBadge(it.w - 2, 0, it.hall, 'hall');
    } else if (it.style === 'icon') {
      var tx = it.w / 2 - 28;
      s += '<rect class="hit" x="0" y="0" width="' + it.w + '" height="' + it.h + '" fill="transparent"/>';
      s += '<rect x="' + tx + '" y="0" width="56" height="56" rx="12" fill="' + R.fill + '" stroke="' + R.stroke + '" stroke-width="1.5"/>';
      s += iconSvg(it.icon, tx + 13, 13, 30, R.text, 2);
      for (i = 0; i < lines.length; i++) s += '<text x="' + (it.w / 2) + '" y="' + (56 + 18 + i * 14) + '" text-anchor="middle" font-size="12" font-weight="bold" fill="#262626">' + esc(lines[i]) + '</text>';
      if (it.sub) s += '<text x="' + (it.w / 2) + '" y="' + (56 + 18 + lines.length * 14 + 1) + '" text-anchor="middle" font-size="10.5" font-weight="bold" fill="' + R.sub + '">' + esc(it.sub) + '</text>';
      if (it.num) s += numBadge(tx + 56, 52, it.num, 'num');
      if (it.hall) s += numBadge(tx + 56, 2, it.hall, 'hall');
    } else {
      var hasIcon = it.icon && ICONS[it.icon];
      s += '<rect width="' + it.w + '" height="' + it.h + '" rx="4" fill="' + R.fill + '" stroke="' + R.stroke + '" stroke-width="1.5"/>';
      if (hasIcon) s += iconSvg(it.icon, 11, it.h / 2 - 12, 24, R.text, 2);
      var lx = hasIcon ? 44 : it.w / 2, anchor = hasIcon ? 'start' : 'middle';
      var ty = it.h / 2 - (lines.length * 15) / 2 + 11.5;
      for (i = 0; i < lines.length; i++) s += '<text x="' + lx + '" y="' + (ty + i * 15) + '" text-anchor="' + anchor + '" font-size="13" font-weight="bold" fill="' + R.text + '">' + esc(lines[i]) + '</text>';
      if (it.sub) s += '<text x="0" y="' + (it.h + 15) + '" font-size="11" font-weight="bold" fill="' + R.sub + '">' + esc(it.sub) + '</text>';
      if (it.num) s += numBadge(it.w - 2, it.h + 1, it.num, 'num');
      if (it.hall) s += numBadge(it.w - 2, -1, it.hall, 'hall');
    }
    s += selBox(it, exp) + portsSvg(it, exp) + '</g>';
    return s;
  }

  function renderZone(it, exp) {
    var Z = ZV[it.variant] || ZV.gray;
    var s = '<g class="item zone' + (ui.connect ? ' connectable' : '') + '" data-id="' + it.id + '" transform="translate(' + it.x + ',' + it.y + ')">';
    if (isIso()) {
      // Zona sobre el piso: contorno doble redondeado y título que corre a lo largo del borde.
      var zf = Z.fill === 'none' ? 'transparent' : Z.fill, zs = it.variant === 'dark' ? '#3A3A3A' : Z.stroke, zt = it.variant === 'dark' ? '#3A3A3A' : Z.title;
      s += '<rect width="' + it.w + '" height="' + it.h + '" rx="30" fill="' + zf + '" fill-opacity="0.5" stroke="' + zs + '" stroke-width="2.4"' + (it.variant === 'trust' ? ' stroke-dasharray="12 6"' : '') + '/>';
      if (it.w > 40 && it.h > 40) s += '<rect x="8" y="8" width="' + (it.w - 16) + '" height="' + (it.h - 16) + '" rx="24" fill="none" stroke="' + zs + '" stroke-width="1.2" stroke-opacity="0.55"/>';
      // Título sobre el borde delantero de la zona (el más cercano al observador), alineado a la derecha.
      if (it.label) {
        var zfs = Math.max(10, Math.min(16, Math.min(it.w, it.h * 2) / 16)), zlh = zfs * 1.2;
        var zl = wrapText(it.label, it.w - 60, zfs, true, 2, 1.4);
        zl.forEach(function (l, i) { s += '<text x="' + (it.w - 34) + '" y="' + rr(it.h - 16 - (zl.length - 1 - i) * zlh) + '" text-anchor="end" font-size="' + rr(zfs) + '" font-weight="bold" letter-spacing="1.4" fill="' + zt + '">' + esc(l) + '</text>'; });
      }
      return s + selBox(it, exp) + portsSvg(it, exp) + '</g>';
    }
    s += '<rect width="' + it.w + '" height="' + it.h + '" rx="8" fill="' + (Z.fill === 'none' ? 'transparent' : Z.fill) + '" stroke="' + Z.stroke + '" stroke-width="' + (Z.thick || 1.5) + '"' + (Z.dash ? ' stroke-dasharray="' + Z.dash + '"' : '') + '/>';
    if (it.label) {
      var italic = it.variant === 'trust' ? ' font-style="italic"' : '';
      var lab = wrapText(it.label, it.w - 24, 11.5, true, 2, 0.8);
      lab.forEach(function (l, i) { s += '<text x="12" y="' + (20 + i * 14) + '" font-size="11.5" font-weight="bold" letter-spacing="0.8" fill="' + Z.title + '"' + italic + '>' + esc(l) + '</text>'; });
    }
    s += selBox(it, exp) + portsSvg(it, exp) + '</g>';
    return s;
  }

  function renderText(it, exp) {
    var S = TEXT_STYLES[it.variant] || TEXT_STYLES.body, pad = S.pad || 0, lines = linesCache[it.id] || [];
    var tp = posOf(it.x, it.y);
    var s = '<g class="item text" data-id="' + it.id + '" transform="translate(' + rr(tp.x) + ',' + rr(tp.y) + ')">';
    if (S.box) s += '<rect width="' + it.w + '" height="' + it.h + '" rx="6" fill="' + S.box + '"' + (S.stroke ? ' stroke="' + S.stroke + '" stroke-width="1.5"' : '') + '/>';
    else s += '<rect class="hit" width="' + it.w + '" height="' + it.h + '" fill="transparent"/>';
    lines.forEach(function (l, i) {
      s += '<text x="' + pad + '" y="' + (pad + S.size + i * S.lh - (S.lh - S.size) / 4) + '" font-size="' + S.size + '"' + (S.bold ? ' font-weight="bold"' : '') + (S.ls ? ' letter-spacing="' + S.ls + '"' : '') + ' fill="' + S.color + '" xml:space="preserve">' + esc(l) + '</text>';
    });
    s += selBox(it, exp) + '</g>';
    return s;
  }

  function renderBadge(it, exp) {
    var B = BADGES[it.variant] || BADGES.num;
    var bp = posOf(it.x, it.y);
    var s = '<g class="item badge' + (ui.connect ? ' connectable' : '') + '" data-id="' + it.id + '" transform="translate(' + rr(bp.x) + ',' + rr(bp.y) + ')">';
    s += '<rect width="' + it.w + '" height="24" rx="12" fill="' + B.fill + '" stroke="' + B.stroke + '" stroke-width="2"/>';
    s += '<text x="' + (it.w / 2) + '" y="16.5" text-anchor="middle" font-size="11" font-weight="bold" fill="' + B.text + '">' + esc(it.label) + '</text>';
    s += selBox(it, exp) + '</g>';
    return s;
  }

  var ROLE_LEGEND = { sol: 'Componente de la solución (numerado)', asset: 'Activo protegido o usuario', exist: 'Existente, tercero o proveedor', detect: 'Solo detección', info: 'Red / conectividad', neutral: 'Elemento neutro / DFD' };
  var ZONE_LEGEND = { red: 'Límite de cuenta, red o proveedor (DMZ)', trust: 'Límite de confianza', amber: 'Zona OT / IoT / cuarentena', green: 'Sitio alterno / zona de confianza', blue: 'Red virtual / nube' };
  function legendRows() {
    var roles = {}, zones = {}, kinds = {};
    doc.items.forEach(function (i) { if (i.kind === 'node') roles[i.role] = 1; if (i.kind === 'zone' && ZONE_LEGEND[i.variant]) zones[i.variant] = 1; });
    doc.edges.forEach(function (e) { kinds[e.kind] = 1; });
    var left = [];
    ['sol', 'asset', 'exist', 'detect', 'info', 'neutral'].forEach(function (r) { if (roles[r]) left.push({ t: 'role', k: r }); });
    ['red', 'trust', 'amber', 'green', 'blue'].forEach(function (z) { if (zones[z]) left.push({ t: 'zone', k: z }); });
    var right = Object.keys(EK).filter(function (k) { return kinds[k]; }).map(function (k) { return { t: 'edge', k: k }; });
    return { left: left, right: right };
  }
  function renderLegend(it, exp) {
    var L = legendRows();
    var lp = posOf(it.x, it.y);
    var s = '<g class="item legend" data-id="' + it.id + '" transform="translate(' + rr(lp.x) + ',' + rr(lp.y) + ')">';
    s += '<rect width="' + it.w + '" height="' + it.h + '" rx="6" fill="#F2F2F2" stroke="#D0D0D0"/>';
    s += '<text x="16" y="24" font-size="14" font-weight="bold" fill="#262626">' + esc(it.label || 'Leyenda') + '</text>';
    if (!L.left.length && !L.right.length) s += '<text x="16" y="52" font-size="12" fill="#6b6b6b">Agrega componentes y conexiones para generar la leyenda.</text>';
    L.left.forEach(function (r, i) {
      var y = 40 + i * 24;
      if (r.t === 'role') {
        var R = ROLES[r.k], rf = R.fill, rs = R.stroke;
        if (isIso()) { var ic = ISO.colors(r.k, isoPal()); rf = ic.mid; rs = ic.dark; }
        s += '<rect x="16" y="' + (y + 2) + '" width="34" height="16" rx="3" fill="' + rf + '" stroke="' + rs + '"/>';
        s += '<text x="60" y="' + (y + 14) + '" font-size="11.5" fill="#262626">' + esc(ROLE_LEGEND[r.k]) + '</text>';
      } else {
        var Z = ZV[r.k];
        s += '<rect x="16" y="' + (y + 2) + '" width="34" height="16" rx="3" fill="' + (Z.fill === 'none' ? '#fff' : Z.fill) + '" stroke="' + Z.stroke + '" stroke-dasharray="4 3"/>';
        s += '<text x="60" y="' + (y + 14) + '" font-size="11.5" fill="#262626">' + esc(ZONE_LEGEND[r.k]) + '</text>';
      }
    });
    L.right.forEach(function (r, i) {
      var y = 40 + i * 24 + 10, K = EK[r.k], x0 = 280;
      s += '<line x1="' + x0 + '" y1="' + y + '" x2="' + (x0 + 34) + '" y2="' + y + '" stroke="' + K.color + '" stroke-width="' + K.width + '"' + (K.dash ? ' stroke-dasharray="' + K.dash + '"' : '') + (K.arrow !== 'none' ? ' marker-end="url(#' + markerId(K.color) + ')"' : '') + '/>';
      if (r.k === 'denied') s += xMark(x0 + 17, y);
      s += '<text x="' + (x0 + 44) + '" y="' + (y + 4) + '" font-size="11.5" fill="#262626">' + esc(K.name) + '</text>';
    });
    s += selBox(it, exp) + '</g>';
    return s;
  }
  function xMark(x, y) { return '<path d="M' + (x - 5) + ',' + (y - 5) + ' L' + (x + 5) + ',' + (y + 5) + ' M' + (x + 5) + ',' + (y - 5) + ' L' + (x - 5) + ',' + (y + 5) + '" stroke="#E2231A" stroke-width="2.4" stroke-linecap="round"/>'; }

  // Devuelve { line, label }: las etiquetas se dibujan en una capa por encima de los componentes.
  function renderEdge(e, exp) {
    var pts = edgePoints(e);
    if (!pts) return { line: '', label: '' };
    var K = EK[e.kind] || EK.traffic;
    var d = 'M' + pts.map(function (p) { return Math.round(p.x * 10) / 10 + ',' + Math.round(p.y * 10) / 10; }).join(' L');
    var arrow = e.arrow || K.arrow, mk = 'url(#' + markerId(K.color) + ')';
    var s = '<g class="edge" data-id="' + e.id + '">', lab = '';
    if (!exp) s += '<path class="edge-hit" d="' + d + '"/>';
    if (!exp && sel.has(e.id)) s += '<path d="' + d + '" fill="none" stroke="#2F7BE5" stroke-opacity="0.35" stroke-width="' + (K.width + 7) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    var markers = ((arrow === 'end' || arrow === 'both') ? ' marker-end="' + mk + '"' : '') + ((arrow === 'start' || arrow === 'both') ? ' marker-start="' + mk + '"' : '');
    if (isIso() && !K.dash) {
      // Tubería 3D: borde oscuro, cuerpo y brillo central (la flecha va en el brillo para que no se agrande).
      var pw = K.width * 3.4 + 1;
      s += '<path d="' + d + '" fill="none" stroke="' + shade(K.color, -0.4) + '" stroke-width="' + (pw + 2.4) + '" stroke-linejoin="round" stroke-linecap="round"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + K.color + '" stroke-width="' + pw + '" stroke-linejoin="round" stroke-linecap="round"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + shade(K.color, 0.45) + '" stroke-opacity="0.75" stroke-width="' + Math.max(1.2, K.width * 0.8) + '" stroke-linejoin="round"' + markers + '/>';
    } else {
      s += '<path d="' + d + '" fill="none" stroke="' + K.color + '" stroke-width="' + (isIso() ? K.width * 1.5 : K.width) + '" stroke-linejoin="round"' + (K.dash ? ' stroke-dasharray="' + K.dash + '"' : '') + markers + '/>';
    }
    var mid = pointAt(pts, 0.5);
    if (e.kind === 'denied') s += xMark(mid.x, mid.y);
    var lx = mid.x, ly = mid.y;
    if (e.step) {
      lab += numBadge(mid.x, mid.y, e.step, 'step');
      if (e.label) { var horiz = Math.abs(mid.dx) >= Math.abs(mid.dy); lx = horiz ? mid.x : mid.x + 16; ly = horiz ? mid.y - 18 : mid.y; }
    }
    if (e.label) {
      var ll = String(e.label).split('\n'), wmax = 0;
      ll.forEach(function (l) { wmax = Math.max(wmax, tw(l, 11, false)); });
      var bw = wmax + 10, bh = ll.length * 14 + 6;
      var bx = e.step && Math.abs(mid.dx) < Math.abs(mid.dy) ? lx + 4 : lx - bw / 2;
      lab += '<rect x="' + bx + '" y="' + (ly - bh / 2) + '" width="' + bw + '" height="' + bh + '" rx="3" fill="#FFFFFF" fill-opacity="0.94" stroke="#E2E4E8" stroke-width="0.8"/>';
      ll.forEach(function (l, i) { lab += '<text x="' + (bx + bw / 2) + '" y="' + (ly - bh / 2 + 14 + i * 14) + '" text-anchor="middle" font-size="11" font-style="italic" fill="' + (e.kind === 'telemetry' || e.kind === 'data' ? '#B3141A' : '#3a3a3a') + '">' + esc(l) + '</text>'; });
    }
    if (lab && isIso()) { var pm = isoP(mid.x, mid.y); lab = '<g transform="translate(' + rr(pm.x - mid.x) + ',' + rr(pm.y - mid.y) + ')">' + lab + '</g>'; }
    return { line: s + '</g>', label: lab ? '<g class="edge elabel" data-id="' + e.id + '">' + lab + '</g>' : '' };
  }

  // floor = lo que va sobre el piso (zonas, conexiones); up = lo que va de pie (componentes, textos).
  // En vista plana ambos comparten coordenadas; en 3D el piso se proyecta con la matriz isométrica.
  function renderContent(exp, extraFloor, extraUp) {
    var O = renderOrder(), floor = '', up = '', labels = '';
    O.zones.forEach(function (z) { floor += renderZone(z, exp); });
    doc.edges.forEach(function (e) { var r = renderEdge(e, exp); floor += r.line; labels += r.label; });
    O.nodes.forEach(function (n) { up += renderNode(n, exp); });
    up += labels;
    O.rest.forEach(function (it) {
      if (it.kind === 'text') up += renderText(it, exp);
      else if (it.kind === 'badge') up += renderBadge(it, exp);
      else if (it.kind === 'legend') up += renderLegend(it, exp);
    });
    if (isIso()) return '<g transform="' + isoMatrix() + '">' + floor + (extraFloor || '') + '</g>' + up + (extraUp || '');
    return floor + up + (extraFloor || '') + (extraUp || '');
  }

  function render() {
    layoutAll();
    var fx = '', ux = '';
    hiIds = {};
    function highlight(id) {
      var t = byId[id];
      if (!t) return;
      if (isIso() && t.kind === 'node') { hiIds[id] = 1; return; }
      var r = rectOf(t), q = t.kind === 'zone' ? { x: r.x, y: r.y } : posOf(r.x, r.y);
      var str = '<rect class="droptarget" x="' + rr(q.x - 4) + '" y="' + rr(q.y - 4) + '" width="' + (r.w + 8) + '" height="' + (r.h + 8) + '" rx="6"/>';
      if (isIso() && t.kind !== 'zone') ux += str; else fx += str;
    }
    if (drag && drag.type === 'link') {
      var src = byId[drag.from];
      if (src) {
        var c = center(anchorRect(src)), K = EK[ui.edgeKind];
        fx += '<line class="templine" x1="' + c.x + '" y1="' + c.y + '" x2="' + drag.cur.x + '" y2="' + drag.cur.y + '" stroke="' + K.color + '" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#' + markerId(K.color) + ')"/>';
        if (drag.target) highlight(drag.target.id);
      }
    }
    if (ui.connect && ui.connectFrom && byId[ui.connectFrom]) highlight(ui.connectFrom);
    if (drag && drag.type === 'marquee') {
      var m = normRect(drag.start, drag.cur);
      fx += '<rect class="marquee" x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '"/>';
    }
    var s = defsSvg() + renderContent(false, fx, ux);
    world.innerHTML = s;
    world.setAttribute('transform', 'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
    var g = 20 * view.k;
    wrap.style.backgroundSize = ui.grid ? g + 'px ' + g + 'px' : '0 0';
    wrap.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
    wrap.classList.toggle('nogrid', !ui.grid);
    wrap.classList.toggle('connect-mode', ui.connect);
    $('#zoom-val').textContent = Math.round(view.k * 100) + '%';
    $('#empty-state').hidden = doc.items.length > 0;
    $('#status-count').textContent = doc.items.filter(function (i) { return i.kind === 'node'; }).length + ' componentes · ' + doc.edges.length + ' conexiones';
    if (document.activeElement !== $('#doc-title')) $('#doc-title').value = doc.title || '';
  }
  function normRect(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }; }

  /* ------------------------------------------------------------- historia */
  function snap() { return JSON.stringify(doc); }
  function pushHist(before) {
    if (before === snap()) return;
    hist.undo.push(before);
    if (hist.undo.length > 150) hist.undo.shift();
    hist.redo.length = 0;
    afterChange();
  }
  function change(fn, keepProps) {
    layoutAll();
    var b = snap();
    fn();
    layoutAll();
    pushHist(b);
    render();
    if (!keepProps) renderProps();
  }
  function undo() {
    if (!hist.undo.length) return;
    hist.redo.push(snap());
    doc = JSON.parse(hist.undo.pop());
    cleanSel(); afterChange(); render(); renderProps();
  }
  function redo() {
    if (!hist.redo.length) return;
    hist.undo.push(snap());
    doc = JSON.parse(hist.redo.pop());
    cleanSel(); afterChange(); render(); renderProps();
  }
  function cleanSel() { layoutAll(); sel.forEach(function (id) { if (!byId[id]) sel.delete(id); }); }
  var saveTimer = null;
  function afterChange() {
    $('#btn-undo').disabled = !hist.undo.length;
    $('#btn-redo').disabled = !hist.redo.length;
    if (lastView !== doc.view + '|' + isoPal()) { refreshPaletteSwatches(); syncToolbar(); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(LS_AUTO, snap()); $('#status-save').textContent = 'Guardado automático ✓'; } catch (e) { $('#status-save').textContent = 'No se pudo guardar en el navegador'; }
    }, 400);
  }

  /* --------------------------------------------------------- crear items */
  function newFromCatalog(ref, cx, cy) {
    var c = CI[ref];
    if (!c) return null;
    var it;
    if (c.kind === 'zone') it = { id: uid('z'), kind: 'zone', label: c.label, variant: c.variant || 'gray', x: 0, y: 0, w: c.w || 300, h: c.h || 200 };
    else if (c.kind === 'text') it = { id: uid('t'), kind: 'text', label: c.label, variant: c.variant || 'body', x: 0, y: 0, w: c.variant === 'title' ? 620 : c.variant === 'kicker' ? 420 : c.variant === 'body' ? 300 : 340, h: 30 };
    else if (c.kind === 'legend') it = { id: uid('l'), kind: 'legend', label: 'Leyenda', x: 0, y: 0, w: 520, h: 100 };
    else if (c.kind === 'badge') it = { id: uid('b'), kind: 'badge', label: c.label, variant: c.variant || 'num', x: 0, y: 0, w: 24, h: 24 };
    else {
      var st = c.shape ? 'card' : ui.nodeStyle;
      it = { id: uid('n'), kind: 'node', ref: ref, label: c.label, sub: c.sub || '', icon: c.icon, role: c.role || 'sol', style: st, shape: c.shape || 'rect', num: '', hall: '', desc: c.tip || '', rq: '', x: 0, y: 0, w: c.shape === 'dfd-process' ? 170 : (st === 'icon' ? 120 : 190), h: c.shape ? 56 : 48 };
    }
    layoutItem(it);
    it.x = snapv(cx - it.w / 2); it.y = snapv(cy - it.h / 2);
    return it;
  }
  function addFromCatalog(ref, cx, cy, linkFrom) {
    var it = newFromCatalog(ref, cx, cy);
    if (!it) return;
    change(function () {
      doc.items.push(it);
      if (linkFrom && byId[linkFrom]) doc.edges.push(newEdge(linkFrom, it.id));
    });
    sel = new Set([it.id]);
    render(); renderProps();
    toast('Agregado: ' + (it.label || ''));
  }
  function newEdge(from, to) {
    return { id: uid('e'), from: from, to: to, kind: ui.edgeKind, route: 'auto', arrow: '', label: '', step: '' };
  }
  function viewCenter() { var r = wrap.getBoundingClientRect(); return toWorldXY(r.left + r.width / 2, r.top + r.height / 2); }

  /* ----------------------------------------------------------- coordenadas */
  // Pantalla → coordenadas del piso (en 3D se deshace la proyección isométrica).
  function toWorldXY(cx, cy) {
    var r = svg.getBoundingClientRect(), X = (cx - r.left - view.x) / view.k, Y = (cy - r.top - view.y) / view.k;
    return isIso() ? isoInv(X, Y) : { x: X, y: Y };
  }
  function toWorld(e) { return toWorldXY(e.clientX, e.clientY); }
  function toScreen(x, y) { var q = posOf(x, y); return { x: q.x * view.k + view.x, y: q.y * view.k + view.y }; }

  // Elemento del diagrama bajo el puntero (sirve igual en 2D y en 3D porque usa lo que realmente se dibujó).
  function pickAt(cx, cy, excludeId) {
    var els = document.elementsFromPoint(cx, cy);
    for (var i = 0; i < els.length; i++) {
      var g = els[i].closest ? els[i].closest('#world [data-id]') : null;
      if (!g) continue;
      var id = g.getAttribute('data-id'), o = byId[id];
      if (!o || id === excludeId || isEdge(id) || o.kind === 'legend') continue;
      return o;
    }
    return null;
  }
  function containedIn(zone) {
    var zr = rectOf(zone), out = [];
    doc.items.forEach(function (it) { if (it.id !== zone.id && rectInside(rectOf(it), zr)) out.push(it.id); });
    return out;
  }

  /* --------------------------------------------------------------- puntero */
  svg.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  svg.addEventListener('pointerdown', function (e) {
    hideQuick(); commitInline();
    var p = toWorld(e), t = e.target;
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* puntero sintético o ya liberado */ }
    if (e.button === 1 || e.button === 2 || spaceDown) { drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; wrap.classList.add('panning'); return; }
    if (e.button !== 0) return;

    var el = t.closest ? t.closest('[data-id]') : null, id = el ? el.getAttribute('data-id') : null;
    var now = Date.now(), isDbl = now - lastDown.t < 380 && lastDown.id === id && Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 6;
    lastDown = { t: now, id: id, x: e.clientX, y: e.clientY };
    if (isDbl) { lastDown.t = 0; onDouble(id, p, e); return; }

    if (t.classList.contains('port') && id) { drag = { type: 'link', from: id, cur: p, target: null }; render(); return; }
    if (t.classList.contains('handle') && id) {
      var it0 = byId[id];
      drag = { type: 'resize', id: id, start: p, w: it0.w, h: it0.h, before: snap() };
      return;
    }
    if (ui.connect) {
      if (id && byId[id] && byId[id].kind !== undefined && byId[id].kind !== 'legend' && !isEdge(id)) {
        if (!ui.connectFrom) { ui.connectFrom = id; render(); setHint('Ahora haz clic en el componente destino (Esc para cancelar)'); }
        else if (ui.connectFrom !== id) {
          var from = ui.connectFrom; ui.connectFrom = null;
          var ne = newEdge(from, id);
          change(function () { doc.edges.push(ne); });
          sel = new Set([ne.id]); render(); renderProps();
          setHint('Conexión creada. Clic en otro origen para seguir conectando.');
        }
        return;
      }
      if (!id) { ui.connectFrom = null; render(); }
    }
    if (id && isEdge(id)) {
      if (e.shiftKey) { if (sel.has(id)) sel.delete(id); else sel.add(id); } else sel = new Set([id]);
      render(); renderProps(); return;
    }
    if (id && byId[id]) {
      var it = byId[id];
      if (e.shiftKey && it.kind === 'zone' && !sel.has(id)) { drag = { type: 'marquee', start: p, cur: p, add: true }; return; }
      if (e.shiftKey) { if (sel.has(id)) sel.delete(id); else sel.add(id); render(); renderProps(); return; }
      var wasSel = sel.has(id);
      if (!wasSel) sel = new Set([id]);
      var moveIds = new Set();
      sel.forEach(function (sid) {
        var s0 = byId[sid]; if (!s0 || isEdge(sid)) return;
        moveIds.add(sid);
        if (s0.kind === 'zone') containedIn(s0).forEach(function (c) { moveIds.add(c); });
      });
      var orig = {};
      moveIds.forEach(function (mid) { orig[mid] = { x: byId[mid].x, y: byId[mid].y }; });
      drag = { type: 'move', start: p, primary: id, orig: orig, moved: false, before: snap(), wasSel: wasSel };
      render(); renderProps();
      return;
    }
    // fondo vacío
    if (e.shiftKey) { drag = { type: 'marquee', start: p, cur: p, add: true }; return; }
    if (sel.size) { sel.clear(); render(); renderProps(); }
    drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, fromEmpty: true };
    wrap.classList.add('panning');
  });

  svg.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = toWorld(e);
    if (drag.type === 'pan') { view.x = drag.vx + (e.clientX - drag.sx); view.y = drag.vy + (e.clientY - drag.sy); render(); return; }
    if (drag.type === 'move') {
      var dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) * view.k < 3) return;
      drag.moved = true;
      var po = drag.orig[drag.primary];
      var nx = snapv(po.x + dx), ny = snapv(po.y + dy), ddx = nx - po.x, ddy = ny - po.y;
      Object.keys(drag.orig).forEach(function (id) { var it = byId[id]; if (it) { it.x = drag.orig[id].x + ddx; it.y = drag.orig[id].y + ddy; } });
      render(); return;
    }
    if (drag.type === 'resize') {
      var it = byId[drag.id];
      var minW = it.kind === 'zone' ? 80 : it.kind === 'text' ? 60 : 70, minH = it.kind === 'zone' ? 50 : 30;
      it.w = Math.max(minW, snapv(drag.w + p.x - drag.start.x));
      if (it.kind === 'zone' || (it.kind === 'node' && it.style !== 'icon')) it.h = Math.max(minH, snapv(drag.h + p.y - drag.start.y));
      render(); return;
    }
    if (drag.type === 'link') { drag.cur = p; drag.target = pickAt(e.clientX, e.clientY, drag.from); render(); return; }
    if (drag.type === 'marquee') { drag.cur = p; render(); }
  });

  function endDrag(e) {
    if (!drag) return;
    var d = drag; drag = null;
    wrap.classList.remove('panning');
    if (d.type === 'move') {
      if (d.moved) { pushHist(d.before); renderProps(); }
      else if (d.wasSel && sel.size > 1 && !e.shiftKey) { sel = new Set([d.primary]); renderProps(); }
      render();
    } else if (d.type === 'resize') { layoutAll(); pushHist(d.before); render(); }
    else if (d.type === 'link') {
      if (d.target) {
        var ne = newEdge(d.from, d.target.id);
        change(function () { doc.edges.push(ne); });
        sel = new Set([ne.id]); render(); renderProps();
      } else {
        render();
        var r = toScreen(d.cur.x, d.cur.y);
        showQuick(r.x, r.y, d.cur, d.from);
      }
    } else if (d.type === 'marquee') {
      var m = normRect(d.start, d.cur);
      if (!d.add) sel.clear();
      doc.items.forEach(function (it) { if (rectInside(rectOf(it), m)) sel.add(it.id); });
      doc.edges.forEach(function (ed) { if (sel.has(ed.from) && sel.has(ed.to)) sel.add(ed.id); });
      render(); renderProps();
    }
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    var mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * mult * 0.0022));
    } else {
      view.x -= (e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * mult;
      view.y -= (e.shiftKey && !e.deltaX ? 0 : e.deltaY) * mult;
      render();
    }
  }, { passive: false });

  function zoomAt(cx, cy, f) {
    var r = svg.getBoundingClientRect(), k = Math.min(3, Math.max(0.15, view.k * f));
    var px = cx - r.left, py = cy - r.top;
    view.x = px - (px - view.x) * (k / view.k);
    view.y = py - (py - view.y) * (k / view.k);
    view.k = k; render();
  }
  function zoomCenter(f) { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }

  // keep(it) opcional: limita los elementos considerados (ej. solo el dibujo, sin notas).
  function bounds(keep) {
    if (!doc.items.length) return { x: 0, y: 0, w: 800, h: 500 };
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    function ext(x, y) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
    var items = typeof keep === 'function' ? doc.items.filter(keep) : doc.items;
    if (!items.length) return { x: 0, y: 0, w: 800, h: 500 };
    if (isIso()) {
      // Límites de lo que realmente se ve: piso proyectado + objetos de pie.
      items.forEach(function (it) {
        if (it.kind === 'zone') [[0, 0], [it.w, 0], [it.w, it.h], [0, it.h]].forEach(function (q) { var p = isoP(it.x + q[0], it.y + q[1]); ext(p.x, p.y); });
        else if (it.kind === 'node') {
          var c = center(rectOf(it)), p = isoP(c.x, c.y), top = ISO.object(it, isoPal()).top;
          var lw = Math.min(132, tw(it.label || '', 11.5, true));
          ext(p.x - 50 - lw, p.y + top - 34); ext(p.x + 70, p.y + (it.sub ? 66 : 50));
        } else { var q2 = isoP(it.x, it.y); ext(q2.x - 6, q2.y - 6); ext(q2.x + it.w + 6, q2.y + it.h + 6); }
      });
      doc.edges.forEach(function (e) { var pts = edgePoints(e); if (pts) pts.forEach(function (q) { var p = isoP(q.x, q.y); ext(p.x, p.y); }); });
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    items.forEach(function (it) {
      x1 = Math.min(x1, it.x - 14); y1 = Math.min(y1, it.y - 14);
      x2 = Math.max(x2, it.x + it.w + 14); y2 = Math.max(y2, it.y + it.h + (it.sub ? 22 : 14));
    });
    doc.edges.forEach(function (e) { var p = edgePoints(e); if (p) p.forEach(function (q) { x1 = Math.min(x1, q.x); y1 = Math.min(y1, q.y); x2 = Math.max(x2, q.x); y2 = Math.max(y2, q.y); }); });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  /* ------------------------------------------------- conversión 2D ↔ 3D */
  function isAnnotation(it) { return it.kind === 'text' || it.kind === 'legend'; }
  // Separación automática al pasar a 3D: según la distancia típica entre componentes.
  function autoIsoScale() {
    var cs = doc.items.filter(function (i) { return i.kind === 'node'; }).map(function (i) { return center(rectOf(i)); });
    if (cs.length < 2) return 1;
    var nn = cs.map(function (a, i) {
      var m = Infinity;
      cs.forEach(function (b, j) { if (i !== j) m = Math.min(m, Math.hypot(a.x - b.x, a.y - b.y)); });
      return m;
    }).sort(function (a, b) { return a - b; });
    var med = nn[Math.floor(nn.length / 2)] || 150;
    return Math.round(Math.min(1.8, Math.max(1, 150 / med)) * 100) / 100;
  }
  // Coloca títulos arriba del dibujo y notas/leyenda debajo, en la vista actual.
  function arrangeAnnotations(list) {
    if (!list.length) return;
    layoutAll();
    var b = bounds(function (it) { return !isAnnotation(it); });
    function place(i, sx, sy) { var f = isIso() ? isoInv(sx, sy) : { x: sx, y: sy }; i.x = Math.round(f.x); i.y = Math.round(f.y); }
    var heads = list.filter(function (i) { return i.kind === 'text' && (i.variant === 'title' || i.variant === 'kicker'); }).sort(function (a, c) { return a.y - c.y; });
    var rest = list.filter(function (i) { return heads.indexOf(i) < 0; }).sort(function (a, c) { return ((a.kind === 'legend') - (c.kind === 'legend')) || (a.y - c.y) || (a.x - c.x); });
    var Y = b.y - 24 - heads.reduce(function (t, i) { return t + i.h + 6; }, 0);
    heads.forEach(function (i) { place(i, b.x, Y); Y += i.h + 6; });
    var X = b.x, Y2 = b.y + b.h + 30, rowH = 0, maxX = b.x + Math.max(b.w, 1000);
    rest.forEach(function (i) {
      if (X > b.x && X + i.w > maxX) { X = b.x; Y2 += rowH + 20; rowH = 0; }
      place(i, X, Y2); X += i.w + 24; rowH = Math.max(rowH, i.h);
    });
  }
  // Aplica el cambio de vista guardando/restaurando la posición 2D de títulos, notas y leyenda.
  function applyView(v) {
    var ann = doc.items.filter(isAnnotation);
    if (v === 'iso') {
      ann.forEach(function (i) { i.p2 = { x: i.x, y: i.y }; });
      if (!(+doc.isoScale > 0)) doc.isoScale = autoIsoScale();
      doc.view = 'iso';
      arrangeAnnotations(ann);
    } else {
      doc.view = 'flat';
      var fresh = [];
      ann.forEach(function (i) { if (i.p2) { i.x = i.p2.x; i.y = i.p2.y; delete i.p2; } else fresh.push(i); });
      arrangeAnnotations(fresh);
    }
  }
  function fit() {
    layoutAll();
    var b = bounds(), r = svg.getBoundingClientRect();
    var k = Math.min(1.25, Math.max(0.2, Math.min((r.width - 60) / b.w, (r.height - 60) / b.h)));
    view.k = k; view.x = (r.width - b.w * k) / 2 - b.x * k; view.y = (r.height - b.h * k) / 2 - b.y * k;
    render();
  }

  /* ----------------------------------------------------------- doble clic */
  function onDouble(id, p, e) {
    if (!id) { var s = toScreen(p.x, p.y); showQuick(s.x, s.y, p, null); return; }
    sel = new Set([id]); render(); renderProps();
    if (byId[id] && byId[id].kind === 'legend') return;
    startInline(id);
  }

  var inline = null;
  function startInline(id) {
    var obj = byId[id];
    if (!obj) return;
    var ta = $('#inline-edit'), sr = wrap.getBoundingClientRect(), x, y, w, h;
    if (isEdge(id)) {
      var pts = edgePoints(obj); if (!pts) return;
      var m = pointAt(pts, 0.5), s = toScreen(m.x, m.y);
      w = 180; h = 44; x = s.x - w / 2; y = s.y - h / 2;
    } else if (isIso() && obj.kind === 'node') {
      // En 3D el nombre va arriba a la izquierda del objeto.
      var cc = center(rectOf(obj)), s3 = toScreen(cc.x, cc.y), top = ISO.object(obj, isoPal()).top;
      w = 180; h = 44; x = s3.x - 46 * view.k - w; y = s3.y + (top - 24) * view.k;
    } else {
      var r = obj.kind === 'node' ? anchorRect(obj) : rectOf(obj), s2 = toScreen(r.x, r.y);
      w = Math.max(160, r.w * view.k); h = Math.max(40, Math.min(r.h * view.k, 160));
      if (obj.kind === 'zone') h = 40;
      x = s2.x; y = s2.y;
      if (obj.kind === 'node' && obj.style === 'icon') { y = s2.y + 56 * view.k; x = s2.x + 28 * view.k - w / 2; }
    }
    ta.style.left = x + 'px'; ta.style.top = y + 'px'; ta.style.width = w + 'px'; ta.style.height = h + 'px';
    ta.value = obj.label || '';
    ta.hidden = false; ta.focus(); ta.select();
    inline = { id: id, before: snap() };
  }
  function commitInline(cancel) {
    if (!inline) return;
    var ta = $('#inline-edit'), obj = byId[inline.id], val = ta.value;
    ta.hidden = true;
    var b = inline.before; inline = null;
    if (!cancel && obj && obj.label !== val) { obj.label = val; layoutAll(); pushHist(b); }
    render(); renderProps();
  }
  $('#inline-edit').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitInline(); }
    else if (e.key === 'Escape') { e.preventDefault(); commitInline(true); }
    e.stopPropagation();
  });
  $('#inline-edit').addEventListener('blur', function () { commitInline(); });

  /* ------------------------------------------------------- búsqueda rápida */
  var quick = null;
  function searchCatalog(q) {
    q = norm(q);
    var out = [];
    CATALOG.forEach(function (c) {
      c.items.forEach(function (it) {
        if (!q || norm(it.label + ' ' + c.cat + ' ' + (it.tip || '') + ' ' + (it.sub || '')).indexOf(q) >= 0) out.push(it);
      });
    });
    if (q) out.sort(function (a, b) { return (norm(a.label).indexOf(q) === -1) - (norm(b.label).indexOf(q) === -1); });
    return out;
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function showQuick(sx, sy, wp, linkFrom) {
    var box = $('#quick'), sr = wrap.getBoundingClientRect();
    quick = { wp: wp, linkFrom: linkFrom, idx: 0 };
    box.style.left = Math.min(sx, sr.width - 330) + 'px';
    box.style.top = Math.min(sy, sr.height - 340) + 'px';
    box.hidden = false;
    $('#quick-title').textContent = linkFrom ? 'Agregar y conectar…' : 'Agregar componente aquí…';
    var inp = $('#quick-input'); inp.value = ''; fillQuick(''); inp.focus();
  }
  function fillQuick(q) {
    var res = searchCatalog(q).slice(0, 9), list = $('#quick-list');
    quick.res = res; quick.idx = 0;
    list.innerHTML = res.map(function (it, i) {
      var R = ROLES[it.role] || ROLES.neutral;
      return '<li data-i="' + i + '" class="' + (i === 0 ? 'on' : '') + '"><span class="sw" style="background:' + (it.kind ? '#e9e9e9' : R.fill) + '">' + (it.icon ? iconMini(it.icon, it.kind ? '#555' : R.text) : '') + '</span><span><b>' + esc(it.label) + '</b><small>' + esc(it.cat) + '</small></span></li>';
    }).join('') || '<li class="none">Sin resultados</li>';
  }
  function hideQuick() { $('#quick').hidden = true; quick = null; }
  function pickQuick(i) {
    if (!quick || !quick.res || !quick.res[i]) return;
    var it = quick.res[i], q = quick; hideQuick();
    addFromCatalog(it.id, q.wp.x, q.wp.y, q.linkFrom);
  }
  $('#quick-input').addEventListener('input', function (e) { fillQuick(e.target.value); });
  $('#quick-input').addEventListener('keydown', function (e) {
    e.stopPropagation();
    if (!quick) return;
    var n = (quick.res || []).length;
    if (e.key === 'ArrowDown') { quick.idx = Math.min(n - 1, quick.idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { quick.idx = Math.max(0, quick.idx - 1); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); pickQuick(quick.idx); return; }
    else if (e.key === 'Escape') { hideQuick(); return; }
    $$('#quick-list li').forEach(function (li, i) { li.classList.toggle('on', i === quick.idx); });
  });
  $('#quick-list').addEventListener('mousedown', function (e) { var li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pickQuick(+li.getAttribute('data-i')); } });

  function iconMini(name, color) { var inner = ICONS[name]; return inner ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>' : ''; }

  /* ---------------------------------------------------------------- paleta */
  function buildPalette() {
    var box = $('#palette-list');
    box.innerHTML = CATALOG.map(function (c, ci) {
      return '<details class="cat"' + (ci < 4 ? ' open' : '') + '><summary><span>' + esc(c.cat) + '</span><small>' + esc(c.s) + '</small></summary><div class="items">' +
        c.items.map(function (it) {
          var R = ROLES[it.role] || ROLES.neutral, sw;
          if (it.kind === 'zone') { var Z = ZV[it.variant]; sw = '<span class="sw zone" style="background:' + (Z.fill === 'none' ? '#fff' : Z.fill) + ';border-color:' + Z.stroke + '"></span>'; }
          else if (it.kind) sw = '<span class="sw" style="background:#ececec">' + iconMini(it.kind === 'legend' ? 'list-tree' : it.kind === 'badge' ? 'circle-x' : 'type', '#555') + '</span>';
          else sw = nodeSwatch(it);
          return '<div class="pitem" draggable="true" data-ref="' + it.id + '" title="' + esc(it.tip || '') + '">' + sw + '<span class="pl">' + esc(it.label) + '</span></div>';
        }).join('') + '</div></details>';
    }).join('');
    lastView = doc.view + '|' + isoPal();
  }
  // Miniatura del componente: ícono plano en 2D, objeto isométrico en 3D.
  function nodeSwatch(it) {
    if (isIso()) return '<span class="sw iso">' + ISO.thumb(it, isoPal()) + '</span>';
    var R = ROLES[it.role] || ROLES.neutral;
    return '<span class="sw" style="background:' + R.fill + ';border-color:' + R.stroke + '">' + iconMini(it.icon, R.text) + '</span>';
  }
  function refreshPaletteSwatches() {
    $$('#palette-list .pitem').forEach(function (el) {
      var it = CI[el.getAttribute('data-ref')];
      if (!it || it.kind) return;
      var old = el.querySelector('.sw');
      if (old) old.outerHTML = nodeSwatch(it);
    });
    lastView = doc.view + '|' + isoPal();
    document.body.classList.toggle('iso-mode', isIso());
  }
  $('#palette-list').addEventListener('dragstart', function (e) {
    var el = e.target.closest('.pitem'); if (!el) return;
    e.dataTransfer.setData('text/plain', el.getAttribute('data-ref'));
    e.dataTransfer.effectAllowed = 'copy';
  });
  $('#palette-list').addEventListener('click', function (e) {
    var el = e.target.closest('.pitem'); if (!el) return;
    var c = viewCenter(); pasteN = (pasteN + 1) % 6;
    addFromCatalog(el.getAttribute('data-ref'), c.x + pasteN * 20, c.y + pasteN * 20);
  });
  $('#palette-list').addEventListener('mouseover', function (e) {
    var el = e.target.closest('.pitem'); if (!el) return;
    var it = CI[el.getAttribute('data-ref')];
    $('#palette-info').innerHTML = '<b>' + esc(it.label) + '</b><br>' + esc(it.tip || '');
  });
  $('#palette-search').addEventListener('input', function (e) {
    var q = norm(e.target.value);
    $$('#palette-list .cat').forEach(function (cat) {
      var any = false;
      $$('.pitem', cat).forEach(function (el) {
        var it = CI[el.getAttribute('data-ref')];
        var ok = !q || norm(it.label + ' ' + (it.tip || '') + ' ' + (it.sub || '') + ' ' + it.cat).indexOf(q) >= 0;
        el.hidden = !ok; if (ok) any = true;
      });
      cat.hidden = !any;
      if (q) cat.open = any;
    });
  });
  wrap.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  wrap.addEventListener('drop', function (e) {
    e.preventDefault();
    var ref = e.dataTransfer.getData('text/plain');
    if (!CI[ref]) return;
    var p = toWorld(e);
    var target = pickAt(e.clientX, e.clientY);
    addFromCatalog(ref, p.x, p.y);
    if (target && target.kind === 'node' && CI[ref].kind === undefined) toast('Tip: arrastra desde los puntos azules de un componente para conectarlo');
  });

  /* ------------------------------------------------------------- selección */
  function isEdge(id) { var o = byId[id]; return !!(o && o.from !== undefined); }
  function selectedItems() { var a = []; sel.forEach(function (id) { var o = byId[id]; if (o && !isEdge(id)) a.push(o); }); return a; }
  function selectedEdges() { var a = []; sel.forEach(function (id) { if (isEdge(id)) a.push(byId[id]); }); return a; }

  function deleteSel() {
    if (!sel.size) return;
    change(function () {
      var ids = new Set(sel);
      doc.items = doc.items.filter(function (i) { return !ids.has(i.id); });
      doc.edges = doc.edges.filter(function (e) { return !ids.has(e.id) && !ids.has(e.from) && !ids.has(e.to); });
    });
    sel.clear(); render(); renderProps();
  }
  function copySel() {
    var items = selectedItems(); if (!items.length) return false;
    var ids = new Set(items.map(function (i) { return i.id; }));
    clipboard = { items: clone(items), edges: clone(doc.edges.filter(function (e) { return ids.has(e.from) && ids.has(e.to); })) };
    pasteN = 0; toast('Copiado (' + items.length + ')');
    return true;
  }
  function paste(offset) {
    if (!clipboard) return;
    pasteN++;
    var map = {}, off = (offset || 20) * pasteN, newIds = [];
    change(function () {
      clipboard.items.forEach(function (it) {
        var n = clone(it); n.id = uid(it.kind[0]); map[it.id] = n.id; n.x += off; n.y += off;
        doc.items.push(n); newIds.push(n.id);
      });
      clipboard.edges.forEach(function (e) { var n = clone(e); n.id = uid('e'); n.from = map[e.from]; n.to = map[e.to]; doc.edges.push(n); newIds.push(n.id); });
    });
    sel = new Set(newIds); render(); renderProps();
  }
  function duplicate() { if (copySel()) { paste(30); } }

  /* ---------------------------------------------------------- propiedades */
  var propBefore = null;
  function seg(prop, cur, opts) {
    return '<div class="seg">' + opts.map(function (o) { return '<button type="button" data-set="' + prop + '" data-val="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? 'on' : '') + '" title="' + esc(o[2] || o[1]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function roleSwatches(cur) {
    return '<div class="swatches">' + Object.keys(ROLES).map(function (k) {
      var R = ROLES[k];
      return '<button type="button" data-set="role" data-val="' + k + '" class="swb' + (cur === k ? ' on' : '') + '" title="' + esc(R.name) + '"><span style="background:' + R.fill + ';border-color:' + R.stroke + '"></span>' + esc(R.name.split(' ')[0]) + '</button>';
    }).join('') + '</div>';
  }
  function iconPicker(cur) {
    var names = Object.keys(ICONS).sort();
    return '<details class="iconpick"><summary>' + iconMini(cur, '#262626') + ' <span>' + esc(cur || 'sin ícono') + '</span> · cambiar</summary>' +
      '<input type="search" class="ip-search" placeholder="Buscar ícono (en inglés: shield, server…)">' +
      '<div class="ip-grid"><button type="button" data-set="icon" data-val="" title="Sin ícono">∅</button>' + names.map(function (n) { return '<button type="button" data-set="icon" data-val="' + n + '" title="' + n + '">' + iconMini(n, '#262626') + '</button>'; }).join('') + '</div></details>';
  }
  function f(label, html, hint) { return '<div class="f"><label>' + label + '</label>' + html + (hint ? '<p class="hint">' + hint + '</p>' : '') + '</div>'; }
  function inp(prop, val, ph, attrs) { return '<input type="text" data-bind="' + prop + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '"' + (attrs || '') + '>'; }
  function ta(prop, val, ph, rows) { return '<textarea data-bind="' + prop + '" rows="' + (rows || 2) + '" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>'; }
  function act(a, label, cls) { return '<button type="button" class="btn ' + (cls || '') + '" data-act="' + a + '">' + label + '</button>'; }

  function renderProps() {
    cleanSel(); // descarta ids de elementos que ya no existen (tras borrar, deshacer o cargar plantilla)
    var box = $('#props'), html = '', items = selectedItems(), edges = selectedEdges();
    if (!sel.size) {
      html += '<h3>Diagrama</h3>';
      html += f('Título del diagrama', '<input type="text" data-docbind="title" value="' + esc(doc.title) + '">');
      html += f('Vista del diagrama', seg('doc.view', isIso() ? 'iso' : 'flat', [['flat', '2D (plano)'], ['iso', '3D isométrico']]),
        isIso() ? 'Las zonas y conexiones se proyectan sobre el piso; cada componente es un objeto 3D. Arrastra sobre el piso para moverlos.' : '');
      if (isIso()) {
        html += f('Colores en 3D', seg('doc.isoPalette', isoPal(), [['azul', 'Azul (moderno)'], ['clasica', 'Clásica (rojo y negro)']]), 'En ambos, rojo = componente de la solución y ámbar = solo detección.');
        html += f('Separación entre componentes', '<div class="row">' + act('spread-out', '↔ Separar más') + act('spread-in', '→← Juntar') + '</div>', 'Útil al pasar a 3D un diagrama hecho en 2D: los objetos 3D ocupan más espacio.');
      }
      html += f('Estilo para nuevos componentes (2D)', seg('ui.nodeStyle', ui.nodeStyle, [['card', 'Tarjeta (Draw.io)'], ['icon', 'Ícono (Packet Tracer)']]));
      html += f('Tipo de línea para nuevas conexiones', edgeKindList(ui.edgeKind, 'ui.edgeKind'));
      html += f('Lienzo', '<label class="chk"><input type="checkbox" data-uibind="grid"' + (ui.grid ? ' checked' : '') + '> Mostrar cuadrícula</label><label class="chk"><input type="checkbox" data-uibind="snap"' + (ui.snap ? ' checked' : '') + '> Ajustar a la cuadrícula</label>');
      html += f('Convertir todos los componentes', '<div class="row">' + act('all-card', 'A tarjeta') + act('all-icon', 'A ícono') + '</div>');
      html += '<div class="tips"><b>Cómo se usa</b><ul>' +
        '<li><b>Arrastra</b> un componente de la izquierda al lienzo (o haz clic para agregarlo al centro).</li>' +
        '<li><b>Conecta</b>: pasa el mouse sobre un componente y arrastra desde un <span class="dot"></span> punto azul hasta otro. Si lo sueltas en vacío, eliges qué crear.</li>' +
        '<li><b>Doble clic</b> en un componente para renombrarlo; en el fondo, para buscar y agregar.</li>' +
        '<li><b>Zonas</b> (DMZ, sede, VLAN): al moverlas se mueve todo lo que contienen.</li>' +
        '<li>Arrastra el fondo para moverte · <b>Ctrl + rueda</b> para zoom · <b>Shift + arrastrar</b> para seleccionar varios.</li></ul></div>';
    } else if (items.length + edges.length > 1) {
      html += '<h3>' + (items.length + edges.length) + ' elementos seleccionados</h3>';
      var nodes = items.filter(function (i) { return i.kind === 'node'; });
      if (nodes.length) {
        html += f('Color / rol de los componentes', roleSwatches(''));
        html += f('Estilo', seg('style', '', [['card', 'Tarjeta'], ['icon', 'Ícono']]));
      }
      if (edges.length) html += f('Tipo de línea (' + edges.length + ')', edgeKindList('', 'kind'));
      if (items.length > 1) {
        html += f('Alinear', '<div class="row icons">' + act('al-left', '⇤ Izq.') + act('al-center', '↔ Centro') + act('al-right', 'Der. ⇥') + '</div><div class="row icons">' + act('al-top', '⤒ Arriba') + act('al-middle', '↕ Medio') + act('al-bottom', 'Abajo ⤓') + '</div>');
        html += f('Distribuir', '<div class="row">' + act('dist-h', 'Horizontal') + act('dist-v', 'Vertical') + act('same-size', 'Igual tamaño') + '</div>');
      }
      html += '<div class="row">' + act('duplicate', 'Duplicar') + act('delete', 'Eliminar', 'danger') + '</div>';
    } else if (edges.length) {
      var e = edges[0], a = byId[e.from], b = byId[e.to];
      html += '<h3>Conexión</h3><p class="muted">' + esc(a ? a.label : '?') + ' → ' + esc(b ? b.label : '?') + '</p>';
      html += f('Tipo de línea', edgeKindList(e.kind, 'kind'));
      html += f('Etiqueta', ta('label', e.label, 'ej. 443/HTTPS, salida del conector, réplica asíncrona', 2));
      html += f('Paso del flujo', inp('step', e.step, 'ej. 1, 2, a, b'), 'Para la "vista espejo": numera el recorrido de una solicitud.');
      html += f('Trazado', seg('route', e.route || 'auto', [['auto', 'Auto'], ['straight', 'Recto'], ['zv', 'Z ↕', 'Escalón vertical (sale por abajo/arriba)'], ['zh', 'Z ↔', 'Escalón horizontal (sale por los lados)'], ['hv', '└ H→V', 'Primero horizontal, luego vertical'], ['vh', '┐ V→H', 'Primero vertical, luego horizontal']]));
      html += f('Flechas', seg('arrow', e.arrow || '', [['', 'Por tipo'], ['end', '→'], ['both', '↔'], ['start', '←'], ['none', '—']]));
      html += '<div class="row">' + act('reverse', '⇄ Invertir') + act('delete', 'Eliminar', 'danger') + '</div>';
    } else {
      var it = items[0];
      if (it.kind === 'node') {
        var c = CI[it.ref];
        html += '<h3>Componente</h3>';
        html += f('Nombre', ta('label', it.label, 'Nombre del componente', 2));
        html += f('Texto debajo', inp('sub', it.sub, 'ej. EDR · cifrado · sin admin'));
        html += f('Color / rol', roleSwatches(it.role));
        if (!it.shape || it.shape === 'rect') html += f('Estilo', seg('style', it.style, [['card', 'Tarjeta'], ['icon', 'Ícono']]));
        else html += f('Forma DFD', seg('shape', it.shape, [['dfd-entity', 'Entidad'], ['dfd-process', 'Proceso'], ['dfd-store', 'Almacén']]));
        html += f('Ícono', iconPicker(it.icon));
        html += '<div class="two">' + f('Nº componente', inp('num', it.num, 'ej. 3')) + f('Hallazgo', inp('hall', it.hall, 'ej. H2')) + '</div>';
        html += f('Sustento: ¿por qué se incluye?', ta('desc', it.desc, 'Qué riesgo mitiga y por qué va aquí', 4));
        html += f('Atiende (requisito / riesgo)', inp('rq', it.rq, 'ej. RQ1, RQ5 · R2'));
        if (c && c.tip && c.tip !== it.desc) html += '<p class="hint"><b>Referencia:</b> ' + esc(c.tip) + ' <a href="#" data-act="use-tip">usar como sustento</a></p>';
        html += '<div class="row">' + act('front', 'Al frente') + act('back', 'Al fondo') + '</div>';
        html += '<div class="row">' + act('duplicate', 'Duplicar') + act('delete', 'Eliminar', 'danger') + '</div>';
      } else if (it.kind === 'zone') {
        html += '<h3>Zona / contenedor</h3>';
        html += f('Título', ta('label', it.label, 'ej. SEDE LIMA, DMZ, VLAN 30 · DC', 2));
        html += f('Tipo de zona', '<div class="zlist">' + Object.keys(ZV).map(function (k) { var Z = ZV[k]; return '<button type="button" data-set="variant" data-val="' + k + '" class="' + (it.variant === k ? 'on' : '') + '"><span style="background:' + (Z.fill === 'none' ? '#fff' : Z.fill) + ';border-color:' + Z.stroke + ';border-style:' + (Z.dash ? 'dashed' : 'solid') + '"></span>' + esc(Z.name) + '</button>'; }).join('') + '</div>');
        html += '<p class="hint">Al mover la zona se mueve todo lo que está completamente dentro. Redimensiona con el cuadrito de la esquina inferior derecha.</p>';
        html += '<div class="row">' + act('duplicate', 'Duplicar') + act('delete', 'Eliminar', 'danger') + '</div>';
      } else if (it.kind === 'text') {
        html += '<h3>Texto</h3>';
        html += f('Contenido', ta('label', it.label, '', 5));
        html += f('Estilo', seg('variant', it.variant, [['kicker', 'Antetítulo'], ['title', 'Título'], ['body', 'Normal'], ['note', 'Nota'], ['alert', 'Destacado']]));
        html += '<div class="row">' + act('duplicate', 'Duplicar') + act('delete', 'Eliminar', 'danger') + '</div>';
      } else if (it.kind === 'badge') {
        html += '<h3>Marca</h3>';
        html += f('Texto', inp('label', it.label, 'ej. 1, H3, a'));
        html += f('Tipo', seg('variant', it.variant, [['num', 'Número'], ['step', 'Paso'], ['hall', 'Hallazgo'], ['dark', 'Oscura']]));
        html += '<div class="row">' + act('duplicate', 'Duplicar') + act('delete', 'Eliminar', 'danger') + '</div>';
      } else if (it.kind === 'legend') {
        html += '<h3>Leyenda</h3><p class="muted">Se actualiza sola con los colores, zonas y tipos de línea que uses en el diagrama.</p>';
        html += f('Título', inp('label', it.label, 'Leyenda'));
        html += '<div class="row">' + act('delete', 'Eliminar', 'danger') + '</div>';
      }
    }
    box.innerHTML = html;
  }
  function edgeKindList(cur, prop) {
    return '<div class="klist">' + Object.keys(EK).map(function (k) {
      var K = EK[k];
      var line = '<svg width="38" height="12"><line x1="2" y1="6" x2="' + (K.arrow === 'none' ? 36 : 30) + '" y2="6" stroke="' + K.color + '" stroke-width="' + K.width + '"' + (K.dash ? ' stroke-dasharray="' + K.dash + '"' : '') + '/>' + (K.arrow !== 'none' ? '<path d="M30,2 L37,6 L30,10 z" fill="' + K.color + '"/>' : '') + (k === 'denied' ? '<path d="M14,2 L22,10 M22,2 L14,10" stroke="#E2231A" stroke-width="2"/>' : '') + '</svg>';
      return '<button type="button" data-set="' + prop + '" data-val="' + k + '" class="' + (cur === k ? 'on' : '') + '">' + line + '<span>' + esc(K.name) + '</span></button>';
    }).join('') + '</div>';
  }

  var props = $('#props');
  props.addEventListener('focusin', function (e) { if (e.target.matches('[data-bind],[data-docbind]')) propBefore = snap(); });
  props.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches('.ip-search')) {
      var q = t.value.toLowerCase();
      $$('.ip-grid button', t.parentNode).forEach(function (b) { b.hidden = q && b.getAttribute('data-val').indexOf(q) === -1; });
      return;
    }
    if (t.matches('[data-docbind]')) { doc[t.getAttribute('data-docbind')] = t.value; render(); return; }
    if (t.matches('[data-uibind]')) return;
    if (!t.matches('[data-bind]')) return;
    var prop = t.getAttribute('data-bind');
    sel.forEach(function (id) { var o = byId[id]; if (o) o[prop] = t.value; });
    render();
  });
  props.addEventListener('focusout', function (e) {
    if (e.target.matches('[data-bind],[data-docbind]') && propBefore) { layoutAll(); pushHist(propBefore); propBefore = null; }
  });
  props.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-uibind]')) { ui[t.getAttribute('data-uibind')] = t.checked; saveUI(); render(); }
  });
  props.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set],[data-act]');
    if (!b) return;
    if (b.hasAttribute('data-act')) { e.preventDefault(); doAction(b.getAttribute('data-act')); return; }
    var prop = b.getAttribute('data-set'), val = b.getAttribute('data-val');
    if (prop.indexOf('ui.') === 0) { ui[prop.slice(3)] = val; saveUI(); syncToolbar(); renderProps(); return; }
    if (prop === 'doc.view') { setView(val); return; }
    if (prop === 'doc.isoPalette') { change(function () { doc.isoPalette = val; }); return; }
    change(function () {
      sel.forEach(function (id) {
        var o = byId[id]; if (!o) return;
        if (prop === 'kind' && !isEdge(id)) return;
        if ((prop === 'role' || prop === 'style') && o.kind !== 'node') return;
        if (prop === 'style' && o.shape && o.shape !== 'rect') return;
        if (prop === 'style' && o.style !== val) { var cx = o.x + o.w / 2; o.style = val; o.w = val === 'icon' ? 120 : 190; o.h = val === 'icon' ? 90 : 48; o.x = snapv(cx - o.w / 2); return; }
        o[prop] = val;
      });
    });
  });

  function doAction(a) {
    var items = selectedItems();
    if (a === 'delete') return deleteSel();
    if (a === 'duplicate') return duplicate();
    if (a === 'use-tip') { var it0 = items[0], c = it0 && CI[it0.ref]; if (c) change(function () { it0.desc = c.tip; }); return; }
    if (a === 'reverse') return change(function () { selectedEdges().forEach(function (e) { var t = e.from; e.from = e.to; e.to = t; }); });
    if (a === 'front' || a === 'back') return change(function () {
      items.forEach(function (it) { doc.items.splice(doc.items.indexOf(it), 1); if (a === 'front') doc.items.push(it); else doc.items.unshift(it); });
    });
    if (a === 'spread-out' || a === 'spread-in') {
      var fct = a === 'spread-out' ? 1.25 : 0.8, cxs = 0, cys = 0, nn = 0;
      if (isIso()) {
        // En 3D solo cambia la escala de la vista: el diagrama 2D queda igual.
        change(function () {
          var ann = doc.items.filter(isAnnotation), pos = ann.map(function (i) { return isoP(i.x, i.y); });
          doc.isoScale = Math.round(Math.min(3, Math.max(0.5, isoS() * fct)) * 100) / 100;
          ann.forEach(function (i, k) { var f = isoInv(pos[k].x * fct, pos[k].y * fct); i.x = Math.round(f.x); i.y = Math.round(f.y); });
        });
        return fit();
      }
      // En 2D escala las posiciones (no los tamaños de los componentes) alrededor del centro del diagrama.
      doc.items.forEach(function (o) { cxs += o.x + o.w / 2; cys += o.y + o.h / 2; nn++; });
      if (!nn) return;
      cxs /= nn; cys /= nn;
      change(function () {
        doc.items.forEach(function (o) {
          if (o.kind === 'zone') { o.x = Math.round(cxs + (o.x - cxs) * fct); o.y = Math.round(cys + (o.y - cys) * fct); o.w = Math.round(o.w * fct); o.h = Math.round(o.h * fct); }
          else { var ox = o.x + o.w / 2, oy = o.y + o.h / 2; o.x = Math.round(cxs + (ox - cxs) * fct - o.w / 2); o.y = Math.round(cys + (oy - cys) * fct - o.h / 2); }
        });
      });
      return fit();
    }
    if (a === 'all-card' || a === 'all-icon') {
      var st = a === 'all-icon' ? 'icon' : 'card';
      return change(function () { doc.items.forEach(function (o) { if (o.kind === 'node' && (!o.shape || o.shape === 'rect') && o.style !== st) { var cx = o.x + o.w / 2; o.style = st; o.w = st === 'icon' ? 120 : 190; o.h = st === 'icon' ? 90 : 48; o.x = snapv(cx - o.w / 2); } }); });
    }
    if (a.indexOf('al-') === 0) {
      var x1 = Math.min.apply(null, items.map(function (i) { return i.x; })), x2 = Math.max.apply(null, items.map(function (i) { return i.x + i.w; }));
      var y1 = Math.min.apply(null, items.map(function (i) { return i.y; })), y2 = Math.max.apply(null, items.map(function (i) { return i.y + i.h; }));
      return change(function () {
        items.forEach(function (i) {
          if (a === 'al-left') i.x = x1; if (a === 'al-right') i.x = x2 - i.w; if (a === 'al-center') i.x = Math.round((x1 + x2) / 2 - i.w / 2);
          if (a === 'al-top') i.y = y1; if (a === 'al-bottom') i.y = y2 - i.h; if (a === 'al-middle') i.y = Math.round((y1 + y2) / 2 - i.h / 2);
        });
      });
    }
    if (a === 'dist-h' || a === 'dist-v') {
      var hz = a === 'dist-h', s = items.slice().sort(function (p, q) { return hz ? p.x - q.x : p.y - q.y; });
      if (s.length < 3) return toast('Selecciona 3 o más elementos para distribuir');
      var first = s[0], last = s[s.length - 1];
      var span = hz ? (last.x + last.w - first.x) : (last.y + last.h - first.y);
      var sum = s.reduce(function (t, i) { return t + (hz ? i.w : i.h); }, 0), gap = (span - sum) / (s.length - 1), pos = hz ? first.x : first.y;
      return change(function () { s.forEach(function (i) { if (hz) { i.x = Math.round(pos); pos += i.w + gap; } else { i.y = Math.round(pos); pos += i.h + gap; } }); });
    }
    if (a === 'same-size') {
      var ref = items[0];
      return change(function () { items.forEach(function (i) { if (i.kind === ref.kind) { i.w = ref.w; if (i.kind !== 'text') i.h = ref.h; } }); });
    }
  }

  /* --------------------------------------------------------------- teclado */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (!$('#modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    var mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.key === ' ') { spaceDown = true; wrap.classList.add('space'); e.preventDefault(); return; }
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if ((mod && k === 'y') || (mod && k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
    if (mod && k === 'c') { copySel(); e.preventDefault(); return; }
    if (mod && k === 'x') { if (copySel()) deleteSel(); e.preventDefault(); return; }
    if (mod && k === 'v') { paste(); e.preventDefault(); return; }
    if (mod && k === 'd') { duplicate(); e.preventDefault(); return; }
    if (mod && k === 'a') { e.preventDefault(); sel = new Set(doc.items.map(function (i) { return i.id; }).concat(doc.edges.map(function (x) { return x.id; }))); render(); renderProps(); return; }
    if (mod && k === 's') { e.preventDefault(); openSave(); return; }
    if (mod) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSel(); return; }
    if (e.key === 'Escape') { if (ui.connect) { ui.connectFrom = null; if (!ui.connectFrom) setConnect(false); } sel.clear(); hideQuick(); render(); renderProps(); return; }
    if (e.key === 'F2' && sel.size === 1) { e.preventDefault(); startInline(Array.from(sel)[0]); return; }
    if (k === 'c') { setConnect(!ui.connect); return; }
    if (k === '/') { e.preventDefault(); var c = viewCenter(), s = toScreen(c.x, c.y); showQuick(s.x - 150, s.y - 100, c, null); return; }
    if (k === '+' || k === '=') { zoomCenter(1.2); return; }
    if (k === '-') { zoomCenter(1 / 1.2); return; }
    if (k === '0') { fit(); return; }
    if (e.key.indexOf('Arrow') === 0) {
      var items = selectedItems(); if (!items.length) return;
      e.preventDefault();
      var st = e.shiftKey ? 10 : 1, dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
      change(function () { items.forEach(function (i) { i.x += dx; i.y += dy; }); }, true);
    }
  });
  document.addEventListener('keyup', function (e) { if (e.key === ' ') { spaceDown = false; wrap.classList.remove('space'); } });

  /* --------------------------------------------------------------- toolbar */
  function setConnect(on) {
    ui.connect = on; ui.connectFrom = null;
    $('#btn-connect').classList.toggle('on', on);
    setHint(on ? 'Modo conectar: clic en el origen y luego en el destino (C o Esc para salir)' : '');
    render();
  }
  function syncToolbar() {
    $('#edge-kind').value = ui.edgeKind;
    $('#btn-connect').classList.toggle('on', ui.connect);
    $$('[data-nodestyle]').forEach(function (b) { b.classList.toggle('on', !isIso() && b.getAttribute('data-nodestyle') === ui.nodeStyle); });
    $('#btn-iso').classList.toggle('on', isIso());
  }
  // Cambia entre vista plana (2D) e isométrica (3D); se puede deshacer.
  function setView(v) {
    v = v === 'iso' ? 'iso' : 'flat';
    if ((doc.view || 'flat') === v) return;
    change(function () { applyView(v); });
    syncToolbar(); fit();
    toast(v === 'iso' ? 'Vista 3D isométrica' : 'Vista 2D');
  }
  function setHint(t) { $('#status-hint').textContent = t || 'Arrastra el fondo para moverte · Ctrl + rueda: zoom · Doble clic: renombrar / agregar · C: conectar · /: buscar'; }

  $('#edge-kind').innerHTML = Object.keys(EK).map(function (k) { return '<option value="' + k + '">' + esc(EK[k].name) + '</option>'; }).join('');
  $('#edge-kind').addEventListener('change', function (e) {
    ui.edgeKind = e.target.value; saveUI();
    var ed = selectedEdges();
    if (ed.length) change(function () { ed.forEach(function (x) { x.kind = ui.edgeKind; }); });
    else renderProps();
  });
  $$('[data-nodestyle]').forEach(function (b) {
    b.addEventListener('click', function () {
      ui.nodeStyle = b.getAttribute('data-nodestyle'); saveUI();
      if (isIso()) setView('flat');
      syncToolbar(); renderProps();
    });
  });
  $('#btn-iso').addEventListener('click', function () { setView(isIso() ? 'flat' : 'iso'); });
  $('#btn-connect').addEventListener('click', function () { setConnect(!ui.connect); });
  $('#btn-undo').addEventListener('click', undo);
  $('#btn-redo').addEventListener('click', redo);
  $('#btn-zin').addEventListener('click', function () { zoomCenter(1.2); });
  $('#btn-zout').addEventListener('click', function () { zoomCenter(1 / 1.2); });
  $('#btn-fit').addEventListener('click', fit);
  $('#zoom-val').addEventListener('click', function () { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / view.k); });
  $('#btn-legend').addEventListener('click', function () {
    var ex = doc.items.filter(function (i) { return i.kind === 'legend'; })[0];
    if (ex) { sel = new Set([ex.id]); render(); renderProps(); toast('Ya hay una leyenda: está seleccionada'); return; }
    layoutAll(); var b = bounds();
    var it = newFromCatalog('x-legend', 0, 0); it.x = snapv(b.x + 14); it.y = snapv(b.y + b.h + 20);
    change(function () { doc.items.push(it); }); sel = new Set([it.id]); render(); renderProps();
  });
  $('#btn-number').addEventListener('click', autoNumber);
  $('#btn-table').addEventListener('click', openSustento);
  $('#btn-new').addEventListener('click', function () {
    if (doc.items.length && !confirm('¿Empezar un diagrama nuevo? El actual se perderá si no lo guardaste (Guardar → en este navegador o .json).')) return;
    change(function () { var t = emptyDoc(); doc.items = t.items; doc.edges = t.edges; doc.title = t.title; });
    sel.clear(); view = { x: 60, y: 40, k: 1 }; render(); renderProps();
  });
  $('#btn-templates').addEventListener('click', openTemplates);
  $('#btn-open').addEventListener('click', openLibrary);
  $('#btn-save').addEventListener('click', openSave);
  $('#btn-export').addEventListener('click', openExport);
  $('#btn-help').addEventListener('click', openHelp);
  $('#empty-templates').addEventListener('click', openTemplates);
  $('#empty-help').addEventListener('click', openHelp);
  $('#doc-title').addEventListener('focus', function () { propBefore = snap(); });
  $('#doc-title').addEventListener('input', function (e) { doc.title = e.target.value; });
  $('#doc-title').addEventListener('blur', function () { if (propBefore) { pushHist(propBefore); propBefore = null; } });
  $('#toggle-palette').addEventListener('click', function () { document.body.classList.toggle('hide-palette'); setTimeout(render, 50); });
  $('#toggle-props').addEventListener('click', function () { document.body.classList.toggle('hide-props'); setTimeout(render, 50); });
  window.addEventListener('resize', function () { render(); });

  function autoNumber() {
    var nodes = doc.items.filter(function (i) { return i.kind === 'node' && i.role === 'sol'; });
    if (!nodes.length) return toast('No hay componentes de la solución (rojos) para numerar');
    if (nodes.some(function (n) { return n.num; }) && !confirm('Se renumerarán los ' + nodes.length + ' componentes rojos en orden de lectura (arriba→abajo, izquierda→derecha). ¿Continuar?')) return;
    nodes.sort(function (a, b) { var ra = Math.round((a.y + a.h / 2) / 70), rb = Math.round((b.y + b.h / 2) / 70); return ra - rb || a.x - b.x; });
    change(function () { nodes.forEach(function (n, i) { n.num = String(i + 1); }); });
    toast('Numerados ' + nodes.length + ' componentes');
  }

  /* ---------------------------------------------------------------- modales */
  function openModal(title, body, wide) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    $('#modal').hidden = false;
    $('#modal .dialog').classList.toggle('wide', !!wide);
  }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal').addEventListener('mousedown', function (e) { if (e.target.id === 'modal') closeModal(); });
  $('#modal-close').addEventListener('click', closeModal);

  function openTemplates() {
    var T = window.TEMPLATES || [];
    openModal('Plantillas', '<p class="muted">Patrones de arquitectura listos para usar como punto de partida. Cárgalos y adáptalos a tu escenario.</p><div class="tgrid">' +
      T.map(function (t, i) { return '<button type="button" class="tcard" data-tpl="' + i + '"><span class="tag">' + esc(t.tag) + '</span><b>' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span></button>'; }).join('') + '</div>', true);
    $$('[data-tpl]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = T[+b.getAttribute('data-tpl')];
        if (doc.items.length && !confirm('Cargar "' + t.name + '" reemplazará el diagrama actual. ¿Continuar?')) return;
        var d = t.build();
        change(function () { doc.title = d.title; doc.items = d.items; doc.edges = d.edges; doc.view = d.view || 'flat'; doc.isoPalette = d.isoPalette || 'azul'; });
        sel.clear(); closeModal(); fit(); renderProps();
      });
    });
  }

  function lib() { try { return JSON.parse(localStorage.getItem(LS_LIB) || '[]'); } catch (e) { return []; } }
  function setLib(l) { try { localStorage.setItem(LS_LIB, JSON.stringify(l)); return true; } catch (e) { alert('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado). Usa "Descargar .json".'); return false; } }
  function openLibrary() {
    var L = lib();
    openModal('Abrir diagrama', '<h4>Guardados en este navegador</h4>' +
      (L.length ? '<ul class="lib">' + L.map(function (d, i) { return '<li><span><b>' + esc(d.name) + '</b><small>' + new Date(d.date).toLocaleString('es-PE') + ' · ' + d.doc.items.length + ' elementos</small></span><button class="btn" data-open="' + i + '">Abrir</button><button class="btn danger" data-del="' + i + '">Borrar</button></li>'; }).join('') + '</ul>' : '<p class="muted">Aún no guardaste diagramas en este navegador.</p>') +
      '<h4>Desde un archivo</h4><p class="muted">Abre un archivo <code>.json</code> exportado con esta app (por ejemplo, el que trajiste en un USB o descargaste de tu correo).</p><label class="btn primary filebtn">Elegir archivo .json<input type="file" id="file-in" accept=".json,application/json" hidden></label>');
    $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { var d = L[+b.getAttribute('data-open')]; loadDoc(d.doc); closeModal(); toast('Abierto: ' + d.name); }); });
    $$('[data-del]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-del'); if (!confirm('¿Borrar "' + L[i].name + '" de este navegador?')) return; L.splice(i, 1); setLib(L); openLibrary(); }); });
    $('#file-in').addEventListener('change', function (e) {
      var file = e.target.files[0]; if (!file) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var d = JSON.parse(rd.result); if (!d.items || !d.edges) throw new Error('formato'); loadDoc(d); closeModal(); toast('Abierto: ' + file.name); }
        catch (err) { alert('El archivo no es un diagrama válido de CiberArq Studio.'); }
      };
      rd.readAsText(file);
    });
  }
  function loadDoc(d) {
    change(function () { doc.title = d.title || 'Diagrama'; doc.items = clone(d.items); doc.edges = clone(d.edges); doc.view = d.view || 'flat'; doc.isoPalette = d.isoPalette || 'azul'; });
    sel.clear(); fit(); renderProps();
  }
  function openSave() {
    openModal('Guardar', '<div class="f"><label>Nombre</label><input type="text" id="save-name" value="' + esc(doc.title) + '"></div>' +
      '<div class="row"><button class="btn primary" id="save-local">Guardar en este navegador</button><button class="btn" id="save-file">Descargar .json</button></div>' +
      '<p class="hint">El trabajo también se guarda solo mientras editas (en este navegador). Descarga el <b>.json</b> si vas a abrirlo en otra computadora; luego lo cargas con <b>Abrir → Desde un archivo</b>.</p>');
    $('#save-name').focus(); $('#save-name').select();
    $('#save-local').addEventListener('click', function () {
      var name = $('#save-name').value.trim() || doc.title || 'Diagrama';
      var L = lib(), i = L.findIndex(function (d) { return d.name === name; });
      if (i >= 0 && !confirm('Ya existe "' + name + '". ¿Reemplazarlo?')) return;
      var entry = { name: name, date: Date.now(), doc: clone(doc) };
      if (i >= 0) L[i] = entry; else L.unshift(entry);
      if (setLib(L)) { closeModal(); toast('Guardado en el navegador: ' + name); }
    });
    $('#save-file').addEventListener('click', function () { downloadJSON($('#save-name').value.trim()); closeModal(); });
  }
  function slug(s) { return norm(s || 'diagrama').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'diagrama'; }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadJSON(name) { download(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }), slug(name || doc.title) + '.json'); }

  function exportSVGString() {
    layoutAll();
    var b = bounds(), pad = 24, x = Math.floor(b.x - pad), y = Math.floor(b.y - pad), w = Math.ceil(b.w + pad * 2), h = Math.ceil(b.h + pad * 2);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="' + x + ' ' + y + ' ' + w + ' ' + h + '" font-family="' + FONT + '">' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#ffffff"/>' + defsSvg().replace('</defs>', ISO.defs() + '</defs>') + renderContent(true) + '</svg>';
  }
  function exportPNG(scale) {
    if (!doc.items.length) return toast('El diagrama está vacío');
    var s = exportSVGString(), img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = img.width * scale; c.height = img.height * scale;
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      c.toBlob(function (blob) { download(blob, slug(doc.title) + '.png'); toast('PNG descargado'); }, 'image/png');
    };
    img.onerror = function () { alert('No se pudo generar la imagen. Prueba con SVG.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function openExport() {
    openModal('Exportar', '<div class="exp">' +
      '<button class="btn primary" data-exp="png2">Imagen PNG (alta resolución)</button>' +
      '<button class="btn" data-exp="png1">Imagen PNG (normal)</button>' +
      '<button class="btn" data-exp="svg">SVG (vectorial, editable)</button>' +
      '<button class="btn" data-exp="json">Archivo .json (para seguir editando)</button>' +
      '<button class="btn" data-exp="print">Imprimir / PDF</button></div>' +
      '<p class="hint">El PNG incluye solo el diagrama (sin cuadrícula ni selección), recortado a su contenido. Para el sustento de componentes usa el botón <b>Sustento</b>.</p>');
    $$('[data-exp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-exp'); closeModal();
        if (t === 'png2') exportPNG(2.5); else if (t === 'png1') exportPNG(1.25);
        else if (t === 'svg') download(new Blob([exportSVGString()], { type: 'image/svg+xml' }), slug(doc.title) + '.svg');
        else if (t === 'json') downloadJSON();
        else if (t === 'print') printDiagram();
      });
    });
  }
  function printDiagram() {
    var w = window.open('', '_blank');
    if (!w) return alert('Permite las ventanas emergentes para imprimir.');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(doc.title) + '</title><style>@page{size:landscape;margin:10mm}body{margin:0;font-family:Arial}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%;margin-top:16px;font-size:12px}td,th{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}th{background:#262626;color:#fff}</style></head><body>' + exportSVGString() + sustentoTableHTML() + '<script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }

  function sustentoNodes() {
    var nodes = doc.items.filter(function (i) { return i.kind === 'node' && (i.num || i.role === 'sol'); });
    return nodes.sort(function (a, b) {
      var na = parseFloat(a.num), nb = parseFloat(b.num);
      if (isNaN(na) && isNaN(nb)) return a.y - b.y || a.x - b.x;
      if (isNaN(na)) return 1; if (isNaN(nb)) return -1; return na - nb;
    });
  }
  function sustentoTableHTML() {
    var n = sustentoNodes(); if (!n.length) return '';
    return '<table><tr><th>#</th><th>Componente</th><th>Por qué se incluye</th><th>Atiende</th></tr>' + n.map(function (i) { return '<tr><td>' + esc(i.num) + '</td><td>' + esc(i.label) + '</td><td>' + esc(i.desc) + '</td><td>' + esc(i.rq) + '</td></tr>'; }).join('') + '</table>';
  }
  function openSustento() {
    var n = sustentoNodes();
    openModal('Sustento de cada componente', n.length ?
      '<p class="muted">Componentes rojos y/o numerados. Edita aquí el "por qué" y el requisito que atiende; se guarda en cada componente.</p>' +
      '<div class="row">' + '<button class="btn" id="st-number">Numerar automáticamente</button><button class="btn" id="st-copy">Copiar tabla (para Excel/Word)</button><button class="btn" id="st-csv">Descargar CSV</button><button class="btn primary" id="st-insert">Insertar en el diagrama</button></div>' +
      '<table class="st"><thead><tr><th>#</th><th>Componente</th><th>Por qué se incluye</th><th>Atiende</th></tr></thead><tbody>' +
      n.map(function (i) { return '<tr data-id="' + i.id + '"><td><input data-st="num" value="' + esc(i.num) + '"></td><td><b>' + esc(i.label) + '</b></td><td><textarea data-st="desc" rows="2">' + esc(i.desc) + '</textarea></td><td><input data-st="rq" value="' + esc(i.rq) + '" placeholder="RQ…"></td></tr>'; }).join('') + '</tbody></table>'
      : '<p class="muted">Aún no hay componentes de la solución (color rojo). Agrega controles al diagrama y vuelve aquí.</p>', true);
    if (!n.length) return;
    var before = null;
    $$('[data-st]').forEach(function (el) {
      el.addEventListener('focus', function () { before = snap(); });
      el.addEventListener('input', function () { var o = byId[el.closest('tr').getAttribute('data-id')]; o[el.getAttribute('data-st')] = el.value; render(); });
      el.addEventListener('blur', function () { if (before) { pushHist(before); before = null; } });
    });
    $('#st-number').addEventListener('click', function () { closeModal(); autoNumber(); openSustento(); });
    var rows = function () { return sustentoNodes().map(function (i) { return [i.num, i.label, i.desc, i.rq]; }); };
    $('#st-copy').addEventListener('click', function () {
      var t = [['#', 'Componente', 'Por qué se incluye', 'Atiende']].concat(rows()).map(function (r) { return r.map(function (c) { return String(c || '').replace(/[\t\n]/g, ' '); }).join('\t'); }).join('\n');
      copyText(t);
    });
    $('#st-csv').addEventListener('click', function () {
      var t = '﻿' + [['#', 'Componente', 'Por qué se incluye', 'Atiende']].concat(rows()).map(function (r) { return r.map(function (c) { return '"' + String(c || '').replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      download(new Blob([t], { type: 'text/csv;charset=utf-8' }), slug(doc.title) + '-sustento.csv');
    });
    $('#st-insert').addEventListener('click', function () {
      layoutAll(); var b = bounds();
      var txt = 'SUSTENTO DE CADA COMPONENTE\n' + sustentoNodes().map(function (i) { return (i.num ? i.num + ' · ' : '• ') + i.label + (i.desc ? ' — ' + i.desc : '') + (i.rq ? ' [' + i.rq + ']' : ''); }).join('\n');
      var it = { id: uid('t'), kind: 'text', variant: 'body', label: txt, x: snapv(b.x + b.w + 40), y: snapv(b.y + 10), w: 520, h: 40 };
      change(function () { doc.items.push(it); }); sel = new Set([it.id]); closeModal(); render(); renderProps();
      toast('Tabla insertada a la derecha del diagrama');
    });
  }
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { toast('Copiado: pega en Excel o Word'); }, fallback);
    else fallback();
    function fallback() { var x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); toast('Copiado'); } catch (e) { alert('No se pudo copiar'); } x.remove(); }
  }

  function openHelp() {
    openModal('Ayuda rápida', '<div class="help">' +
      '<div><h4>Construir</h4><ul><li><b>Arrastra</b> componentes desde la izquierda, o haz <b>clic</b> en uno para ponerlo al centro.</li><li><b>Doble clic en el fondo</b> o tecla <kbd>/</kbd>: buscar y agregar por nombre.</li><li><b>Zonas</b> (DMZ, VLAN, sede, cuenta cloud): se colocan detrás; al moverlas arrastran su contenido.</li><li>Usa <b>Plantillas</b> para partir de un patrón de arquitectura listo.</li><li>Botón <b>3D</b>: vista isométrica (objetos en perspectiva sobre el piso, tuberías y zonas proyectadas). Tu diagrama 2D no cambia; vuelve con <b>Tarjeta</b> o <b>Ícono</b>.</li></ul></div>' +
      '<div><h4>Conectar</h4><ul><li>Pasa el mouse sobre un componente y arrastra desde un <b>punto azul</b> hasta el destino.</li><li>Si sueltas en vacío, te propone crear un componente ya conectado.</li><li>O activa <b>Conectar</b> (<kbd>C</kbd>): clic en origen, clic en destino.</li><li>Elige el <b>tipo de línea</b> antes de conectar o cámbialo después en el panel derecho.</li></ul></div>' +
      '<div><h4>Editar</h4><ul><li><b>Doble clic</b> o <kbd>F2</kbd>: renombrar.</li><li>Panel derecho: color/rol, ícono, número, hallazgo y sustento.</li><li><kbd>Shift</kbd> + clic o <kbd>Shift</kbd> + arrastrar: seleccionar varios → alinear/distribuir.</li><li><kbd>Supr</kbd> borrar · <kbd>Ctrl+Z</kbd>/<kbd>Ctrl+Y</kbd> deshacer/rehacer · <kbd>Ctrl+C</kbd>/<kbd>Ctrl+V</kbd>/<kbd>Ctrl+D</kbd> copiar/pegar/duplicar · flechas mueven.</li></ul></div>' +
      '<div><h4>Navegar</h4><ul><li>Arrastra el fondo (o <kbd>Espacio</kbd>/clic derecho + arrastrar) para moverte.</li><li><kbd>Ctrl</kbd> + rueda (o pellizco en touchpad): zoom · <kbd>0</kbd>: ajustar a la pantalla.</li></ul></div>' +
      '<div class="wide"><h4>Convención de colores</h4><ul class="legend-help">' +
      Object.keys(ROLES).map(function (k) { return '<li><span style="background:' + ROLES[k].fill + ';border-color:' + ROLES[k].stroke + '"></span>' + esc(ROLES[k].name) + '</li>'; }).join('') +
      '</ul><p class="muted">Método sugerido: activos → amenazas/vulnerabilidades → riesgos (P×I) → requisitos → <b>diagrama numerado + sustento</b> → vista espejo (flujos paso a paso con la propiedad <i>Paso del flujo</i> de cada conexión).</p></div>' +
      '<div class="wide"><h4>Guardar tu trabajo</h4><p class="muted">Se guarda solo en este navegador mientras editas. Para no perderlo: <b>Guardar → Descargar .json</b> y, al terminar, <b>Exportar → PNG</b>.</p></div></div>', true);
  }

  var toastTimer;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2200); }

  /* ------------------------------------------------------------------ init */
  buildPalette();
  syncToolbar();
  setHint('');
  try {
    var saved = JSON.parse(localStorage.getItem(LS_AUTO) || 'null');
    if (saved && saved.items) { doc = saved; }
  } catch (e) { }
  // Enlaces directos: ?tpl=N abre una plantilla (si no hay trabajo sin guardar, o con &force=1); ?clean=1 oculta los paneles.
  var params = new URLSearchParams(location.search);
  if (params.get('clean') === '1') document.body.classList.add('hide-palette', 'hide-props');
  var tplN = parseInt(params.get('tpl'), 10), TPL = window.TEMPLATES || [];
  if (!isNaN(tplN) && TPL[tplN - 1] && (!doc.items.length || params.get('force') === '1' || confirm('¿Abrir la plantilla "' + TPL[tplN - 1].name + '"? Reemplazará el diagrama actual.'))) {
    var td = TPL[tplN - 1].build();
    doc = { version: 1, title: td.title, view: td.view || 'flat', isoPalette: td.isoPalette || 'azul', items: td.items, edges: td.edges };
    if (params.get('view') === '3d' && doc.view !== 'iso') applyView('iso');
    if (params.get('view') === '2d' && doc.view === 'iso') applyView('flat');
  }
  afterChange();
  render(); renderProps();
  if (doc.items.length) fit();

  window.CiberArq = { get doc() { return doc; }, render: render, fit: fit };
})();
