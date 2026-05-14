# Rahma — Privacy Model

**Date:** 2026-05-14
**Audience:** operator + security reviewer.

## Data minimisation

| Personal identifier | Stored shape | Notes |
|---|---|---|
| Email address | sha-256 hash only (`email_hash`, 64 hex) | Raw email never persisted by Rahma. |
| Device id | sha-256 hash only (`device_hash`, 64 hex) | Raw device id never reaches the backend; mobile hashes it locally. |
| User id | opaque UUID | Not derivable from email or device. |
| Phone | NEVER stored | |
| Address | NEVER stored | |
| Photo / voice / video | NEVER stored | No upload endpoint exists. |
| IP address | sha-256 hash only in audit rows; raw IP MAY appear in the operator's reverse-proxy / Traefik logs governed by the operator's retention policy. |

## Children's data

Rahma is a family app with a wali (guardian) toggle. When the children's
section is active:

- NO email / device id collected from the child.
- NO chat between children.
- NO public profile.
- NO leaderboard.
- Progress is local-first; opt-in server backup stores ONLY counters.
- Audit table `wasm_child_safety_audit` stores ONLY a sha-256 of the
  evaluated body — NEVER the body text.

## Request types

`POST /api/privacy/requests` supports:

- `delete_account`
- `data_export`
- `correct_data`
- `restrict_processing`
- `contact`

Each request returns `persisted: false` when the DB is not yet wired
(honest: the request is acknowledged but not yet stored). When the DB
is wired, the request is recorded with an `email_hash` + `request_type`
+ `status` + timestamps — never the raw email.

## Retention

- `audit_events`: 7 years (operator policy; legal-driven).
- `privacy_requests`: kept indefinitely as the legal record of how the
  request was handled.
- Cached mobile data (encrypted hive boxes): operator may invalidate
  via a "logout all devices" flow when the SESSION_SECRET rotates.

## Compliance posture

This is a privacy MODEL, not a compliance certification. The operator
must independently determine GDPR / CCPA / store-policy obligations
and update the model as needed. Rahma's job is to make those
obligations easy to meet — by NOT collecting data we don't need.
