# Robbyte eWallet

Aplicacion web personal para controlar ingresos, gastos, prestamos y tarjetas de credito con Firebase y cifrado local.
Permite configurar una moneda principal por pais para formatear todos los montos de la app.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

La configuracion de Vite usa `base: "./"` para funcionar en GitHub Pages sin depender del nombre exacto del repositorio.

## Firebase

La app usa Google Sign-In, Cloud Firestore y App Check opcional mediante `VITE_RECAPTCHA_SITE_KEY`.
Configura en Firebase Authentication el proveedor Google y agrega el dominio de GitHub Pages en dominios autorizados.

Los datos financieros se cifran en el navegador con una clave derivada de un PIN de 6 digitos. Firestore solo recibe payloads cifrados.
