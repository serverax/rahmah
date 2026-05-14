# Rahma — Sync Conflict Policy

**Date:** 2026-05-14

## Goal

Keep mobile-side reconciliation simple. The mobile app is a thin client;
the cluster is the source of truth.

## Cases

| Local state | Server state | Resolution |
|---|---|---|
| local cache approved, server-side approved-source revoked | server wins; client invalidates cache on next sync |
| local question draft | server has no record (never sent) | client uploads on sync; server returns `pending_review` |
| local question draft | server has the question (uploaded before) | server response wins; client merges status |
| local game progress | server has older counters | local wins; client uploads |
| local game progress | server has newer counters (other device) | server wins; client overwrites local |
| local donation intent | provider succeeded | server wins; client clears local "pending" copy |
| local donation intent | provider failed | server wins; client clears local copy, shows safe Arabic copy |

## Server is the source of truth

Anything that affects identity, persistence, or audit is determined by
the cluster. The mobile app can hold OPTIMISTIC state while offline,
but reconciliation flips to server-wins for everything except game
progress (where local-wins is the obvious choice).

## Hard NEVERs

- NEVER auto-resolve a Sheikh answer's citation_status on the client.
- NEVER mark a donation as succeeded on the client without a server
  confirmation.
- NEVER overwrite a server-side question status with a local guess.
- NEVER cache PII (user_id beyond opaque, email beyond hash) in the
  conflict resolver.
