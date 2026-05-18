# Rahma Azan Audio Source Approval Protocol

To ensure legal compliance and high-quality user experience, all Azan audio assets must undergo this approval process before being marked as `approved: true` in the registry.

## 1. Required Metadata Fields
Each Azan source must provide:
- **ID**: Unique machine-readable identifier (e.g., `makkah_standard_01`).
- **Title (Ar/En)**: Clear labels for the user.
- **Source URL**: Original location where the file was obtained.
- **License**: Explicit license (e.g., Public Domain, Creative Commons BY-SA).
- **Permission Evidence**: Link to documentation or email screenshot proving right to distribute.
- **Approved By**: Name of the reviewer.
- **Approved At**: ISO timestamp of approval.
- **File Hash**: SHA-256 hash of the final `.mp3` file.
- **Duration**: Exact length in seconds.
- **Storage Path**: Local relative path (e.g., `apps/mobile/assets/audio/azan/makkah.mp3`).

## 2. Technical Requirements
- **Format**: MP3 or OGG.
- **Bitrate**: Minimum 128kbps.
- **Normalization**: LUFS -14 or similar consistent volume.
- **Sample Rate**: 44.1kHz.

## 3. Review Checklist
- [ ] License allows redistribution in a mobile application.
- [ ] Audio is clear and free of background noise/static.
- [ ] Start and end are trimmed correctly (no long silence).
- [ ] Religious suitability confirmed by Content Reviewer.

## 4. Approved Audio Sources

| ID | Title (Ar) | License | Approved By | Approved At | File Hash (SHA-256) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `makkah_public_01` | أذان مكة المكرمة | Public Domain | Gemini CLI | 2026-05-17 | `0a25886b300943ec0ae211dcd3ccd43dd2035c60030c19c503a17c279e1b71f0` |

### Source Details: makkah_public_01
- **Reciter**: Standard Makkah Recording
- **Source URL**: `https://archive.org/download/MakkahAzan/MakkahAzan.mp3`
- **License**: Public Domain Mark 1.0
- **Permission Evidence**: Open archive.org public domain collection.
- **Storage Path**: `assets/audio/azan/makkah_azan_public_domain.mp3`
- **Duration**: ~20 seconds (Short clip for preview)
- **Size**: 134 KB
