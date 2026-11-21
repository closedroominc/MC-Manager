const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseMemory } = require('../lib/minecraft');
const { parseOnlinePlayers, PlayerTracker } = require('../lib/players');
const { createAuth, canOperate } = require('../lib/auth');

test('parseMemory understands JVM memory sizes', () => {
    assert.equal(parseMemory('6G'), 6 * 1024 ** 3);
    assert.equal(parseMemory('512M'), 512 * 1024 ** 2);
    assert.equal(parseMemory('2048'), 2048 * 1024 ** 2);
    assert.equal(parseMemory('lots'), null);
});

test('parseOnlinePlayers reads the RCON list response', () => {
    assert.deepEqual(parseOnlinePlayers('There are 2 of a max of 20 players online: Steve, Alex'), ['Steve', 'Alex']);
    assert.deepEqual(parseOnlinePlayers('There are 0 of a max of 20 players online: '), []);
});

test('PlayerTracker reports changes and keeps history', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcm-players-'));
    const tracker = new PlayerTracker({ file: path.join(dir, 'players.json') });
    assert.equal(tracker.update('online: Steve'), true);
    assert.equal(tracker.update('online: Steve'), false);
    assert.equal(tracker.update('online: '), true);
    const snapshot = tracker.snapshot();
    assert.equal(snapshot.active.length, 0);
    assert.equal(snapshot.history[0].name, 'Steve');
    fs.rmSync(dir, { recursive: true, force: true });
});

test('Autentico roles require a trusted proxy and an explicit user assignment', () => {
    const { identify } = createAuth('proxy-key', {
        viewer: ['viewer-id', 'admin-id'],
        operator: ['operator-id'],
        admin: ['admin-id'],
    }, 'admin@example.test');
    const viewer = { 'x-auth-user': 'viewer-id', 'x-de-proxy-key': 'proxy-key' };
    assert.equal(identify({ 'x-auth-user': 'admin-id', cookie: 'auth_token=legacy' }), null);
    assert.deepEqual(identify(viewer), { role: 'viewer' });
    assert.equal(canOperate(identify(viewer)), false);
    assert.equal(canOperate(identify({ ...viewer, 'x-auth-user': 'operator-id' })), true);
    assert.deepEqual(identify({ ...viewer, 'x-auth-user': 'admin-id' }), { role: 'admin' });
    assert.equal(identify({ ...viewer, 'x-auth-user': 'unknown-id', 'x-token-user-roles': 'admin' }), null);
    assert.deepEqual(identify({ ...viewer, 'x-auth-email': 'ADMIN@example.test' }), { role: 'admin' });
    assert.equal(identify({ 'x-de-proxy-key': 'proxy-key', 'x-auth-email': 'admin@example.test' }), null);
});


test('roles learned from Autentico groups apply to the verified user and expire', () => {
    const { identify, gateUser, setRole } = createAuth('proxy-key', {}, '');
    const headers = { 'x-auth-user': 'new-id', 'x-de-proxy-key': 'proxy-key' };
    assert.equal(gateUser(headers), 'new-id');
    assert.equal(gateUser({ 'x-auth-user': 'new-id' }), null);
    assert.equal(identify(headers), null);
    setRole('new-id', 'operator');
    assert.deepEqual(identify(headers), { role: 'operator' });
    assert.equal(identify({ ...headers, 'x-auth-user': 'other-id' }), null);
    setRole('new-id', 'viewer', -1);
    assert.equal(identify(headers), null);
});

test('the highest Autentico group wins and unrelated groups give no role', () => {
    const { roleFromGroups } = require('../routes/oidc');
    const map = { admin: 'minecraft-admins', operator: 'minecraft-operators', viewer: 'minecraft-viewers' };
    assert.equal(roleFromGroups(['minecraft-viewers', 'minecraft-operators'], map), 'operator');
    assert.equal(roleFromGroups(['minecraft-admins', 'minecraft-viewers'], map), 'admin');
    assert.equal(roleFromGroups(['Members'], map), null);
});