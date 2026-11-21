const path = require('path');

const APP_ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(APP_ROOT, '.env') });

const env = process.env;
const list = (value) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);
const resolveFrom = (base, value) => (path.isAbsolute(value) ? path.resolve(value) : path.resolve(base, value));

const SANDBOX_ROOT = path.resolve(env.SANDBOX_ROOT || path.join(APP_ROOT, '..'));
const SERVER_DIR = path.resolve(env.MC_SERVER_DIR || path.join(SANDBOX_ROOT, 'server'));
const BACKUP_DIR = path.resolve(env.BACKUP_DIR || path.join(SANDBOX_ROOT, 'backups'));
const DATA_DIR = path.resolve(env.MANAGER_DATA_DIR || path.join(SANDBOX_ROOT, 'manager-data'));

const isConfiguredSecret = (value) => Boolean(value && !value.startsWith('replace-with-'));

const SUPERVISOR_TOKEN = env.SUPERVISOR_TOKEN || '';

module.exports = {
    APP_ROOT,
    SANDBOX_ROOT,
    SERVER_DIR,
    BACKUP_DIR,
    DATA_DIR,
    PORT: Number.parseInt(env.PORT || '3000', 10),
    HOST: '127.0.0.1',
    SUPERVISOR_TOKEN,
    SSO_PROXY_KEY: isConfiguredSecret(env.SSO_PROXY_KEY) ? env.SSO_PROXY_KEY : '',
    SSO_BOOTSTRAP_ADMIN_EMAIL: (env.SSO_BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase(),
    SSO_ROLES: {
        admin: list(env.SSO_ADMIN_IDS),
        operator: list(env.SSO_OPERATOR_IDS),
        viewer: list(env.SSO_VIEWER_IDS),
    },
    PUBLIC_ORIGIN: env.PUBLIC_ORIGIN || '',
    // Roles also come from Asmit Labs ID groups through OpenID Connect (routes/oidc.js).
    OIDC: {
        issuer: env.OIDC_ISSUER || 'https://id.asmit.dpdns.org',
        internal: env.OIDC_INTERNAL || 'http://127.0.0.1:8420',
        clientId: env.OIDC_CLIENT_ID || 'mc-manager',
        redirectUri: (env.PUBLIC_ORIGIN || '') + '/auth/callback',
        groups: { admin: 'minecraft-admins', operator: 'minecraft-operators', viewer: 'minecraft-viewers' },
    },
    SUPERVISOR_CONFIGURED: isConfiguredSecret(SUPERVISOR_TOKEN),
    // Used only when no server profile exists (a server that was installed by hand).
    fallback: {
        serverJar: resolveFrom(SERVER_DIR, env.MC_SERVER_JAR || 'fabric-server.jar'),
        javaBin: env.JAVA_BIN || (
            env.JAVA_HOME
                ? path.join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
                : 'java'
        ),
        minMemory: env.MC_MIN_MEMORY || '2G',
        maxMemory: env.MC_MAX_MEMORY || '6G',
        rcon: {
            host: env.RCON_HOST || '127.0.0.1',
            port: Number.parseInt(env.RCON_PORT || '25575', 10),
            password: isConfiguredSecret(env.RCON_PASSWORD) ? env.RCON_PASSWORD : '',
        },
    },
    PROPERTIES_FILE: resolveFrom(SERVER_DIR, env.MC_SERVER_PROPERTIES || 'server.properties'),
    CORS_ORIGIN: env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
        : false,
    CURSEFORGE_API_KEY: isConfiguredSecret(env.CURSEFORGE_API_KEY) ? env.CURSEFORGE_API_KEY : '',
    MODRINTH_USER_AGENT: env.MODRINTH_USER_AGENT || 'asmitonweb/MC-Manager/1.1 (github.com/asmitonweb/MC-Manager)',
    isConfiguredSecret,
};
