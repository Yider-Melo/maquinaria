// Esquemas de validacion con Joi para todas las entradas de la API.
// Cada esquema define las reglas de cada campo (tipo, requerido, longitud, etc.)
// y se usa junto con el middleware validate() para sanitizar requests.

const Joi = require('joi');

const schemas = {
    // Registro de nuevo usuario
    register: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'El email no tiene un formato válido',
            'any.required': 'El email es requerido',
            'string.empty': 'El email no puede estar vacío'
        }),
        password: Joi.string()
            .min(8)
            .max(50)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
            .required()
            .messages({
                'string.pattern.base': 'La contraseña debe incluir mayúscula, minúscula y número',
                'string.min': 'La contraseña debe tener al menos 8 caracteres'
            }),
        nombre: Joi.string().min(2).max(100).required().messages({
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'any.required': 'El nombre es requerido',
            'string.empty': 'El nombre no puede estar vacío'
        }),
        apellido: Joi.string().min(2).max(100).required().messages({
            'string.min': 'El apellido debe tener al menos 2 caracteres',
            'any.required': 'El apellido es requerido',
            'string.empty': 'El apellido no puede estar vacío'
        }),
        telefono: Joi.string().max(20).optional(),
        tipo_usuario: Joi.string().valid('propietario', 'arrendatario').required().messages({
            'any.only': 'El tipo de usuario debe ser propietario o arrendatario',
            'any.required': 'El tipo de usuario es requerido'
        })
    }),

    // Inicio de sesion
    login: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'El email no tiene un formato válido',
            'any.required': 'El email es requerido',
            'string.empty': 'El email no puede estar vacío'
        }),
        password: Joi.string().required().messages({
            'any.required': 'La contraseña es requerida',
            'string.empty': 'La contraseña no puede estar vacía'
        })
    }),

    resetPassword: Joi.object({
        token: Joi.string().required(),
        password: Joi.string()
            .min(8)
            .max(50)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
            .required()
            .messages({
                'string.pattern.base': 'La contraseña debe incluir mayúscula, minúscula y número',
                'string.min': 'La contraseña debe tener al menos 8 caracteres'
            })
    }),

    // Creacion/edicion de maquinaria
    maquinaria: Joi.object({
        titulo: Joi.string().min(3).max(200).required().messages({
            'string.min': 'El título debe tener al menos 3 caracteres',
            'any.required': 'El título es requerido',
            'string.empty': 'El título no puede estar vacío'
        }),
        descripcion: Joi.string().max(2000).optional(),
        tipo: Joi.string().max(50).required().messages({
            'any.required': 'El tipo de maquinaria es requerido',
            'string.empty': 'El tipo no puede estar vacío'
        }),
        marca: Joi.string().max(100).optional(),
        modelo: Joi.string().max(100).optional(),
        anio: Joi.number().integer().min(1900).max(2100).optional(),
        capacidad: Joi.string().max(50).optional(),
        estado: Joi.string().valid('nuevo', 'excelente', 'bueno', 'regular').required().messages({
            'any.only': 'El estado debe ser: nuevo, excelente, bueno o regular',
            'any.required': 'El estado es requerido'
        }),
        precio_por_dia: Joi.number().positive().required().messages({
            'number.positive': 'El precio por día debe ser mayor a cero',
            'any.required': 'El precio por día es requerido'
        }),
        precio_por_hora: Joi.number().positive().optional().messages({
            'number.positive': 'El precio por hora debe ser mayor a cero'
        }),
        ubicacion_lat: Joi.number().min(-90).max(90).optional(),
        ubicacion_lng: Joi.number().min(-180).max(180).optional(),
        direccion: Joi.string().max(500).optional(),
        ciudad: Joi.string().max(100).optional(),
        departamento: Joi.string().max(100).optional()
    }),

    // Creacion de reserva
    reserva: Joi.object({
        maquinaria_id: Joi.string().uuid().required().messages({
            'string.guid': 'El ID de maquinaria no es válido',
            'any.required': 'El ID de maquinaria es requerido'
        }),
        fecha_inicio: Joi.date().iso().min('now').required().messages({
            'date.min': 'La fecha de inicio debe ser posterior a hoy',
            'any.required': 'La fecha de inicio es requerida',
            'date.format': 'La fecha de inicio no tiene un formato válido'
        }),
        fecha_fin: Joi.date().iso().min(Joi.ref('fecha_inicio')).required().messages({
            'date.min': 'La fecha de fin debe ser posterior o igual a la fecha de inicio',
            'any.required': 'La fecha de fin es requerida',
            'date.format': 'La fecha de fin no tiene un formato válido'
        }),
        modalidad: Joi.string().valid('dia', 'hora').default('dia').messages({
            'any.only': 'La modalidad debe ser dia u hora'
        }),
        cantidad_horas: Joi.number().positive().optional().messages({
            'number.positive': 'La cantidad de horas debe ser mayor a cero'
        })
    }),

    // Calificacion post-alquiler
    calificacion: Joi.object({
        reserva_id: Joi.string().uuid().required().messages({
            'string.guid': 'El ID de reserva no es válido',
            'any.required': 'El ID de reserva es requerido'
        }),
        maquinaria_id: Joi.string().uuid().required().messages({
            'string.guid': 'El ID de maquinaria no es válido',
            'any.required': 'El ID de maquinaria es requerido'
        }),
        calificado_id: Joi.string().uuid().required().messages({
            'string.guid': 'El ID de usuario no es válido',
            'any.required': 'El ID de usuario calificado es requerido'
        }),
        puntuacion: Joi.number().integer().min(1).max(5).required().messages({
            'number.min': 'La puntuación mínima es 1',
            'number.max': 'La puntuación máxima es 5',
            'any.required': 'La puntuación es requerida'
        }),
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
        ciudad: Joi.string().max(100).optional(),
        departamento: Joi.string().max(100).optional(),
        minPrice: Joi.number().min(0).optional(),
        maxPrice: Joi.number().positive().optional(),
        lat: Joi.number().min(-90).max(90).optional(),
        lng: Joi.number().min(-180).max(180).optional(),
        radius: Joi.number().min(1).max(500).optional(),
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).default(1),
        size: Joi.number().integer().min(1).max(100).default(20),
        sort: Joi.string().valid('price_asc', 'price_desc', 'rating', 'distance').default('price_asc')
    })
};

module.exports = { schemas };
