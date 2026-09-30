# Uso de IA en el desarrollo

Este proyecto se desarrolló con apoyo de **Claude** (Anthropic), modelo Claude Opus 5.5, en claude.ai, el 30 de septiembre de 2026. Este documento registra los prompts usados, las decisiones que se tomaron en cada paso y cómo se verificó el trabajo.

**Conversación completa:** _[pegar aquí el enlace público de la conversación]_

## Cómo se repartió el trabajo

| Quién | Qué hizo |
| --- | --- |
| Desarrollador (Daniel Borja) | Escribió el entendimiento del proyecto, definió los requisitos, respondió las preguntas de diseño, tomó las decisiones de negocio y redactó las respuestas de `RESPUESTAS.md` |
| IA (Claude) | Redactó el brief técnico, propuso el diseño de datos y la arquitectura, escribió el código, las pruebas y la documentación, y verificó todo contra una base de datos PostgreSQL real |

Las respuestas de `RESPUESTAS.md` son del desarrollador. La IA solo corrigió ortografía y ordenó la redacción, sin cambiar las ideas.

## Decisiones clave

| Decisión | Quién la tomó | Motivo |
| --- | --- | --- |
| PostgreSQL 16 con pgAdmin 4, en lugar de MongoDB | El desarrollador, por recomendación de la IA | El enunciado exige una base de datos relacional SQL y un `database.sql`; pgAdmin ofrece una experiencia visual similar a MongoDB Compass |
| Alcance MVP: sin CRUD de candidatos y vacantes, autenticación, paginación ni historial de estados | El desarrollador | Enfocarse en lo que pide el enunciado |
| La carta de presentación es obligatoria | El desarrollador | Respuesta a pregunta de diseño |
| Un candidato `HIRED` no puede volver a postularse a la misma vacante | El desarrollador | Respuesta a pregunta de diseño |
| Pedir el mismo estado responde 200 sin cambios, no error | El desarrollador | "No es un error, pero prefiero que el estado no cambie" |
| Se permiten saltos y retrocesos entre estados activos | El desarrollador | Poder corregir errores de la postulación o del sistema |
| Palabras clave con la expresión `/\bnode|sql|\bapi/i` | La IA la propuso; el desarrollador la aprobó | Contar "MySQL" y "APIs" sin falsos positivos como "capital" o "rapid" |
| El puntaje negativo se guarda tal cual | El desarrollador | Respuesta a pregunta de diseño |
| Años de experiencia con decimales (`NUMERIC(3,1)`) | El desarrollador | Respuesta a pregunta de diseño |
| Seed con 4 vacantes abiertas y postulaciones de ejemplo | La IA lo propuso; el desarrollador lo aprobó | Con solo 2 vacantes no se puede probar la penalización −2 ni la regla de 30 días |
| Transacción con `SELECT … FOR UPDATE` e índice único parcial | La IA | Evitar postulaciones duplicadas cuando llegan peticiones simultáneas |

## Cómo se verificó el trabajo de la IA

Todo el código se ejecutó contra un PostgreSQL 16 real antes de entregarlo:

- `database.sql` se ejecutó dos veces seguidas sin errores; se comprobó que 7 restricciones rechazan datos inválidos y que los puntajes del seed coinciden con las reglas.
- 8 pruebas automatizadas del cálculo de puntaje y prioridad (`npm test`).
- 13 escenarios de `POST`, 8 de `GET` y 14 de `PUT`, incluido el ciclo completo de rechazo, espera de 30 días y nueva postulación.
- 10 postulaciones idénticas enviadas al mismo tiempo: se guardó 1 y las otras 9 recibieron 409.
- Instalación limpia siguiendo el README desde un clon nuevo del repositorio: las 18 peticiones de `requests.http` respondieron el código HTTP esperado.

## Registro de la conversación

### 1. Brief del proyecto

<details>
<summary>Prompt</summary>

