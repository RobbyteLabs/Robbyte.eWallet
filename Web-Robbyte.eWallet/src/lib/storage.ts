import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { defaultAppData } from "../data/defaults";
import type { AppData, DataBlockName, EncryptedBlock } from "../types";
import { decryptValue, encryptValue, orderedBlocks } from "./crypto";
import { db } from "./firebase";

type EncryptedAppBlocks = Partial<Record<DataBlockName, EncryptedBlock>>;

const cacheKey = (uid: string) => `robbyte-ewallet:${uid}:encrypted-cache`;

const encryptedDataRef = (uid: string) =>
  collection(db, "users", uid, "encryptedData");

export const loadRemoteBlocks = async (uid: string) => {
  const snapshot = await getDocs(encryptedDataRef(uid));
  const blocks: EncryptedAppBlocks = {};
  snapshot.forEach((item) => {
    blocks[item.id as DataBlockName] = item.data() as EncryptedBlock;
  });
  return blocks;
};

export const saveRemoteBlocks = async (
  uid: string,
  blocks: EncryptedAppBlocks,
) => {
  await Promise.all(
    Object.entries(blocks).map(([name, block]) =>
      setDoc(doc(db, "users", uid, "encryptedData", name), {
        ...block,
        updatedAt: block.updatedAt,
        serverUpdatedAt: serverTimestamp(),
      }),
    ),
  );
};

export const cacheEncryptedBlocks = (uid: string, blocks: EncryptedAppBlocks) => {
  localStorage.setItem(cacheKey(uid), JSON.stringify(blocks));
};

export const loadCachedBlocks = (uid: string) => {
  const raw = localStorage.getItem(cacheKey(uid));
  if (!raw) return {};
  return JSON.parse(raw) as EncryptedAppBlocks;
};

export const clearCachedBlocks = (uid: string) => {
  localStorage.removeItem(cacheKey(uid));
};

export const decryptAppData = async (
  blocks: EncryptedAppBlocks,
  key: CryptoKey,
) => {
  const next: AppData = structuredClone(defaultAppData);
  for (const name of orderedBlocks) {
    if (blocks[name]) {
      next[name] = await decryptValue(blocks[name] as EncryptedBlock, key);
    }
  }
  return next;
};

export const encryptAppData = async (
  data: AppData,
  key: CryptoKey,
  salt: string,
) => {
  const blocks: EncryptedAppBlocks = {};
  for (const name of orderedBlocks) {
    blocks[name] = await encryptValue(data[name], key, salt);
  }
  return blocks;
};

export const hasAnyRemoteData = (blocks: EncryptedAppBlocks) =>
  orderedBlocks.some((name) => Boolean(blocks[name]));

export type { EncryptedAppBlocks };
