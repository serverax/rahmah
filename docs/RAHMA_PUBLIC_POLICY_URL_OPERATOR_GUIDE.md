# Rahma — Public Policy URL Operator Guide

## 1. Overview
To pass App Store and Google Play reviews, several legal and support pages must be hosted on a public domain and linked in the store consoles.

## 2. Required Public Pages
The following files from `apps/web/public/` must be served over HTTPS:

| File | Proposed URL Path | Console Usage |
|---|---|---|
| `privacy.html` | `/privacy` | Privacy Policy URL (Required by both) |
| `terms.html` | `/terms` | EULA / Terms of Service |
| `child-safety.html` | `/child-safety` | Data Safety / Families Policy evidence |
| `support.html` | `/support` | Support URL (Required by Apple) |
| `account-deletion.html` | `/delete-account` | Data Deletion URL (Required by Google) |

## 3. Store Console Configuration

### Google Play Console
- **Privacy Policy**: Enter the live URL to `privacy.html`.
- **Data Safety**: Declare that the app collects "Email" (if applicable) and "Approximate Location" (if GPS used), and provide the URL to `account-deletion.html`.

### Apple App Store Connect
- **Privacy Policy URL**: Enter the live URL to `privacy.html`.
- **Support URL**: Enter the live URL to `support.html`.
- **App Privacy**: Select "Data Linked to User" (Account/UGC) and "Data Not Linked to User" (Location/Diagnostics).

## 4. Final Warning
**DO NOT submit the app for review until these URLs are live and reachable by the reviewers.**
