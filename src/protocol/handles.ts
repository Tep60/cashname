import { HANDLE_REGEX, HANDLE_SUFFIX } from "../constants";

export function normalizeHandle(input: string): string {
  let h = input.trim().toLowerCase();
  if (h.endsWith(HANDLE_SUFFIX)) h = h.slice(0, -HANDLE_SUFFIX.length);
  if (h.endsWith("@cashname")) h = h.slice(0, -"@cashname".length);
  return h;
}

export function isValidHandle(input: string): boolean {
  return HANDLE_REGEX.test(normalizeHandle(input));
}

export function displayHandle(handle: string): string {
  return `${normalizeHandle(handle)}${HANDLE_SUFFIX}`;
}

export function handleError(input: string): string | null {
  const h = normalizeHandle(input);
  if (!h) return "Enter a handle.";
  if (h.length > 30) return "Handles are at most 30 characters.";
  if (!HANDLE_REGEX.test(h)) {
    return "Use lowercase letters, digits, and underscores. Start and end with a letter or digit.";
  }
  return null;
}
