# API de Postulaciones a Vacantes

API REST para registrar postulaciones de candidatos a vacantes, consultarlas y cambiar su estado. El backend calcula automáticamente un **puntaje** y una **prioridad de revisión** (TOP, HIGH, MEDIUM, LOW), para que el equipo de selección atienda primero los perfiles más afines.

**Stack:** Node.js 22 · Express 5 · PostgreSQL 16 · `pg` (sin ORM) · `dotenv` · `node:test`

---

## Contenido

1. [Requisitos](#1-requisitos)
2. [Instalación paso a paso en Linux](#2-instalación-paso-a-paso-en-linux)
3. [Ejecutar la API y las pruebas](#3-ejecutar-la-api-y-las-pruebas)
4. [Probar los endpoints](#4-probar-los-endpoints)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Datos de prueba (seed)](#6-datos-de-prueba-seed)
7. [Errores](#7-errores)
8. [Estructura del proyecto](#8-estructura-del-proyecto)
9. [Decisiones técnicas](#9-decisiones-técnicas)
10. [Fuera de alcance (MVP)](#10-fuera-de-alcance-mvp)
11. Uso de IA en el desarrollo. 
---

## 1. Requisitos

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Node.js | 20 o superior (probado con 22) | Ejecutar la API |
| npm | El que trae Node | Instalar dependencias |
| PostgreSQL | 13 o superior (probado con 16) | Base de datos |
| pgAdmin 4 | Cualquiera reciente (opcional) | Ver y administrar la base de datos de forma visual |

## 2. Instalación paso a paso en Linux

Los comandos son para Ubuntu / Debian. Ejecútalos en la terminal (en VS Code: **Ctrl + ñ** o **Ctrl + `**).

### 2.1 Node.js

Comprueba si ya lo tienes:

```bash
node -v   # debe mostrar v20 o superior
```

Si no lo tienes, la forma recomendada es con [nvm](https://github.com/nvm-sh/nvm): instálalo siguiendo su README y luego:

```bash
nvm install 22
nvm use 22
```

### 2.2 PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql
sudo systemctl enable --now postgresql

# Asigna una contraseña al usuario "postgres" (la usarás en el .env y en pgAdmin)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'tu_contraseña';"
```

> En Ubuntu 24.04, `apt install postgresql` instala la versión 16.

### 2.3 pgAdmin 4 (herramienta visual, opcional)

Comandos del [repositorio oficial de pgAdmin](https://www.pgadmin.org/download/pgadmin-4-apt/):

```bash
sudo install -d -m 0755 /etc/apt/keyrings
curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo gpg --dearmor -o /etc/apt/keyrings/packages-pgadmin-org.gpg
sudo sh -c 'echo "deb [signed-by=/etc/apt/keyrings/packages-pgadmin-org.gpg] https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list && apt update'
sudo apt install -y pgadmin4-desktop
```

### 2.4 Crear la base de datos y cargar `database.sql`

`database.sql` crea las tablas, restricciones e índices, y carga los datos de prueba. Se puede ejecutar varias veces: siempre deja la base en el mismo estado inicial.

**Opción A: con pgAdmin (visual)**

1. Abre pgAdmin. La primera vez, registra tu servidor: clic derecho en **Servers → Register → Server…**
   - Pestaña *General* → **Name:** `Local`
   - Pestaña *Connection* → **Host:** `localhost` · **Port:** `5432` · **Username:** `postgres` · **Password:** la que definiste en el paso 2.2 · activa *Save password*
2. Expande **Servers → Local**, clic derecho en **Databases → Create → Database…**, escribe `applications_db` y guarda.
3. Selecciona `applications_db` y abre **Tools → Query Tool**.
4. Con el ícono de carpeta (**Open File**) abre `database.sql` y ejecútalo con **F5**. Debe aparecer *Query returned successfully*.
5. Para ver los datos: **applications_db → Schemas → public → Tables**, clic derecho en una tabla → **View/Edit Data → All Rows**.

**Opción B: con la terminal**

```bash
sudo -u postgres createdb applications_db
psql "postgresql://postgres:tu_contraseña@localhost:5432/applications_db" -f database.sql
```

### 2.5 Configurar las variables de entorno

```bash
cp .env.example .env
```

Abre `.env` y coloca tu URI de conexión:

```bash
PORT=3000
DATABASE_URL=postgresql://postgres:tu_contraseña@localhost:5432/applications_db
```

> `.env` está en `.gitignore`: tus credenciales nunca se suben al repositorio. Si tu contraseña tiene caracteres especiales (`@`, `:`, `/`, `#`), escríbelos codificados en la URI (por ejemplo `@` → `%40`).

### 2.6 Instalar dependencias

```bash
npm ci   # instala exactamente las versiones de package-lock.json
```

## 3. Ejecutar la API y las pruebas

```bash
npm run dev   # desarrollo: se reinicia sola al guardar cambios
npm start     # modo normal
npm test      # pruebas automatizadas del cálculo de puntaje y prioridad
```

Al iniciar verás `[server] API escuchando en http://localhost:3000`. Si falta el `.env` o la contraseña es incorrecta, la API se detiene con un mensaje que explica qué revisar.

Comprobación rápida:

```bash
curl http://localhost:3000/health   # {"status":"ok"}
```

## 4. Probar los endpoints

Los ejemplos usan `curl`. También puedes usar el archivo `requests.http` con la extensión **REST Client** de VS Code: abre el archivo y haz clic en *Send Request* sobre cada petición.

> Para repetir los escenarios desde cero, vuelve a ejecutar `database.sql`.

### 4.1 `POST /applications` — Registrar una postulación

```bash
curl -i -X POST http://localhost:3000/applications \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": 3,
    "vacancyId": 1,
    "source": "REFERRAL",
    "coverLetter": "I have four years of experience building REST APIs with Node.js and SQL databases"
  }'
```

Respuesta **201 Created** (con el encabezado `Location: /applications/{id}`):

```json
{
  "data": {
    "id": 6,
    "candidateId": 3,
    "vacancyId": 1,
    "coverLetter": "I have four years of experience building REST APIs with Node.js and SQL databases",
    "source": "REFERRAL",
    "score": 9,
    "priority": "TOP",
    "status": "RECEIVED",
    "createdAt": "2026-09-30T19:18:12.055Z",
    "statusUpdatedAt": "2026-09-30T19:18:12.055Z",
    "scoreBreakdown": [
      { "rule": "MEETS_MIN_EXPERIENCE", "points": 4 },
      { "rule": "SOURCE_REFERRAL", "points": 3 },
      { "rule": "COVER_LETTER_KEYWORDS", "points": 2 }
    ]
  }
}
```

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `candidateId` | número entero | Sí | Positivo; el candidato debe existir |
| `vacancyId` | número entero | Sí | Positivo; la vacante debe existir y estar `OPEN` |
| `source` | texto | Sí | `REFERRAL`, `INTERNAL`, `JOB_BOARD` u `OTHER` |
| `coverLetter` | texto | Sí | No vacía, máximo 5000 caracteres |

`score`, `priority` y `status` **no** se aceptan del cliente: si se envían, se ignoran. `scoreBreakdown` explica qué reglas sumaron o restaron; no se guarda en la base de datos.

### 4.2 `GET /applications` — Consultar postulaciones

```bash
curl "http://localhost:3000/applications"
curl "http://localhost:3000/applications?status=IN_REVIEW"
curl "http://localhost:3000/applications?status=RECEIVED&vacancyId=1"
```

Respuesta **200 OK**, ordenada por puntaje de mayor a menor y, en empate, por fecha de creación (la más antigua primero):

```json
{
  "count": 1,
  "data": [
    {
      "id": 2,
      "status": "IN_REVIEW",
      "source": "OTHER",
      "score": 6,
      "priority": "HIGH",
      "coverLetter": "Tengo experiencia creando reportes y consultas SQL para áreas comerciales.",
      "createdAt": "2026-09-25T19:19:23.893Z",
      "statusUpdatedAt": "2026-09-28T19:19:23.893Z",
      "candidate": { "id": 4, "fullName": "José Ramírez", "email": "jose.ramirez@example.com" },
      "vacancy": { "id": 2, "title": "Data Analyst SQL" }
    }
  ]
}
```

| Parámetro | Opcional | Valores |
| --- | --- | --- |
| `status` | Sí | `RECEIVED`, `IN_REVIEW`, `REJECTED`, `HIRED` |
| `vacancyId` | Sí | Número entero positivo |

Un filtro sin resultados (incluso una vacante que no existe) responde **200** con `"data": []`.

### 4.3 `PUT /applications/:id/status` — Cambiar el estado

```bash
curl -X PUT http://localhost:3000/applications/1/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "IN_REVIEW" }'
```

Respuesta **200 OK**:

```json
{
  "changed": true,
  "data": {
    "id": 1,
    "candidateId": 4,
    "vacancyId": 1,
    "coverLetter": "Busco crecer como desarrollador backend en un equipo con buenas prácticas.",
    "source": "JOB_BOARD",
    "score": 0,
    "priority": "LOW",
    "status": "IN_REVIEW",
    "createdAt": "2026-09-24T19:20:02.100Z",
    "statusUpdatedAt": "2026-09-30T19:20:02.310Z"
  }
}
```

`changed` es `false` cuando se pide el mismo estado que ya tiene: no es un error, pero no se modifica nada (ni siquiera `statusUpdatedAt`).

### 4.4 Escenarios para probar con el seed

Ejecuta `database.sql` antes de empezar y sigue el orden de la tabla:

| # | Petición | Resultado esperado |
| --- | --- | --- |
| 1 | `POST` María (3) → vacante 1, `REFERRAL`, carta del enunciado | 201, puntaje 9, TOP |
| 2 | Repetir la petición 1 | 409 `DUPLICATE_APPLICATION` (ya tiene una activa) |
| 3 | `POST` José (4) → vacante 4, `JOB_BOARD`, carta sin palabras clave | 201, puntaje 2 (+4 experiencia −2 por 3 activas), LOW |
| 4 | `POST` Carlos (2) → vacante 1 | 201: su rechazo fue hace 45 días |
| 5 | `POST` Ana (1) → vacante 2 | 409 con `canReapplyAt`: su rechazo fue hace 10 días |
| 6 | `POST` a la vacante 5 | 409 `VACANCY_NOT_OPEN` (está `CLOSED`) |
| 7 | `POST` con `candidateId: 99` | 404 `CANDIDATE_NOT_FOUND` |
| 8 | `GET /applications?status=RECEIVED&vacancyId=1` | Solo postulaciones recibidas de la vacante 1 |
| 9 | `PUT /applications/1/status` con `IN_REVIEW` y luego con `RECEIVED` | 200 y 200 (se permite retroceder) |
| 10 | `PUT /applications/5/status` con `RECEIVED` | 409 `APPLICATION_IN_FINAL_STATE` |

## 5. Reglas de negocio

### 5.1 Puntaje

Se calcula **solo en el backend**, una vez, al crear la postulación. Queda como una "fotografía" de ese momento: no se recalcula si luego cambian otras postulaciones del candidato.

| Regla | Puntos |
| --- | --- |
| Años de experiencia del candidato ≥ mínimo de la vacante | +4 |
| Fuente `REFERRAL` | +3 |
| Fuente `INTERNAL` | +2 |
| La carta contiene "node", "sql" o "api" | +2 |
| La carta tiene más de 500 caracteres | +1 |
| El candidato tiene 3 o más postulaciones activas en **otras** vacantes | −2 |

El puntaje va de **−2 a 10**. Los años de experiencia admiten decimales (por ejemplo 2.5).

**Palabras clave.** Se buscan sin distinguir mayúsculas con la expresión `/\bnode|sql|\bapi/i`:

- "node" y "api" deben iniciar una palabra: cuentan *Node.js*, *nodes* y *APIs*, pero no *capital* ni *rapid*, que contienen "api" por dentro.
- "sql" cuenta en cualquier posición: *SQL*, *MySQL*, *PostgreSQL* y *NoSQL*.

**Largo de la carta.** Se cuenta después de quitar espacios al inicio y al final, y por caracteres reales: un emoji cuenta como 1.

### 5.2 Prioridad

| Prioridad | Puntaje |
| --- | --- |
| TOP | 7 o más |
| HIGH | 5 a 6 |
| MEDIUM | 3 a 4 |
| LOW | 2 o menos (incluye puntajes negativos, que se guardan tal cual) |

### 5.3 Regla de duplicidad

Se revisa la postulación **más reciente** del mismo candidato a la misma vacante:

| Situación | Resultado |
| --- | --- |
| No existe ninguna | Se permite |
| Está activa (`RECEIVED` o `IN_REVIEW`) | 409, ya tiene una postulación activa |
| Está `HIRED` | 409, ya fue contratado para esa vacante |
| Está `REJECTED` hace menos de 30 días | 409, con la fecha desde la que podrá volver (`canReapplyAt`) |
| Está `REJECTED` hace 30 días o más | Se permite |

La fecha de rechazo es `status_updated_at`: como un estado final no puede cambiar, esa fecha ya no se mueve.

### 5.4 Estados y transiciones

- **Activos:** `RECEIVED` (estado inicial) e `IN_REVIEW`.
- **Finales:** `REJECTED` y `HIRED`. Desde un estado final no se puede cambiar (409).
- **Se permiten saltos y retrocesos entre estados activos.** Por ejemplo, `RECEIVED` → `HIRED` o `IN_REVIEW` → `RECEIVED`. Así el equipo puede corregir errores en la postulación o del sistema sin quedar bloqueado.
- Pedir el mismo estado que ya tiene responde 200 con `changed: false`, sin modificar nada.
- Cada cambio real actualiza `status_updated_at`.

## 6. Datos de prueba (seed)

**Vacantes:** 4 abiertas y 1 cerrada. El mínimo pedido era 2, pero con solo 2 vacantes no se puede probar la penalización −2: el candidato necesita 3 postulaciones activas en otras vacantes, más la nueva.

| Id | Título | Mínimo de años | Estado |
| --- | --- | --- | --- |
| 1 | Backend Developer Node.js | 3 | OPEN |
| 2 | Data Analyst SQL | 2 | OPEN |
| 3 | Frontend Developer | 1 | OPEN |
| 4 | QA Engineer | 2 | OPEN |
| 5 | DevOps Engineer | 5 | CLOSED |

**Candidatos:**

| Id | Nombre | Años de experiencia | Para probar |
| --- | --- | --- | --- |
| 1 | Ana López | 6 | Rechazo reciente: aún no puede volver a la vacante 2 |
| 2 | Carlos Méndez | 1 | Rechazo antiguo: ya puede volver a la vacante 1 |
| 3 | María Pérez | 4 | El ejemplo del enunciado → 9, TOP |
| 4 | José Ramírez | 2.5 | Penalización −2 y años con decimales |

**Postulaciones de ejemplo** (puntajes calculados con las mismas reglas del backend; el desglose está comentado en `database.sql`):

| Id | Candidato → Vacante | Puntaje | Estado | Para probar |
| --- | --- | --- | --- | --- |
| 1 | José → 1 | 0, LOW | RECEIVED | Activa 1 de 3 de José |
| 2 | José → 2 | 6, HIGH | IN_REVIEW | Activa 2 de 3 de José |
| 3 | José → 3 | 4, MEDIUM | RECEIVED | Activa 3 de 3 de José |
| 4 | Carlos → 1 | 2, LOW | REJECTED hace 45 días | Puede volver a postularse |
| 5 | Ana → 2 | 8, TOP | REJECTED hace 10 días | Recibe 409 con `canReapplyAt` |

Los correos usan el dominio reservado `example.com`, que no pertenece a nadie.

## 7. Errores

Todos los errores tienen el mismo formato JSON, con un `code` estable que el cliente puede usar sin leer el mensaje:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La solicitud contiene datos inválidos",
    "details": [
      { "field": "source", "message": "Debe ser uno de: REFERRAL, INTERNAL, JOB_BOARD, OTHER" }
    ]
  }
}
```

Los errores de formato se devuelven **todos juntos**, para que el cliente corrija de una sola vez.

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Datos faltantes, con tipo incorrecto o fuera de los valores permitidos |
| 400 | `INVALID_JSON` | El cuerpo no es un JSON válido |
| 404 | `CANDIDATE_NOT_FOUND` · `VACANCY_NOT_FOUND` · `APPLICATION_NOT_FOUND` | El recurso no existe |
| 404 | `ROUTE_NOT_FOUND` | La ruta no existe |
| 409 | `VACANCY_NOT_OPEN` | La vacante está cerrada |
| 409 | `DUPLICATE_APPLICATION` | Regla de duplicidad (`details.reason` indica cuál) |
| 409 | `APPLICATION_IN_FINAL_STATE` | Se intentó cambiar una postulación `REJECTED` o `HIRED` |
| 413 | `PAYLOAD_TOO_LARGE` | El cuerpo supera 100 KB |
| 500 | `INTERNAL_ERROR` | Error inesperado; el detalle solo se registra en el servidor |

**Criterio:** 400 = la petición está mal formada; 404 = el recurso no existe; 409 = la petición es válida pero choca con el estado actual de los datos.

## 8. Estructura del proyecto

```text
applications-api/
├── src/
│   ├── app.js                  # Crea la app Express: middlewares, rutas y errores
│   ├── server.js               # Arranque: valida .env, prueba la BD y abre el puerto
│   ├── config/env.js           # Lee y valida las variables de entorno
│   ├── db/pool.js              # Pool de conexiones + withTransaction()
│   ├── domain/
│   │   ├── constants.js        # Valores permitidos y parámetros de negocio
│   │   └── scoring.js          # Cálculo de puntaje y prioridad (funciones puras)
│   ├── validators/             # Formato de body, params y query
│   ├── routes/                 # Método + URL → controlador
│   ├── controllers/            # Petición HTTP → servicio → respuesta
│   ├── services/               # Reglas de negocio y transacciones
│   ├── repositories/           # SQL parametrizado, snake_case ↔ camelCase
│   └── errors/                 # AppError y manejador central de errores
├── tests/scoring.test.js       # Pruebas del cálculo de puntaje y prioridad
├── database.sql                # Tablas, restricciones, índices y seed
├── requests.http               # Peticiones de ejemplo (REST Client)
├── .env.example                # Variables de entorno sin credenciales reales
└── RESPUESTAS.md               # Respuestas de la sección de IA
```

Cada petición recorre las capas en orden: **ruta → controlador → validador → servicio → repositorio**. El cálculo de puntaje vive aparte, en `domain/`, sin depender de Express ni de la base de datos.

## 9. Decisiones técnicas

- **PostgreSQL con SQL escrito a mano (sin ORM).** Muestra el diseño relacional y deja visibles las consultas y transacciones. Todas las consultas son parametrizadas (`$1`, `$2`…), lo que evita inyección SQL.
- **Reglas protegidas también en la base de datos.** Los `CHECK` validan valores permitidos, rangos y la coherencia entre puntaje y prioridad. Las llaves foráneas usan `ON DELETE RESTRICT` para no perder historial. Si el backend tuviera un error, la base de datos no aceptaría datos inválidos.
- **Índice único parcial `uq_applications_active_pair`.** Garantiza como máximo una postulación **activa** por candidato y vacante, y aun así permite volver a postularse después de un rechazo.
- **Condiciones de carrera controladas.** El registro corre en una transacción que bloquea la fila del candidato (`SELECT … FOR UPDATE`). Así, dos peticiones simultáneas del mismo candidato se procesan una tras otra. Se comprobó enviando 10 peticiones idénticas al mismo tiempo: se guardó 1 y las otras 9 recibieron 409.
- **Cambio de estado atómico.** Un solo `UPDATE … WHERE status IN ('RECEIVED','IN_REVIEW')` evita que otra petición modifique la fila entre revisar y actualizar.
- **Tiempos con el reloj de la base de datos.** La regla de 30 días se calcula en SQL con `now()`, para no depender de diferencias de hora entre servidores.
- **`NUMERIC(3,1)` para los años de experiencia.** Admite decimales exactos, sin los errores de redondeo de los tipos de punto flotante.
- **Pocas dependencias.** Solo `express`, `pg` y `dotenv`. Las pruebas usan `node:test`, incluido en Node.
- **Configuración validada al arrancar.** Si falta `DATABASE_URL` o la base de datos no responde, la API no inicia y muestra qué revisar.

## 10. Fuera de alcance (MVP)

- Endpoints para crear o editar candidatos y vacantes (el enunciado no los exige).
- Autenticación y roles (reclutador vs. candidato).
- Paginación del listado, frontend y despliegue.
- Historial de cambios de estado en una tabla aparte.

## 11. Uso de IA en el Desarrollo
https://claude.ai/share/3abd17af-6fda-4965-81cf-8daaa2487af8

