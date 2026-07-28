export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  }
}

export function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map(v => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

export function getContrastText(bgHex: string) {
  const { r, g, b } = hexToRgb(bgHex)
  return getLuminance(r, g, b) > 0.5 ? '#000000' : '#ffffff'
}

export function darkenColor(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex)
  const factor = 1 - percent / 100
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n * factor)))
  return `#${[r, g, b].map(n => clamp(n).toString(16).padStart(2, '0')).join('')}`
}
