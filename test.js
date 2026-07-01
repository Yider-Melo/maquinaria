const http = require('http');

// Login
const data = JSON.stringify({ email: 'propietario@rentamaq.com', password: 'test1234' });

const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Login response:', body);
        const parsed = JSON.parse(body);
        if (parsed.success) {
            const token = parsed.data.token;
            console.log('Token:', token);

            // Create machinery
            const machineryData = JSON.stringify({
                titulo: 'Retroexcavadora CAT 320',
                tipo: 'Excavadora',
                marca: 'Caterpillar',
                modelo: '320D',
                estado: 'excelente',
                precio_por_dia: 450000,
                ciudad: 'Villavicencio',
                departamento: 'Meta'
            });

            const req2 = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/machinery',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(machineryData),
                    'Authorization': `Bearer ${token}`
                }
            }, (res2) => {
                let body2 = '';
                res2.on('data', (chunk) => body2 += chunk);
                res2.on('end', () => console.log('Create machinery:', body2));
            });
            req2.on('error', (e) => console.error('Error creating machinery:', e.message));
            req2.write(machineryData);
            req2.end();
        }
    });
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
