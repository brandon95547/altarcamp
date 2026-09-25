/**
 * A file's bytes as base64, for the JSON upload body. FileReader encodes natively; building the
 * string with String.fromCharCode(...bytes) instead spreads every byte into one call, which
 * overflows the stack for anything much over 100 KB — every song, in other words.
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}
