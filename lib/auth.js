const { timingSafeEqual } = require('node:crypto');

const sameSecret = (given, expected) => {
    const a = Buffer.from(typeof given === 'string' ? given : '');
    const b = Buffer.from(expected || '');
    return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
};

const canOperate = (user) => ['admin', 'operator'].includes(user?.role);

function createAuth(proxyKey, roles = {}, adminEmail = "") {
    const grants = new Map();
    const fromGroups = new Map();
    const ROLE_TTL_MS = 8 * 60 * 60 * 1000;
    for (const role of ['viewer', 'operator', 'admin']) {
        for (const userId of roles[role] || []) grants.set(userId, role);
    }

    // The verified Autentico user behind a request that carries the proxy key (no role needed).
    const gateUser = (headers) => {
        if (!sameSecret(headers['x-de-proxy-key'], proxyKey)) return null;
        const userId = headers['x-auth-user'];
        return typeof userId === 'string' && userId ? userId : null;
    };

    // Role learned from the user's Autentico groups; expires so a downgrade takes effect.
    const setRole = (userId, role, ttlMs = ROLE_TTL_MS) => fromGroups.set(userId, { role, until: Date.now() + ttlMs });
    const groupRole = (userId) => {
        const entry = fromGroups.get(userId);
        if (entry && entry.until > Date.now()) return entry.role;
        fromGroups.delete(userId);
        return undefined;
    };

    const identify = (headers) => {
        if (!sameSecret(headers['x-de-proxy-key'], proxyKey)) return null;
        const userId = headers['x-auth-user'];
        if (typeof userId !== 'string' || !userId) return null;
        const verifiedEmail = headers['x-auth-email'];
        // ForwardAuth only emits this header for an email Autentico has verified.
        const isBootstrapAdmin = adminEmail && typeof verifiedEmail === 'string'
            && verifiedEmail.toLowerCase() === adminEmail;
        const role = isBootstrapAdmin ? 'admin' : (grants.get(userId) || groupRole(userId));
        return role ? { role } : null;
    };

    const requireAuth = (req, res, next) => {
        const user = identify(req.headers);
        if (!user) return res.status(401).json({ error: 'Autentico access required' });
        req.user = user;
        next();
    };

    const requireAdmin = (req, res, next) => {
        if (req.user?.role === 'admin') return next();
        return res.status(403).json({ error: 'Administrator access required' });
    };

    return { identify, gateUser, setRole, requireAuth, requireAdmin };
}

const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

module.exports = { createAuth, canOperate, sameSecret, asyncHandler };
