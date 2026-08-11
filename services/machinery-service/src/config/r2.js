const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.R2_BUCKET || 'rentamaq-imagenes';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

const habilitado = !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && PUBLIC_URL);

let client = null;
function getClient() {
    if (!habilitado) return null;
    if (!client) {
        client = new S3Client({
            region: 'auto',
            endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
        });
    }
    return client;
}

async function subirImagen(clave, buffer, contentType) {
    const c = getClient();
    if (!c) return null;
    await c.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: clave,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream'
    }));
    return `${PUBLIC_URL}/${clave}`;
}

async function eliminarImagen(clave) {
    const c = getClient();
    if (!c) return;
    try {
        await c.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: clave }));
    } catch (err) {
        // La eliminación del objeto en R2 no debe romper el borrado del registro
    }
}

module.exports = { habilitado, subirImagen, eliminarImagen };
