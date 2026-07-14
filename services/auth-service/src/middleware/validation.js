function getLogger(req) {
    return req.app?.locals?.logger;
}

// Sanitizar strings para prevenir inyecciones
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>\"']/g, '') // Eliminar caracteres especiales
    .substring(0, 1000); // Límite de longitud
};

// Middleware para validar emails
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Middleware para validar passwords
const validatePassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false; // Mayúscula
  if (!/[a-z]/.test(password)) return false; // Minúscula
  if (!/\d/.test(password)) return false; // Número
  return true;
};

// Middleware para validar que email y password estén presentes
const validateAuthInputs = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    getLogger(req)?.warn('Invalid auth attempt - missing credentials', {
      ip: req.ip,
      hasEmail: !!email,
      hasPassword: !!password
    });
    return res.status(400).json({
      success: false,
      error: { message: 'Email y contraseña son requeridos' }
    });
  }

  // Validar formato de email
  if (!validateEmail(email)) {
    getLogger(req)?.warn('Invalid auth attempt - invalid email format', {
      ip: req.ip,
      email: email?.substring(0, 5) + '***'
    });
    return res.status(400).json({
      success: false,
      error: { message: 'Email inválido' }
    });
  }

  // Sanitizar inputs
  req.body.email = sanitize(email).toLowerCase();
  req.body.password = req.body.password.substring(0, 256); // No sanitizar password

  next();
};

// Middleware para validar registro
const validateRegisterInputs = (req, res, next) => {
  const { email, password, nombre, apellido, telefono } = req.body;

  // Validar campos requeridos
  if (!email || !password || !nombre || !apellido || !telefono) {
    return res.status(400).json({
      success: false,
      error: { message: 'Todos los campos son requeridos' }
    });
  }

  // Validar email
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Email inválido' }
    });
  }

  // Validar password
  if (!validatePassword(password)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'La contraseña debe tener: mínimo 8 caracteres, una mayúscula, una minúscula y un número'
      }
    });
  }

  // Sanitizar inputs
  req.body.email = sanitize(email).toLowerCase();
  req.body.nombre = sanitize(nombre);
  req.body.apellido = sanitize(apellido);
  req.body.telefono = sanitize(telefono);

  getLogger(req)?.info('User registration attempt', {
    email: email?.substring(0, 5) + '***',
    ip: req.ip
  });

  next();
};

module.exports = {
  validateAuthInputs,
  validateRegisterInputs,
  sanitize,
  validateEmail,
  validatePassword
};
