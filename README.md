# estrategIA lab

Repositorio público de la página **estrategIA lab**, el espacio en GitHub de la newsletter estrategIA para reunir prototipos, repositorios y proyectos prácticos vinculados a inteligencia artificial, política y gobierno.

## Qué es

estrategIA lab no sustituye a la newsletter ni a la página institucional de ALEPH. Su función es ordenar la parte más práctica y experimental del proyecto:

- repositorios comentados o presentados en estrategIA;
- prototipos creados con herramientas de IA;
- proyectos aplicados a comunicación pública, análisis político, gobierno y cultura institucional;
- enlaces a recursos complementarios de ALEPH, Substack y LinkedIn.

## Página publicada

La web está disponible en:

https://elcontemplador.github.io/estrategIA-lab/

La fuente única de la web es **`main/docs/`**. GitHub Pages publica esa carpeta mediante
el workflow [Validar y publicar LAB](.github/workflows/pages.yml), solo después de superar
las comprobaciones de archivos, enlaces, descargas y navegador. En Settings → Pages,
la fuente de publicación es **GitHub Actions**.

La rama `gh-pages` se conserva como historial de la publicación anterior; ya no es la
fuente activa. No se deben copiar cambios directamente a esa rama.

## Proyectos enlazados

- Renta básica en la era de la IA, monográfico sobre una posible transición hacia el postrabajo: https://elcontemplador.github.io/estrategIA-lab/renta-basica/
- El reto estrategIA, concurso de cultura general sobre IA: https://elcontemplador.github.io/reto-estrategia-ia/
- La ribera del Molino, demo municipal en 3D: https://ribera-estrategia.netlify.app/ribera/
- Archivo web de artículos principales en inglés: https://elcontemplador.github.io/estrategia-english/
- Archivo historIAs: https://elcontemplador.github.io/estrategIA-lab/historias/
- Guía de inteligencia artificial: https://elcontemplador.github.io/estrategIA-lab/que-es-la-ia/
- Ágora 2032, prototipo narrativo: https://elcontemplador.github.io/estrategIA-lab/agora2032/
- App estoica: https://github.com/elcontemplador/estoicismo_diario
- Analizador de discursos: https://github.com/elcontemplador/analizador-discurso-politico

## Trabajar en la web y publicar

Usa un clon de este repositorio público y edita los archivos de `docs/`. El entorno
editorial de la newsletter es un proyecto distinto: no copies sus corpus, borradores
ni carpetas `outputs/` a este repositorio.

Para servir la web en local, desde la raíz del repositorio:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory docs
```

Abre `http://127.0.0.1:8000/`. La web es estática; Python y Node solo son necesarios
para desarrollo y comprobaciones, no para sus visitantes.

Antes de integrar cambios en `main`, con Python 3.12 y Node 22:

```sh
npm ci --ignore-scripts
npx playwright install chromium
python tests/validate_site.py
npm test
```

Las pruebas se ejecutan sobre un servidor temporal y un navegador sin sesión personal.
Comprueban los recursos existentes, las fichas y filtros del archivo, las descargas,
las simulaciones, la adaptación móvil y la lectura de la guía sin JavaScript. No envían
formularios ni invocan servicios de IA. No equivalen a una auditoría integral de accesibilidad.

1. Abre una rama y un pull request hacia `main`.
2. Comprueba que el trabajo `validate` termina correctamente y revisa el cambio.
3. Al integrarlo en `main`, el workflow vuelve a validar, empaqueta `docs/` y lo publica.
4. Comprueba la web pública y el resultado de `deploy` en Actions.

Si una validación falla, no se ejecuta el despliegue. El entorno `github-pages` permite
publicar únicamente desde `main`. Para recuperar una versión anterior, revierte el
cambio en `main` y deja que el mismo procedimiento la compruebe y publique.

El cambio de publicación del 4 de septiembre de 2026 recuperó en `main/docs` la guía
que existía solo en `gh-pages` y preservó los archivos y PDF publicados.

## Monográfico de renta básica

