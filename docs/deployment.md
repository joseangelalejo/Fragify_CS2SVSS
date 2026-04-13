# Despliegue - Fragify

## Vercel

### Requisitos

- Cuenta Vercel
- Repositorio en GitHub

### Pasos

1. Conectar repositorio a Vercel
2. Configurar variables de entorno en Vercel Dashboard
3. Deploy automático en cada push a main

```bash
git push origin main
```

## Docker + Proxmox

### Build Docker

```bash
docker build -t fragify:latest .
docker run -p 3000:3000 --env-file .env fragify:latest
```

### Docker Compose

```bash
docker-compose up -d
```

## Performance

- Vercel: Recomendado para máxima velocidad global
- Proxmox: Recomendado para control local y datos privados
