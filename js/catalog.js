/*
 * Catálogo de componentes de arquitectura de ciberseguridad.
 *
 * role:  sol    = Componente de la solución (rojo, se numera)
 *        asset  = Activo protegido o usuario (negro)
 *        exist  = Existente / tercero / proveedor (gris)
 *        detect = Solo detección (ámbar)
 *        neutral= Neutro (blanco con borde)
 *        info   = Red / nube (azul)
 * s:     subtítulo de la categoría
 * tip:   para qué sirve / dónde va (se usa como "sustento" por defecto)
 */
window.ROLES = {
  sol:     { name: 'Componente de la solución', fill: '#E2231A', stroke: '#E2231A', text: '#ffffff', sub: '#E2231A' },
  asset:   { name: 'Activo protegido o usuario', fill: '#262626', stroke: '#262626', text: '#ffffff', sub: '#262626' },
  exist:   { name: 'Existente, tercero o proveedor', fill: '#8C8C8C', stroke: '#8C8C8C', text: '#ffffff', sub: '#6b6b6b' },
  detect:  { name: 'Solo detección', fill: '#B5700E', stroke: '#B5700E', text: '#ffffff', sub: '#B5700E' },
  info:    { name: 'Red / nube / conectividad', fill: '#1F5FAD', stroke: '#1F5FAD', text: '#ffffff', sub: '#1F5FAD' },
  neutral: { name: 'Neutro', fill: '#ffffff', stroke: '#262626', text: '#262626', sub: '#262626' }
};

window.EDGE_KINDS = {
  traffic:   { name: 'Tráfico de acceso', color: '#262626', dash: '', width: 1.8, arrow: 'end' },
  policy:    { name: 'Política, llave o consulta de postura', color: '#262626', dash: '6 4', width: 1.6, arrow: 'end' },
  telemetry: { name: 'Registros / telemetría al SIEM', color: '#E2231A', dash: '6 4', width: 1.6, arrow: 'end' },
  data:      { name: 'Flujo del dato', color: '#E2231A', dash: '', width: 2, arrow: 'end' },
  control:   { name: 'Canal de control (PDP → PEP / SDN)', color: '#7a7a7a', dash: '2 4', width: 1.8, arrow: 'end' },
  replica:   { name: 'Réplica / respaldo', color: '#1F5FAD', dash: '8 4', width: 1.8, arrow: 'end' },
  denied:    { name: 'Tráfico denegado', color: '#9a9a9a', dash: '4 3', width: 1.6, arrow: 'end' },
  link:      { name: 'Enlace físico / LAN (cable)', color: '#4a4a4a', dash: '', width: 1.6, arrow: 'none' },
  wan:       { name: 'Enlace WAN / Internet / MPLS', color: '#1F5FAD', dash: '', width: 3, arrow: 'none' }
};

window.ZONE_VARIANTS = {
  gray:  { name: 'Gris (sede, segmento, plataforma)', fill: '#F2F2F2', stroke: '#BDBDBD', dash: '6 4', title: '#6b6b6b' },
  red:   { name: 'Roja (DMZ, cuenta cloud, proveedor)', fill: '#FDECEC', stroke: '#E2231A', dash: '6 4', title: '#E2231A' },
  white: { name: 'Blanca (grupo interno)', fill: '#FFFFFF', stroke: '#BDBDBD', dash: '', title: '#262626' },
  blue:  { name: 'Azul (nube, VPC, red)', fill: '#EAF1FB', stroke: '#1F5FAD', dash: '6 4', title: '#1F5FAD' },
  green: { name: 'Verde (sitio alterno, zona de confianza)', fill: '#EAF6EC', stroke: '#2E8B3E', dash: '6 4', title: '#2E8B3E' },
  amber: { name: 'Ámbar (OT, IoT, cuarentena)', fill: '#FBF1E1', stroke: '#B5700E', dash: '6 4', title: '#B5700E' },
  trust: { name: 'Límite de confianza (DFD)', fill: 'none', stroke: '#E2231A', dash: '10 5', title: '#E2231A', thick: 2.4 },
  dark:  { name: 'Oscura (VLAN)', fill: '#3A3A3A', stroke: '#262626', dash: '', title: '#ffffff' }
};