La fuente canónica es [`docs/renta-basica/index.html`](docs/renta-basica/index.html).
El monográfico pide a los gobiernos estudiar seriamente la renta básica, la fiscalidad
y la protección social ante una posible transición hacia el **postrabajo**. Distingue
evidencia de pilotos, modelos, previsiones y propuestas de preparación.

El PDF y el Markdown de `docs/renta-basica/` se derivan del mismo HTML mediante
[`scripts/build_renta_basica_downloads.py`](scripts/build_renta_basica_downloads.py).
No se editan por separado. Al modificar el contenido, conserva los identificadores de
los apartados y las citas para mantener los enlaces internos y las referencias existentes.

Instala las dependencias y el navegador de desarrollo:

```sh
python -m pip install -r scripts/renta-basica-requirements.txt
python -m playwright install chromium
```

Regenera los descargables y ejecuta su comprobación específica desde la raíz del
repositorio. Sustituye `RUTA_A_EVIDENCIAS` por una carpeta de trabajo fuera de `docs/`;
`--output` guarda las evidencias, mientras el generador actualiza el PDF y el Markdown
en `docs/renta-basica/`:

```sh
python scripts/build_renta_basica_downloads.py --output RUTA_A_EVIDENCIAS/descargas
python tests/renta_basica.py --output RUTA_A_EVIDENCIAS/qa
```

Ambos comandos aceptan `--browser-channel msedge` para usar Microsoft Edge instalado.
La QA comprueba estructura, enlaces, descargables, controles, navegación, adaptación
móvil e impresión. Sus resultados no sustituyen la revisión editorial y visual.

## Canales de estrategIA

- Substack: https://estrategiabyaleph.substack.com/
- Suscripción: https://estrategiabyaleph.substack.com/subscribe
- LinkedIn Newsletter: https://www.linkedin.com/newsletters/estrategia-7201868200244834304/
- Archivo de artículos principales en inglés: https://elcontemplador.github.io/estrategia-english/
- Página en ALEPH: https://institucioneducativaaleph.com/investigacion-y-publicaciones/estrategia-newsletter-sobre-inteligencia-artificial-en-la-politica-y-el-gobierno-de-la-institucion-educativa-aleph/

## Autoría editorial

estrategIA fue creada y está dirigida por Fernando Nieto Lobato, editada por Pablo Martín Diez e impulsada por la Institución Educativa ALEPH.

## Licencia y cita

El contenido de este repositorio se publica bajo licencia Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0), salvo activos con condiciones propias documentadas en [atribuciones](docs/assets/ATTRIBUTIONS.md). Consulte `LICENSE` y `CITATION.cff` para los detalles de uso y citación. Los proyectos externos conservan sus respectivas licencias: consultar código público no concede automáticamente permiso para reutilizarlo.

## Portada y mantenimiento

La portada explica qué es estrategIA y cómo se relacionan la newsletter en Substack,
la presentación y los recursos de ALEPH y este laboratorio. Ese contexto permanece
visible antes del catálogo y conserva la mirada política y el propósito editorial.

Las nueve fichas explican el propósito de los proyectos, con vistas previas, requisitos,
límites y acciones disponibles. El archivo web en inglés figura como proyecto de acceso
internacional a los artículos principales traducidos; su alcance se explica a la vista.
No contiene el resto de secciones de los números completos ni otra suscripción semanal.

`docs/home.js` añade solo mejoras progresivas: ajusta el margen de los enlaces internos
a la cabecera y limita el destacado del tercer aniversario a octubre de 2026, en la zona
horaria de Madrid. Al terminar el mes, el juego permanece en el catálogo. Sin JavaScript,
la promoción conserva su fecha explícita y todos los proyectos, enlaces y condiciones
siguen accesibles. No hay analítica ni llamadas a modelos de IA.

La fecha de revisión de las fichas no es la fecha de creación o de publicación de cada
proyecto. Actualícela cuando vuelva a comprobar el catálogo; no la regenere automáticamente.
Conserve las capturas como vistas previas reales, los activos originales y sus atribuciones.
La incorporación del monográfico de renta básica el 2 de octubre de 2026 se distingue
de la revisión de las otras ocho fichas, realizada el 1 de octubre de 2026.
