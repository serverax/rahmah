# Rahma — Privacy & Data Safety Model

## 1. Overview
This document defines the data collection, retention, and deletion model for the Rahma application. It serves as the source of truth for generating App Store Privacy Labels and Google Play Data Safety declarations.

## 2. Data Collection

### 2.1 User Accounts
- **Collected**: Email (hashed on server), Roles.
- **Purpose**: Authentication for Sheikhs/Admins, linking optional public user history.
- **Linked to User**: Yes.

### 2.2 User-Generated Content (UGC)
- **Collected**: Questions submitted to "Ask Sheikh Hasan".
- **Purpose**: Providing religious guidance.
- **Linked to User**: Yes, but obfuscated for public display if approved.
- **Default Visibility**: Private.

### 2.3 Location Data
- **Collected**: Approximate or Precise Location (based on user permission).
- **Purpose**: Calculating local prayer times and finding nearby mosques.
- **Storage**: Not stored persistently on the backend. Only used transiently or cached locally on the device (hashed/rounded).
- **Linked to User**: No.

### 2.4 Device & Analytics
- **Collected**: Anonymized Device IDs, OS versions, App versions.
- **Purpose**: Delivering push notifications (Azan), debugging, sync orchestration.
- **Linked to User**: No (hashed).

## 3. Data Safety Declarations (Store Prep)

### Google Play Data Safety
- **Data Collected**: Personal info (email hash), App activity (questions).
- **Data Shared**: None with third parties.
- **Encryption**: All data encrypted in transit (HTTPS).
- **Deletion**: Users can request data deletion via in-app mechanism.

### Apple App Privacy Labels
- **Data Linked to You**: Contact Info (Email), User Content (Questions).
- **Data Not Linked to You**: Location, Identifiers (Device ID), Diagnostics.
- **Tracking**: No.

## 4. Deletion & Anonymization
- When a user requests account deletion, their email hash and identity records are purged.
- Submitted questions (UGC) are either deleted or permanently anonymized (disconnected from any user ID) depending on their publication status and the user's explicit request.
