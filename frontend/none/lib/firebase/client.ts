import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from "firebase/auth";

import { env } from "@/lib/config/env";

function getRequiredFirebaseConfig() {
  const config = {
    apiKey: env.firebase.apiKey,
    authDomain: env.firebase.authDomain,
    projectId: env.firebase.projectId,
    appId: env.firebase.appId,
    storageBucket: env.firebase.storageBucket || undefined,
    messagingSenderId: env.firebase.messagingSenderId || undefined,
  };

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    return null;
  }

  return config;
}

export function isFirebaseClientConfigured() {
  return Boolean(getRequiredFirebaseConfig());
}

export function getFirebaseApp() {
  const config = getRequiredFirebaseConfig();

  if (!config) {
    throw new Error(
      "Firebase client config is missing. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID.",
    );
  }

  return getApps().length ? getApp() : initializeApp(config);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function createPhoneRecaptchaVerifier(container: HTMLElement) {
  return new RecaptchaVerifier(getFirebaseAuth(), container, {
    size: "invisible",
  });
}

export function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
  });

  return provider;
}
