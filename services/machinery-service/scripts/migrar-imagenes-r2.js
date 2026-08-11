// Script único de migración: sube las imágenes base64 guardadas en la BD a Cloudflare R2
// y reemplaza la URL del registro por la URL pública de R2.
// Uso: node services/machinery-service/scripts/migrar-imagenes-r2.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const pool = require('../src/db');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.R2_BUCKET || 'rentamaq-imagenes';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

(async () => {
    if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !PUBLIC_URL) {
        console.error('Faltan variables R2_* en el entorno. Abortando.');
        process.exit(1);
    }

    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
    });

    const { rows } = await pool.query(
        "SELECT id, maquinaria_id, url FROM imagen_maquinaria WHERE url LIKE 'data:%'"
    );
    console.log('Imágenes base64 a migrar:', rows.length);

    let ok = 0;
    let fail = 0;
    for (const img of rows) {
        try {
            const match = img.url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/s);
            if (!match) { fail++; console.error('Formato no reconocido:', img.id); continue; }
            const contentType = match[1];
            const buffer = Buffer.from(match[2], 'base64');
            const ext = contentType === 'image/svg+xml' ? 'svg'
                : (contentType.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
            const clave = `maquinaria/${img.maquinaria_id}/${img.id}.${ext}`;

            await client.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: clave,
                Body: buffer,
                ContentType: contentType
            }));
            await pool.query(
                'UPDATE imagen_maquinaria SET url = $1 WHERE id = $2',
                [`${PUBLIC_URL}/${clave}`, img.id]
            );
            ok++;
            console.log('Migrada:', img.id, '->', `${PUBLIC_URL}/${clave}`);
        } catch (err) {
            fail++;
            console.error('Error migrando', img.id, ':', err.message);
        }
    }

    console.log('Migradas:', ok, '| Fallidas:', fail);
    await pool.end();
    process.exit(fail > 0 ? 1 : 0);
})().catch((err) => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
