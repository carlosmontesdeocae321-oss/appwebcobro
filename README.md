# AppWebCobro

> Dashboard estático para gestionar un registro de "apps" que muestran un aviso visual (gate) en landings estáticas.

## Resumen

- Proyecto 100% cliente: contiene un dashboard para editar `data/apps.json`, un `gate.js` público que las landings cargan y un loader (`billing-gate-loader.js`) para inyectar el gate.
- Incluye un workflow de GitHub Actions (`.github/workflows/update-apps.yml`) para actualizar `data/apps.json` mediante `repository_dispatch` de forma segura.

## Estructura principal

- `index.html` — dashboard UI (edición, export, push)
- `dashboard.js` — lógica del dashboard y editor por app
- `styles.css` — estilos del dashboard
- `data/apps.json` — registro de apps (id, name, whatsapp, enabled, message, startDate, expirationDate)
- `gate.js` — script público que se inyecta en landings y muestra el botón `!` y el card
- `push_to_github.ps1` — script auxiliar para hacer push local al repo remoto (opcional)
- `.github/workflows/update-apps.yml` — workflow que actualiza `data/apps.json` al recibir `repository_dispatch`

## Cómo probar localmente

1. Levanta un servidor estático desde la carpeta `appwebcobro`:

```powershell
cd C:\Users\DarthRoberth\Desktop\appwebcobro
npx http-server -p 8090 --cors -c-1
```

2. Abre `http://localhost:8090` y edita las apps en el dashboard.
3. Usa "Descargar JSON" para exportar o el botón "Push a GitHub" si ya configuraste un token (opción temporal) o el endpoint de dispatch (recomendado).

## Push seguro (recomendado)

- Se incluye un workflow que actualiza `data/apps.json` cuando se recibe un evento `repository_dispatch` con el payload.
- Flujo seguro sugerido: desplegar una función serverless (Vercel/Netlify/Cloudflare Worker) que valide un secreto y llame a la API de GitHub para emitir `repository_dispatch` hacia este repo. El dashboard POSTea al endpoint serverless con el JSON — no hace falta exponer un PAT en el navegador.

## Nota sobre tokens (si usas la opción sin servidor)

- Crea un Personal Access Token (preferentemente "fine‑grained") con permisos mínimos (Contents: read & write solo en este repo) y con expiración corta (7–30 días).
- Al usarlo en el dashboard, guarda el token únicamente en `sessionStorage` y bórralo al cerrar el modal.

## Siguientes pasos sugeridos

- Si quieres, puedo generar el código del endpoint serverless (lista para desplegar) y adaptar el dashboard para POSTear al mismo. Esto evita que pegues tokens en el navegador.
- También puedo ayudarte a configurar la rama de GitHub Pages si quieres publicar el dashboard.

---

Pequeña nota: este sistema sólo implementa un bloqueo visual (no seguridad real). Para bloqueo total y seguro se necesita control del servidor y autenticación en backend.
