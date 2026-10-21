# Lector de libro — PWA prototipo 0.2

Aplicación web gratuita para probar el flujo de digitalización de libros en el navegador. Código abierto; todavía es un prototipo y no una versión definitiva.

## Funciones
- Fotografiar una página o seleccionar varias fotos para procesarlas en orden.
- OCR en español con Tesseract.js.
- Tratamiento de imagen con escala de grises y umbral local; modo automático compara el OCR de la foto original con el de la foto mejorada.
- Lista de páginas reconocidas, eliminación de páginas y edición manual del texto.
- Guardado local en el navegador.
- Importación de EPUB (se extrae el texto siguiendo el orden de lectura del libro).
- Exportación a EPUB y TXT.
- Lectura por voz del sistema, pausa/reanudación, detener y velocidad ajustable.
- Manifiesto PWA y service worker con versión de caché renovada.

## Limitaciones conocidas
- El OCR puede equivocarse, especialmente con fotos borrosas, páginas curvadas, sombras, columnas o texto que se transparenta desde el reverso. Revisa el resultado; prueba los modos de tratamiento de imagen.
- La importación EPUB extrae texto y no conserva imágenes, maquetación ni todas las características del libro original. La exportación crea un EPUB de texto sencillo con un capítulo; la separación por capítulos es una mejora pendiente.
- No crea MP3/M4B todavía. La API de voz del navegador reproduce audio, pero no entrega directamente un archivo descargable. Hace falta integrar un motor TTS que genere audio.
- La reproducción con pantalla bloqueada o en segundo plano depende del navegador y del sistema operativo.
- Se mantiene un solo libro activo en el navegador. Exporta una copia antes de abrir otro.
- El OCR, JSZip y los datos de idioma se cargan desde CDN; hace falta Internet para la primera carga y para importar/exportar EPUB si no se han cargado las bibliotecas.
- Los textos se guardan localmente en este navegador/dispositivo. Borrar los datos del navegador puede borrarlos. El código de esta app no envía el texto del libro a un servidor.
- No manipules el teléfono mientras conduces.

## Probar en ordenador
Con Python instalado, ejecuta en esta carpeta `python -m http.server 8000` y abre `http://localhost:8000`.

## Publicar con GitHub Pages
Sube los archivos de esta carpeta a la raíz de un repositorio y activa **Settings → Pages → Deploy from a branch → main → /(root)**. Cuando se publique una actualización, recarga la página; si aparece una versión antigua, cierra la PWA y vuelve a abrirla.

## Instalación Android
Abre la URL HTTPS de GitHub Pages en Chrome y usa el menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio». Para una APK nativa y una futura publicación en Google Play, consulta la hoja de ruta del proyecto; este ZIP no contiene todavía una APK.

## Hoja de ruta
1. Validar OCR con fotografías reales y mejorar recorte, rotación y reducción de transparencias.
2. Biblioteca de varios libros, capítulos y guardado/exportación de proyectos.
3. Generación real de audio MP3 por capítulos; estudiar M4B después.
4. Aplicación Android con reproducción en segundo plano, accesibilidad y pruebas de batería.
5. Automatizar compilación APK, documentar instalación y valorar publicación en Google Play.


## Versión 0.3: mejoras experimentales del OCR

- El modo automático compara el OCR de la foto original con una versión en blanco y negro mediante umbral adaptativo.
- El filtro utiliza un margen más amplio para intentar descartar texto tenue que se transparenta desde el reverso.
- Se limita el tamaño de procesamiento para evitar consumir demasiada memoria en móviles y las dos lecturas se hacen en secuencia.
- Se configura Tesseract para reconocer una página como un bloque de texto, un ajuste habitual para páginas de libros.

**Importante:** no existe un filtro que pueda separar perfectamente el texto del anverso y del reverso en todas las fotografías. La versión 0.3 necesita probarse con páginas reales; el modo «Foto original» permite comparar el resultado cuando el filtro no ayuda.
