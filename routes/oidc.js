const crypto = require('node:crypto');
const express = require('express');

const b64url = (buffer) => buffer.toString('base64url');
const ROLE_ORDER = ['admin', 'operator', 'viewer'];
const TX_TTL_MS = 10 * 60 * 1000;

// Roles come from the person's Asmit Labs ID groups (the OIDC `groups` claim); the highest role wins.
const roleFromGroups = (groups, map) => ROLE_ORDER.find((role) => groups.includes(map[role])) || null;

// Signed-in users have already passed the Autentico gate in front of this app (Caddy adds the proxy
// key and the verified user ID). This asks Autentico which groups that same user is in, so roles are
// managed in Autentico and nowhere else. No cookies are issued: the role is cached against the user ID.
module.exports = ({ config, auth }) => {
    const router = express.Router();
    const o = config.OIDC;
    const pending = new Map();

    const prune = () => {
        const now = Date.now();
        for (const [state, tx] of pending) if (tx.until < now) pending.delete(state);
    };

    router.get('/login', (req, res) => {
        const userId = auth.gateUser(req.headers);
        if (!userId) return res.status(401).type('text').send('Autentico access required');
        prune();
        const state = b64url(crypto.randomBytes(16));
        const verifier = b64url(crypto.randomBytes(32));
        pending.set(state, { verifier, userId, until: Date.now() + TX_TTL_MS });
        const query = new URLSearchParams({
            response_type: 'code',
            client_id: o.clientId,
            redirect_uri: o.redirectUri,
            scope: 'openid profile email groups',
            state,
            code_challenge: b64url(crypto.createHash('sha256').update(verifier).digest()),
            code_challenge_method: 'S256',
        });
        return res.redirect(`${o.issuer}/oauth2/authorize?${query}`);
    });

    router.get('/callback', async (req, res) => {
        const fail = (message, status = 403) => res.status(status).type('text').send(`Sign-in failed: ${message}`);
        try {
            const userId = auth.gateUser(req.headers);
            if (!userId) return fail('Autentico access required', 401);
            const tx = pending.get(String(req.query.state || ''));
            pending.delete(String(req.query.state || ''));
            if (req.query.error) return fail(String(req.query.error_description || req.query.error).slice(0, 200));
            if (!tx || tx.until < Date.now() || tx.userId !== userId || !req.query.code) {
                return fail('the sign-in session expired, open the dashboard again', 400);
            }

            const tokenResponse = await fetch(`${o.internal}/oauth2/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: String(req.query.code),
                    redirect_uri: o.redirectUri,
                    client_id: o.clientId,
                    code_verifier: tx.verifier,
                }),
            });
            const token = await tokenResponse.json().catch(() => ({}));
            if (!tokenResponse.ok || !token.access_token) return fail('Asmit Labs ID refused the token exchange', 502);

            const infoResponse = await fetch(`${o.internal}/oauth2/userinfo`, {
                headers: { Authorization: `Bearer ${token.access_token}` },
            });
            const info = await infoResponse.json().catch(() => ({}));
            if (!infoResponse.ok || info.sub !== userId) return fail('identity mismatch', 502);

            const groups = Array.isArray(info.groups) ? info.groups : [];
            const role = roleFromGroups(groups, o.groups);
            if (!role) return fail('your account has no Minecraft manager role');
            auth.setRole(userId, role);
            return res.redirect('/');
        } catch (error) {
            console.error('OIDC callback error:', error.message);
            return fail('Asmit Labs ID could not be reached', 502);
        }
    });

    return router;
};
module.exports.roleFromGroups = roleFromGroups;
