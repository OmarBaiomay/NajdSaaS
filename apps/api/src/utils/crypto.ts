import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(env.CREDENTIALS_ENCRYPTION_KEY, "hex");

export interface EncryptedPayload {
  encryptedKey: string; // hex ciphertext
  iv: string; // hex
  authTag: string; // hex
}

/** Encrypts a secret (e.g. a tenant's third-party API key) at rest. */
export function encryptSecret(plaintext: string): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encryptedKey: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(payload.iv, "hex"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedKey, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/** Last 4 chars only, for display ("••••••••ab12") — never return the full key to the client. */
export function maskSecret(plaintext: string): string {
  const tail = plaintext.slice(-4);
  return `••••••••${tail}`;
}
