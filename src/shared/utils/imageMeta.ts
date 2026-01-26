/**
 * Image metadata helpers for API uploads.
 * Keep in sync across upload endpoints to avoid duplicated logic.
 */

/**
 * Extract image dimensions from binary data (supports PNG, JPEG, WebP, GIF).
 */
export function getImageDimensions(data: Uint8Array): { width: number; height: number } {
  // PNG: bytes 16-23 contain width and height (4 bytes each, big-endian)
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
    const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
    return { width, height };
  }

  // JPEG: Find SOF0 marker (0xFFC0) and read dimensions
  if (data[0] === 0xFF && data[1] === 0xD8) {
    let offset = 2;
    while (offset < data.length - 8) {
      if (data[offset] === 0xFF) {
        const marker = data[offset + 1];
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          const height = (data[offset + 5] << 8) | data[offset + 6];
          const width = (data[offset + 7] << 8) | data[offset + 8];
          return { width, height };
        }
        const length = (data[offset + 2] << 8) | data[offset + 3];
        offset += 2 + length;
      } else {
        offset++;
      }
    }
  }

  // WebP: RIFF header, then VP8/VP8L/VP8X chunk
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
    // VP8X extended format
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x58) {
      const width = ((data[24] | (data[25] << 8) | (data[26] << 16)) & 0xFFFFFF) + 1;
      const height = ((data[27] | (data[28] << 8) | (data[29] << 16)) & 0xFFFFFF) + 1;
      return { width, height };
    }
    // VP8L lossless
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x4C) {
      const bits = (data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24)) >>> 0;
      const width = (bits & 0x3FFF) + 1;
      const height = ((bits >> 14) & 0x3FFF) + 1;
      return { width, height };
    }
    // VP8 lossy
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x20) {
      const width = (data[26] | (data[27] << 8)) & 0x3FFF;
      const height = (data[28] | (data[29] << 8)) & 0x3FFF;
      return { width, height };
    }
  }

  // GIF: bytes 6-9 contain width and height (2 bytes each, little-endian)
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);
    return { width, height };
  }

  return { width: 0, height: 0 };
}

/**
 * Calculate simplified aspect ratio string (e.g., "16:9", "4:3", "1:1").
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const w = divisor ? width / divisor : width;
  const h = divisor ? height / divisor : height;

  // Simplify common ratios
  const ratio = height === 0 ? 0 : width / height;
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2';
  if (Math.abs(ratio - 2 / 3) < 0.05) return '2:3';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';

  if (!w || !h) return '0:0';
  return `${w}:${h}`;
}
