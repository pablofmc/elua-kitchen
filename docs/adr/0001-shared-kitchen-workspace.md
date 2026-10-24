# Una sola cocina compartida, sin datos por usuario

Elúa Kitchen es la herramienta de una sola panadería: todas las personas con sesión iniciada trabajan sobre las mismas recetas, ingredientes y lotes. Por eso las tablas no tienen `user_id` y las políticas de RLS solo exigen una sesión real (rol `authenticated` y no anónima), sin filtrar filas por dueño. Quién entra se controla en Auth: los registros nuevos se apagan después del primer inicio de sesión.

## Considered options

- **`user_id` en cada fila con políticas por dueño:** se descartó porque la clienta y quien la ayude en la cocina necesitan ver lo mismo, y repartir recetas por persona no refleja cómo trabaja Elúa.
- **Una tabla de "cocinas" con miembros:** sería lo correcto si la app atendiera varias panaderías (Fase 4 o un producto para terceros). Hoy es complejidad sin uso; si llega ese momento, se agrega `kitchen_id` y este ADR se reemplaza.

## Consequences

- Cualquier cuenta creada en Auth ve y edita todo. Mantener los registros cerrados en Supabase es parte de la seguridad, no un detalle de configuración.
