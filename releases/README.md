# Descargas

| Archivo                                        | Versión         | Para qué                                                 | SHA-256                                                            |
| ---------------------------------------------- | --------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| [`plato-demo-0.1.0.apk`](plato-demo-0.1.0.apk) | 0.1.0 (build 1) | Demo: IA, pagos y nube **simulados**, no necesita claves | `6f856f3205da7e3c615ace03d8df6be9c036524946b1757e520449174742f54a` |

- Android 8.0 o superior, teléfonos de 64 bits (arm64-v8a: prácticamente todos desde 2017).
- Firmado con la clave de debug de Android: es solo para pruebas, Google Play no lo acepta.
- Cómo descargarlo: abrí el archivo en GitHub y tocá **Download raw file** (ícono de descarga).
  Desde el celular, abrí el link en el navegador e instalalo (guía en
  [docs/TESTERS.md](../docs/TESTERS.md)).

Los builds siguientes conviene generarlos con EAS (`eas build -p android --profile demo` o
`preview`), que da un link de descarga directo, en lugar de guardarlos en el repositorio.
