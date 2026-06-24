async function deriveKey(password, saltBase64) {
  const textEncoder = new TextEncoder();
  const base64ToBytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const salt = base64ToBytes(saltBase64);
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return key;
}

(async () => {
  const result = await deriveKey('hunter2', 'c29tZXNhbHQxMjM0NTY3OA==');
  console.log(result);
})();