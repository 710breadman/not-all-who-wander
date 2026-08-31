# Android release checklist

The Android app is a Capacitor package around the same local-first web app. Use
the commands below from the repository root.

## Security baseline

- The app has no background or precise-location permission. It requests
  approximate location only when a user asks to use their current location or
  records a track. Its only other runtime permissions are Internet and network
  state.
- Android backups are disabled because trip notes and medical details can be
  stored locally.
- Cleartext network traffic is blocked. Production web assets are bundled into
  the APK, so the app remains useful offline.
- Release APKs are optimized with R8 and resource shrinking. The release task
  rejects unsigned output.

## Build a signed release APK

1. Install Android SDK Platform 36 and Build Tools, then ensure `JAVA_HOME`
   points to JDK 21 or newer. Set `ANDROID_HOME` to the SDK location for the
   current shell, for example `$env:ANDROID_HOME = "$env:LOCALAPPDATA\\Android\\Sdk"`.
2. Create a private signing key. Keep it outside source control, for example:

   ```powershell
   keytool -genkeypair -v -keystore android/camping-release.jks -alias camping -keyalg RSA -keysize 4096 -validity 10000
   ```

3. Create the ignored file `android/keystore.properties`:

   ```properties
   storeFile=camping-release.jks
   storePassword=your-store-password
   keyAlias=camping
   keyPassword=your-key-password
   ```

4. Build and verify the APK:

   ```powershell
   npm run android:release
   & "$env:ANDROID_HOME/build-tools/<version>/apksigner.bat" verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
   ```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`.
Increment `versionCode` before every store upload; Android and Play reject a
reused version code. Never commit the keystore or `keystore.properties`.

## Local verification

Run `npm run android:verify` for a debug APK. The GitHub Actions Android
workflow also produces a debug APK artifact on every main-branch push.
