export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  tipo_usuario: 'propietario' | 'arrendatario' | 'admin';
  foto_url?: string;
  telefono?: string;
  departamento?: string;
  ciudad?: string;
  numero_documento?: string;
  email_verificado?: boolean;
  verificado_2fa?: boolean;
  activo?: boolean;
}

export interface LoginResponse {
  token?: string;
  refresh_token?: string;
  expires_in?: string;
  usuario?: Usuario;
  requires_2fa?: boolean;
  message?: string;
}

export interface BankAccount {
  id?: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular: string;
  tipo_documento: string;
  numero_documento: string;
}

export interface Machinery {
  id: string;
  titulo: string;
  tipo: string;
  descripcion?: string;
  marca: string;
  modelo: string;
  anio?: number;
  estado: string;
  capacidad?: number;
  precio_por_dia: number;
  direccion?: string;
  ciudad: string;
  departamento: string;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  disponible: boolean;
  activo?: boolean;
  propietario_id: string;
  imagenes?: MachineryImage[];
  imagen_portada?: string;
  puntuacion_promedio?: number;
  total_resenas?: number;
  favorito?: boolean;
  creado_en?: string;
}

export interface MachineryImage {
  id: string;
  url: string;
  es_portada?: boolean;
}

export interface Booking {
  id: string;
  estado: BookingEstado;
  fecha_inicio: string;
  fecha_fin: string;
  creado_en?: string;
  precio_total: number;
  precio_unitario?: number;
  maquinaria_id: string;
  maquinaria_titulo?: string;
  maquinaria_precio?: number;
  propietario_id: string;
  propietario_nombre?: string;
  arrendatario_id: string;
  arrendatario_nombre?: string;
  arrendatario_email?: string;
  arrendatario_promedio_calificacion?: number;
  arrendatario_total_calificaciones?: number;
  modalidad?: string;
  motivo_cancelacion?: string;
}

export type BookingEstado = 'pendiente' | 'confirmada' | 'pagada' | 'en_curso' | 'completada' | 'cancelada' | 'rechazada';

export interface Payment {
  id: string;
  estado: PaymentEstado;
  monto: number;
  metodo_pago: string;
  referencia_pasarela?: string;
  fecha_pago?: string;
  creado_en?: string;
  reserva_id: string;
  maquinaria_id?: string;
  maquinaria_titulo?: string;
  maquinaria_precio?: number;
}

export type PaymentEstado = 'pendiente' | 'retenido' | 'liberado' | 'reembolsado' | 'fallido';

export interface Rating {
  id: string;
  reserva_id: string;
  maquinaria_id: string;
  puntuacion: number;
  puntuacion_maquinaria?: number;
  comentario?: string;
  calificador_id?: string;
  calificador_nombre?: string;
  calificador_email?: string;
  calificado_id: string;
  calificado_nombre?: string;
  creado_en?: string;
  editado?: boolean;
  motivo_reporte?: string;
  maquinaria_titulo?: string;
}

export interface Notification {
  id: string;
  leida: boolean;
  tipo: string;
  titulo: string;
  mensaje: string;
  creado_en: string;
  referencia_id?: string;
  referencia_tipo?: string;
}

export interface UnreadCount {
  no_leidas: number;
}

export interface SearchResult {
  data: Machinery[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    size: number;
  };
}

export interface CheckAvailability {
  disponible: boolean;
  fechas_no_disponibles?: { inicio: string; fin: string }[];
}

export interface PaymentCheckout {
  checkout_url?: string;
  pago_id?: string;
  proveedor?: string;
  wompi?: {
    public_key: string;
    signature: string;
    acceptance_token: string;
    amount_in_cents: number;
    currency: string;
    reference: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

export interface UserStats {
  total: number;
  propietarios: number;
  arrendatarios: number;
}

export interface MachineryStats {
  resumen: {
    activas: number;
    inactivas: number;
    total: number;
    propietarios_con_maquinaria: number;
    tipos_distintos: number;
    precio_promedio_dia: number;
    precio_minimo: number;
    precio_maximo: number;
  };
  por_tipo: { tipo: string; cantidad: number }[];
}

export interface BookingStats {
  total: number;
  pendientes: number;
  confirmadas: number;
  en_curso: number;
  completadas: number;
  canceladas: number;
  rechazadas: number;
  ingresos_totales: number;
  promedio_por_reserva: number;
}

export interface PaymentDashboard {
  resumen: {
    total_liberado: number;
    total_retenido: number;
    total_reembolsado: number;
    total_transacciones: number;
    total_fallidos: number;
  };
  ultimos_pagos: Payment[];
}

export interface RatingStats {
  resumen: {
    total: number;
    puntuacion_promedio: number;
    reportadas: number;
  };
  reportadas: Rating[];
}

export interface OccupiedDates {
  ranges: { fecha_inicio: string; fecha_fin: string }[];
  dates: string[];
}
