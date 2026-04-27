# Access Control

Covers roles, API tokens, users, invitations, and SSO.

> For endpoint shapes, payload attributes, and TS signatures, consult `npx datocms cma:docs roles <action> --types-depth 2`, `cma:docs accessTokens <action> --types-depth 2`, `cma:docs users <action> --types-depth 2`, `cma:docs siteInvitations <action> --types-depth 2`, `cma:docs ssoUsers <action> --types-depth 2`, `cma:docs ssoGroups <action> --types-depth 2`, or `cma:docs ssoSettings <action> --types-depth 2` (raise the depth or use `--expand-types` for deeper nested types). This file only covers what the docs don't carry.

## Permissions model

DatoCMS roles use a **positive/negative permission model**: positive permission arrays grant; negative permission arrays revoke (overriding any positive grant — useful for "all access except X" patterns).

Four parallel permission arrays on a role:

- `positive_item_type_permissions` / `negative_item_type_permissions` — per-model record actions
- `positive_upload_permissions` / `negative_upload_permissions` — asset actions
- `positive_build_trigger_permissions` / `negative_build_trigger_permissions` — build trigger actions

The complete computed permission set (own + inherited via `inherits_permissions_from`) lives in `meta.final_permissions` on a fetched role — read it when debugging "why does this user not see X?".

### `environments_access` levels

Top-level enum on a role, **not** a per-permission flag:

| Value | Effect |
|---|---|
| `"all"` | Every environment, primary + sandboxes |
| `"primary_only"` | Primary only |
| `"sandbox_only"` | Any sandbox, never primary |
| `"none"` | No environment access (rare; for tokens that never touch records) |

### Item type permission scoping

Beyond `environment` and `item_type`, the per-permission record entry takes optional fields that narrow the grant — these often surprise:

- `action` — `"all" | "read" | "create" | "update" | "duplicate" | "delete" | "publish" | "edit_creator" | "take_over" | "move_to_stage"`. `"all"` is **CRUD + publish**, not "everything ever" (e.g. it does not include `take_over`).
- `on_creator` — `"anyone" | "self" | "role" | null`. Restrict the grant to records the actor created (`"self"`), or anyone with the same role (`"role"`). Null = no creator restriction.
- `localization_scope` — `null | "all" | "localized" | "not_localized"`. Used together with `locale` to grant write access to specific locales only. Required when locking down per-locale editing.
- `workflow` / `on_stage` / `to_stage` — required only for the `move_to_stage` action and workflow-aware grants.

### Upload permission actions

Different enum from item types: `"all" | "read" | "create" | "update" | "delete" | "edit_creator" | "replace_asset" | "move"`. `"replace_asset"` is its own grant — `"update"` covers metadata but not file replacement; `"move"` covers reorganizing across upload collections.

### Role inheritance

```ts
inherits_permissions_from: [{ id: baseRoleId, type: "role" }]
```

Inherited permissions are unioned with own positives, minus own negatives. The resolved set lives in `meta.final_permissions` (read-only).

---

## API tokens

The `token` string value is **only returned on `create` and `regenerateToken`** — every other read returns `token: null`. Persist it at creation time or you will need to regenerate it (which invalidates the previous value).

`can_access_cda`, `can_access_cda_preview`, `can_access_cma` are **independent** booleans — a token can have any combination. A "CMA token" with only `can_access_cma: true` cannot read CDA content; a token with `can_access_cda_preview: true` reads draft content via the public CDA endpoint.

`regenerateToken("token-id")` returns a new `token` value and invalidates the old one immediately — coordinate rollouts to consumers before calling it on a production token.

---

## Site invitations

`invitation_link` is, like the access token value, **only returned on create / resend** — list/find responses set it to `null`. Capture it at creation time.

`expired: true` means the link no longer works; call `client.siteInvitations.resend(id)` to mint a fresh link with the same role binding.

---

## SSO

**`ssoUsers` is read-only on attributes.** First name, last name, email, active status, group membership are all managed by the identity provider (SAML / SCIM). Only the `role` assignment can be modified, and even then only via group membership in most setups.

`client.ssoUsers.copyUsers()` — bulk-import the project's existing email-based users as SSO users. Useful as a one-time migration when enabling SSO on a project that already has collaborators.

**`ssoGroups.priority` resolves the role conflict** when one SSO user belongs to multiple groups: the role from the **highest-priority** group wins. Always set `priority` explicitly when creating overlapping groups; default ordering is not stable.

`client.ssoGroups.copyRoles(groupId)` — sync the role assignments from the IdP for a single group.

`client.ssoSettings.default_role` — assigned to any new SSO user that doesn't match a group. Set it to a low-privilege role (e.g. read-only viewer) rather than leaving it as full editor.
