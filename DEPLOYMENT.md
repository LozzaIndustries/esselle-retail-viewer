# Lumière Folio: Deployment Guide

This document outlines the professional deployment workflow for Lumière Folio to Firebase.

## 1. Prerequisites
- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- A Firebase Project created in the console.
- **Authentication**, **Firestore**, and **Storage** enabled in the console.

## 2. Local Initialization
Run the following commands in your project root:

```bash
firebase login
firebase init
```

### Initialization Settings:
- **Features:** Hosting, Firestore, Storage.
- **Firestore/Storage:** Select "Use an existing project" and pick your project.
- **Hosting:**
  - Public directory: `.` (or your build folder if using a bundler).
  - Configure as a single-page app: **Yes**.
  - Set up automatic builds/deploys with GitHub: **Yes** (Recommended).

## 3. Firebase Security Rules

### Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global App Settings
    match /config/global_settings {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Booklets
    match /booklets/{bookletId} {
      allow read: if true; // Publicly viewable
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
  }
}
```

### Storage Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true; // Allow public viewing of PDFs
      allow write: if request.auth != null; // Only authenticated users upload
    }
  }
}
```

## 4. Production Configuration
Update `services/firebase.ts` with your credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

## 5. Deployment
```bash
# Deploy everything
firebase deploy

# Deploy only hosting (for quick UI updates)
firebase deploy --only hosting
```

## 6. Going Live
Once deployed, your app will be available at `https://YOUR_PROJECT.web.app`.
1. Log in with your admin credentials.
2. Go to **Branding** to upload your permanent logo.
3. Start uploading PDFs to build your portfolio.

---
*Lumière Folio - Premium Digital Publication Engine*