```text
Buenos dias Claude, un gusto saludarte. Necesito diseñar un sistema que responda a las necesidades de una empresa. Se necesita una  API REST para gestionar las postulaciones de candidatos a sus vacantes laborales. Los candidatos se postulan a vacantes publicadas por la empresa, y el equipo de selección necesita almacenar las postulaciones, consultar su estado y calcular automáticamente una prioridad de revisión utilizando reglas de negocio, de modo que los reclutadores atiendan primero los perfiles más afines.
 
Necesito que actues como un API Platform Integration Specialist, Database Administrator (DBA), Query Optimization Specialist o el rol que tu analices conveniente para el desarrollo de este sistema. 
    
Analiza el siguiente entendimiento de proyecto que escribì, crea un brief explicando el proyecto y el desarrollo necesario con sus requerimientos para que pueda entender tu analisis. Puedes hacerme preguntas si es necesario. Entendimiento = 
    
    1. Metodo de evaluacion: logica aplicada, la calidad de las decisiones técnicas, la organización del proyecto, el manejo de errores y la claridad de la solución.
    2. Tecnologias: NodeJs, Librerias if you must, Bases de datos relacional basada en SQL.
    3. Caso de Estudio: 
        1. Empresa requiere un API REST
        2. Gestionar las postulaciones de cantidatos a sus vacantes laborales.
        3. Proceso de usuario: 
            1. Empresa publica la vacante
            2. Candidato consulta informacion de la vacante
            3. Candidato se postula 
            4. Informacion se guarda en una bd
            5. Equipo de seleccion revisa y consulta las postulaciones
                1. Necesidad: 
                    1. Segùn prioridad de revision: refiere a las reglas de negocio
                    2. Efecto: primero los perfiles màs afines a la vacante
        4. Informacion de BD
            1. Candidato
                1. Id candidato
                2. Nombre
                3. correo
                4. años de experiencia
            2. Vacante
                1. id vacanet
                2. titulo de cargo
                3. años minimos de experiencia
                4. estado de vacante
            3. Postulacion
                1. id postulacion
                2. id candidato
                3. id vacante
                4. carta de presentacion
                5. fuente de postulacion
                6. puntaje
                7. prioridad
                8. estado
                9. fecha de creacion
                10. fecha de ultima actualizacion de estado
        5. Requerimientos de diseño:
            1. Diseñar las tablas
            2. Tipos de datos
            3. primary keys
            4. foreign keys
            5. restricciones
            6. demas elementos necesarios
            7. explicar relaciones entre candidatos - vacantes - postulaciones
            8. No se exige implementar endpoints para crear candidatos y vacantes
            9. seed de al menos 3 candidatos y 2 vacantes (1 en estado CLOSED)
        6. Valores Permitidos:
            1. Fuentes de postulacion
                1. REFERRAL
                2. INTERNAL
                3. JOB_BOARD
                4. OTHER
            2. Estados de postulacion
                1. RECIEVED
                2. IN_REVIEW
                3. REJECTED
                4. HIRED
            3. Estado de Vacante
                1. OPEN
                2. CLOSED
                3. Tomar en cuenta: se consideran postulaciones activas aquellas en estado RECIEVED o IN_REVIEW
                4. Estados finales: REJECTED y HIRED
        7. Calculo de Prioridad
            1. Requerimiento: el calculo de prioridad se realiza en el backend, no es valor proporcionado por usuario.
            2. Condicion
                1. +4 Los años de experiencia del candidato son iguales o superiores a los mínimos exigidos por la vacante
                2. +3 La fuente es REFERRAL
                3. +2 La fuente es INTERNAL
                4. +2 La carta de presentación contiene alguna de las palabras "node", "sql" o "api"
                5. +1 La carta de presentación tiene más de 500 caracteres
                6. -2 El candidato tiene 3 o más postulaciones activas en otras vacantes
            3. Prioridad
                1. TOP  puntaje 7+
                2. HIGH puntaje 5 - 6
                3. MEDIUM puntaje 3 - 4
                4. LOW puntaje 0 - 2
        8. Funciones Obligatorias
            1. Registrar una postulación
            Implementar:
            POST /applications
            Ejemplo de cuerpo de solicitud:
            {
            "candidateId": 3,
            "vacancyId": 1,
            "source": "REFERRAL",
            "coverLetter": "I have four years of experience building REST APIs with Node.js and SQL databases"
            }
            La operación debe, como mínimo:
                1. Validar los datos obligatorios.
                2. Validar que la fuente de la postulación sea permitida.
                3. Verificar que el candidato exista.
                4. Verificar que la vacante exista y se encuentre en estado OPEN.
                5. Aplicar la regla de duplicidad descrita en la sección 8.
                6. Consultar la información necesaria para aplicar las reglas de prioridad.
                7. Calcular el puntaje y determinar la prioridad.
                8. Registrar la postulación en la base de datos.
                9. Asignar RECEIVED como estado inicial.
                10. Retornar una respuesta HTTP coherente con el resultado de la operación.
            2. Consultar postulaciones
            Implementar:
            GET /applications
            La respuesta debe incluir la información de la postulación y, como mínimo, el nombre y correo
            electrónico del candidato y el título de la vacante.
            Los resultados deben retornarse ordenados por puntaje de mayor a menor y, en caso de empate, por
            fecha de creación (la más antigua primero).
            También debe permitir filtrar por estado, por vacante o por ambos criterios combinados:
            GET /applications?status=IN_REVIEW
            GET /applications?status=RECEIVED&vacancyId=1
            3. Cambiar el estado de una postulación
            Implementar:
            PUT /applications/:id/status
            Ejemplo de cuerpo de solicitud:
            {
            "status": "IN_REVIEW"
            }
            La operación debe validar:
            • Que la postulación exista.
            • Que el nuevo estado corresponda a uno de los estados permitidos.
            • Que una postulación en estado final (REJECTED o HIRED) no pueda cambiar de estado.
            • Que se actualice la fecha de última actualización de estado.
            • Que los errores sean respondidos mediante códigos HTTP apropiados.
        9. Regla de limitacion
            1. Los candidatos no pueden postularse a las vacantes que ya tienen postulado. Solamente pueden volver a postular cuando hayan transcurrido minimop 30 dias desde la fecha de rechazo.
        10. Implementacion de Pruebas
            1. implementar 3 priebas automatizadas relacionadas con la logica de calculo de puntaje y prioridad.  
        11. Fundamentos de IA
            1. Agregar un archivo de RESPUESTAS.md

Necesito que como primer paso escribamos el BRIEF del proyecto para comenzar a desarrollar. Toma en cuenta estos requerimientos finales para el proyecto. Entregables=
    
    1. Código fuente de la aplicación.
    2. package.json y archivo de bloqueo de dependencias generado por el gestor utilizado.
    3. database.sql con las instrucciones necesarias para crear las tablas y estructuras de base de
    datos requeridas, junto con los datos de prueba de candidatos y vacantes.
    4. .env.example con las variables de entorno necesarias, sin contraseñas o credenciales reales.
    5. RESPUESTAS.md con las respuestas de la sección de inteligencia artificial. 
    6. README.md con instrucciones para instalar dependencias, configurar la base de datos, ejecutar
    la aplicación y probar los endpoints
    7. Las pruebas automatizadas implementadas.
    8. No incluya la carpeta node_modules en la entrega
    9. Se valorará el uso adecuado de variables de entorno y la ausencia de credenciales sensibles en
    el código.
    10. Se valorará la separación de responsabilidades, legibilidad, nombres adecuados y manejo
    consistente de errores.
    11. Las decisiones técnicas que considere relevantes pueden explicarse brevemente en
    README.md.
```

