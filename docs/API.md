# RentaMaq API

Base local via API Gateway: `http://localhost:3000`

## Salud

- `GET /health` estado del API Gateway.
- `GET http://localhost:3001/health` auth-service.
- `GET http://localhost:3002/health` machinery-service.

## Autenticacion

- `POST /auth/register` crea usuario.
- `POST /auth/login` devuelve JWT.
- `GET /auth/profile` requiere `Authorization: Bearer <token>`.
- `PUT /auth/profile` actualiza perfil.

Las contrasenas deben tener minimo 8 caracteres, una mayuscula, una minuscula y un numero.

## Maquinaria

- `GET /machinery/:id` detalle con imagenes.
- `POST /machinery` crea maquinaria para propietario/admin.
- `PUT /machinery/:id` actualiza maquinaria propia.
- `DELETE /machinery/:id` desactiva maquinaria propia.
- `POST /machinery/:id/images` agrega imagen.
- `GET /machinery/:id/availability?start=YYYY-MM-DD&end=YYYY-MM-DD` disponibilidad registrada.

## Busqueda

- `GET /search?q=&tipo=&ciudad=&minPrice=&maxPrice=&sort=&page=&size=` lista maquinaria disponible.
- `GET /search/suggestions?q=cat` autocompletado.

Los filtros de busqueda se validan con Joi y las consultas usan parametros SQL.

## Reservas

- `GET /bookings/check-availability?machineryId=&start=&end=` valida conflictos de fechas.
- `POST /bookings` crea solicitud.
- `GET /bookings/my-bookings` reservas como arrendatario.
- `GET /bookings/my-listings` reservas recibidas como propietario.
- `PUT /bookings/:id/confirm` confirma solicitud.
- `PUT /bookings/:id/reject` rechaza solicitud.
- `PUT /bookings/:id/cancel` cancela reserva.
- `PUT /bookings/:id/complete` completa reserva.

## Pagos

- `POST /payments/checkout` crea checkout simulado para reserva confirmada.
- `POST /payments/:id/simulate-approval` marca pago demo como retenido.
- `GET /payments/booking/:bookingId` lista pagos de una reserva.
- `POST /payments/:id/release` libera fondos retenidos.
- `POST /payments/:id/refund` reembolsa fondos retenidos.

## Notificaciones

- `GET /notifications` lista notificaciones del usuario.
- `PUT /notifications/:id/read` marca una como leida.
- `PUT /notifications/read-all` marca todas como leidas.

## Admin

- `GET /admin/users/stats`
- `GET /admin/machinery/stats`
- `GET /admin/bookings/stats`
- `GET /admin/bookings/recent?limit=10`
- `GET /admin/payments/dashboard`
