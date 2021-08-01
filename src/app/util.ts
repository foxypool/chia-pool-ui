export function ensureHexPrefix(string: String) {
  return string.startsWith('0x') ? string : `0x${string}`;
}
