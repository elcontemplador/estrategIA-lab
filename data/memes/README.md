# Archivo de memes de estrategIA

Fuente editable: `catalog.json`. La web generada está en `docs/memes/` y se integra en la portada existente del LAB.

La edición vigente contiene 187 imágenes de 157 de los primeros 161 números, hasta el 28 de octubre de 2026. Los números 13, 65, 117 y 118 son ediciones especiales sin meme independiente incluido. Se excluyen cinco banners de patrocinio. Las secuencias contenidas en una imagen permanecen juntas; las variantes publicadas como imágenes diferentes tienen fichas propias.

Cada registro conserva el enlace a la newsletter, fecha, enlace a la imagen original, dimensiones y SHA-256 del original. El título, contexto, descripción visual, transcripción, etiquetas y créditos se prepararon para este archivo. Las imágenes y textos fueron revisados visualmente por asistentes; ello no equivale a aprobación editorial humana.

## Actualizar

1. Comprobar el número publicado y sus imágenes, distinguir memes de anuncios y conservar el original sin cambios fuera del repositorio público.
2. Añadir el registro con un identificador estable `NNN-OO`. Mantener la fecha de publicación y comprobar el contexto frente al número correspondiente. No atribuir autoría a una marca de herramienta.
3. Crear dos WebP sin recortar ni ampliar: `docs/memes/assets/NNN-OO-thumb.webp` (lado máximo 640 px) y `NNN-OO-large.webp` (lado máximo 1600 px). Los originales se enlazan desde la ficha.
4. Actualizar `cutoffIssue`, `cutoffDate` y `compiledDate` en el catálogo. El generador actualiza el alcance, la fecha y la imagen de portada a partir de esos datos. Mantener el resumen de este README y el del repositorio, y actualizar las expectativas explícitas de las pruebas al inventario revisado.
5. Ejecutar `python scripts/build_memes.py`. No editar las fichas HTML a mano.
6. Ejecutar `python tests/validate_site.py`, `npm test` y `node tests/memes.cjs`, además de las comprobaciones vigentes del LAB. La suite de memes comprueba toda la edición vigente y debe actualizarse si cambia el inventario.
7. Revisar visualmente las nuevas piezas y sus textos, en móvil y escritorio. Publicar mediante el flujo habitual de revisión y GitHub Pages del LAB.

No se necesitan servicios de IA, base de datos, cuentas de usuario ni llamadas externas para navegar por el archivo. El JavaScript filtra el catálogo incrustado y recuerda la selección en sessionStorage. La galería y las fichas se pueden leer sin JavaScript.

## Accesibilidad y pruebas

La suite específica comprueba búsquedas, filtros, estados vacíos, retorno desde fichas, ampliación y foco, transcripción, ausencia de JavaScript, todas las imágenes y fichas, anchuras de 320 a 1440 px y texto de galería al 200 %. Axe analiza una muestra de fichas y la galería. Estas pruebas no constituyen una certificación WCAG ni una auditoría humana completa con lectores de pantalla.

## Criterio de los textos de contexto

Explicar en dos o tres frases la referencia necesaria y la situación que plantea la imagen. Preferir acciones y ejemplos concretos a expresiones abstractas. Definir siglas y términos técnicos si hacen falta para entenderla, y traducir referencias en inglés cuando su sentido sea relevante. Mantener el contexto de publicación y distinguir la sátira o la ficción de los hechos documentados. Contrastar cada cambio con la newsletter y la imagen; no deducir hechos históricos solo de una plantilla de meme.
