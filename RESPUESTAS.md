# Respuestas — Fundamentos de IA

## Pregunta 1

> La empresa desea utilizar un modelo de inteligencia artificial para identificar automáticamente las habilidades técnicas del candidato a partir de su carta de presentación y compararlas con las requeridas por la vacante. Explique cómo integraría esta capacidad a la solución desarrollada.

Sí considero que se puede integrar la IA al sistema actual. La idea es automatizar el análisis de la información del candidato para asignar un puntaje y hacer un filtro rápido antes de que la postulación llegue al equipo evaluador.

Propongo este flujo:

1. **Extracción de la información.** Integrar un OCR para leer la información que proporciona el candidato y convertirla en datos que el sistema pueda analizar.
2. **Comparación con la vacante.** Evaluar esa información con las palabras clave relacionadas con la vacante, definidas por el equipo evaluador.
3. **Puntaje.** Comparar los resultados dentro del sistema y asignar un puntaje definitivo.
4. **Filtros existentes.** Las reglas que ya tiene el sistema (no postularse dos veces a la misma vacante, la penalización por tener varias postulaciones activas, etc.) pueden servir como filtro definitivo para descartar postulaciones.

Aun así, recomiendo que una persona del equipo sea la encargada de evaluar todo el sistema. Al final, el objetivo principal es encontrar buenos candidatos, no que el sistema elimine a varios solo porque sí.

## Pregunta 2

> Suponga que el modelo de IA devuelve ocasionalmente una respuesta con formato inválido o habilidades que no existen en el catálogo de la empresa. Explique cómo debería manejar esta situación el backend.

El sistema puede dar respuestas que no existen o que no han sido evaluadas por el equipo. Cada candidato tiene su propia manera de presentar y "vender" sus habilidades: los cambios de lenguaje, de palabras clave o de idioma, e incluso un sistema de evaluación que no ha sido actualizado, pueden llegar a afectar el resultado.

Por eso el backend debe tomar en cuenta este tipo de respuestas y enviarlas a revisión humana:

1. **Detectar** los errores y las respuestas con formato inválido.
2. **Identificar** las habilidades que no existen en el catálogo de la empresa, en lugar de ignorarlas.
3. **Categorizar** estos casos para que el equipo los revise, en vez de aceptarlos o descartarlos automáticamente.

## Pregunta 3

> ¿Considera apropiado reemplazar completamente las reglas determinísticas utilizadas para calcular la prioridad por una decisión realizada por un modelo de IA, teniendo en cuenta que la decisión afecta directamente a personas? Justifique técnicamente su respuesta.

No. Considero que el sistema obtiene mejores resultados al combinar ambos enfoques: IA y revisión humana.

Cualquier error dentro del sistema no debe afectar a los candidatos ni descartarlos solamente porque quien diseñó el sistema no supo cómo referirlos o integrarlos. Por eso, definitivamente debemos mantener una revisión humana, para que la decisión no afecte por completo a los candidatos.