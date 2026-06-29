import { aiModel } from '@/firebase';

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function extractDocumentFields(imageBlob, { docNbrFieldLabel, pinNbrFieldLabel }) {
  const base64Data = await blobToBase64(imageBlob);

  const prompt = `
Examine this document and extract the following fields, if present:

- "name": the document's title or what it represents (e.g. "Vehicle Registration", "Passport")
- "provider": the issuing organization, company, or authority shown on the document
- "expiry": expiration date in YYYY-MM-DD format, if shown
- "field1": the value for "${docNbrFieldLabel}", if this label or an equivalent concept appears on the document
- "field2": the value for "${pinNbrFieldLabel}", if this label or an equivalent concept appears on the document
- "notes": any other potentially useful information visible on the document that doesn't fit the above fields (names, addresses, additional numbers, dates, etc.), summarized concisely

Rules:
- Only include information actually visible in the image — never guess or fabricate.
- If a field isn't present or legible, use null for that field (except "notes", which can be an empty string).
- Dates must be YYYY-MM-DD format only.

Return ONLY a JSON object with exactly these keys:
{
  "name": string | null,
  "provider": string | null,
  "expiry": string | null,
  "field1": string | null,
  "field2": string | null,
  "notes": string
}
`;

  const result = await aiModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { inlineData: { mimeType: imageBlob.type || 'image/jpeg', data: base64Data } }],
      },
    ],
  });

  const responseText = result.response.text();
  const jsonString = responseText.replace(/```json|```/g, '').trim();
  return JSON.parse(jsonString);
}

export { extractDocumentFields };
