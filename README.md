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

- El reto estrategIA, concurso de cultura general sobre IA: https://elcontemplador.github.io/reto-estrategia-ia/
- La ribera del Molino, demo municipal en 3D: https://ribera-estrategia.netlify.app/ribera/
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

## Canales de estrategIA

- Substack: https://estrategiabyaleph.substack.com/
- Suscripción: https://estrategiabyaleph.substack.com/subscribe
- LinkedIn Newsletter: https://www.linkedin.com/newsletters/estrategia-7201868200244834304/
- Página en ALEPH: https://institucioneducativaaleph.com/investigacion-y-publicaciones/estrategia-newsletter-sobre-inteligencia-artificial-en-la-politica-y-el-gobierno-de-la-institucion-educativa-aleph/

## Autoría editorial

estrategIA fue creada y está dirigida por Fernando Nieto Lobato, editada por Pablo Martín Diez e impulsada por la Institución Educativa ALEPH.

## Licencia y cita

El contenido de este repositorio se publica bajo licencia Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). Consulte `LICENSE` y `CITATION.cff` para los detalles de uso y citación.
