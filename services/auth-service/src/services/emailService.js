const nodemailer = require('nodemailer');
const createServiceLogger = require('../../../../shared/logger');

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

async function sendPasswordReset(email, token, nombre) {
    const resetUrl = `${PUBLIC_URL}/auth/reset-password?token=${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6b3520, #e2a84b); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">RentaMaq</h1>
            </div>
            <div style="padding: 32px; background: #fff8ef; border: 1px solid #efd8bd; border-radius: 0 0 12px 12px;">
                <h2 style="color: #2f241d;">Recuperación de contraseña</h2>
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" style="background: #c96f2d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Restablecer contraseña</a>
                </div>
                <p style="color: #7a6558; font-size: 13px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este mensaje.</p>
                <hr style="border: none; border-top: 1px solid #efd8bd; margin: 24px 0;">
                <p style="color: #7a6558; font-size: 12px; text-align: center;">© 2026 RentaMaq - Plataforma de alquiler de maquinaria</p>
            </div>
        </div>
    `;
    return await sendEmail({ to: email, subject: 'Recuperación de contraseña - RentaMaq', html });
}

async function sendVerificationEmail(email, nombre, token) {
    const verifyUrl = `${PUBLIC_URL}/auth/verify-email?token=${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6b3520, #e2a84b); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">RentaMaq</h1>
            </div>
            <div style="padding: 32px; background: #fff8ef; border: 1px solid #efd8bd; border-radius: 0 0 12px 12px;">
                <h2 style="color: #2f241d;">Verifica tu correo electrónico</h2>
                <p>Hola <strong>${nombre}</strong>,</p>
                <p>Gracias por registrarte en RentaMaq. Confirma tu dirección de correo haciendo clic en el siguiente botón:</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyUrl}" style="background: #c96f2d; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Verificar correo</a>
                </div>
                <p style="color: #7a6558; font-size: 13px;">Si no creaste una cuenta, ignora este mensaje.</p>
                <hr style="border: none; border-top: 1px solid #efd8bd; margin: 24px 0;">
                <p style="color: #7a6558; font-size: 12px; text-align: center;">© 2026 RentaMaq - Plataforma de alquiler de maquinaria</p>
            </div>
        </div>
    `;
    return await sendEmail({ to: email, subject: 'Verifica tu correo - RentaMaq', html });
}

module.exports = { configure, isConfigured, sendPasswordReset, sendVerificationEmail };
