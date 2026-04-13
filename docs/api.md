# Referencia API - Fragify

## Autenticación

Todos los endpoints protegidos requieren autenticación mediante JWT token.

### Login Steam
```
POST /api/auth/steam
```

### Login Email/Password
```
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
```

## Endpoints Principales

### Obtener Perfil de Jugador
```
GET /api/players/:steamId
```

### Obtener Leaderboards
```
GET /api/leaderboards?mode=premier&sort=elo
```

### Registrar Partida
```
POST /api/matches
Body: match data
```
