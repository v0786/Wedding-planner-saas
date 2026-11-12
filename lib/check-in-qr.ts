// Version 2-L, byte mode, mask 0. A check-in code is ASCII and fits in the
// single 34-data / 10-error-correction codeword block for this version.
const SIZE = 25
const DATA_BYTES = 34
const ERROR_BYTES = 10
const FORMAT_BITS = 0x77c4

function gfMultiply(left: number, right: number) {
  let result = 0
  while (right) {
    if (right & 1) result ^= left
    left <<= 1
    if (left & 0x100) left ^= 0x11d
    right >>>= 1
  }
  return result
}

function codewords(code: string) {
  if (!/^[\x20-\x7e]{1,32}$/.test(code)) throw new Error("Invalid QR check-in code")
  const bits: number[] = []
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  append(0b0100, 4)
  append(code.length, 8)
  for (const char of code) append(char.charCodeAt(0), 8)
  append(0, 4)
  for (let pad = 0; bits.length < DATA_BYTES * 8; pad++) append(pad % 2 === 0 ? 0xec : 0x11, 8)

  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0))
  }

  // Reed–Solomon generator polynomial, then division for the remainder.
  let generator = [1]
  let root = 1
  for (let i = 0; i < ERROR_BYTES; i++) {
    const next = Array<number>(generator.length + 1).fill(0)
    generator.forEach((value, index) => {
      next[index] ^= value
      next[index + 1] ^= gfMultiply(value, root)
    })
    generator = next
    root = gfMultiply(root, 2)
  }
  const remainder = [...data, ...Array<number>(ERROR_BYTES).fill(0)]
  data.forEach((_, index) => {
    const factor = remainder[index]
    generator.forEach((value, offset) => {
      remainder[index + offset] ^= gfMultiply(value, factor)
    })
  })
  return [...data, ...remainder.slice(DATA_BYTES)]
}

export function checkInQrMatrix(code: string) {
  const words = codewords(code)
  const modules = Array.from({ length: SIZE }, () => Array<boolean | null>(SIZE).fill(null))
  const set = (x: number, y: number, dark: boolean) => {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) modules[y][x] = dark
  }

  for (const [centerX, centerY] of [[3, 3], [SIZE - 4, 3], [3, SIZE - 4]]) {
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        const distance = Math.max(Math.abs(x), Math.abs(y))
        set(centerX + x, centerY + y, distance === 3 || distance <= 1)
      }
    }
  }
  for (let i = 8; i < SIZE - 8; i++) {
    set(i, 6, i % 2 === 0)
    set(6, i, i % 2 === 0)
  }
  for (let y = -2; y <= 2; y++) {
    for (let x = -2; x <= 2; x++) {
      set(18 + x, 18 + y, Math.max(Math.abs(x), Math.abs(y)) !== 1)
    }
  }

  const format = (index: number) => (FORMAT_BITS & (1 << index)) !== 0
  for (let i = 0; i < 6; i++) set(8, i, format(i))
  set(8, 7, format(6))
  set(8, 8, format(7))
  set(7, 8, format(8))
  for (let i = 9; i < 15; i++) set(14 - i, 8, format(i))
  for (let i = 0; i < 8; i++) set(SIZE - 1 - i, 8, format(i))
  for (let i = 8; i < 15; i++) set(8, SIZE - 15 + i, format(i))
  set(8, SIZE - 8, true)

  let bitIndex = 0
  let upward = true
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const y = upward ? SIZE - 1 - vertical : vertical
      for (const x of [right, right - 1]) {
        if (modules[y][x] !== null) continue
        const word = words[bitIndex >>> 3] ?? 0
        const bit = (word >>> (7 - (bitIndex & 7))) & 1
        set(x, y, Boolean(bit) !== ((x + y) % 2 === 0))
        bitIndex++
      }
    }
    upward = !upward
  }
  return modules
}
