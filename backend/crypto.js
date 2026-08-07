// Field-level encryption for user PII (usernames/emails) + blind index for lookups.
//
// Usernames are never stored in plaintext:
//   - `encryptField` / `decryptField`: AES-256-GCM, random IV per value.
//   - `blindIndex`: deterministic HMAC-SHA256 so we can look a user up by email
//     without decrypting every record.
const crypto = require('crypto')

const HEX_KEY_RE = /^[0-9a-f]{64}$/i

function resolveKey() {
  const raw = process.env.ENCRYPTION_KEY || ''
  if (HEX_KEY_RE.test(raw)) return Buffer.from(raw, 'hex')
  if (raw) return crypto.createHash('sha256').update(raw).digest()
  console.warn('[crypto] ENCRYPTION_KEY not set — using an insecure dev key. Set a 64-char hex key in .env for real use.')
  return crypto.createHash('sha256').update('pov-cooking-dev-key').digest()
}

const KEY = resolveKey()

function encryptField(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`
}

function decryptField(payload) {
  const [ivHex, tagHex, dataHex] = String(payload).split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}

function blindIndex(value) {
  return crypto.createHmac('sha256', KEY).update(String(value).trim().toLowerCase()).digest('hex')
}

module.exports = { encryptField, decryptField, blindIndex }
