# Inicio Rápido - Fragify

## Requisitos

- Node.js 18+
- npm o yarn
- Cuenta Steam OpenID
- TiDB Cloud Database

## Instalación

```bash
git clone https://github.com/joseangelalejo/Fragify_CS2SVSS.git
cd Fragify_CS2SVSS
npm install
```

## Configuración

1. Crear archivo `.env.local`:
```env
NEXT_PUBLIC_STEAM_API_KEY=your_key_here
DATABASE_URL=your_tidb_connection_string
TELEGRAM_BOT_TOKEN=your_bot_token
```

2. Ejecutar migraciones:
```bash
npm run db:migrate
```

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

Acceder a `http://localhost:3000`
