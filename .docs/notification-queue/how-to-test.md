# Manual del Sistema de Notificaciones

Este documento explica cómo funciona el sistema de notificaciones, cómo probarlo correctamente y cómo solucionar problemas comunes.

## Arquitectura del Sistema

El sistema de notificaciones consta de estos componentes principales:

1. **Base de datos**: Almacena tareas (`tasks`), plantillas (`notification_templates`) y logs (`notification_logs`)
2. **Cola de trabajos**: Utiliza Bull + Redis o un sistema de cola en memoria
3. **Scheduler**: Verifica periódicamente tareas pendientes
4. **Worker**: Procesa los trabajos para enviar notificaciones
5. **API REST**: Permite gestionar tareas y trabajos

## Estados de las Tareas

Una tarea (`task`) puede estar en uno de estos estados:

- **created**: La tarea está programada pero aún no se ha procesado
- **processing**: La tarea está siendo procesada en este momento
- **completed**: La tarea se ha procesado exitosamente
- **failed**: Ocurrió un error al procesar la tarea (solo si se configura así)

## Flujo normal de una tarea

1. Se crea una tarea con estado **created**
2. El scheduler verifica periódicamente las tareas pendientes
3. Cuando llega la fecha y hora programada, la tarea se añade a la cola como un job
4. El worker procesa el job y cambia el estado de la tarea a **processing**
5. Se envía la notificación según las plantillas configuradas
6. Si es exitoso, la tarea cambia a estado **completed**

## Cómo reiniciar la memoria/cola

Para reiniciar completamente la cola:

1. **Si usas Redis**:
   ```bash
   # Conexión a Redis
   redis-cli
   # Borrar todas las claves relacionadas con Bull
   KEYS bull:notification:* 
   DEL [claves encontradas]
   ```

2. **Si usas el modo simulado (sin Redis)**:
   - Reinicia la aplicación (esto limpia la memoria)
   - También puedes usar el endpoint `POST /jobs/cleanup` con un valor grande para `grace`

## Endpoints principales para pruebas

### 1. Verificar tareas pendientes
```bash
POST /jobs/check
# Sin payload usa valores predeterminados
```

Opciones:
```json
{
  "ignoreTime": true,     // Procesa todas las tareas de hoy independientemente de la hora
  "endDate": "2025-05-30" // Busca tareas hasta esta fecha
}
```

### 2. Procesar una tarea específica
```bash
POST /tasks/{id}/process
```

### 3. Ver estado de la cola
```bash
GET /jobs/queue?includeJobs=true
```

### 4. Limpiar trabajos antiguos
```bash
POST /jobs/cleanup
{
  "grace": 3600000,  // 1 hora en milisegundos
  "status": "all",
  "limit": 1000
}
```

### 5. Listar trabajos con filtros
```bash
GET /jobs?types=waiting,active,delayed,failed,completed
```

## Cómo probar correctamente

### Prueba 1: Modo de desarrollo (sin Redis)

1. Configure en `.env`:
   ```
   NOTIFICATION_QUEUE_ENABLED=false
   ```

2. Cree una tarea con estado "created":
   ```sql
   INSERT INTO tasks (...) VALUES (..., 'created');
   ```

3. Para tareas programadas para hoy pero en el futuro:
   ```bash
   # Verificar las tareas pendientes (no deberían procesarse aún)
   POST /jobs/check
   ```

4. Para probar una tarea específica:
   ```bash
   # Procesar manualmente
   POST /tasks/{id}/process
   
   # Verificar logs de notificación
   SELECT * FROM notification_logs WHERE task_id = '{id}';
   ```

### Prueba 2: Modo producción (con Redis)

1. Configure en `.env`:
   ```
   NOTIFICATION_QUEUE_ENABLED=true
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

2. Inicie Redis (Docker):
   ```bash
   docker-compose up -d redis
   ```

3. Repita las pruebas del punto anterior

## Solución de problemas comunes

### Error: "No tasks found"

**Causa posible**: Las tareas no están en estado "created" o las fechas no coinciden.

**Solución**: 
- Verifique el estado de las tareas en la base de datos
- Confirme que las fechas estén en formato correcto (YYYY-MM-DD)
- Use el parámetro `endDate` para ampliar el rango de búsqueda

### Error: "Task already queued"

**Causa posible**: La tarea ya fue añadida a la cola anteriormente.

**Solución**:
- Verifique los trabajos activos: `GET /jobs?types=waiting,active`
- Limpie la cola si es necesario: `POST /jobs/cleanup`

### Error en validación de recipients

**Causa posible**: El formato de los destinatarios no es compatible con el esquema.

**Solución**:
- Asegúrese de que `userManager` esté en formato JSON válido: `["user1", "user2"]`
- Verifique que los IDs de usuarios existan en la base de datos

### No se envían notificaciones

**Causa posible**: Falta la plantilla correcta o no hay servicio de email configurado.

**Solución**:
- Verifique que exista una plantilla para el tipo de notificación
- Confirme que `notificationsService` o `emailService` estén disponibles
- Revise los logs para ver errores específicos

## Consejos para testing

1. **Use fechas pasadas para testing manual**: Crear tareas con fecha y hora ligeramente pasadas para que sean procesadas inmediatamente al ejecutar `/jobs/check`

2. **Debugging**: Use `checkAll: true` para procesar todas las tareas sin importar su fecha

3. **Monitoreo**: Revise los logs del servidor para entender el flujo completo

4. **Sistema incremental**: Pruebe primero el modo simulado (sin Redis) y luego pase a Redis

5. **Validación**: Siempre verifique los cambios en la base de datos:
   ```sql
   SELECT * FROM tasks ORDER BY updated_at DESC LIMIT 10;
   SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;
   ```

## Consideraciones para producción

1. **Configuración**: Ajuste estos valores según la carga esperada:
   - `NOTIFICATION_CONCURRENCY`: Número de trabajos simultáneos
   - `NOTIFICATION_CHECK_INTERVAL`: Frecuencia de verificación del scheduler
   - `NOTIFICATION_JOB_ATTEMPTS`: Número de reintentos para trabajos fallidos

2. **Monitoreo**: Implemente un sistema de alertas para:
   - Trabajos fallidos
   - Trabajos atascados
   - Cola demasiado larga

3. **Mantenimiento**: Programe limpieza regular de trabajos antiguos con:
   ```bash
   POST /jobs/cleanup
   ```

4. **Seguridad**: Asegure la comunicación con Redis usando TLS en entornos de producción.