// Funciones helpers para estandarizar las respuestas JSON de la API.
// Todas las respuestas exitosas siguen el formato { success: true, data: ... }.

function success(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data
    });
}

// Para respuestas paginadas incluye metadatos de paginacion.
function paginated(res, data, total, page, size) {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page,
            size,
            totalPages: Math.ceil(total / size)
        }
    });
}

module.exports = { success, paginated };
