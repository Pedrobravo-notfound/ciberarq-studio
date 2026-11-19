/* Plantillas: patrones genéricos de arquitectura de seguridad para empezar rápido. */
(function () {
  'use strict';
  var CI = window.CATALOG_INDEX;

  function N(ref, x, y, o) {
    var c = CI[ref] || {};
    var it = { id: '', kind: 'node', ref: ref, label: c.label, sub: c.sub || '', icon: c.icon, role: c.role || 'sol', style: 'card', shape: c.shape || 'rect', num: '', hall: '', desc: c.tip || '', rq: '', x: x, y: y, w: 190, h: 48 };
    if (c.shape) { it.h = 56; if (c.shape === 'dfd-process') it.w = 170; }
    o = o || {};
    if (o.style === 'icon' && !o.w) it.w = 120;
    return Object.assign(it, o);
  }
  function Z(label, variant, x, y, w, h, o) { return Object.assign({ id: '', kind: 'zone', label: label, variant: variant, x: x, y: y, w: w, h: h }, o || {}); }
  function T(label, variant, x, y, w, o) { return Object.assign({ id: '', kind: 'text', label: label, variant: variant, x: x, y: y, w: w || 300, h: 30 }, o || {}); }
  function LG(x, y) { return { id: '', kind: 'legend', label: 'Leyenda', x: x, y: y, w: 520, h: 100 }; }
  function E(from, to, kind, o) { return Object.assign({ id: '', from: from, to: to, kind: kind || 'traffic', route: 'auto', arrow: '', label: '', step: '' }, o || {}); }
  function build(title, items, edges) {
    var c = 0;
    items.forEach(function (it) { if (!it.id) it.id = it.kind.charAt(0) + 'a' + (++c); });
    edges.forEach(function (e, i) { e.id = 'ea' + (i + 1); });
    return { title: title, items: items, edges: edges };
  }

  var TEMPLATES = [];
  function add(name, tag, desc, fn) { TEMPLATES.push({ name: name, tag: tag, desc: desc, build: fn }); }

  /* 1 ─ Perímetro en 3 capas */
  add('Arquitectura perimetral en 3 capas (DMZ)', 'Red', 'Internet → router de borde → firewall → DMZ y red interna segmentada por VLANs.', function () {
    return build('Arquitectura perimetral en 3 capas', [
      T('ARQUITECTURA DE REFERENCIA · RED', 'kicker', 40, 20, 600),
      T('Arquitectura de seguridad perimetral en 3 capas', 'title', 40, 42, 820),
      N('n-internet', 40, 150, { id: 'inet', w: 170 }),
      N('n-isp', 250, 150, { id: 'isp' }),
      N('f-perimeter', 480, 150, { id: 'fw', num: '1' }),
      Z('DMZ', 'red', 450, 250, 250, 110),
      N('a-web', 480, 290, { id: 'web', label: 'Servidor web / API pública' }),
      N('n-l3', 750, 150, { id: 'l3', label: 'Switch multicapa (L3)', num: '2', desc: 'Enruta entre VLANs con ACLs: punto de control entre segmentos.' }),
      Z('RED INTERNA (VLANs)', 'gray', 1000, 100, 250, 330),
      N('d-pc', 1030, 140, { id: 'v10', label: 'VLAN 10 · Administración', icon: 'users' }),
      N('d-scada', 1030, 210, { id: 'v20', label: 'VLAN 20 · Operaciones' }),
      N('d-server', 1030, 280, { id: 'v30', label: 'VLAN 30 · Servidores internos' }),
      N('n-ap', 1030, 350, { id: 'v99', label: 'VLAN 99 · Invitados', role: 'exist' }),
      T('Entre cada capa hay un punto de control obligatorio: ningún tráfico pasa directo de Internet a la red interna.', 'note', 40, 460, 640),
      T('Permitido: Internet → DMZ (solo los puertos del servicio publicado) · DMZ → interna (solo consultas específicas, ej. a la BD).\nProhibido: interna → Internet sin pasar por proxy/firewall · DMZ → interna sin restricción.', 'alert', 40, 550, 640),
      LG(720, 460)
    ], [
      E('inet', 'isp', 'wan'), E('isp', 'fw'), E('fw', 'web', 'traffic', { label: 'solo 443' }), E('fw', 'l3'),
      E('l3', 'v10', 'link'), E('l3', 'v20', 'link'), E('l3', 'v30', 'link'), E('l3', 'v99', 'link')
    ]);
  });

  /* 2 ─ Screened subnet */
  add('Doble firewall + IPS en línea (screened subnet)', 'Red', 'Firewall externo, IPS, DMZ, firewall interno y LAN, con monitoreo en el SIEM.', function () {
    return build('Screened subnet: doble firewall + IPS', [
      T('ALTERNATIVA DE DISEÑO · DMZ', 'kicker', 40, 20, 600),
      T('Doble firewall con IPS en línea (screened subnet)', 'title', 40, 42, 900),
      N('n-internet', 40, 150, { id: 'inet', w: 150 }),
      N('f-ext', 230, 150, { id: 'fwe', num: '1', w: 180 }),
      N('f-ips', 450, 150, { id: 'ips', num: '2', w: 170, sub: 'inspección en línea' }),
      Z('DMZ', 'red', 660, 115, 210, 115),
      N('d-server', 675, 150, { id: 'dmz', label: 'Servidor público', w: 180 }),
      N('f-int', 910, 150, { id: 'fwi', num: '3', w: 180, sub: '2ª línea de control' }),
      Z('LAN INTERNA', 'gray', 1130, 100, 230, 170),
      N('u-user', 1150, 140, { id: 'users', label: 'Usuarios' }),
      N('d-server', 1150, 205, { id: 'srv', label: 'Servidores internos' }),
      N('m-siem', 450, 300, { id: 'siem', num: '4', w: 170 }),
      T('Doble punto de control: vulnerar el firewall externo no da acceso directo a la LAN interna. Idealmente, firewalls de distinto fabricante. El IPS bloquea exploits y escaneos antes de llegar al servidor de la DMZ. Mayor costo y complejidad: dos firewalls y el IPS se mantienen por separado.', 'note', 40, 400, 700),
      T('Variante económica (three-legged): un único firewall con 3 interfaces (Internet, DMZ y LAN), pero es el único punto de falla.', 'alert', 780, 400, 420),
      LG(40, 520)
    ], [
      E('inet', 'fwe'), E('fwe', 'ips'), E('ips', 'dmz'), E('dmz', 'fwi', 'traffic', { label: 'solo consultas' }), E('fwi', 'users'), E('fwi', 'srv'),
      E('fwe', 'siem', 'telemetry'), E('ips', 'siem', 'telemetry'), E('fwi', 'siem', 'telemetry')
    ]);
  });

  /* 3 ─ Zero Trust de referencia */
  add('Arquitectura de referencia Zero Trust', 'Zero Trust', 'Sujetos → PEP ↔ PDP → zonas micro-segmentadas, con monitoreo continuo.', function () {
    return build('Arquitectura de referencia Zero Trust', [
      T('ARQUITECTURA DE REFERENCIA · ZERO TRUST', 'kicker', 40, 20, 600),
      T('Arquitectura de referencia Zero Trust (NIST SP 800-207)', 'title', 40, 42, 900),
      Z('SUJETOS', 'gray', 40, 100, 230, 260),
      N('u-remote', 60, 140, { id: 's1', label: 'Empleado remoto' }),
      N('d-laptop', 60, 210, { id: 's2', label: 'Dispositivo corporativo', sub: '' }),
      N('u-partner', 60, 280, { id: 's3' }),
      N('z-pdp', 340, 100, { id: 'pdp', label: 'Motor de decisión (PDP)', w: 240, num: '2', sub: 'Evalúa política y señales de riesgo' }),
      N('z-pep', 340, 220, { id: 'pep', label: 'Punto de aplicación (PEP)', w: 240, num: '1', sub: 'Permite, bloquea o monitorea' }),
      T('Verificación de identidad y contexto: MFA · postura del dispositivo · comportamiento', 'body', 40, 375, 230),
      Z('RECURSOS · MICRO-SEGMENTADOS', 'gray', 660, 100, 280, 270),
      N('b-erp', 680, 140, { id: 'r1', label: 'Zona: Apps críticas', icon: 'app-window', w: 240, sub: 'Micro-segmentada' }),
      N('b-db', 680, 215, { id: 'r2', label: 'Zona: Datos sensibles', w: 240, sub: 'Micro-segmentada' }),
      N('d-server', 680, 290, { id: 'r3', label: 'Zona: Servicios internos', w: 240, sub: 'Micro-segmentada' }),
      N('m-soc', 340, 420, { id: 'soc', label: 'Monitoreo continuo (SOC / SIEM)', w: 600, num: '3', sub: 'Reevalúa el riesgo de forma permanente' }),
      LG(40, 530),
      T('Cada solicitud pasa por el PEP, que consulta al PDP. Ninguna conexión se confía por su ubicación: la decisión se reevalúa continuamente.', 'note', 600, 530, 340)
    ], [
      E('s1', 'pep'), E('s2', 'pep'), E('s3', 'pep'),
      E('pep', 'pdp', 'control', { arrow: 'both', label: 'consulta' }),
      E('pep', 'r1'), E('pep', 'r2'), E('pep', 'r3'),
      E('pep', 'soc', 'telemetry'),
      E('soc', 'pdp', 'policy', { route: 'vh', label: 'realimentación continua' })
    ]);
  });

  /* 4 ─ Componentes lógicos Zero Trust */
  add('Componentes lógicos Zero Trust (PE, PA, PEP)', 'Zero Trust', 'Plano de control (PE + PA = PDP), plano de datos (sujeto → PEP → recurso) y fuentes de información para la decisión.', function () {
    var S = function (ref, x, o) { return N(ref, x, 140, Object.assign({ role: 'exist', w: 150 }, o || {})); };
    return build('Componentes lógicos Zero Trust', [
      T('NIST SP 800-207 · COMPONENTES LÓGICOS', 'kicker', 40, 20, 700),
      T('Componentes lógicos de una arquitectura Zero Trust', 'title', 40, 42, 900),
      Z('FUENTES DE INFORMACIÓN PARA LA DECISIÓN', 'gray', 40, 100, 1130, 125, { id: 'srcz' }),
      S('i-idp', 55, { label: 'Identidad (IdP / IAM + MFA)' }), S('e-uem', 213, { label: 'Postura del dispositivo (MDM/EDR)' }), S('z-ti', 371), S('m-siem', 529, { label: 'Registros y SIEM' }),
      S('p-class', 687, { label: 'Políticas de acceso a datos' }), S('z-pki', 845), S('z-compliance', 1003),
      Z('PLANO DE CONTROL · PDP', 'blue', 380, 255, 420, 150),
      N('z-pe', 400, 295, { id: 'pe', w: 180, num: '1', sub: 'decide' }),
      N('z-pa', 600, 295, { id: 'pa', w: 180, num: '2', sub: 'ejecuta la decisión' }),
      Z('PLANO DE DATOS', 'gray', 40, 445, 1130, 160),
      Z('Zona no confiable', 'amber', 60, 480, 270, 105),
      N('u-user', 90, 515, { id: 'subj', label: 'Sujeto (usuario + dispositivo)', w: 210 }),
      N('z-pep', 490, 515, { id: 'pep', w: 210, num: '3', sub: 'habilita y corta la conexión' }),
      Z('Zona de confianza implícita', 'green', 860, 480, 290, 105),
      N('d-server', 890, 515, { id: 'res', label: 'Recurso empresarial', w: 220 }),
      T('PE decide (conceder, denegar, revocar) · PA ejecuta: crea el token/sesión y ordena al PEP · PEP habilita, monitorea y termina la conexión. Si no hay una decisión explícita de permitir, el PEP deniega.', 'note', 40, 640, 620),
      LG(700, 640)
    ], [
      E('srcz', 'pe', 'policy'),
      E('pe', 'pa', 'control', { label: 'decisión' }),
      E('pa', 'pep', 'control', { label: 'canal de control' }),
      E('subj', 'pep'), E('pep', 'res')
    ]);
  });

  /* 5 ─ Entorno empresarial en 3D (vista isométrica) */
  add('Entorno empresarial en 3D: DMZ y red interna', '3D', 'Vista isométrica: atacante → firewall → DMZ (web, correo, Windows, Linux, aplicaciones) → firewall interno → AD, controladores de dominio y base de datos.', function () {
    // NI: componente centrado en (cx, cy) del piso.
    var NI = function (ref, cx, cy, o) { return N(ref, cx - 95, cy - 24, o); };
    var d = build('Entorno empresarial en 3D: DMZ y red interna', [
      T('SIMULACIÓN DE ATAQUE · VISTA ISOMÉTRICA', 'kicker', -590, 450, 520),
      T('Entorno empresarial: DMZ y red interna', 'title', -560, 480, 640),
      Z('ENTORNO EMPRESARIAL', 'red', 0, 0, 1000, 960),
      Z('ZONA MILITARIZADA · RED INTERNA', 'blue', 340, 40, 620, 380),
      Z('ZONA DESMILITARIZADA (DMZ)', 'blue', 40, 480, 620, 440),
      NI('b-websrv', 240, 590, { id: 'web' }),
      NI('b-mailsrv', 440, 590, { id: 'mail' }),
      NI('d-windows', 120, 760, { id: 'win', label: 'Windows' }),
      NI('d-linux', 360, 800, { id: 'lin', label: 'Linux' }),
      NI('b-appsrv', 560, 740, { id: 'app' }),
      NI('f-int', 560, 450, { id: 'fwi', label: 'Firewall interno', num: '2' }),
      NI('i-ad', 440, 320, { id: 'ad' }),
      NI('i-dc', 640, 230, { id: 'dc' }),
      NI('i-childdc', 560, 100, { id: 'cdc' }),
      NI('b-dbsrv', 860, 280, { id: 'db' }),
      NI('f-perimeter', 240, 960, { id: 'fwe', num: '1' }),
      NI('u-attacker', 240, 1130, { id: 'att', label: 'Atacante (Red Team)' }),
      T('Ruta del ataque (tubería roja): Internet → firewall perimetral → DMZ → firewall interno → controlador de dominio. Cada salto atraviesa un punto de control: defensa en profundidad.', 'note', 280, 1320, 520),
      LG(1120, 680)
    ], [
      E('att', 'fwe', 'data', { label: 'Internet' }),
      E('fwe', 'web', 'data'),
      E('app', 'fwi', 'data'),
      E('fwi', 'dc', 'data'),
      E('ad', 'dc', 'traffic'),
      E('cdc', 'dc', 'traffic'),
      E('dc', 'db', 'traffic')
    ]);
    d.view = 'iso'; d.isoPalette = 'azul';
    return d;
  });

  window.TEMPLATES = TEMPLATES;
})();
