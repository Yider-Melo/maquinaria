// Esquemas de validacion con Joi para todas las entradas de la API.
// Cada esquema define las reglas de cada campo (tipo, requerido, longitud, etc.)
// y se usa junto con el middleware validate() para sanitizar requests.

const Joi = require('joi');

const schemas = {
    // Registro de nuevo usuario
    register: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).max(50).required(),
        nombre: Joi.string().min(2).max(100).required(),
        apellido: Joi.string().min(2).max(100).required(),
        telefono: Joi.string().max(20).optional(),
        tipo_usuario: Joi.string().valid('propietario', 'arrendatario').required()
    }),

    // Inicio de sesion
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    // Creacion/edicion de maquinaria
    maquinaria: Joi.object({
        titulo: Joi.string().min(3).max(200).required(),
        descripcion: Joi.string().max(2000).optional(),
        tipo: Joi.string().max(50).required(),
        marca: Joi.string().max(100).optional(),
        modelo: Joi.string().max(100).optional(),
        anio: Joi.number().integer().min(1900).max(2100).optional(),
        capacidad: Joi.string().max(50).optional(),
        estado: Joi.string().valid('nuevo', 'excelente', 'bueno', 'regular').required(),
        precio_por_dia: Joi.number().positive().required(),
        precio_por_hora: Joi.number().positive().optional(),
        ubicacion_lat: Joi.number().min(-90).max(90).optional(),
        ubicacion_lng: Joi.number().min(-180).max(180).optional(),
        direccion: Joi.string().max(500).optional(),
        ciudad: Joi.string().max(100).optional(),
        departamento: Joi.string().max(100).optional()
    }),

    // Creacion de reserva
    reserva: Joi.object({
        maquinaria_id: Joi.string().uuid().required(),
        fecha_inicio: Joi.date().iso().min('now').required(),
        fecha_fin: Joi.date().iso().greater(Joi.ref('fecha_inicio')).required()
    }),

    // Calificacion post-alquiler
    calificacion: Joi.object({
        reserva_id: Joi.string().uuid().required(),
        maquinaria_id: Joi.string().uuid().required(),
        calificado_id: Joi.string().uuid().required(),
        puntuacion: Joi.number().integer().min(1).max(5).required(),
        comentario: Joi.string().max(1000).optional()
    }),

    // Inicio de pago
    pago: Joi.object({
        reserva_id: Joi.string().uuid().required(),
        metodo_pago: Joi.string().max(50).optional()
    }),

    // Filtros de busqueda de maquinaria
    busqueda: Joi.object({
        q: Joi.string().max(200).optional(),
        tipo: Joi.string().max(50).optional(),
        minPrice: Joi.number().min(0).optional(),
        maxPrice: Joi.number().positive().optional(),
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
        radius: Joi.number().min(1).max(500).optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).default(1),
        size: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('price_asc', 'price_desc', 'rating', 'distance').optional()
    })
};

module.exports = { schemas };
