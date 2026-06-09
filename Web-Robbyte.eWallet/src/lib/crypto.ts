import type { DataBlockName, EncryptedBlock } from "../types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const iterations = 250000;
const version = 1;

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
};

const fromBase64 = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const normalizePin = (pin: string, uid: string) => {
  const normalizedPin = pin.trim();
  if (!/^\d{6}$/.test(normalizedPin)) {
    throw new Error("El PIN debe tener exactamente 6 digitos.");
  }
  return `${uid}:${normalizedPin}`;
};

export const generateSalt = () => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return toBase64(salt);
};

export const deriveEncryptionKey = async (
  pin: string,
  uid: string,
  saltBase64: string,
) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(normalizePin(pin, uid)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltBase64),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptValue = async <T>(
  value: T,
  key: CryptoKey,
  salt: string,
): Promise<EncryptedBlock> => {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(value)),
  );

  return {
    encryptedPayload: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    salt,
    version,
    updatedAt: new Date().toISOString(),
  };
};

export const decryptValue = async <T>(
  block: EncryptedBlock,
  key: CryptoKey,
): Promise<T> => {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(block.iv) },
    key,
    fromBase64(block.encryptedPayload),
  );
  return JSON.parse(decoder.decode(decrypted)) as T;
};

export const encryptedBackupName = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `robbyte-ewallet-backup-${timestamp}.json`;
};

export const orderedBlocks: DataBlockName[] = [
  "settings",
  "incomes",
  "expenses",
  "loans",
  "cards",
];
