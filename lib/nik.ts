export const NIK_LENGTH = 16;

export function sanitizeNikValue(value: string) {
  return value.replace(/\D/g, "").slice(0, NIK_LENGTH);
}

export function getNikValidationMessage(value: string) {
  if (!value) {
    return "NIK wajib diisi.";
  }

  if (value.length !== NIK_LENGTH) {
    return `NIK harus terdiri dari ${NIK_LENGTH} digit.`;
  }

  return "";
}
