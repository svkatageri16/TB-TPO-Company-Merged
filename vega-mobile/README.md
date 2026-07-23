# VEGA Enterprise Mobile Architecture Documentation (Android & iOS)

A high-performance, resilient, secure, and production-ready React Native application. This mobile companion fully synchronizes with the existing VEGA backend APIs, enabling a seamless experience for Students, Recruiters, and Administrators.

---

## 1. Directory Tree & Architecture Blueprint

```text
/vega-mobile
├── package.json               # Mobile dependency configurations
├── tsconfig.json              # TypeScript engine configurations
├── README.md                  # Comprehensive technical roadmap
└── src
    ├── types
    │   └── index.ts          # Unified Interface data-models
    ├── services
    │   ├── api.ts            # Axios networking + outbox offline caches
    │   ├── socket.ts         # Socket.IO real-time tunnel controllers
    │   └── security.ts       # Jailbreak blocks + SSL pinning specifications
    ├── store
    │   └── index.ts          # Global state management using Redux Toolkit
    ├── navigation
    │   └── AppNavigator.tsx  # Dynamic stack controller (Student, Company, Admin)
    └── screens
        ├── LoginScreen.tsx   # Secured access screen with Biometrics integration
        ├── DashboardScreen.tsx    # Gamified daily metrics interface for Student
        ├── InterviewScreen.tsx    # Oral/voice interview evaluation sandbox
        ├── ResumeBuilderScreen.tsx # Multi-template generative ATS resumes customizer
        ├── CodingArenaScreen.tsx  # Interactive compilation & algorithm tester
        ├── RecruiterScreen.tsx    # Funnel analytical console for recruiters
        └── AdminScreen.tsx        # High-availability monitoring console
```

---

## 2. Authentication Flow & Biometric Integration

```text
               ┌────────────────────────┐
               │    App Initial boot    │
               └───────────┬────────────┘
                           │
             ┌─────────────▼─────────────┐
             │ Root/Jailbreak Detection  │
             └─────────────┬─────────────┘
                           │
                    [Device Secure?]
               ┌───────────┴───────────┐
            No │                   Yes │
       ┌───────▼───────┐       ┌───────▼───────┐
       │ Restrict Load │       │ Inspect State │
       └───────────────┘       └───────┬───────┘
                                       │
                              [JWT Active/Valid?]
                         ┌─────────────┴─────────────┐
                      No │                       Yes │
             ┌───────────▼───────────┐       ┌───────▼───────┐
             │ Biometric Prompt /    │       │ Bypass View to│
             │ Password Submission   │       │ role Dashboard│
             └───────────────────────┘       └───────────────┘
```

* **Biometric Profile Hardware Cryptography (FaceID & Fingerprint)**:
  * Leverages secure hardware-isolated enclaves (TEE/Enclave chips) via `expo-local-authentication` or `react-native-fingerprint-scanner`.
  * Preserves secure session payloads locally utilizing platform-specific keychains (Keystore on Android, Keychain on iOS).
  * Automatically signs transaction requests with asymmetric private keys following successful biologic identification.

---

## 3. High-Performance Navigation Hierarchy

* **Bottom Tabs Architecture**: Used by Students for high-priority views (Talent Hub, AI Speech Evaluator, ATS Resume Optimizer, Algorithmic Coding Arena) inspired by the high-efficiency layouts of LinkedIn and Naukri.
* **Declarative Role Isolation**:
  * **Student Stack**: Dynamically loads `MainApp` tab structures.
  * **Recruiter Stack**: Mounts funnel lists, pipeline trackers, candidate search logs, and eligibility criteria management screens.
  * **Admin Stack**: Accesses the platform health logging control center and service status indicators (`Uptime`, `Latency`, `Workers health`).

---

## 4. State Management (Redux Toolkit Ecosystem)

* **Separation of Concerns**: State is partitioned into `auth` (credentials & keys), `student` (cached streaks, XP points, and interviews), and `config` (dual-language preferences & online adapters).
* **Memoization Strategy**:
  * Utilizes React `useMemo` on static analytical datasets (or Talent Score computations) to avoid redrawing large lists and canvas animations.
  * Employs `useCallback` on handlers passed down to specialized charts or interactive inputs to decrease layout computation garbage collection overhead.

---

## 5. Network Resiliency & Offline Cache Outbox

* **Auto JWT Token Refresh Handshakes**: Implemented via Axios response interceptors. Intercepts any `401 Unauthorized` responses and completes an automatic backchannel handshake using secured refresh tokens stored in Async Storage.
* **Outbox Buffer Pattern**:
  * If the device undergoes network drops, APIs like mock interview transcripts and resume inputs are automatically added to a persistent JSON-serialized queue.
  * Upon network recovery, a dynamic event trigger fires `syncOfflineQueue()`, sequentially replaying offline actions to the backend database before emptying the queue cache.

---

## 6. Real-Time Telemetry & WebSocket Connection

* **Keep-alive WebSocket (Socket.IO)**: Builds real-time duplex pipelines for candidate evaluations, mock session state signals, job matches, and global notifications. Equipped with an exponential backoff heartbeat monitor to auto-reconnect following tunnel terminations.

---

## 7. Secured Coding Standards & Defenses

* **Jailbreak and Root Lockouts**: Utilizes active integrity API checks matching Google SafetyNet / Apple App Attest. Restricts application launch if security flags are triggered.
* **Man-In-The-Middle Prevention (Certificate Pinning)**: Restricts API communication exclusively to connections signing fingerprints matching authorized CA registries (`pinConfig` in `src/services/security.ts`).
* **Protected Local Values**: Restricts access credentials and sensitive key values by saving payloads into secure SQLite local sectors rather than generic key-value lists.

---

## 8. Play Store & App Store Production Deployment Audits

### Android Release Optimization (Google Play Store)
1. **Proguard Decryption Rules**: Turn on Proguard obfuscation optimization inside `android/app/proguard-rules.pro` to encrypt compiled JavaScript code bundles, making reverse engineering of business algorithms nearly impossible.
2. **Dynamic Delivery Splits (AAB format)**: Compile using Android App Bundle (`./gradlew bundleRelease`) instead of standard APKs to split compiled assets by device architecture, reducing final download bundle size by over 50%.
3. **SafetyNet / Play Integrity Attestation**: Integrate Google Play Integrity capabilities on console dashboards to secure authentication APIs against automated emulator bot farms.

### iOS Release Optimization (Apple App Store)
1. **Bitcode Compiler Optimization**: Build using modern LLVM profiles to allow Apple servers to auto-compile architecture patches for targeted device form-factors.
2. **Entitlements Profile Scans**: Define exact capabilities list parameters inside plist files (e.g., `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`) ensuring strict compliance with app store guideline audits.
3. **Provisioning Profiles and Encrypted Handshakes**: Create Production Apple Distribution certificates through Apple Developer accounts before committing final test builds to TestFlight.
