# Documentación de la API de Notificaciones

Este documento detalla los endpoints disponibles en la API del sistema de notificaciones, incluyendo parámetros, formatos de respuesta y ejemplos.

## Autorización

Todos los endpoints requieren autenticación mediante token JWT:

```
Authorization: Bearer <token>
```

## Endpoints

### Estado de la Cola

#### Obtener estado de la cola

```
GET /jobs-queue
```

**Parámetros de consulta:**
- `includeJobs` (boolean, opcional) - Si se deben incluir trabajos recientes en la respuesta

**Respuesta:**
```json
{
  "status": "operational",
  "jobs": {
    "waiting": 0,
    "active": 2,
    "completed": 15,
    "failed": 1,
    "delayed": 0,
    "paused": 0
  },
  "workers": 5,
  "recentJobs": [
    {
      "id": "job-125",
      "state": "active",
      "taskId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2023-11-08T14:30:00.000Z",
      "data": {
        "taskId": "550e8400-e29b-41d4-a716-446655440000",
        "scheduledTrigger": true
      },
      "attempts": 1,
      "result": null,
      "error": null
    }
  ]
}
```

### Gestión de Trabajos

#### Listar trabajos

```
GET /jobs
```

**Parámetros de consulta:**
- `types` (string, opcional) - Lista separada por comas de tipos de trabajo (waiting,active,delayed,failed,completed)
- `page` (integer, opcional) - Número de página
- `limit` (integer, opcional) - Elementos por página
- `taskId` (uuid, opcional) - Filtrar por ID de tarea
- `sortBy` (string, opcional) - Campo para ordenar (timestamp, attempts)
- `sortDir` (string, opcional) - Dirección de ordenamiento (asc, desc)

**Respuesta:**
```json
{
  "data": [
    {
      "id": "job-125",
      "state": "active",
      "taskId": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2023-11-08T14:30:00.000Z",
      "data": {
        "taskId": "550e8400-e29b-41d4-a716-446655440000",
        "scheduledTrigger": true
      },
      "attempts": 1,
      "result": null,
      "error": null,
      "finishedOn": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 18,
    "totalPages": 1
  }
}
```

#### Reintentar un trabajo

```
POST /jobs/{id}/retry
```

**Parámetros de ruta:**
- `id` (string, requerido) - ID del trabajo a reintentar

**Respuesta:**
```json
{
  "success": true,
  "message": "Job job-121 has been scheduled for retry",
  "job": {
    "id": "job-121",
    "state": "waiting",
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "attempts": 5
  }
}
```

#### Eliminar un trabajo

```
DELETE /jobs/{id}
```

**Parámetros de ruta:**
- `id` (string, requerido) - ID del trabajo a eliminar

**Respuesta:**
```json
{
  "success": true,
  "message": "Job job-121 has been removed"
}
```

#### Limpiar trabajos antiguos

```
POST /jobs/cleanup
```

**Cuerpo de la solicitud:**
```json
{
  "grace": 86400000,
  "status": "all",
  "limit": 1000
}
```

- `grace` (integer, opcional) - Período de gracia en milisegundos (default: 24 horas)
- `status` (string, opcional) - Estado de los trabajos a limpiar ("completed", "failed", "all")
- `limit` (integer, opcional) - Número máximo de trabajos a limpiar

**Respuesta:**
```json
{
  "success": true,
  "message": "Successfully cleaned up 15 jobs",
  "cleaned": {
    "completed": 14,
    "failed": 1,
    "total": 15
  }
}
```

### Procesamiento de Tareas

#### Procesar una tarea manualmente

```
POST /tasks/{id}/process
```

**Parámetros de ruta:**
- `id` (uuid, requerido) - ID de la tarea a procesar

**Respuesta:**
```json
{
  "success": true,
  "message": "Task 550e8400-e29b-41d4-a716-446655440000 queued for processing",
  "jobId": "job-126",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "taskName": "Recordatorio de documento vencido",
  "status": "queued"
}
```

#### Verificar tareas pendientes

```
POST /jobs/check
```

**Cuerpo de la solicitud (opcional):**
```json
{
  "checkDate": "2023-11-08",
  "checkTime": "15:30"
}
```

- `checkDate` (date, opcional) - Fecha específica para verificar
- `checkTime` (string, opcional) - Hora específica para verificar (formato HH:MM)

**Respuesta:**
```json
{
  "success": true,
  "message": "Check complete. Found 3 tasks to process.",
  "count": 3,
  "tasks": [
    {
      "jobId": "job-127",
      "taskId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Recordatorio de reunión"
    }
  ]
}
```

### Gestión de Tareas

#### Listar tareas

```
GET /tasks
```

**Parámetros de consulta:**
- `status` (string, opcional) - Filtrar por estado
- `notification_type` (string, opcional) - Filtrar por tipo de notificación
- `from_date` (date, opcional) - Fecha de inicio para filtrar
- `to_date` (date, opcional) - Fecha de fin para filtrar
- `upcoming` (boolean, opcional) - Mostrar solo tareas próximas
- `page` (integer, opcional) - Número de página
- `limit` (integer, opcional) - Elementos por página

**Respuesta:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Recordatorio de documento vencido",
      "description": "Documento de identidad próximo a vencer",
      "notification_date": "2023-11-08",
      "actity_time": "15:00",
      "status": "created",
      "notification_type": "document",
      "number_period": "1",
      "select_period": "meses",
      "upcoming": {
        "isPending": true,
        "executionTime": "15:00",
        "executionDate": "Today"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 8,
    "totalPages": 1
  }
}
```

## Códigos de Error

La API puede devolver los siguientes códigos de error:

- `400 Bad Request` - Solicitud inválida
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - Sin permiso para acceder al recurso
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto con el estado actual del recurso
- `500 Internal Server Error` - Error del servidor

## Ejemplos de Uso

### Verificar tareas pendientes para la hora actual

```bash
curl -X POST http://localhost:3000/jobs/check \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

### Procesar una tarea específica

```bash
curl -X POST http://localhost:3000/tasks/550e8400-e29b-41d4-a716-446655440000/process \
  -H "Authorization: Bearer <token>"
```

### Reintentar un trabajo fallido

```bash
curl -X POST http://localhost:3000/jobs/job-121/retry \
  -H "Authorization: Bearer <token>"
```

### Limpiar trabajos completados más antiguos que 7 días

```bash
curl -X POST http://localhost:3000/jobs/cleanup \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","grace":604800000}'
```

### Obtener tareas programadas para las próximas 24 horas

```bash
curl -X GET "http://localhost:3000/tasks?upcoming=true" \
  -H "Authorization: Bearer <token>"
```

## Limitaciones

- El tiempo máximo de ejecución para un trabajo es de 10 minutos.
- No se pueden programar tareas con más de un año de antelación.
- La concurrencia máxima por defecto es de 5 trabajos simultáneos.