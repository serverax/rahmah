# Rahma — Android APK Build Runbook

## 1. Prerequisites
- **Android Studio** (or Android SDK Command Line Tools)
- **Java 17+** (OpenJDK)
- **Flutter SDK** (3.41.7+ recommended)

## 2. Environment Setup
1. Set `ANDROID_HOME` environment variable to your SDK path (e.g., `C:\Android\sdk`).
2. Run `flutter doctor` to verify the Android toolchain is green.
3. Ensure the Flutter SDK is on your `PATH`.

## 3. Build Process
1. Navigate to the mobile app directory:
   ```powershell
   cd F:/rahma/apps/mobile
   ```
2. Get dependencies:
   ```powershell
   flutter pub get
   ```
3. Run the build command (Debug version for testing):
   ```powershell
   flutter build apk --debug --dart-define=RAHMA_API_BASE=http://<YOUR_LOCAL_IP>:3000
   ```
   *Note: Replace `<YOUR_LOCAL_IP>` with the IP of your running backend machine.*

## 4. CI/CD Build
An automated build workflow is available in `.github/workflows/rahma-mobile-apk.yml`. Pushing to `main` or triggering manually will produce an APK artifact downloadable from the Actions tab.