</details>

**Resultado:** la IA asumió el rol de *Backend Engineer (Node.js) con responsabilidades de DBA* y redactó un brief técnico con resumen, alcance, stack, modelo de datos (tablas, tipos, llaves, restricciones e índices), reglas de negocio, especificación de endpoints, arquitectura por capas, manejo de errores, plan de pruebas, entregables y plan por fases. Detectó que `RECIEVED` debía escribirse `RECEIVED` y dejó 10 preguntas de diseño abiertas.

### 2. Respuestas a las preguntas de diseño

<details>
<summary>Prompt</summary>

```text
Excelente gracias por tu analisis. Estos son mis comentarios: 

Creamos el MVP del proyecto dejemos afuera del alcance los • Endpoints para crear o editar candidatos y vacantes (el enunciado lo excluye).
• Autenticación y roles (reclutador vs. candidato).
• Paginación del listado, frontend y despliegue.
• Historial de cambios de estado en una tabla aparte.

Utilicemos MongoDB compass porfavor, prefiero utilizarlo pues es màs facil para mi comprenderlo. 

para el .env pongamos un .env example para facilitar la instalacion. ayudame en poner aqui se pone tu direccion URI de mongo

Respuestas a tus preguntas: 

1. Preguntas para RESPUESTAS.md te las voy a dar al final, completemos el proyecto y te las mando.
2. como vez la integracion de MongoDB Compass?
3. Si es obligatoria la cover
4. No puede volver a postularse
5. No es un error pero prefiero que el estado no cambie
6. No hay saltos disponibles, agreguemos la explicacion al readme
7. Si
8. Si se guarda el puntaje negativo
9. Si pueden ser
10. Si incluyamos explica en readme
```

</details>

**Resultado:** el brief se actualizó con las decisiones. La IA **recomendó no usar MongoDB**, porque el enunciado exige una base de datos relacional SQL y un `database.sql`, y evalúa tablas, llaves foráneas y restricciones. Explicó que MongoDB Compass es solo una herramienta visual y propuso PostgreSQL con pgAdmin 4 (o DBeaver) como alternativa equivalente.

### 3. Confirmación del motor y fase 1

<details>
<summary>Prompt</summary>

