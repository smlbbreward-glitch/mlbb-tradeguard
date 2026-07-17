export const sanitizeFileName = (name) => {
  const base = (name || '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '') || 'file';
  if (/^(image|img|photo|picture|screenshot|pic|untitled)\.(png|jpe?g|gif|webp|bmp)$/i.test(base)) {
    const ext = base.split('.').pop() || 'png';
    return `upload_${Date.now()}.${ext}`;
  }
  return base;
};
