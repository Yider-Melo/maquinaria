const nodemailer = require('nodemailer');
const createServiceLogger = require('./logger');

const logger = createServiceLogger('email');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@rentamaq.com';
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:4200';

let transporter = null;

function isConfigured() {
    return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function configure() {
    if (!isConfigured()) {
        logger.warn('SMTP no configurado. Los emails solo se mostrarán en logs.');
        return false;
    }
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });
    logger.info('Servicio de emails configurado:', { host: SMTP_HOST, port: SMTP_PORT });
    try {
        await transporter.verify();
        logger.info('Conexión SMTP verificada correctamente');
    } catch (err) {
        logger.error('Error verificando conexión SMTP:', { error: err.message });
    }
    return true;
}

async function sendEmail({ to, subject, html }) {
    if (!transporter) {
        logger.info('Email simulado:', { to, subject, html: html.substring(0, 200) + '...' });
        return { simulated: true };
    }
    try {
        const info = await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
        logger.info('Email enviado:', { to, subject, messageId: info.messageId });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        logger.error('Error enviando email:', { to, subject, error: err.message });
        return { success: false, error: err.message };
    }
}

function layout(content) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6b3520, #e2a84b); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">RentaMaq</h1>
            </div>
            <div style="padding: 32px; background: #fff8ef; border: 1px solid #efd8bd; border-radius: 0 0 12px 12px;">
                ${content}
                <hr style="border: none; border-top: 1px solid #efd8bd; margin: 24px 0;">
                <p style="color: #7a6558; font-size: 12px; text-align: center;">© 2026 RentaMaq - Plataforma de alquiler de maquinaria</p>
            </div>
        </div>
    `;
}

function button(text, url) {
    return `<div style="text-align: center; margin: 32px 0;">
        <a href="${url}" style="background: #c96f2d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${text}</a>
    </div>`;
}

// --- Auth templates ---

async function sendPasswordReset(email, token, nombre) {
    const resetUrl = `${PUBLIC_URL}/auth/reset-password?token=${token}`;
    const html = layout(`
        <h2 style="color: #2f241d;">Recuperación de contraseña</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
        ${button('Restablecer contraseña', resetUrl)}
        <p style="color: #7a6558; font-size: 13px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este mensaje.</p>
    `);
    return await sendEmail({ to: email, subject: 'Recuperación de contraseña - RentaMaq', html });
}

async function sendVerificationEmail(email, nombre, token) {
    const verifyUrl = `${PUBLIC_URL}/auth/verify-email?token=${token}`;
    const html = layout(`
        <h2 style="color: #2f241d;">Verifica tu correo electrónico</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Gracias por registrarte en RentaMaq. Confirma tu dirección de correo haciendo clic en el siguiente botón:</p>
        ${button('Verificar correo', verifyUrl)}
        <p style="color: #7a6558; font-size: 13px;">Si no creaste una cuenta, ignora este mensaje.</p>
    `);
    return await sendEmail({ to: email, subject: 'Verifica tu correo - RentaMaq', html });
}

// --- Booking templates ---

async function sendBookingCreated(email, nombre, data) {
    const html = layout(`
        <h2 style="color: #2f241d;">Nueva solicitud de reserva</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Has recibido una nueva solicitud de reserva para tu maquinaria <strong>${data.maquinaria_titulo || ''}</strong>.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #7a6558;">Fechas:</td><td style="padding: 8px; font-weight: bold;">${data.fecha_inicio || ''} → ${data.fecha_fin || ''}</td></tr>
            <tr><td style="padding: 8px; color: #7a6558;">Total:</td><td style="padding: 8px; font-weight: bold;">$${data.precio_total || 0}</td></tr>
        </table>
        ${button('Ver reserva', `${PUBLIC_URL}/bookings/${data.reserva_id}`)}
    `);
    return await sendEmail({ to: email, subject: 'Nueva solicitud de reserva - RentaMaq', html });
}

async function sendBookingConfirmed(email, nombre, data) {
    const html = layout(`
        <h2 style="color: #2f241d;">Reserva confirmada</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Tu reserva ha sido confirmada por el propietario.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #7a6558;">Maquinaria:</td><td style="padding: 8px; font-weight: bold;">${data.maquinaria_titulo || ''}</td></tr>
            <tr><td style="padding: 8px; color: #7a6558;">Fechas:</td><td style="padding: 8px; font-weight: bold;">${data.fecha_inicio || ''} → ${data.fecha_fin || ''}</td></tr>
            <tr><td style="padding: 8px; color: #7a6558;">Total:</td><td style="padding: 8px; font-weight: bold;">$${data.precio_total || 0}</td></tr>
        </table>
        <p>Para completar el proceso, realiza el pago desde la plataforma.</p>
        ${button('Ir a la reserva', `${PUBLIC_URL}/bookings/${data.reserva_id}`)}
    `);
    return await sendEmail({ to: email, subject: 'Reserva confirmada - RentaMaq', html });
}

async function sendBookingRejected(email, nombre, data) {
    const html = layout(`
        <h2 style="color: #2f241d;">Reserva rechazada</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Lamentamos informarte que tu solicitud de reserva para <strong>${data.maquinaria_titulo || ''}</strong> ha sido rechazada por el propietario.</p>
        <p>Puedes buscar otras opciones de maquinaria disponibles en la plataforma.</p>
        ${button('Ver maquinaria disponible', `${PUBLIC_URL}/machinery`)}
    `);
    return await sendEmail({ to: email, subject: 'Reserva rechazada - RentaMaq', html });
}

async function sendBookingCancelled(email, nombre, data) {
    const rol = data.rol || 'usuario';
    const esPropietario = rol === 'propietario';
    const html = layout(`
        <h2 style="color: #2f241d;">Reserva cancelada</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>${esPropietario ? 'El arrendatario ha cancelado' : 'Has cancelado'} la reserva de <strong>${data.maquinaria_titulo || ''}</strong>.</p>
        ${data.motivo ? `<p><strong>Motivo:</strong> ${data.motivo}</p>` : ''}
        ${data.reembolso ? '<p>El reembolso será procesado según la política de cancelación.</p>' : ''}
    `);
    return await sendEmail({ to: email, subject: 'Reserva cancelada - RentaMaq', html });
}

async function sendBookingCompleted(email, nombre, data) {
    const html = layout(`
        <h2 style="color: #2f241d;">Reserva completada</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>La reserva de <strong>${data.maquinaria_titulo || ''}</strong> ha sido completada exitosamente.</p>
        <p>¡Nos encantaría conocer tu opinión! Califica tu experiencia para ayudar a otros usuarios.</p>
        ${button('Calificar experiencia', `${PUBLIC_URL}/bookings/${data.reserva_id}`)}
    `);
    return await sendEmail({ to: email, subject: 'Reserva completada - RentaMaq', html });
}

async function sendPaymentConfirmed(email, nombre, data) {
    const html = layout(`
        <h2 style="color: #2f241d;">Pago recibido</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>El pago de <strong>$${data.monto || 0}</strong> por la reserva de <strong>${data.maquinaria_titulo || ''}</strong> ha sido recibido exitosamente.</p>
        <p>El propietario ya puede iniciar el periodo de alquiler.</p>
        ${button('Ver detalle del pago', `${PUBLIC_URL}/payments/${data.pago_id}`)}
    `);
    return await sendEmail({ to: email, subject: 'Pago confirmado - RentaMaq', html });
}

async function sendPaymentReleased(email, nombre, data) {
    const html = layout(`
        <h2 style="color: #2f241d;">Fondos liberados</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Los fondos de <strong>$${data.monto || 0}</strong> por la reserva completada de <strong>${data.maquinaria_titulo || ''}</strong> han sido liberados a tu cuenta.</p>
        <p>El dinero será depositado en tu cuenta bancaria registrada en los próximos días hábiles.</p>
    `);
    return await sendEmail({ to: email, subject: 'Fondos liberados - RentaMaq', html });
}

module.exports = {
    configure, isConfigured,
    sendPasswordReset, sendVerificationEmail,
    sendBookingCreated, sendBookingConfirmed, sendBookingRejected,
    sendBookingCancelled, sendBookingCompleted,
    sendPaymentConfirmed, sendPaymentReleased
};
