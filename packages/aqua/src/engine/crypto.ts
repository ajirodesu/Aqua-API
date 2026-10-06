/*
 * INFO: crypto.ts
 * Settings Encryption Utility — AES-256-GCM — by AjiroDesu.
 *
 * Ported from Persian-Bot's credential encryption
 * (`packages/cat-bot/src/engine/utils/crypto.util.ts`): industry-standard
 * authenticated encryption (AEAD) for secrets at rest. AES-256-GCM provides
 * three guarantees in a single pass:
 *   - Confidentiality   : AES-256 (256-bit key, 2^256 brute-force search space)
 *   - Integrity         : GCM auth tag detects any bit-flip or byte substitution
 *   - Authenticity      : same auth tag prevents forged ciphertexts reaching decrypt()
 *
 * Key material: 32 bytes (256 bits), sourced from ENCRYPTION_KEY env var as 64 hex chars.
 * IV:           12 bytes (96 bits), randomly generated per encrypt() call — NIST SP 800-38D
 *               recommendation for GCM; reusing an IV with the same key is cryptographically fatal.
 * Auth tag:     16 bytes (128 bits) — maximum GCM tag length, hardest to forge.
 *
 * Wire format: enc:v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * The "enc:v1:" prefix serves two purposes:
 *   1. Graceful migration — decrypt() returns legacy plaintext values unchanged when
 *      the prefix is absent, so existing rows continue working after deployment without
 *      a forced DB rewrite migration.
 *   2. Versioning — a future key rotation can introduce enc:v2: with a different algorithm
 *      or key derivation scheme while decrypt() dispatches on the version token.
 *
 * The format is intentionally identical to Persian-Bot's, so values are
 * interoperable between the two codebases when they share the same key.
 *
 * ENCRYPTION_KEY must be kept secret and rotated if compromised. Rotate by:
 *   1. Generate new key with: openssl rand -hex 32
 *   2. Write a one-time migration script that reads enc:v1: values with the OLD key and
 *      re-encrypts with the new key, writing enc:v2: (or fresh enc:v1: with new key).
 *   3. Deploy with the new ENCRYPTION_KEY after the migration completes.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from './env.config.js';
import { logger } from './logger.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV — NIST recommended for GCM
const KEY_LENGTH = 32; // 256-bit key
const ENCRYPTED_PREFIX = 'enc:v1:';

let plaintextWarned = false;

// ── Key handling ──────────────────────────────────────────────────────────────

/** Raw configured key material, or undefined when ENCRYPTION_KEY is unset. */
function keyHex(): string | undefined {
  return env.ENCRYPTION_KEY;
}

/** True when a key is configured (shape is validated on actual use). */
export function isEncryptionConfigured(): boolean {
  const raw = keyHex();
  return typeof raw === 'string' && raw.trim() !== '';
}

/**
 * Derives the 32-byte AES key from the ENCRYPTION_KEY environment variable.
 * Fails fast on misconfiguration so misuse crashes loudly rather than
 * silently storing plaintext secrets in the database.
 */
function getKey(): Buffer {
  const raw = keyHex();
  if (raw === undefined) {
    throw new Error(
      '[crypto] ENCRYPTION_KEY is not set — cannot encrypt. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
  const keyHexValue = raw.trim();
  // Reject keys that are clearly wrong length before attempting the Buffer decode
  if (keyHexValue.length !== KEY_LENGTH * 2) {
    throw new Error(
      `[crypto] ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes / 256 bits). ` +
        `Got ${keyHexValue.length} characters.`,
    );
  }
  const key = Buffer.from(keyHexValue, 'hex');
  // Double-check after decode — invalid hex chars silently produce shorter buffers
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      '[crypto] ENCRYPTION_KEY contains non-hex characters. ' +
        'Use only 0-9 and a-f characters.',
    );
  }
  return key;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string with AES-256-GCM.
 *
 * A fresh random 12-byte IV is generated on every call — this is mandatory for GCM
 * security. Reusing an IV with the same key completely breaks confidentiality and
 * allows an attacker to XOR two ciphertexts to recover both plaintexts.
 *
 * @returns Encoded string: enc:v1:<iv>:<authTag>:<ciphertext> (all segments base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return (
    ENCRYPTED_PREFIX +
    iv.toString('base64') +
    ':' +
    authTag.toString('base64') +
    ':' +
    ciphertext.toString('base64')
  );
}

/**
 * Decrypts a value previously encrypted by encrypt().
 *
 * Graceful migration path: values that do NOT carry the enc:v1: prefix are assumed
 * to be legacy plaintext stored before encryption was deployed. They are returned
 * unchanged so existing DB rows work immediately after deployment without a forced
 * rewrite migration.
 *
 * @throws If the value is encrypted but no (valid) key is configured, or if the
 *         GCM auth tag verification fails — tampered or corrupted ciphertext must
 *         never be silently swallowed by callers.
 */
export function decrypt(value: string): string {
  // Legacy plaintext — return as-is for backward-compatible migration
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

  const key = getKey();
  const rest = value.slice(ENCRYPTED_PREFIX.length);
  const parts = rest.split(':');

  // Exactly 3 colon-delimited segments: iv, authTag, ciphertext
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error(
      '[crypto] Malformed encrypted value. ' +
        'Expected format: enc:v1:<iv>:<authTag>:<ciphertext>',
    );
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  // setAuthTag must be called before final() — GCM verification happens at final()
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

/**
 * Encrypts a database setting value when a key is configured, otherwise stores
 * it as plaintext with a one-time warning. Used by the DB adapters so the
 * dashboard keeps working with zero setup while deployments with
 * ENCRYPTION_KEY set get ciphertext at rest automatically.
 */
export function encryptSetting(plaintext: string): string {
  if (!isEncryptionConfigured()) {
    if (!plaintextWarned) {
      plaintextWarned = true;
      logger.warn(
        'ENCRYPTION_KEY is not set — database settings are stored as plaintext. ' +
          'Generate one with: openssl rand -hex 32',
      );
    }
    return plaintext;
  }
  return encrypt(plaintext);
}

/**
 * Decrypts a database setting value. Legacy plaintext rows pass through
 * untouched; encrypted rows require the (correct) configured key.
 */
export function decryptSetting(stored: string): string {
  return decrypt(stored);
}
