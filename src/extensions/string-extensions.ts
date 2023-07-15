export {}

declare global {
  interface String {
    ensureHexPrefix(): string
    stripHexPrefix(): string
  }
}

String.prototype.ensureHexPrefix = function(): string {
  return this.startsWith('0x') ? this : `0x${this}`
}

String.prototype.stripHexPrefix = function(): string {
  return this.startsWith('0x') ? this.slice(2) : this
}
