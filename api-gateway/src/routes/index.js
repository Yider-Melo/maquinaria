const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { validateToken, requireRole, extractUser } = require('../middleware/authMiddleware');

const router = express.Router();

const API_PREFIX = '/api/v1';

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const MACHINERY_SERVICE = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';
const SEARCH_SERVICE = process.env.SEARCH_SERVICE_URL || 'http://localhost:3003';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const RATING_SERVICE = process.env.RATING_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

const proxyWithTarget = (target, pathRewrite) => createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['access-control-allow-origin'] = req.headers.origin || '*';
        proxyRes.headers['access-control-allow-credentials'] = 'true';
    }
});

function api(path) {
    return `${API_PREFIX}${path}`;
}

router.use(api('/auth'), proxyWithTarget(AUTH_SERVICE, { [`^${API_PREFIX}/auth`]: '' }));

router.get(api('/machinery'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.get(api('/machinery/stats'), validateToken, requireRole('admin'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.get(api('/machinery/all'), validateToken, requireRole('admin'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.get(api('/machinery/owner'), validateToken, requireRole('propietario'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.get(api('/machinery/:id/images'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.get(api('/machinery/:id/availability'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.get(api('/machinery/:id'), proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));
router.use(api('/machinery'), validateToken, proxyWithTarget(MACHINERY_SERVICE, { [`^${API_PREFIX}/machinery`]: '' }));

router.use(api('/search'), proxyWithTarget(SEARCH_SERVICE, { [`^${API_PREFIX}/search`]: '' }));

router.get(api('/bookings/check-availability'), proxyWithTarget(BOOKING_SERVICE, { [`^${API_PREFIX}/bookings`]: '' }));
router.get(api('/bookings/machinery/*'), proxyWithTarget(BOOKING_SERVICE, { [`^${API_PREFIX}/bookings`]: '' }));
router.use(api('/bookings'), validateToken, proxyWithTarget(BOOKING_SERVICE, { [`^${API_PREFIX}/bookings`]: '' }));

router.post(api('/payments/webhook'), proxyWithTarget(PAYMENT_SERVICE, { [`^${API_PREFIX}/payments`]: '' }));
router.get(api('/payments/my-payments'), validateToken, proxyWithTarget(PAYMENT_SERVICE, { [`^${API_PREFIX}/payments`]: '' }));
router.use(api('/payments'), validateToken, proxyWithTarget(PAYMENT_SERVICE, { [`^${API_PREFIX}/payments`]: '' }));

router.get(api('/ratings/by-machinery/*'), proxyWithTarget(RATING_SERVICE, { [`^${API_PREFIX}/ratings`]: '' }));
router.get(api('/ratings/user/*'), proxyWithTarget(RATING_SERVICE, { [`^${API_PREFIX}/ratings`]: '' }));
router.get(api('/ratings/machinery/*'), proxyWithTarget(RATING_SERVICE, { [`^${API_PREFIX}/ratings`]: '' }));
router.get(api('/ratings'), proxyWithTarget(RATING_SERVICE, { [`^${API_PREFIX}/ratings`]: '' }));
router.use(api('/ratings'), validateToken, proxyWithTarget(RATING_SERVICE, { [`^${API_PREFIX}/ratings`]: '' }));

router.use(api('/notifications'), validateToken, proxyWithTarget(NOTIFICATION_SERVICE, { [`^${API_PREFIX}/notifications`]: '' }));

function adminProxy(target, prefix) {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: (path) => path.replace(API_PREFIX + prefix, '')
    });
}
router.use(api('/admin/payments'), validateToken, requireRole('admin'), adminProxy(PAYMENT_SERVICE, '/admin/payments'));
router.use(api('/admin/users'), validateToken, requireRole('admin'), adminProxy(AUTH_SERVICE, '/admin/users'));
router.use(api('/admin/bookings'), validateToken, requireRole('admin'), adminProxy(BOOKING_SERVICE, '/admin/bookings'));
router.use(api('/admin/machinery'), validateToken, requireRole('admin'), adminProxy(MACHINERY_SERVICE, '/admin/machinery'));
router.use(api('/admin/ratings'), validateToken, requireRole('admin'), adminProxy(RATING_SERVICE, '/admin/ratings'));

module.exports = router;
