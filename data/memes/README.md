# Archivo de memes de estrategIA

Fuente editable: `catalog.json`. La web generada está en `docs/memes/` y se integra en la portada existente del LAB.

La edición inicial contiene 184 imágenes de 154 de los primeros 158 números. Los números 13, 65, 117 y 118 son ediciones especiales sin meme independiente incluido. Se excluyen cinco banners de patrocinio. Las secuencias contenidas en una imagen permanecen juntas; las variantes publicadas como imágenes diferentes tienen fichas propias.

Cada registro conserva el enlace a la newsletter, fecha, enlace a la imagen original, dimensiones y SHA-256 del original. El título, contexto, descripción visual, transcripción, etiquetas y créditos se prepararon para este archivo. Las imágenes y textos fueron revisados visualmente por asistentes; ello no equivale a aprobación editorial humana.

## Actualizar

1. Comprobar el número publicado y sus imágenes, distinguir memes de anuncios y conservar el original sin cambios fuera del repositorio público.
2. Añadir el registro con un identificador estable `NNN-OO`. Mantener la fecha de publicación y comprobar el contexto frente al número correspondiente. No atribuir autoría a una marca de herramienta.
3. Crear dos WebP sin recortar ni ampliar: `docs/memes/assets/NNN-OO-thumb.webp` (lado máximo 640 px) y `NNN-OO-large.webp` (lado máximo 1600 px). Los originales se enlazan desde la ficha.
4. Actualizar alcance y fecha del catálogo. Revisar también los textos de alcance, las opciones y pruebas que corresponda en el generador; la primera edición está expresamente cerrada en el número 158.
5. Ejecutar `python scripts/build_memes.py`. No editar las fichas HTML a mano.
6. Ejecutar `python tests/validate_site.py`, `npm test` y `node tests/memes.cjs`, además de las comprobaciones vigentes del LAB. La suite de memes comprueba toda la edición inicial y debe actualizarse si cambia el inventario.
7. Revisar visualmente las nuevas piezas y sus textos, en móvil y escritorio. Publicar mediante el flujo habitual de revisión y GitHub Pages del LAB.

No se necesitan servicios de IA, base de datos, cuentas de usuario ni llamadas externas para navegar por el archivo. El JavaScript filtra el catálogo incrustado y recuerda la selección en sessionStorage. La galería y las fichas se pueden leer sin JavaScript.

## Accesibilidad y pruebas

La suite específica comprueba búsquedas, filtros, estados vacíos, retorno desde fichas, ampliación y foco, transcripción, ausencia de JavaScript, todas las imágenes y fichas, anchuras de 320 a 1440 px y texto de galería al 200 %. Axe analiza una muestra de fichas y la galería. Estas pruebas no constituyen una certificación WCAG ni una auditoría humana completa con lectores de pantalla.
