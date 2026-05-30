# Android build (Capacitor)

Quick steps to turn the frontend into an Android app using Capacitor.

1. Build the web app

```powershell
cd "G:\JAPANESE APP\frontend"
npm install
npm run build
```

2. Install Capacitor and initialize (only once)

```powershell
npm install @capacitor/core @capacitor/cli --save
npx cap init JbackApp com.example.jback --web-dir=dist
```

3. Add Android, copy assets, open Android Studio

```powershell
npx cap add android
npx cap sync android
npx cap open android
```

4. After changes to web code

```powershell
npm run build
npx cap copy android
npx cap sync android
```

Notes:
- Make sure Android Studio, Android SDK, and JDK are installed and configured.
- If `npx cap add android` errors about missing SDK, open Android Studio and import the generated `android/` project after running the previous commands.
