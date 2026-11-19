/* Motor de vista isométrica 3D para CiberArq Studio.
 * Proyección isométrica verdadera (30°): el "piso" del diagrama se proyecta y
 * cada componente se dibuja como un objeto 3D de pie sobre una plataforma. */
(function () {
  'use strict';
  var C = Math.cos(Math.PI / 6), S = 0.5;
  var ICONS = window.ICONS, CI = window.CATALOG_INDEX;

  function r1(v) { return Math.round(v * 10) / 10; }
  function P(x, y) { return { x: (x - y) * C, y: (x + y) * S }; }
  function inv(X, Y) { var a = X / C, b = Y / S; return { x: (a + b) / 2, y: (b - a) / 2 }; }
  var MATRIX = 'matrix(' + C + ',' + S + ',' + (-C) + ',' + S + ',0,0)';

  /* Paletas: "azul" imita el estilo de los diagramas isométricos de red;
   * "clasica" usa rojo y negro (negro = activo). El rojo
   * (componente de la solución) y el ámbar (solo detección) se mantienen en ambas. */
  var BASE = {
    sol: { light: '#FF8F87', mid: '#E2231A', dark: '#A3150F', face: '#FFF1F0', ink: '#B3141A' },
    detect: { light: '#F7C470', mid: '#C77F14', dark: '#8A5308', face: '#FFF7EA', ink: '#8A5308' },
    neutral: { light: '#FFFFFF', mid: '#DDE1E7', dark: '#AEB5BF', face: '#FFFFFF', ink: '#3A404B' }
  };
  var PALETTES = {
    azul: {
      asset: { light: '#9AA2FF', mid: '#5A63E6', dark: '#363DB0', face: '#F1F2FF', ink: '#363DB0' },
      exist: { light: '#DCE8F3', mid: '#A9BCCF', dark: '#7B8FA6', face: '#FAFCFE', ink: '#4D6075' },
      info: { light: '#8ADBFF', mid: '#2BA3E8', dark: '#1272B5', face: '#ECF8FF', ink: '#1272B5' }
    },
    clasica: {
      asset: { light: '#7D8699', mid: '#434A58', dark: '#262A33', face: '#F3F5F8', ink: '#262A33' },
      exist: { light: '#D5D9DE', mid: '#A3A9B1', dark: '#727882', face: '#FBFBFC', ink: '#5E646D' },
      info: { light: '#86BDF5', mid: '#2F74C9', dark: '#1A4C8C', face: '#EEF5FE', ink: '#1A4C8C' }
    }
  };
  var ROLES = ['sol', 'asset', 'exist', 'detect', 'info', 'neutral'];
  function colors(role, pal) {
    var p = PALETTES[pal] || PALETTES.azul;
    return p[role] || BASE[role] || BASE.sol;
  }
  var PLAT = { top: 'url(#isoPlatTop)', left: '#63C6F6', right: '#2F9EDC' };

  /* ---------------------------------------------------------- primitivas */
  var minY = 0;
  function track(y) { if (y < minY) minY = y; }
  function poly(pts, fill, stroke) {
    pts.forEach(function (p) { track(p.y); });
    return '<polygon points="' + pts.map(function (p) { return r1(p.x) + ',' + r1(p.y); }).join(' ') + '" fill="' + fill + '" stroke="' + (stroke || 'rgba(20,30,60,.18)') + '" stroke-width="0.7" stroke-linejoin="round"/>';
  }
  function up(p, z) { return { x: p.x, y: p.y - z }; }
  // Caja con huella a (eje x) × b (eje y) centrada en (ox, oy), desde z0 hasta z0 + h.
  function box(ox, oy, a, b, z0, h, c) {
    var A = P(ox - a / 2, oy - b / 2), B = P(ox + a / 2, oy - b / 2), Cc = P(ox + a / 2, oy + b / 2), D = P(ox - a / 2, oy + b / 2), zt = z0 + h;
    return poly([up(D, z0), up(Cc, z0), up(Cc, zt), up(D, zt)], c.left) +
      poly([up(Cc, z0), up(B, z0), up(B, zt), up(Cc, zt)], c.right) +
      poly([up(A, zt), up(B, zt), up(Cc, zt), up(D, zt)], c.top);
  }
  // Matriz que pinta un ícono (24×24) sobre una cara de la caja.
  function faceMatrix(face, ox, oy, a, b, zc, k) {
    var q, m;
    if (face === 'top') { q = up(P(ox, oy), zc); m = [k * C, k * S, -k * C, k * S]; }
    else if (face === 'left') { q = up(P(ox, oy + b / 2), zc); m = [k * C, k * S, 0, k]; }
    else { q = up(P(ox + a / 2, oy), zc); m = [k * C, -k * S, 0, k]; }
    return 'matrix(' + m.map(r1x).join(',') + ',' + r1(q.x) + ',' + r1(q.y) + ') translate(-12,-12)';
  }
  function r1x(v) { return Math.round(v * 1000) / 1000; }
  function icon(name, transform, color, sw) {
    var inner = ICONS[name];
    if (!inner) return '';
    return '<g transform="' + transform + '" fill="none" stroke="' + color + '" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g>';
  }

  /* ------------------------------------------------- tipo de objeto 3D */
  var SETS = {
    wall: ['brick-wall', 'flame'],
    cylinder: ['database', 'database-backup'],
    stack: ['server', 'hard-drive', 'container', 'warehouse', 'archive', 'folder', 'landmark', 'store', 'boxes', 'folder-git-2', 'square-function', 'briefcase'],
    cube: ['id-card', 'book-user', 'scale', 'gavel', 'clipboard-check', 'vault', 'key', 'key-round', 'microchip', 'lock-keyhole', 'lock', 'user-check', 'list-tree', 'tags', 'file-key', 'user-round-check', 'hammer', 'key-square'],
    network: ['router', 'network', 'wifi', 'route', 'split', 'cable', 'arrow-left-right', 'git-merge', 'plug', 'signpost-big', 'zap', 'link', 'link-2'],
    tower: ['shield-alert', 'radar', 'scan-search', 'scan-eye', 'door-open', 'chart-line', 'shield-half', 'search-check', 'shield-ellipsis', 'workflow', 'server-cog', 'globe-lock', 'shield-ban', 'list-checks', 'refresh-cw', 'bell-ring', 'monitor', 'shield-plus', 'eye'],
    cloud: ['cloud', 'cloud-cog', 'globe', 'cloud-upload']
  };
  var WALL_IDS = { 'f-ngfw': 1, 'f-waf': 1, 'f-wafcdn': 1, 'a-wafbot': 1, 'z-fwaas': 1, 'e-hfw': 1, 'f-packet': 1, 'f-sg': 1 };
  function shapeFor(it) {
    var c = CI[it.ref] || {};
    if (c.iso) return c.iso;
    if (WALL_IDS[it.ref]) return 'wall';
    if (it.ref && it.ref.indexOf('u-') === 0) return 'person';
    var ic = it.icon || '';
    for (var k in SETS) if (SETS[k].indexOf(ic) >= 0) return k;
    return 'card';
  }

  function flame(x, base, h, grad) {
    var y = base - h;
    track(y);
    return '<path d="M' + x + ',' + base + ' C' + (x - 12) + ',' + (base - h * 0.35) + ' ' + (x - 7) + ',' + (base - h * 0.72) + ' ' + x + ',' + y +
      ' C' + (x + 3) + ',' + (base - h * 0.62) + ' ' + (x + 13) + ',' + (base - h * 0.45) + ' ' + (x + 8) + ',' + base + ' Z" fill="url(#' + grad + ')" opacity="0.92"/>';
  }

  function disc(z, rx, ry, hh, c, role, pal) {
    var yb = -z, yt = -(z + hh);
    track(yt - ry);
    return '<path d="M' + (-rx) + ',' + yb + ' A' + rx + ',' + ry + ' 0 0 0 ' + rx + ',' + yb + ' L' + rx + ',' + yt + ' A' + rx + ',' + ry + ' 0 0 1 ' + (-rx) + ',' + yt + ' Z" fill="url(#isoCyl-' + pal + '-' + role + ')" stroke="' + c.dark + '" stroke-width="0.7"/>' +
      '<ellipse cx="0" cy="' + yt + '" rx="' + rx + '" ry="' + ry + '" fill="' + c.light + '" stroke="' + c.dark + '" stroke-width="0.7"/>';
  }

  /* Devuelve { svg, top } — top = coordenada y más alta (negativa) del objeto. */
  function object(it, pal) {
    var role = it.role && colors(it.role, pal) ? it.role : 'sol';
    var c = colors(role, pal), shape = shapeFor(it), s = '', i;
    minY = -10;
    var shade = '<ellipse cx="0" cy="3" rx="34" ry="13" fill="rgba(10,40,90,.13)"/>';
    switch (shape) {
      case 'stack':
        s += shade;
        for (i = 0; i < 3; i++) {
          var z = i * 16;
          s += box(0, 0, 46, 46, z, 12, { top: c.light, left: c.mid, right: c.dark });
          var l1 = up(P(23, 6), z + 6), l2 = up(P(23, 12), z + 6);
          s += '<circle cx="' + r1(l1.x) + '" cy="' + r1(l1.y) + '" r="1.7" fill="#7CFFB2"/><circle cx="' + r1(l2.x) + '" cy="' + r1(l2.y) + '" r="1.7" fill="#7CFFB2"/>';
          var a1 = up(P(-16, 23), z + 6), a2 = up(P(6, 23), z + 6);
          s += '<line x1="' + r1(a1.x) + '" y1="' + r1(a1.y) + '" x2="' + r1(a2.x) + '" y2="' + r1(a2.y) + '" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-linecap="round"/>';
        }
        s += icon(it.icon, faceMatrix('top', 0, 0, 46, 46, 44, 1.15), '#FFFFFF', 2.2);
        break;
      case 'cube':
        s += shade + box(0, 0, 42, 42, 0, 42, { top: c.light, left: c.mid, right: c.dark });
        s += icon(it.icon, faceMatrix('left', 0, 0, 42, 42, 21, 1.15), '#FFFFFF', 2.1);
        s += icon(it.icon, faceMatrix('top', 0, 0, 42, 42, 42, 1.0), c.dark, 2);
        break;
      case 'tower':
        s += shade + box(0, 0, 30, 44, 0, 64, { top: c.light, left: c.mid, right: c.dark });
        s += icon(it.icon, faceMatrix('right', 0, 0, 30, 44, 42, 1.05), '#FFFFFF', 2.1);
        for (i = 0; i < 3; i++) {
          var t1 = up(P(15, -12), 12 + i * 6), t2 = up(P(15, 12), 12 + i * 6);
          s += '<line x1="' + r1(t1.x) + '" y1="' + r1(t1.y) + '" x2="' + r1(t2.x) + '" y2="' + r1(t2.y) + '" stroke="rgba(255,255,255,.45)" stroke-width="1.4" stroke-linecap="round"/>';
        }
        break;
      case 'network':
        s += shade + box(0, 0, 56, 56, 0, 15, { top: c.light, left: c.mid, right: c.dark });
        for (i = 0; i < 6; i++) { var pp = up(P(-20 + i * 8, 28), 7); s += '<rect x="' + r1(pp.x - 2) + '" y="' + r1(pp.y - 2) + '" width="4" height="4" rx="1" fill="#9BF6C7"/>'; }
        s += icon(it.icon, faceMatrix('top', 0, 0, 56, 56, 15, 1.35), '#FFFFFF', 2.2);
        break;
      case 'cylinder':
        s += shade;
        for (i = 0; i < 3; i++) s += disc(i * 15, 33, 19, 11, c, role, pal);
        s += '<g transform="translate(0,' + (-41) + ') scale(1,0.58)">' + icon(it.icon, 'translate(-11,-11) scale(0.92)', c.dark, 2.2) + '</g>';
        break;
      case 'wall':
        var fl = role === 'sol' ? 'isoFlameRed' : 'isoFlameBlue';
        s += flame(-17, -12, 34, fl) + flame(-1, -16, 46, fl) + flame(15, -12, 36, fl);
        s += box(0, 0, 62, 14, 0, 30, { top: '#F7DED2', left: 'url(#isoBrick)', right: '#D9876E' });
        var o = up(P(-31, 7), 30), m = 'matrix(' + r1x(C) + ',' + r1x(S) + ',0,1,' + r1(o.x) + ',' + r1(o.y) + ')', br = '';
        br += '<line x1="0" y1="10" x2="62" y2="10"/><line x1="0" y1="20" x2="62" y2="20"/>';
        [15.5, 31, 46.5].forEach(function (u) { br += '<line x1="' + u + '" y1="0" x2="' + u + '" y2="10"/><line x1="' + u + '" y1="20" x2="' + u + '" y2="30"/>'; });
        [7.75, 23.25, 38.75, 54.25].forEach(function (u) { br += '<line x1="' + u + '" y1="10" x2="' + u + '" y2="20"/>'; });
        s += '<g transform="' + m + '" stroke="#B94A35" stroke-width="1.1" opacity="0.8">' + br + '</g>';
        break;
      case 'person':
        var att = it.ref === 'u-attacker';
        var body = att ? '#2B2B2B' : c.mid, dk = att ? '#111' : c.dark, head = att ? '#3A3A3A' : c.light;
        s += shade;
        s += '<path d="M-16,2 L-16,-20 Q-16,-35 0,-35 Q16,-35 16,-20 L16,2 Z" fill="' + body + '" stroke="' + dk + '" stroke-width="0.8"/>';
        s += '<path d="M0,-35 Q16,-35 16,-20 L16,2 L0,2 Z" fill="' + dk + '" opacity="0.35"/>';
        if (att) {
          s += '<path d="M-13,-38 Q-13,-60 0,-60 Q13,-60 13,-38 Q0,-33 -13,-38 Z" fill="' + head + '" stroke="#111" stroke-width="0.8"/>';
          s += '<ellipse cx="0" cy="-44" rx="7" ry="6" fill="#0A0A0A"/><circle cx="-2.6" cy="-45" r="1.4" fill="#FF3B30"/><circle cx="2.6" cy="-45" r="1.4" fill="#FF3B30"/>';
        } else {
          s += '<circle cx="0" cy="-45" r="10" fill="' + head + '" stroke="' + dk + '" stroke-width="0.8"/>';
        }
        track(-60);
        break;
      case 'cloud':
        s += shade;
        s += '<path d="M-30,-22 C-42,-22 -42,-42 -28,-42 C-28,-58 -6,-62 2,-50 C8,-60 30,-56 28,-40 C42,-40 42,-22 30,-22 Z" fill="url(#isoFace-' + pal + '-' + role + ')" stroke="' + c.mid + '" stroke-width="1.8" stroke-linejoin="round"/>';
        s += icon(it.icon, 'translate(-11,-46) scale(0.92)', c.ink, 2.2);
        track(-62);
        break;
      default: // tarjeta vertical con el ícono en la cara frontal
        s += shade + box(0, 4, 44, 7, 0, 58, { top: c.light, left: 'url(#isoFace-' + pal + '-' + role + ')', right: c.mid });
        var e1 = up(P(-22, 7.5), 0), e2 = up(P(22, 7.5), 0), e3 = up(P(22, 7.5), 58), e4 = up(P(-22, 7.5), 58);
        s += '<polygon points="' + [e1, e2, e3, e4].map(function (p) { return r1(p.x) + ',' + r1(p.y); }).join(' ') + '" fill="none" stroke="' + c.mid + '" stroke-width="1.6" stroke-linejoin="round"/>';
        s += icon(it.icon, faceMatrix('left', 0, 4, 44, 7, 29, 1.25), c.ink, 2.1);
    }
    return { svg: s, top: Math.round(minY), shape: shape };
  }

  function platform() {
    return box(0, 0, 64, 64, -9, 9, PLAT);
  }

  function defs() {
    var s = '<linearGradient id="isoPlatTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C4E9FF"/></linearGradient>';
    s += '<linearGradient id="isoBrick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE5DA"/><stop offset="1" stop-color="#EDB7A3"/></linearGradient>';
    s += '<linearGradient id="isoFlameRed" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E2231A"/><stop offset="0.6" stop-color="#FF7A2E"/><stop offset="1" stop-color="#FFD166"/></linearGradient>';
    s += '<linearGradient id="isoFlameBlue" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1E4FD8"/><stop offset="0.6" stop-color="#3D8BFF"/><stop offset="1" stop-color="#A8ECFF"/></linearGradient>';
    Object.keys(PALETTES).forEach(function (pal) {
      ROLES.forEach(function (r) {
        var c = colors(r, pal);
        s += '<linearGradient id="isoFace-' + pal + '-' + r + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="' + c.face + '"/></linearGradient>';
        s += '<linearGradient id="isoCyl-' + pal + '-' + r + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + c.light + '"/><stop offset="0.45" stop-color="' + c.mid + '"/><stop offset="1" stop-color="' + c.dark + '"/></linearGradient>';
      });
    });
    return s;
  }

  // Miniatura para la paleta.
  function thumb(ci, pal) {
    var it = { ref: ci.id, role: ci.role || 'sol', icon: ci.icon };
    return '<svg viewBox="-64 -92 128 138" width="34" height="37" aria-hidden="true">' + platform() + object(it, pal).svg + '</svg>';
  }

  window.ISO = { P: P, inv: inv, MATRIX: MATRIX, object: object, platform: platform, defs: defs, thumb: thumb, colors: colors, shapeFor: shapeFor };
})();
