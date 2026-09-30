-- =====================================================================
-- API de Postulaciones — Esquema de base de datos (PostgreSQL 16)
-- =====================================================================
-- Cómo usarlo:
--   1. Crea la base de datos una sola vez (en pgAdmin o en psql):
--        CREATE DATABASE applications_db;
--   2. Conéctate a applications_db y ejecuta ESTE archivo completo.
--
-- El script se puede ejecutar varias veces: borra y recrea las tablas,
-- así que siempre deja la base en el mismo estado inicial.
-- Todo corre dentro de una transacción: si algo falla, no queda nada a medias.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Limpieza (orden inverso a las dependencias)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS vacancies;
DROP TABLE IF EXISTS candidates;

-- ---------------------------------------------------------------------
-- Tabla: candidates
-- Personas que se postulan. No se crean desde la API (solo por seed).
-- ---------------------------------------------------------------------
CREATE TABLE candidates (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name           VARCHAR(150) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  -- NUMERIC(3,1): permite decimales como 2.5 años
  years_of_experience NUMERIC(3,1) NOT NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_candidates_full_name_not_blank
    CHECK (length(trim(full_name)) > 0),
  CONSTRAINT chk_candidates_email_format
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT chk_candidates_years_range
    CHECK (years_of_experience BETWEEN 0 AND 60)
);

-- Correo único sin distinguir mayúsculas: "Ana@x.com" y "ana@x.com" son el mismo
CREATE UNIQUE INDEX uq_candidates_email_lower ON candidates (LOWER(email));

-- ---------------------------------------------------------------------
-- Tabla: vacancies
-- Puestos que publica la empresa. Solo se aceptan postulaciones si están OPEN.
-- ---------------------------------------------------------------------
CREATE TABLE vacancies (
  id                   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title                VARCHAR(150) NOT NULL,
  min_years_experience NUMERIC(3,1) NOT NULL,
  status               VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT chk_vacancies_title_not_blank
    CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_vacancies_min_years_range
    CHECK (min_years_experience BETWEEN 0 AND 60),
  CONSTRAINT chk_vacancies_status
    CHECK (status IN ('OPEN', 'CLOSED'))
);

-- ---------------------------------------------------------------------
-- Tabla: applications
-- Une candidatos con vacantes (relación N:M) y guarda los datos propios
-- de cada postulación. La PK es un id propio y NO el par
-- (candidate_id, vacancy_id), porque un candidato puede volver a
-- postularse a la misma vacante 30 días después de un rechazo.
-- ---------------------------------------------------------------------
CREATE TABLE applications (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id      INTEGER      NOT NULL,
  vacancy_id        INTEGER      NOT NULL,
  cover_letter      TEXT         NOT NULL,
  source            VARCHAR(20)  NOT NULL,
  score             SMALLINT     NOT NULL,
  priority          VARCHAR(10)  NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'RECEIVED',
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  status_updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- RESTRICT: no se puede borrar un candidato o una vacante con historial
  CONSTRAINT fk_applications_candidate
    FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE RESTRICT,
  CONSTRAINT fk_applications_vacancy
    FOREIGN KEY (vacancy_id) REFERENCES vacancies (id) ON DELETE RESTRICT,

  CONSTRAINT chk_applications_cover_letter_length
    CHECK (length(trim(cover_letter)) > 0 AND char_length(cover_letter) <= 5000),
  CONSTRAINT chk_applications_source
    CHECK (source IN ('REFERRAL', 'INTERNAL', 'JOB_BOARD', 'OTHER')),
  CONSTRAINT chk_applications_status
    CHECK (status IN ('RECEIVED', 'IN_REVIEW', 'REJECTED', 'HIRED')),
  CONSTRAINT chk_applications_priority
    CHECK (priority IN ('TOP', 'HIGH', 'MEDIUM', 'LOW')),
  -- Rango posible del puntaje según las reglas de negocio: -2 a 10
  CONSTRAINT chk_applications_score_range
    CHECK (score BETWEEN -2 AND 10),
  -- Red de seguridad: el backend calcula la prioridad, la BD verifica
  -- que sea coherente con el puntaje
  CONSTRAINT chk_applications_priority_matches_score
    CHECK (
         (score >= 7            AND priority = 'TOP')
      OR (score BETWEEN 5 AND 6 AND priority = 'HIGH')
      OR (score BETWEEN 3 AND 4 AND priority = 'MEDIUM')
      OR (score <= 2            AND priority = 'LOW')
    ),
  CONSTRAINT chk_applications_dates
    CHECK (status_updated_at >= created_at)
);

-- ---------------------------------------------------------------------
-- Índices de applications (cada uno responde a una consulta concreta)
-- ---------------------------------------------------------------------

