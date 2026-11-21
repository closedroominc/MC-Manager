# MC-Manager

This project is being hosted on the Windows machine under `E:\MC PC - Sandbox`.

## Windows deployment

Use the Windows-specific setup guide at `windows/WINDOWS_SETUP.md` (deployed to `..\WINDOWS_SETUP.md`). The original `setup.sh`, `upgrade.sh`, and Azure deployment instructions are retained for reference only.

The Windows tray controller lives in `windows/tray/` (deployed to `..\tray\`) and owns the Node manager process. From the dashboard, admins install the Minecraft server (Fabric or Forge), manage multiple worlds with backups and restore, and install mods from Modrinth (CurseForge optional).

## Development

```bash
npm test                            # unit tests (node:test)
node test/e2e/e2e.cjs <empty-dir>   # end-to-end check in a throwaway sandbox (needs Java)
windows/deploy-to-mc-pc.sh          # deploy to the Windows host over SSH
```

## Autentico access

The dashboard sits behind an Autentico Protected App. Caddy strips incoming identity headers, calls Autentico over loopback, copies the verified `X-Auth-User` ID from a successful check, and overwrites `X-DE-Proxy-Key` before proxying to the manager. Keep Caddy's key synchronized with the manager's `SSO_PROXY_KEY`, and set `PUBLIC_ORIGIN` to the dashboard's HTTPS origin.

Roles are read from the person's Autentico groups through an OpenID Connect client (`routes/oidc.js`, client id `mc-manager`, scope `groups`, redirect `<PUBLIC_ORIGIN>/auth/callback`). Create the groups `minecraft-admins`, `minecraft-operators` and `minecraft-viewers`; the highest one a person belongs to applies, and the role is cached per user for 8 hours.

- Viewers see server status and the map.
- Operators can also start, stop and restart Minecraft.
- Admins can also run console commands and manage configuration, players, mods, backups and worlds.

`SSO_VIEWER_IDS`, `SSO_OPERATOR_IDS` and `SSO_ADMIN_IDS` (comma-separated Autentico user IDs) still work and take precedence. `SSO_BOOTSTRAP_ADMIN_EMAIL` grants admin to one verified email, for first setup. People with no role are denied.