window.CATALOG = [
  {
    cat: 'Usuarios y actores', s: 'Personas, roles y terceros', items: [
      { id: 'u-user', label: 'Usuario / colaborador', icon: 'user', role: 'asset', tip: 'Sujeto que solicita acceso. En Zero Trust se verifica identidad + dispositivo + contexto en cada solicitud.' },
      { id: 'u-remote', label: 'Usuario remoto', icon: 'laptop', role: 'asset', tip: 'Trabaja fuera de la sede: entra por ZTNA, nunca por VPN a toda la red.' },
      { id: 'u-admin', label: 'Administrador TI', icon: 'user-cog', role: 'asset', tip: 'Cuenta privilegiada: siempre con PAM, MFA físico y elevación JIT.' },
      { id: 'u-dev', label: 'Desarrollador', icon: 'code-xml', role: 'asset', tip: 'Despliega solo a través del pipeline CI/CD con escaneo.' },
      { id: 'u-third', label: 'Tercero / proveedor', icon: 'handshake', role: 'exist', tip: 'Acceso limitado por identidad, recurso, contexto y tiempo (JIT). ZTNA sin agente / portal.' },
      { id: 'u-client', label: 'Clientes (Internet)', icon: 'users', role: 'asset', tip: 'Usuarios externos: entran solo por WAF + CDN + anti-DDoS hacia el balanceador.' },
      { id: 'u-partner', label: 'Partner / API externa', icon: 'webhook', role: 'exist', tip: 'Socio que consume APIs: mTLS + OAuth 2.0 con scopes acotados.' },
      { id: 'u-logistic', label: 'Operador logístico', icon: 'truck', role: 'exist', tip: 'Tercero externo: ZTNA por portal, solo su recurso y sesión limitada.' },
      { id: 'u-tech', label: 'Técnico de campo', icon: 'tablet', role: 'asset', tip: 'Dispositivo gestionado (MDM) + ubicación como condición de acceso.' },
      { id: 'u-ot', label: 'Proveedor OT (JIT)', icon: 'user-cog', role: 'exist', tip: 'Acceso just-in-time, ventana de 2 h, sesión grabada.' },
      { id: 'u-doctor', label: 'Médico externo', icon: 'stethoscope', role: 'exist', tip: 'Identidad federada; su laptop personal va a VLAN de invitados o portal.' },
      { id: 'u-soc', label: 'Equipo de respuesta', icon: 'headset', role: 'asset', tip: 'Entra con identidades de recuperación fuera del dominio.' },
      { id: 'u-attacker', label: 'Atacante', icon: 'skull', role: 'neutral', tip: 'Actor de amenaza (externo/interno). Útil para mostrar el vector del incidente.' },
      { id: 'u-guest', label: 'Visitante / invitado', icon: 'circle-user-round', role: 'exist', tip: 'Va a la VLAN de invitados: solo salida a Internet.' }
    ]
  },
  {
    cat: 'Dispositivos y endpoints', s: 'Equipos de usuario, servidores e IoT', items: [
      { id: 'd-pc', label: 'PC / estación', icon: 'monitor', role: 'asset', tip: 'Endpoint corporativo: EDR, cifrado, sin admin local, parches.' },
      { id: 'd-laptop', label: 'Laptop corporativa', icon: 'laptop', role: 'asset', sub: 'EDR · cifrado · sin admin', tip: 'Principal entrada de phishing y ransomware. Capas: cifrado, hardening, privilegios, EDR, UEM.' },
      { id: 'd-mobile', label: 'Móvil corporativo', icon: 'smartphone', role: 'asset', tip: 'COBO/COPE gestionado por UEM: PIN, cifrado, borrado remoto.' },
      { id: 'd-byod', label: 'Celular BYOD', icon: 'smartphone', role: 'asset', sub: 'Perfil de trabajo (MAM)', tip: 'Solo se controla el perfil de trabajo / apps (MAM): borrado selectivo.' },
      { id: 'd-handheld', label: 'Handheld / tablet', icon: 'scan-barcode', role: 'asset', sub: 'Kiosco UEM · cifrado', tip: 'Modo kiosco: una o pocas apps fijas.' },
      { id: 'd-server', label: 'Servidor', icon: 'server', role: 'asset', tip: 'Blanco final del movimiento lateral: EDR de servidor / HIDS.' },
      { id: 'd-printer', label: 'Impresora', icon: 'printer', role: 'asset', tip: 'Sin agente: MAB → VLAN IoT aislada, sin claves de fábrica.' },
      { id: 'd-camera', label: 'Cámara IP', icon: 'cctv', role: 'asset', tip: 'IoT sin agente: MAB → VLAN IoT/videovigilancia aislada.' },
      { id: 'd-iot', label: 'Sensor IoT', icon: 'radio', role: 'asset', tip: 'Firmware desactualizado: zona aislada IoT.' },
      { id: 'd-biomed', label: 'Equipo biomédico', icon: 'heart-pulse', role: 'asset', tip: 'No admite agente ni 802.1X: MAB + VLAN dedicada + IDS (no IPS) para no bloquearlo.' },
      { id: 'd-pos', label: 'POS / caja', icon: 'credit-card', role: 'asset', tip: 'Red de pagos segmentada + whitelisting de aplicaciones (PCI DSS).' },
      { id: 'd-scada', label: 'Estación SCADA / OT', icon: 'factory', role: 'asset', tip: 'Zona crítica aislada: VLAN dedicada, sin acceso desde oficina ni Internet.' },
      { id: 'd-phone', label: 'Teléfono IP', icon: 'phone', role: 'asset', tip: 'VLAN de voz separada.' },
      { id: 'd-wkstation', label: 'Estación de imágenes', icon: 'monitor-smartphone', role: 'asset', tip: 'SO sin soporte: controles compensatorios (segmentación, IDS, sin Internet).' }
    ]
  },
  {
    cat: 'Red e infraestructura (Packet Tracer)', s: 'Routers, switches, WAN y nube', items: [
      { id: 'n-internet', label: 'Internet', icon: 'globe', role: 'exist', tip: 'Zona no confiable. Internet nunca se conecta directo a la red interna: atraviesa la DMZ.' },
      { id: 'n-isp', label: 'Router de borde (ISP)', icon: 'router', role: 'info', tip: 'Primera capa de la arquitectura perimetral clásica.' },
      { id: 'n-router', label: 'Router', icon: 'router', role: 'info', tip: 'Enrutamiento entre sedes y redes; enlace WAN router a router.' },
      { id: 'n-l3', label: 'Switch multicapa (L3) / núcleo', icon: 'network', role: 'info', tip: 'Enruta entre VLANs con ACLs; punto de control entre segmentos.' },
      { id: 'n-l2', label: 'Switch de acceso (L2)', icon: 'network', role: 'info', tip: 'Conecta endpoints; con 802.1X se integra a NAC.' },
      { id: 'n-ap', label: 'Access Point Wi-Fi', icon: 'wifi', role: 'info', tip: 'Wi-Fi corporativo 802.1X; Wi-Fi de visitantes en VLAN aislada.' },
      { id: 'n-sdn', label: 'Controlador SDN', icon: 'cpu', role: 'sol', tip: 'Plano de control centralizado que programa políticas de microsegmentación en los switches.' },
      { id: 'n-sdwan', label: 'SD-WAN edge', icon: 'route', role: 'info', tip: 'Conecta sedes y nubes por la mejor ruta (Internet, MPLS, 4G/5G); elimina el backhaul.' },
      { id: 'n-mpls', label: 'Enlace WAN / MPLS', icon: 'cable', role: 'info', tip: 'Enlace entre sedes.' },
      { id: 'n-lb', label: 'Balanceador de carga', icon: 'split', role: 'sol', tip: 'Único recurso en subred pública; reparte tráfico a servidores sin IP pública.' },
      { id: 'n-nat', label: 'NAT de salida', icon: 'arrow-left-right', role: 'info', tip: 'Salida a Internet de subredes privadas.' },
      { id: 'n-vpn', label: 'Concentrador VPN', icon: 'lock-keyhole', role: 'exist', tip: 'Modelo tradicional: acceso a toda la red, confianza implícita, expuesto a Internet. Se reemplaza por ZTNA.' },
      { id: 'n-dns', label: 'Conmutación global (DNS)', icon: 'signpost-big', role: 'sol', tip: 'Lleva usuarios y agencias al sitio alterno sin cambiar la app.' },
      { id: 'n-cdn', label: 'CDN', icon: 'zap', role: 'sol', tip: 'Distribuye contenido y absorbe carga; suele ir con WAF y anti-DDoS.' },
      { id: 'n-cloud', label: 'Nube', icon: 'cloud', role: 'info', tip: 'Nube genérica (IaaS/PaaS/SaaS).' }
    ]
  },
  {
    cat: 'Firewalls, IDS/IPS y NAC', s: 'Perímetro y control de acceso a la red', items: [
      { id: 'f-perimeter', label: 'Firewall perimetral', icon: 'brick-wall', role: 'sol', tip: 'Control norte-sur en la frontera con Internet: decide qué entra y qué sale.' },
      { id: 'f-ngfw', label: 'NGFW perimetral (HA)', icon: 'shield', role: 'sol', tip: 'Hasta capa 7: reconoce aplicación y usuario, detiene amenazas. En alta disponibilidad.' },
      { id: 'f-ext', label: 'Firewall externo', icon: 'brick-wall', role: 'sol', sub: '1ª línea de control', tip: 'Screened subnet: separa Internet de la DMZ.' },
      { id: 'f-int', label: 'Firewall interno (ISFW)', icon: 'brick-wall', role: 'sol', tip: 'Tráfico este-oeste entre zonas internas: evita que el atacante salte al datacenter.' },
      { id: 'f-ot', label: 'Firewall OT', icon: 'brick-wall', role: 'sol', tip: 'Aísla la red OT/SCADA; reglas temporales para el proveedor OT.' },
      { id: 'f-stateful', label: 'Firewall stateful', icon: 'brick-wall', role: 'sol', tip: 'Capas 3-4 + estado: solo deja pasar respuestas de conversaciones iniciadas.' },
      { id: 'f-packet', label: 'Filtro de paquetes / ACL', icon: 'list-filter', role: 'sol', tip: 'Capas 3-4: IP y puerto. ACL de switch L3 entre VLANs.' },
      { id: 'f-waf', label: 'WAF', icon: 'shield-check', role: 'sol', tip: 'Capa 7 web: delante de cada sitio publicado, bloquea SQLi, XSS (OWASP).' },
      { id: 'f-wafcdn', label: 'WAF + CDN + anti-DDoS', icon: 'shield-check', role: 'sol', tip: 'Única puerta de entrada desde Internet: filtra ataques web y absorbe volumétricos.' },
      { id: 'f-ips', label: 'IPS en línea', icon: 'shield-alert', role: 'sol', tip: 'Todo el tráfico pasa por él: detecta y bloquea ataques conocidos tras el NGFW.' },
      { id: 'f-nids', label: 'NIDS (SPAN / TAP)', icon: 'radar', role: 'detect', tip: 'Fuera de línea: recibe copia del tráfico, alerta sin interrumpir. Ideal donde manda la disponibilidad.' },
      { id: 'f-idsot', label: 'IDS pasivo (sin bloqueo)', icon: 'radar', role: 'detect', tip: 'En OT o equipos biomédicos: un bloqueo por error sería peor que el ataque.' },
      { id: 'f-hids', label: 'HIDS (agente)', icon: 'scan-search', role: 'detect', tip: 'Ve lo que pasa dentro del servidor, incluso con tráfico cifrado.' },
      { id: 'f-nac', label: 'Servidor NAC / RADIUS', icon: 'door-open', role: 'sol', tip: '802.1X: valida usuario y postura; asigna VLAN corporativa, cuarentena, invitados o IoT (MAB).' },
      { id: 'f-swg', label: 'Proxy / SWG', icon: 'globe-lock', role: 'sol', tip: 'Filtra la navegación a Internet: malware, sitios maliciosos, categorías.' },
      { id: 'f-ddos', label: 'Anti-DDoS', icon: 'shield-ban', role: 'sol', tip: 'Absorbe ataques volumétricos (disponibilidad).' },
      { id: 'f-sg', label: 'Security group / ACL de red', icon: 'list-checks', role: 'sol', tip: 'SG: stateful por recurso (control principal). ACL: stateless por subred (2ª barrera).' }
    ]
  },
  {
    cat: 'Zero Trust, ZTNA y SASE', s: 'PEP, PDP, broker y SSE', items: [
      { id: 'z-pep', label: 'Policy Enforcement Point (PEP)', icon: 'shield-half', role: 'sol', tip: '"El guardia": habilita, monitorea y termina conexiones. Fail-safe: sin decisión explícita, deniega.' },
      { id: 'z-pdp', label: 'PDP: Policy Engine + Policy Administrator', icon: 'scale', role: 'sol', tip: 'PE (el juez) decide; PA (el secretario) ejecuta: crea el token/sesión y ordena al PEP.' },
      { id: 'z-pe', label: 'Policy Engine (PE)', icon: 'gavel', role: 'sol', tip: 'Concede, deniega o revoca según política + señales (identidad, dispositivo, amenazas).' },
      { id: 'z-pa', label: 'Policy Administrator (PA)', icon: 'clipboard-check', role: 'sol', tip: 'Establece o cierra el camino de comunicación y genera credenciales de sesión.' },
      { id: 'z-broker', label: 'Broker ZTNA', icon: 'git-merge', role: 'sol', tip: 'Verifica identidad, dispositivo y contexto en cada solicitud; conexión 1 a 1 solo a la app autorizada.' },
      { id: 'z-gw', label: 'Gateway ZTNA (PEP)', icon: 'shield-half', role: 'sol', tip: 'Modelo con agente: deja pasar la sesión y la corta si el token vence.' },
      { id: 'z-connector', label: 'Conector ZTNA', icon: 'plug', role: 'sol', tip: 'En el datacenter: conexión de SALIDA hacia el broker; la app no abre puertos de entrada.' },
      { id: 'z-agent', label: 'Agente ZTNA', icon: 'bot', role: 'sol', tip: 'En equipos gestionados: evalúa postura en tiempo real y cubre cualquier protocolo.' },
      { id: 'z-portal', label: 'Portal ZTNA (sin agente)', icon: 'app-window', role: 'sol', tip: 'Para terceros, contratistas y BYOD: solo apps web publicadas.' },
      { id: 'z-sase', label: 'Nube SASE (PoP)', icon: 'cloud-cog', role: 'sol', tip: 'SASE = SSE + SD-WAN. Política aplicada en el PoP más cercano al usuario o sede.' },
      { id: 'z-sse', label: 'ZTNA / SSE', icon: 'cloud-cog', role: 'sol', tip: 'SSE = ZTNA + SWG + CASB + FWaaS (+ DLP) entregados desde la nube.' },
      { id: 'z-casb', label: 'CASB', icon: 'eye', role: 'sol', tip: 'Visibilidad y control del uso de SaaS (shadow IT, enlaces públicos).' },
      { id: 'z-fwaas', label: 'FWaaS', icon: 'flame', role: 'sol', tip: 'Firewall como servicio en la nube SASE.' },
      { id: 'z-dlp', label: 'DLP (SSE)', icon: 'file-lock', role: 'sol', tip: 'Inspección de datos sensibles hacia Internet y SaaS.' },
      { id: 'z-ti', label: 'Inteligencia de amenazas', icon: 'radar', role: 'exist', tip: 'Fuente de señales de riesgo para el PE.' },
      { id: 'z-pki', label: 'PKI / certificados', icon: 'badge-check', role: 'exist', tip: 'Fuente de información del PDP; certificados de dispositivo para 802.1X/ZTNA.' },
      { id: 'z-compliance', label: 'Cumplimiento normativo', icon: 'scroll-text', role: 'exist', tip: 'Fuente de información para la decisión de acceso.' },
      { id: 'z-micro', label: 'Micro-perímetro (workload)', icon: 'box', role: 'sol', tip: 'Microsegmentación: cada carga con su propia política; impide el movimiento lateral.' }
    ]
  },
  {
    cat: 'Identidad y accesos (IAM)', s: 'IdP, MFA, PAM y federación', items: [
      { id: 'i-idp', label: 'IdP: SSO + MFA', icon: 'id-card', role: 'sol', tip: 'Autenticación central (SAML/OIDC), MFA resistente al phishing; la identidad es el nuevo perímetro.' },
      { id: 'i-idpca', label: 'IdP: MFA + acceso condicional', icon: 'id-card', role: 'sol', tip: 'Es el PDP: solo da acceso si pasa MFA y el equipo es conforme según UEM y EDR.' },
      { id: 'i-idpjit', label: 'IdP: SSO + MFA + JIT', icon: 'id-card', role: 'sol', tip: 'Sin usuarios locales ni llaves de larga duración; roles temporales aprobados.' },
      { id: 'i-dir', label: 'Directorio (AD / LDAP)', icon: 'book-user', role: 'asset', tip: 'Directorio corporativo; una baja cierra todos los accesos.' },
      { id: 'i-mfa', label: 'MFA / llave FIDO2', icon: 'key-square', role: 'sol', tip: 'Factores de tipos distintos. Llave física/passkey para administradores.' },
      { id: 'i-ca', label: 'Acceso condicional', icon: 'user-check', role: 'sol', tip: 'Decide según identidad + postura del equipo + contexto: permitir, limitado o bloquear.' },
      { id: 'i-pam', label: 'PAM (bóveda + sesión grabada)', icon: 'vault', role: 'sol', tip: 'Bóveda de contraseñas, acceso temporal aprobado, sesiones grabadas al SIEM.' },
      { id: 'i-iga', label: 'IGA (recertificación)', icon: 'user-round-check', role: 'sol', tip: 'Ciclo de vida alta/cambio/baja y revisión periódica de accesos.' },
      { id: 'i-fed', label: 'Federación (SAML / OIDC)', icon: 'link', role: 'sol', tip: 'Con socios, médicos externos o SaaS: B confía en lo que confirma el IdP de A.' },
      { id: 'i-oauth', label: 'OAuth 2.0 (scopes)', icon: 'key-round', role: 'sol', tip: 'Entrega permisos, no identidad; scopes acotados.' },
      { id: 'i-rbac', label: 'RBAC / ABAC', icon: 'users', role: 'sol', tip: 'Roles o atributos (usuario, recurso, contexto); mínimo privilegio y separación de funciones.' },
      { id: 'i-breakglass', label: 'Identidades de recuperación', icon: 'hammer', role: 'sol', tip: 'Cuentas break-glass con MFA física fuera del dominio: restaurar aunque el AD esté cifrado.' },
      { id: 'i-workload', label: 'Identidad de carga (rol)', icon: 'server-cog', role: 'sol', tip: 'Credencial temporal automática para VM/contenedor; sin llaves fijas.' },
      { id: 'i-ad', label: 'Active Directory', icon: 'book-user', role: 'asset', iso: 'card', tip: 'Directorio de identidades: objetivo principal del atacante (credenciales, movimiento lateral). Admins solo con PAM y MFA.' },
      { id: 'i-dc', label: 'Controlador de dominio', icon: 'server-cog', role: 'asset', iso: 'cube', tip: 'Servidor del AD en la zona más protegida; administración solo vía PAM y estaciones dedicadas.' },
      { id: 'i-childdc', label: 'Controlador de dominio hijo', icon: 'server-cog', role: 'asset', iso: 'cube', tip: 'Dominio hijo de un bosque AD; la confianza con el dominio raíz es un camino de escalamiento.' }
    ]
  },
  {
    cat: 'Protección del endpoint', s: 'EDR, UEM, cifrado y privilegios', items: [
      { id: 'e-uem', label: 'UEM / MDM', icon: 'list-checks', role: 'sol', tip: 'Inventario único, políticas según dueño (COBO, kiosco, BYOD), parches, borrado remoto, postura.' },
      { id: 'e-edr', label: 'EDR / EPP (consola)', icon: 'scan-eye', role: 'sol', tip: 'EPP previene lo conocido; EDR detecta comportamiento y aísla el equipo en remoto.' },
      { id: 'e-xdr', label: 'XDR / MDR', icon: 'radar', role: 'sol', tip: 'Correlaciona endpoint, red, correo, identidad y nube; MDR añade analistas 24/7.' },
      { id: 'e-patch', label: 'Parches y vulnerabilidades', icon: 'refresh-cw', role: 'sol', tip: 'Parches automáticos (≤14 días); marca no conformes los SO sin soporte.' },
      { id: 'e-priv', label: 'Privilegios (LAPS / EPM)', icon: 'key-round', role: 'sol', tip: 'Sin admin local permanente; elevación temporal registrada; LAPS rota la clave local.' },
      { id: 'e-crypt', label: 'Cifrado de disco (BitLocker)', icon: 'hard-drive', role: 'sol', tip: 'TPM + PIN; llaves de recuperación en el UEM. Mitiga pérdida o robo.' },
      { id: 'e-dlp', label: 'Host DLP', icon: 'file-lock', role: 'sol', tip: 'Bloquea/registra copia de datos sensibles a USB, nube personal, correo web, impresión.' },
      { id: 'e-appctl', label: 'Control de aplicaciones', icon: 'list-filter', role: 'sol', tip: 'Lista de apps permitidas (AppLocker/WDAC); bloquea scripts desde carpetas de usuario.' },
      { id: 'e-usb', label: 'Control de dispositivos / USB', icon: 'usb', role: 'sol', tip: 'Solo medios USB autorizados y cifrados; bloquea Bluetooth/puertos no aprobados.' },
      { id: 'e-hfw', label: 'Firewall de host / HIPS', icon: 'brick-wall', role: 'sol', tip: 'Reglas por aplicación en el equipo; frena propagación lateral.' },
      { id: 'e-boot', label: 'Secure Boot / TPM', icon: 'microchip', role: 'sol', tip: 'Arranque medido; contraseña UEFI; arranque por USB deshabilitado.' },
      { id: 'e-mam', label: 'MAM (perfil de trabajo)', icon: 'app-window', role: 'sol', tip: 'BYOD: separa datos de la empresa, impide copiarlos y permite borrado selectivo.' },
      { id: 'e-inv', label: 'Inventario de activos', icon: 'clipboard-list', role: 'sol', tip: 'Lo que no está inventariado no se puede proteger (CIS Control 1).' }
    ]
  },
  {
    cat: 'Nube', s: 'Cuentas, VPC, CSPM, CWPP y KMS', items: [
      { id: 'c-org', label: 'Organización + guardrails', icon: 'building-2', role: 'sol', tip: 'Cuentas separadas con políticas que nadie puede saltarse: sin buckets públicos, cifrado obligatorio, registro no se apaga.' },
      { id: 'c-vm', label: 'VMs web + API', icon: 'server', role: 'asset', tip: 'IaaS: en subred privada, sin IP pública; el cliente gestiona SO y parches.' },
      { id: 'c-container', label: 'Contenedores / Kubernetes', icon: 'container', role: 'asset', tip: 'Imágenes escaneadas; protegidos por CWPP.' },
      { id: 'c-func', label: 'Función serverless', icon: 'square-function', role: 'asset', tip: 'PaaS: el proveedor gestiona SO y runtime.' },
      { id: 'c-db', label: 'BD gestionada (PaaS)', icon: 'database', role: 'asset', tip: 'Subred privada de datos, endpoint privado, cifrada con llave del KMS.' },
      { id: 'c-bucket', label: 'Bucket / almacenamiento', icon: 'archive', role: 'asset', tip: 'Nunca público si tiene datos personales; cifrado con llave propia.' },
      { id: 'c-pe', label: 'Endpoints privados', icon: 'link-2', role: 'sol', tip: 'Consume servicios PaaS sin salir a Internet; elimina el endpoint público de la BD.' },
      { id: 'c-bastion', label: 'Acceso admin privado', icon: 'terminal', role: 'sol', tip: 'Reemplaza SSH/RDP públicos por sesiones privadas autenticadas en el IdP y grabadas.' },
      { id: 'c-cspm', label: 'CSPM', icon: 'search-check', role: 'sol', tip: 'Revisa la configuración contra CIS Benchmarks y corrige desvíos (bucket público, puerto abierto).' },
      { id: 'c-cwpp', label: 'CWPP', icon: 'shield-ellipsis', role: 'sol', tip: 'Protege cargas en ejecución (VM, contenedores, funciones): "el EDR de la nube".' },
      { id: 'c-cspmcwpp', label: 'CSPM + CWPP', icon: 'search-check', role: 'sol', tip: 'Juntos (+ código) forman una CNAPP.' },
      { id: 'c-sspm', label: 'CASB / SSPM', icon: 'eye', role: 'sol', tip: 'Descubre SaaS no aprobados y revisa su configuración y qué se comparte.' },
      { id: 'c-kms', label: 'KMS + gestor de secretos', icon: 'key', role: 'sol', tip: 'Datos cifrados con llaves propias y rotación; la API obtiene credenciales con su rol.' },
      { id: 'c-audit', label: 'Registro de auditoría', icon: 'scroll-text', role: 'sol', tip: 'Todas las regiones, en cuenta central inmutable, conectado al SIEM y con alertas de costo.' },
      { id: 'c-iac', label: 'IaC + escaneo', icon: 'file-code', role: 'sol', tip: 'Infraestructura definida en código revisado; policy as code antes de desplegar.' },
      { id: 'c-saas', label: 'SaaS (ej. Microsoft 365)', icon: 'cloud', role: 'exist', tip: 'El cliente gestiona usuarios, permisos, configuración y datos.' },
      { id: 'c-iaas', label: 'App en IaaS', icon: 'cloud', role: 'exist', tip: 'Aplicación en AWS/Azure/GCP.' },
      { id: 'c-sandbox', label: 'Entorno de pruebas', icon: 'boxes', role: 'exist', tip: 'Cuenta separada sin datos reales.' }
    ]
  },
  {
    cat: 'Protección de datos', s: 'Cifrado, llaves, tokenización y DLP', items: [
      { id: 'p-class', label: 'Clasificación y etiquetado', icon: 'tags', role: 'sol', tip: 'Público, Interno, Confidencial, Restringido. La etiqueta la leen DLP, CASB y accesos.' },
      { id: 'p-db', label: 'Base de datos', icon: 'database', role: 'asset', tip: 'Activo de datos en reposo.' },
      { id: 'p-dbenc', label: 'BD cifrada (TDE + campo)', icon: 'database', role: 'asset', sub: 'DNI cifrado por campo', tip: 'TDE con llave del KMS + cifrado por campo para datos sensibles.' },
      { id: 'p-tokvault', label: 'Bóveda de tokens', icon: 'vault', role: 'sol', tip: 'Reemplaza el PAN por un token; saca a la tienda del alcance de PCI DSS.' },
      { id: 'p-pay', label: 'Pasarela de pagos (PCI)', icon: 'credit-card', role: 'exist', tip: 'Proveedor externo que recibe el PAN desde la bóveda.' },
      { id: 'p-kmshsm', label: 'KMS + HSM', icon: 'key', role: 'sol', tip: 'KEK fuera del servidor del dato; jerarquía raíz→KEK→DEK; registro de cada uso.' },
      { id: 'p-hsm', label: 'HSM dedicado', icon: 'microchip', role: 'sol', tip: 'FIPS 140-3: llave raíz, PKI, pagos y firma; control dual.' },
      { id: 'p-secrets', label: 'Gestor de secretos', icon: 'lock-keyhole', role: 'sol', tip: 'Contraseñas y tokens fuera del código, entregados en ejecución y rotados.' },
      { id: 'p-tls', label: 'TLS 1.3 y certificados automáticos', icon: 'lock', role: 'sol', tip: 'Cifra usuario→app; la renovación automática evita cortes.' },
      { id: 'p-mtls', label: 'mTLS entre servicios', icon: 'link', role: 'sol', tip: 'Ambos extremos se autentican (servicio↔servicio).' },
      { id: 'p-dynmask', label: 'PAM + enmascaramiento dinámico', icon: 'eye-off', role: 'sol', tip: 'DBA y soporte ven datos enmascarados; acceso en claro aprobado y grabado.' },
      { id: 'p-statmask', label: 'Enmascaramiento estático', icon: 'eye-off', role: 'sol', tip: 'Datos irreversibles o sintéticos para pruebas: ningún entorno no productivo usa datos reales.' },
      { id: 'p-dlp', label: 'DLP en endpoint y correo', icon: 'file-lock', role: 'sol', tip: 'Monitorear → advertir → cifrar → bloquear. Detecta DNI masivos y archivos etiquetados.' },
      { id: 'p-backup', label: 'Respaldo cifrado', icon: 'database-backup', role: 'sol', tip: 'Con su propia llave del KMS; solo lo restaura un rol autorizado.' },
      { id: 'p-files', label: 'Servidor de archivos', icon: 'folder', role: 'asset', tip: 'Activo frecuente del ransomware.' },
      { id: 'p-nas', label: 'NAS', icon: 'hard-drive', role: 'asset', tip: 'Almacenamiento en red.' },
      { id: 'p-bi', label: 'Reportes (BI)', icon: 'chart-column', role: 'asset', tip: 'Dato en uso: enmascarado y exportes etiquetados.' },
      { id: 'p-envelope', label: 'Cifrado por sobre (DEK/KEK)', icon: 'file-key', role: 'sol', tip: 'DEK cifra el dato; KEK (en el KMS) cifra la DEK. Rotar KEK sin recifrar terabytes.' }
    ]
  },
  {
    cat: 'Aplicaciones y DevSecOps', s: 'OWASP, SSDLC y pipeline seguro', items: [
      { id: 'a-mobile', label: 'App móvil / navegador', icon: 'smartphone', role: 'asset', tip: 'Cliente de la aplicación.' },
      { id: 'a-web', label: 'Aplicación web / portal', icon: 'app-window', role: 'asset', tip: 'Portal publicado: en DMZ, detrás de WAF.' },
      { id: 'a-api', label: 'API de negocio (parametrizada)', icon: 'braces', role: 'asset', tip: 'Consultas parametrizadas, validación en servidor, errores genéricos (A05, A10).' },
      { id: 'a-gw', label: 'API gateway (token + límites)', icon: 'webhook', role: 'sol', tip: 'Valida el token, aplica rate limiting y expone solo rutas publicadas (A07, API4).' },
      { id: 'a-wafbot', label: 'WAF + anti-bots', icon: 'shield-check', role: 'sol', tip: 'Filtra inyecciones, XSS y tráfico automatizado (A05, API6).' },
      { id: 'a-authz', label: 'Autorización por objeto', icon: 'user-check', role: 'sol', tip: 'Cada solicitud verifica que el recurso pertenezca a quien lo pide (A01, API1 BOLA/IDOR).' },
      { id: 'a-svc', label: 'Servicios de negocio', icon: 'boxes', role: 'asset', tip: 'Microservicios en red privada.' },
      { id: 'a-pipe', label: 'Pipeline CI/CD (SAST, SCA, secretos, DAST)', icon: 'git-branch', role: 'sol', tip: 'Shift left: bloquea librerías vulnerables y secretos antes de desplegar; genera SBOM.' },
      { id: 'a-repo', label: 'Repositorio de código', icon: 'folder-git-2', role: 'asset', tip: 'Escaneo de secretos en cada commit.' },
      { id: 'a-sast', label: 'SAST', icon: 'file-search', role: 'sol', tip: 'Analiza el código sin ejecutarlo: inyecciones y secretos temprano.' },
      { id: 'a-sca', label: 'SCA + SBOM', icon: 'package-search', role: 'sol', tip: 'Inventario de librerías de terceros con vulnerabilidades conocidas (A03).' },
      { id: 'a-dast', label: 'DAST / pentest', icon: 'bug', role: 'sol', tip: 'Ataca la app en ejecución desde afuera.' },
      { id: 'a-sign', label: 'Firma de artefactos', icon: 'signature', role: 'sol', tip: 'Producción solo ejecuta artefactos firmados (A08).' },
      { id: 'a-rasp', label: 'RASP / IAST', icon: 'shield-plus', role: 'sol', tip: 'Agente dentro de la app que bloquea ataques en ejecución.' },
      { id: 'a-session', label: 'Gestión de sesiones', icon: 'cookie', role: 'sol', tip: 'Tokens de vida corta, renovación controlada, logout que invalida (A07).' },
      { id: 'a-admin', label: 'Panel de administración / backoffice', icon: 'layout-dashboard', role: 'asset', tip: 'No expuesto a Internet: ZTNA + IdP con MFA.' }
    ]
  },
  {
    cat: 'Threat modeling (DFD · STRIDE)', s: 'Elementos del diagrama de flujo de datos', items: [
      { id: 't-entity', label: 'Entidad externa', icon: 'user', role: 'neutral', shape: 'dfd-entity', tip: 'Usuario o sistema fuera de nuestro control. STRIDE: S, R.' },
      { id: 't-process', label: 'Proceso', icon: 'cog', role: 'neutral', shape: 'dfd-process', tip: 'Código que transforma datos (API, servicio). STRIDE: las seis.' },
      { id: 't-store', label: 'Almacén de datos', icon: 'database', role: 'neutral', shape: 'dfd-store', tip: 'BD, archivos, colas. STRIDE: T, R, I, D.' },
      { id: 't-threat', label: 'Amenaza STRIDE', icon: 'triangle-alert', role: 'detect', tip: 'S suplantación · T manipulación · R repudio · I divulgación · D DoS · E elevación de privilegios.' }
    ]
  },
  {
    cat: 'Monitoreo y respuesta', s: 'SIEM, SOC y respuesta a incidentes', items: [
      { id: 'm-siem', label: 'SIEM', icon: 'chart-line', role: 'sol', tip: 'Recibe registros de firewalls, IPS, IDS, NAC, EDR, nube; correlaciona alertas.' },
      { id: 'm-siemsoc', label: 'SIEM + SOC / MDR', icon: 'chart-line', role: 'sol', tip: 'Correlación y monitoreo 24/7 con respuesta definida: se detecta en minutos, no por llamadas.' },
      { id: 'm-soc', label: 'SOC', icon: 'monitor', role: 'sol', tip: 'Monitoreo continuo; reevalúa el riesgo de forma permanente.' },
      { id: 'm-soar', label: 'SOAR', icon: 'workflow', role: 'sol', tip: 'Automatiza la respuesta (roadmap fase 3).' },
      { id: 'm-ueba', label: 'UEBA', icon: 'user-search', role: 'sol', tip: 'Analítica de comportamiento de usuarios y entidades.' },
      { id: 'm-notify', label: 'Respuesta y notificación (48 h)', icon: 'bell-ring', role: 'sol', tip: 'Decide en horas si notificar a ANPD (48 h), SBS o CNSD y con qué datos.' }
    ]
  },
  {
    cat: 'Resiliencia y gobierno', s: 'Respaldo, continuidad y cumplimiento', items: [
      { id: 'r-immut', label: 'Respaldo inmutable (WORM)', icon: 'database-backup', role: 'sol', tip: 'Otra red y otras credenciales: ni el admin del dominio puede borrarlo ni cifrarlo.' },
      { id: 'r-offsite', label: 'Copia fuera del sitio', icon: 'cloud-upload', role: 'sol', tip: 'Otra región y otro medio: completa la regla 3-2-1-1-0.' },
      { id: 'r-replica', label: 'Réplica (warm standby)', icon: 'copy', role: 'sol', tip: 'Cumple RTO/RPO bajos. Réplica no es respaldo: copia también el cifrado del ransomware.' },
      { id: 'r-alt', label: 'Sitio alterno', icon: 'building', role: 'info', tip: 'En otra región; pilot light, warm standby o activo-activo según RTO/RPO.' },
      { id: 'r-orch', label: 'Orquestador con runbooks', icon: 'workflow', role: 'sol', tip: 'Automatiza y documenta la conmutación; cada prueba deja evidencia.' },
      { id: 'r-grc', label: 'Plataforma GRC', icon: 'clipboard-check', role: 'sol', tip: 'Matriz requisito → control → evidencia alimentada por los propios controles.' },
      { id: 'r-arb', label: 'Comité de arquitectura (ARB)', icon: 'users', role: 'exist', tip: 'Revisa el diseño antes de construir; ADR.' }
    ]
  },
  {
    cat: 'Sistemas y activos de negocio', s: 'Servidores y aplicaciones típicas', items: [
      { id: 'b-erp', label: 'ERP', icon: 'briefcase', role: 'asset', tip: 'Activo crítico del datacenter.' },
      { id: 'b-db', label: 'BD de producción', icon: 'database', role: 'asset', tip: 'Solo el ERP/app habla con la BD (regla de firewall interno).' },
      { id: 'b-core', label: 'Core financiero / bancario', icon: 'landmark', role: 'asset', tip: 'Sin acceso directo desde la DMZ ni sucursales.' },
      { id: 'b-wms', label: 'WMS', icon: 'warehouse', role: 'asset', tip: 'Sistema de almacenes.' },
      { id: 'b-his', label: 'HIS / historia clínica', icon: 'hospital', role: 'asset', tip: 'Datos de salud: sensibles según Ley 29733.' },
      { id: 'b-portal', label: 'Portal web público', icon: 'globe', role: 'asset', tip: 'En la DMZ detrás de WAF.' },
      { id: 'b-mail', label: 'Correo electrónico', icon: 'mail', role: 'asset', tip: 'Vector frecuente de phishing; DLP en correo.' },
      { id: 'b-crm', label: 'CRM', icon: 'contact', role: 'asset', tip: 'Datos de clientes.' },
      { id: 'b-store', label: 'Tienda web + API', icon: 'store', role: 'asset', tip: 'E-commerce.' },
      { id: 'b-paysvc', label: 'Servicio de pagos', icon: 'credit-card', role: 'asset', tip: 'Recibe solo el token por mTLS.' },
      { id: 'b-ot', label: 'Sistema de control OT', icon: 'thermometer', role: 'asset', tip: 'OT: un bloqueo por error dañaría la operación → IDS pasivo.' },
      { id: 'b-lab', label: 'Sistema de laboratorio', icon: 'heart-pulse', role: 'asset', tip: 'Datos de salud.' },
      { id: 'b-academic', label: 'Sistema académico', icon: 'graduation-cap', role: 'asset', tip: 'Plataforma académica o LMS.' },
      { id: 'b-api', label: 'API pública', icon: 'braces', role: 'asset', tip: 'API expuesta a clientes o socios: en la DMZ, detrás de WAF / API gateway; nunca conectada directo a la red interna.' },
      { id: 'b-websrv', label: 'Servidor web', icon: 'server', role: 'asset', iso: 'stack', tip: 'Publicado en la DMZ detrás del firewall y del WAF.' },
      { id: 'b-mailsrv', label: 'Servidor de correo', icon: 'mail', role: 'asset', iso: 'card', tip: 'En la DMZ; filtro anti-phishing y DLP de correo.' },
      { id: 'b-appsrv', label: 'Servidor de aplicaciones', icon: 'server-cog', role: 'asset', iso: 'tower', tip: 'Capa de aplicación entre la DMZ y la red interna; solo él consulta la BD.' },
      { id: 'b-dbsrv', label: 'Servidor de base de datos', icon: 'database', role: 'asset', iso: 'cylinder', tip: 'En la red interna; sin acceso directo desde la DMZ ni desde usuarios.' },
      { id: 'd-windows', label: 'Host Windows', icon: 'app-window', role: 'asset', iso: 'card', tip: 'Equipo Windows: EDR, parches, sin admin local, LAPS.' },
      { id: 'd-linux', label: 'Host Linux', icon: 'terminal', role: 'asset', iso: 'card', tip: 'Equipo Linux: hardening CIS, parches y SSH solo por acceso privado.' }
    ]
  },
  {
    cat: 'Zonas y contenedores', s: 'Arrastra y agrupa', items: [
      { id: 'zn-site', kind: 'zone', label: 'SEDE PRINCIPAL', variant: 'gray', w: 420, h: 280, tip: 'Sede, datacenter, planta o grupo de componentes. Al moverla, se mueve todo lo que contiene.' },
      { id: 'zn-dmz', kind: 'zone', label: 'DMZ', variant: 'red', w: 320, h: 120, tip: 'Servicios expuestos a Internet, aislados entre dos firewalls.' },
      { id: 'zn-vlan', kind: 'zone', label: 'VLAN 10 · Usuarios', variant: 'white', w: 260, h: 140, tip: 'Segmento lógico por función, sensibilidad o nivel de confianza.' },
      { id: 'zn-cloud', kind: 'zone', label: 'ORGANIZACIÓN CLOUD · CUENTAS SEPARADAS', variant: 'red', w: 520, h: 340, tip: 'Límite de cuenta, red o proveedor.' },
      { id: 'zn-vpc', kind: 'zone', label: 'VPC', variant: 'blue', w: 360, h: 220, tip: 'Red virtual con subredes públicas/privadas.' },
      { id: 'zn-subnet', kind: 'zone', label: 'Subred privada · aplicación', variant: 'white', w: 300, h: 110, tip: 'Sin IP pública; SG solo desde el balanceador.' },
      { id: 'zn-ot', kind: 'zone', label: 'VLAN OT', variant: 'amber', w: 260, h: 140, tip: 'OT / IoT / cuarentena.' },
      { id: 'zn-alt', kind: 'zone', label: 'SITIO ALTERNO · OTRA REGIÓN', variant: 'green', w: 360, h: 200, tip: 'Sitio de recuperación.' },
      { id: 'zn-trust', kind: 'zone', label: 'Límite de confianza', variant: 'trust', w: 320, h: 200, tip: 'DFD: donde cambia el nivel de confianza. Ahí se concentran las amenazas.' },
      { id: 'zn-untrusted', kind: 'zone', label: 'ZONA NO CONFIABLE', variant: 'gray', w: 260, h: 200, tip: 'Sujeto (usuario + dispositivo) antes del PEP (NIST 800-207).' }
    ]
  },
  {
    cat: 'Anotaciones', s: 'Títulos, notas y leyenda', items: [
      { id: 'x-kicker', kind: 'text', variant: 'kicker', label: 'ARQUITECTURA PROPUESTA', tip: 'Antetítulo en rojo y mayúsculas.' },
      { id: 'x-title', kind: 'text', variant: 'title', label: 'Arquitectura propuesta para …', tip: 'Título principal del diagrama.' },
      { id: 'x-body', kind: 'text', variant: 'body', label: 'Texto libre', tip: 'Texto normal.' },
      { id: 'x-note', kind: 'text', variant: 'note', label: 'Nota: explica aquí una decisión de diseño.', tip: 'Recuadro oscuro con texto blanco (como las notas del profesor).' },
      { id: 'x-alert', kind: 'text', variant: 'alert', label: 'Idea clave: …', tip: 'Recuadro rosado con texto rojo.' },
      { id: 'x-rules', kind: 'text', variant: 'body', label: '# Origen → Destino : Acción\n1 VLAN 10 → ERP : Permitir\n2 VLAN 10 → BD : Denegar\n3 Invitados → Internas : Denegar\n4 Cualquiera → Cualquiera : Denegar', tip: 'Matriz de reglas (la de "denegar todo" siempre al final).' },
      { id: 'x-legend', kind: 'legend', label: 'Leyenda', tip: 'Se genera sola con los colores y tipos de línea que usaste.' },
      { id: 'x-num', kind: 'badge', variant: 'num', label: '1', tip: 'Número de componente para zonas o políticas (ej. guardrails de la organización).' },
      { id: 'x-hall', kind: 'badge', variant: 'hall', label: 'H1', tip: 'Marca de hallazgo (círculo ámbar).' },
      { id: 'x-step', kind: 'badge', variant: 'step', label: '1', tip: 'Paso de un flujo / vista espejo (círculo rojo).' }
    ]
  }
];

/* índice rápido */
window.CATALOG_INDEX = {};
window.CATALOG.forEach(function (c) { c.items.forEach(function (it) { it.cat = c.cat; window.CATALOG_INDEX[it.id] = it; }); });
