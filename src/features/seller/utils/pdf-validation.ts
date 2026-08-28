export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfValidationError';
  }
}

const PDF_MAGIC_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const MAX_BASE64_CHARS = 15_000_000;
const MAX_RAW_BYTES = Math.floor((MAX_BASE64_CHARS * 3) / 4) - 2048; // ~11 MB safety headroom

export async function validateAndEncodePdf(file: File): Promise<{ filename: string; filedata: string }> {
  if (!/\.pdf$/i.test(file.name)) {
    throw new PdfValidationError('Only PDF documents are accepted (file extension must be .pdf).');
  }
  if (file.name.length < 4 || file.name.length > 30) {
    throw new PdfValidationError('Filename must be between 4 and 30 characters long.');
  }
  if (file.type && file.type !== 'application/pdf') {
    throw new PdfValidationError('Invalid MIME type. Selected file must be a PDF document.');
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new PdfValidationError('File size exceeds maximum permitted limit (~11 MB).');
  }

  const arrayBuffer = await file.arrayBuffer();
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const isPdfHeaderValid = PDF_MAGIC_HEADER.every((byte, index) => headerBytes[index] === byte);

  if (!isPdfHeaderValid) {
    throw new PdfValidationError('Invalid PDF content: magic header bytes (%PDF-) check failed.');
  }

  const base64String = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Payload = (result.includes(',') ? result.split(',')[1] : result) || '';
      resolve(base64Payload);
    };
    reader.onerror = () => reject(new PdfValidationError('Failed to read binary file content.'));
    reader.readAsDataURL(file);
  });

  if (base64String.length < 10 || base64String.length > MAX_BASE64_CHARS) {
    throw new PdfValidationError('Encoded payload size is outside acceptable bounds.');
  }

  return { filename: file.name, filedata: base64String };
}