```text
Excelente analisis para el no uso de Mongo, muchas gracias incluyamos un paso a paso en el readme para su implementacion. 

Sabes, creo que podemos permitir los saltos por si el usuario tiene errores dentro de la postulacion o del sistema. 

Arranquemos la fase 1 porfavor, incluye las instrucciones para crear rapidamente la estructura dentro de VS code, los commits para cada fase y guiame en la implementacion del codigo.
```

</details>

**Resultado:** se confirmó PostgreSQL con pgAdmin y se permitieron los saltos entre estados activos. La IA escribió `database.sql`, `.env.example` y `.gitignore`, los probó en PostgreSQL 16 y entregó una guía con comandos para crear la estructura en VS Code, pasos en pgAdmin y los mensajes de commit de cada fase.

### 4. Proyecto completo

<details>
<summary>Prompt</summary>

```text
es un sistema linux, creo que solo me dara tiempo de hacer un commit por fase porfavor. Crea el archivo completo para optimizar tiempos.
```

</details>

**Resultado:** la IA construyó el proyecto completo en 7 commits, uno por fase: base de datos; configuración, conexión y errores; dominio y pruebas; `POST`; `GET`; `PUT`; y documentación. Cada fase se probó contra PostgreSQL antes de su commit (ver [Cómo se verificó el trabajo de la IA](#cómo-se-verificó-el-trabajo-de-la-ia)).

### 5. Respuestas de la sección de IA

<details>
<summary>Prompt</summary>

```text
Primero, escribe un commit para el push de la aplicacion completa. Segundo crea un archivo con las respuestas siguientes = 
Pregunta 1. La empresa desea utilizar un modelo de inteligencia artificial para identificar
automáticamente las habilidades técnicas del candidato a partir de su carta de presentación y
compararlas con las requeridas por la vacante. Explique cómo integraría esta capacidad a la
solución desarrollada.
Como primer punto creo que si se podrìa integrar la IA al sistema actual. Se podria poner una automatizacion del proceso del analisis de datos para poder dar un puntaje y realizar un filtro rapido antes de llegar al equipo evaluador. Creo que podemosintegrar un OCR para evaluar la data proporcionada por el candidato, evaluar con las palabras clave dentro relacionadas a la vacante propuestas por el equipo evaluador. Luego se compara dentro del sistema y se le da un puntaje definitivo. Las limitaciones del sistema que son doble postulacion, màs de una postulacion, etc podrian servir como filtro deifinitivo y eliminar. Aunque si recomeindo que alguien del equipo sea el encargado a evaluar todo el sistema. Al final el objetivo principal es encontrar buenos candidatos, no que el sistema elimine varios solo porque si.
Pregunta 2. Suponga que el modelo de IA devuelve ocasionalmente una respuesta con formato
inválido o habilidades que no existen en el catálogo de la empresa. Explique cómo debería
manejar esta situación el backend.
El sistema puede dar respuestas que no existen o que no estan evaluadas por el equipo. Cada aplicante tiene sus propias maneras de implementar o venderse con sus habilidades. Cambios de lenduaje, de keywords, de idioma e incluso un sistema de evaluacion que no ha sido actualizado peuden llegar a afectar. El backend deberia tomar en cuenta este tipo de respuestas y dar una revision humana. Se detecta los errores o respuestas invalidas, tomar en cuenta la habilidades que no existen y categorizarlo para revision humana.
Pregunta 3. ¿Considera apropiado reemplazar completamente las reglas determinísticas
utilizadas para calcular la prioridad por una decisión realizada por un modelo de IA, teniendo en
cuenta que la decisión afecta directamente a personas? Justifique técnicamente su respuesta.
No, creo que el sistema puede ver mejores resultados al momento de utilizar estos dos sistemas IA + Humanos. Creo que cualquier error dentro del sistema no debe de afectar a los vacantes ni cortarlos solamente porque el diseñador no supo como referir o integrarlos. Creo que definitivamente debemos de dejar una revision humana para no afectar totalmente a los vacantes.
```

</details>

**Resultado:** las respuestas se guardaron en `RESPUESTAS.md` con corrección de ortografía y redacción, conservando las ideas del desarrollador, en un commit adicional. La IA sugirió posibles refuerzos técnicos (dónde integrar el modelo, validar contra un esquema, justificar con reproducibilidad y explicabilidad), pero las respuestas entregadas son las del desarrollador.

### 6. Registro del uso de IA

<details>
<summary>Prompts</summary>

```text
Necesito importar el chat de esta conversacion e incluirlo en el readme, tengo que hacer publica esta conversacion o como puedo implementar esto?
```

```text
Crea unicamente el archivo de USO de IA .md porfavor asi lo agrego
```

</details>

**Resultado:** la IA explicó cómo compartir la conversación con un enlace público y generó este documento.