-- Integridad: máximo 1 postulación ACTIVA por candidato y vacante.
-- Es la última defensa si dos peticiones iguales llegan al mismo tiempo.
CREATE UNIQUE INDEX uq_applications_active_pair
  ON applications (candidate_id, vacancy_id)
  WHERE status IN ('RECEIVED', 'IN_REVIEW');

-- Regla de duplicidad (última postulación del par) y conteo de
-- postulaciones activas del candidato. También cubre la FK candidate_id.
CREATE INDEX idx_applications_candidate_vacancy
  ON applications (candidate_id, vacancy_id, created_at DESC);

-- Filtros de GET /applications por vacante y estado. Cubre la FK vacancy_id.
CREATE INDEX idx_applications_vacancy_status
  ON applications (vacancy_id, status);

-- Orden del listado: puntaje de mayor a menor, luego la más antigua primero
CREATE INDEX idx_applications_ranking
  ON applications (score DESC, created_at ASC);

-- =====================================================================
-- SEED — datos de prueba
-- Los ids se generan en orden (1, 2, 3...) porque las tablas se acaban
-- de crear. El README explica qué caso prueba cada registro.
-- =====================================================================

-- Candidatos
INSERT INTO candidates (full_name, email, years_of_experience) VALUES
  ('Ana López',     'ana.lopez@example.com',     6.0),  -- id 1: cumple todos los mínimos
  ('Carlos Méndez', 'carlos.mendez@example.com', 1.0),  -- id 2: no cumple el mínimo de la vacante 1
  ('María Pérez',   'maria.perez@example.com',   4.0),  -- id 3: caso del enunciado → 9 TOP
  ('José Ramírez',  'jose.ramirez@example.com',  2.5);  -- id 4: penalización -2

-- Vacantes (4 abiertas para poder probar la regla -2, 1 cerrada)
INSERT INTO vacancies (title, min_years_experience, status) VALUES
  ('Backend Developer Node.js', 3.0, 'OPEN'),    -- id 1
  ('Data Analyst SQL',          2.0, 'OPEN'),    -- id 2
  ('Frontend Developer',        1.0, 'OPEN'),    -- id 3
  ('QA Engineer',               2.0, 'OPEN'),    -- id 4
  ('DevOps Engineer',           5.0, 'CLOSED');  -- id 5

-- Postulaciones de ejemplo. Puntajes calculados con las mismas reglas
-- del backend (el desglose va en cada comentario).
INSERT INTO applications
  (candidate_id, vacancy_id, cover_letter, source, score, priority, status, created_at, status_updated_at)
VALUES
  -- José → vacante 1. Experiencia 2.5 < 3 (0), JOB_BOARD (0), sin palabras clave (0) = 0 LOW
  (4, 1, 'Busco crecer como desarrollador backend en un equipo con buenas prácticas.',
   'JOB_BOARD', 0, 'LOW', 'RECEIVED',
   now() - interval '6 days', now() - interval '6 days'),

  -- José → vacante 2. Experiencia 2.5 >= 2 (+4), OTHER (0), contiene "SQL" (+2) = 6 HIGH
  (4, 2, 'Tengo experiencia creando reportes y consultas SQL para áreas comerciales.',
   'OTHER', 6, 'HIGH', 'IN_REVIEW',
   now() - interval '5 days', now() - interval '2 days'),

  -- José → vacante 3. Experiencia 2.5 >= 1 (+4), JOB_BOARD (0), sin palabras clave (0) = 4 MEDIUM
  -- Con esta, José queda con 3 postulaciones activas: si se postula a la
  -- vacante 4 recibirá la penalización -2.
  (4, 3, 'Me interesa el desarrollo frontend y el diseño de interfaces accesibles.',
   'JOB_BOARD', 4, 'MEDIUM', 'RECEIVED',
   now() - interval '4 days', now() - interval '4 days'),

  -- Carlos → vacante 1, RECHAZADO hace 45 días: YA puede volver a postularse.
  -- Experiencia 1 < 3 (0), JOB_BOARD (0), contiene "Node" (+2) = 2 LOW
  (2, 1, 'Estoy aprendiendo Node.js y quiero sumarme a un equipo backend.',
   'JOB_BOARD', 2, 'LOW', 'REJECTED',
   now() - interval '50 days', now() - interval '45 days'),

  -- Ana → vacante 2, RECHAZADA hace 10 días: aún NO puede volver a postularse.
  -- Experiencia 6 >= 2 (+4), INTERNAL (+2), contiene "SQL" (+2) = 8 TOP
  (1, 2, 'Trabajo en el área de datos de la empresa y domino SQL avanzado.',
   'INTERNAL', 8, 'TOP', 'REJECTED',
   now() - interval '15 days', now() - interval '10 days');

COMMIT;
