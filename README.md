# Lector de libro — PWA prototipo 0.1

## Incluye
- Fotografiar una página o seleccionar varias fotos.
- OCR en español con Tesseract.js.
- Acumulación de páginas y edición del texto.
- Guardado local en el navegador.
- Lectura por voz, pausa/reanudación, detener y velocidad ajustable.
- Exportación del texto a TXT.
- Manifiesto PWA y service worker básico.

## Limitaciones conocidas
- No crea archivos MP3 todavía; la voz se reproduce en tiempo real.
- Lectura con pantalla bloqueada/segundo plano depende del navegador y del sistema.
- La biblioteca solo existe en este navegador y dispositivo. Borrar datos del navegador puede borrarla; exporta copias.
- Un solo libro activo: pulsa «Exportar texto» antes de «Nuevo libro».
- OCR descarga Tesseract.js y el idioma español desde un CDN; necesita Internet en la primera carga.
- Las páginas se agregan en el orden seleccionado/procesado.
- No manipules el teléfono mientras conduces.

## Probar en ordenador
Con Python instalado, ejecuta en esta carpeta `python -m http.server 8000` y abre `http://localhost:8000`.

## Probar en el móvil
Para instalar una PWA el sitio debe servirse por HTTPS. Sube estos archivos a un hosting estático HTTPS (por ejemplo GitHub Pages, Cloudflare Pages o Netlify) y abre la URL en Chrome para Android. Menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».
https://seraphium12.github.io/lector-libro-pwa/
