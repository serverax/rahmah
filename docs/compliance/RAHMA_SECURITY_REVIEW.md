# Rahma — Security Review (App Store Compliance)

## 1. Scope
This document outlines the security controls implemented to satisfy both general security best practices and specific App Store / Google Play requirements for handling sensitive user data and User-Generated Content (UGC).

## 2. Data Protection in Transit and at Rest
- **Transit**: All API communication between the mobile app and the backend must occur over HTTPS. The `RahmaApiClient` enforce this via standard Dart `Uri` parsing and the backend `ingress` configuration.
- **At Rest (Mobile)**: Sensitive session tokens (JWTs) are stored exclusively using `flutter_secure_storage`, which utilizes Android Keystore and iOS Keychain. SQLite data (`sqflite`) is stored in the application's secure sandbox.
- **At Rest (Backend)**: PostgreSQL passwords and application secrets are managed via Kubernetes Secrets and injected as environment variables.

## 3. PII and Anonymization
- **Accounts**: Only Sheikhs and Admins require explicit accounts. Public users operate anonymously by default.
- **Identifiers**: Device registration uses hashed identifiers (`device_id_hash`) rather than raw hardware IDs (like IMEI or MAC address), complying with modern OS privacy constraints.
- **Email Hashing**: Any emails collected for notification or moderation purposes are stored as SHA-256 hashes (`email_hash`) to minimize the impact of a potential breach.

## 4. UGC and Moderation Security
- **Role-Based Access Control (RBAC)**: The backend enforces strict role checks (`requireAuth([ROLES.ADMIN])`) for any state changes that make UGC public.
- **Audit Logging**: Every status transition for a question or answer (e.g., `sheikh_answer_submitted`, `admin_approved_answer`) is logged in `ask_sheikh_audit_events` with the actor's identity.
- **Input Validation**: All incoming UGC (questions) is validated against strict JSON schemas to prevent injection attacks and enforce length limits.

## 5. Third-Party Libraries
- External dependencies in both the Node.js backend and Flutter mobile app are regularly audited for known vulnerabilities (`npm audit`, `flutter pub outdated`).
- No external ad-networks or tracking SDKs are included, maintaining the app's clean privacy label.
