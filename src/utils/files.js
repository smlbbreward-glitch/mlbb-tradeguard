export function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Downscale + re-encode an image dataUrl to keep request payloads small
// (Vercel serverless functions reject bodies over ~4.5MB, so raw phone
// photos as base64 would fail with 413). Returns the original dataUrl if
// it is not an image or if compression is not possible.
export function compressImageDataUrl(dataUrl, { maxSize = 1000, quality = 0.7 } = {}) {
  return new Promise((resolve) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width || maxSize, img.height || maxSize));
      const w = Math.max(1, Math.round((img.width || maxSize) * scale));
      const h = Math.max(1, Math.round((img.height || maxSize) * scale));
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
