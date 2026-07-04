# Bevero Landing

Statische Vite-Landing mit einer gekapselten React-Insel für die öffentliche
Workflow-Sandbox.

## Lokale Entwicklung

```bash
npm install
npm run dev
npm test
npm run test:e2e
npm run build
```

## Workflow-Sandbox

`src/sandbox-entry.jsx` bindet `<SandboxSection />` am Mountpoint
`#sandbox-root` in `index.html` ein. Die Sandbox demonstriert fünf Abläufe:

- Warenannahme
- Umlagerung
- Auffüllung / Entnahme
- Schichtübergabe
- Korrektur / Freigabe

Alle Daten sind feste, fiktive Seeds. Der Zustand wird ausschließlich unter
`bevero-sandbox:v1` in `sessionStorage` gespeichert und bleibt damit auf den
aktuellen Browser-Tab begrenzt. Ein Reset stellt den Seed wieder her.

Die Sandbox nutzt keine API, keine Supabase-Verbindung, keine Cookies und keine
produktiven Freigaben. Das Schichtübergabe-PDF wird lokal im Browser erzeugt
und ist deutlich als Demo markiert.

## Deployment-Grenze

Deployments gehören ausschließlich zum bestehenden Vercel-Projekt
`bevero-plattform-landing`. Preview und Production sind getrennte Gates;
Production erfordert ein separates L4 Owner-GO.
