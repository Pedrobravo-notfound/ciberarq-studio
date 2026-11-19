# CiberArq Studio

Diagramador web de arquitecturas de ciberseguridad, al estilo de Draw.io y Packet Tracer, con vista 2D y 3D isométrica.

Es un sitio 100 % estático (HTML + CSS + JavaScript): no tiene dependencias, servidor ni base de datos. Funciona en Render, GitHub Pages o Netlify, y también abriendo `index.html` directamente, sin conexión.

## Qué incluye

- **196 componentes** (más 20 zonas y anotaciones) en 16 categorías:
  - **Infraestructura:** usuarios y terceros, dispositivos, red, nube.
  - **Seguridad de red y acceso:** firewalls, IDS/IPS, NAC, Zero Trust (PEP, PDP, broker, SSE), IAM (IdP, MFA, PAM, AD).
  - **Endpoint, datos y aplicaciones:** EDR, UEM, cifrado, KMS/HSM, tokenización, DLP, WAF, API gateway, SAST/SCA/DAST.
  - **Operación:** monitoreo (SIEM/SOC), resiliencia (respaldo inmutable, réplica, GRC) y elementos DFD/STRIDE.
- **Vista 3D isométrica** (botón **3D**):
  - Cada componente se dibuja como un objeto en perspectiva sobre una plataforma: servidores apilados, cubos, torres, tarjetas, cilindros, firewalls con llamas, nubes y personas.
  - Las zonas y las conexiones se proyectan sobre el piso como tuberías.
  - Ofrece paleta azul o clásica y separación ajustable, sin modificar el diagrama 2D.
- **Convención de colores:**

  | Color | Significado |
  |---|---|
  | Rojo | Componente de la solución (numerado) |
  | Negro | Activo protegido o usuario |
  | Gris | Existente o tercero |
  | Ámbar | Solo detección |

- **9 tipos de línea:** tráfico, política/postura, telemetría al SIEM, flujo del dato, canal de control, réplica, denegado, cable LAN y enlace WAN.
- **5 plantillas genéricas:** perímetro en 3 capas (DMZ), doble firewall + IPS (screened subnet), referencia Zero Trust, componentes lógicos Zero Trust (NIST SP 800-207) y entorno empresarial en 3D.
- **Leyenda automática**, **numeración automática** y **tabla de sustento** (componente · por qué se incluye · requisito que atiende). La tabla se puede copiar a Excel/Word, descargar como CSV o insertar en el diagrama.
- **Exportación** a PNG, SVG, JSON o imprimir/PDF. El trabajo se guarda solo y hay una biblioteca local de diagramas.

## Uso rápido

| Acción | Cómo |
|---|---|
| Agregar | Arrastra desde la izquierda o haz clic en el componente. Para buscar: doble clic en el fondo o tecla `/` |
| Conectar | Arrastra desde un punto azul del componente hasta otro; si sueltas en vacío, eliges qué crear. O usa `C` (modo conectar) |
| Renombrar | Doble clic o `F2` |
| Seleccionar varios | `Shift` + clic o `Shift` + arrastrar, para alinear o distribuir |
| Moverse | Arrastra el fondo · `Ctrl` + rueda = zoom · `0` = ajustar a la pantalla |
| Deshacer / rehacer | `Ctrl+Z` / `Ctrl+Y` |
| Copiar / pegar / duplicar | `Ctrl+C` / `Ctrl+V` / `Ctrl+D` |
| Vista 3D | Botón **3D** (vuelves con **Tarjeta** o **Ícono**) |

**Enlaces directos:**
- `?tpl=N` abre la plantilla N, según su orden en el menú Plantillas.
- `&view=3d` la abre en 3D. Ejemplo: `?tpl=1&view=3d`.

## Publicar en Render (gratis)

1. Sube el contenido de esta carpeta a un repositorio de GitHub. `index.html` debe quedar en la raíz.
2. En Render, crea un sitio estático y conecta ese repositorio:
   1. Elige **New → Static Site**.
   2. En **Build command** escribe `echo ok`.
   3. En **Publish directory** escribe `.`.
3. Cada `git push` vuelve a publicar el sitio automáticamente.

Otras opciones:
- **Blueprint:** usa el `render.yaml` incluido.
- **GitHub Pages:** activa Pages sobre la rama `main`.
- **Netlify Drop:** arrastra la carpeta.

## Tus datos

Todo se guarda **solo en el navegador** donde trabajas (`localStorage`):
- **Para llevarlo a otra computadora:** usa **Guardar → Descargar .json** y luego **Abrir → Desde un archivo**.
- **Para compartir el diagrama como imagen:** usa **Exportar → PNG**.
