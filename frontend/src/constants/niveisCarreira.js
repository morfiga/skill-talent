export const NIVEIS_CARREIRA_VALIDOS = [
  'E',
  'J1',
  'J2',
  'J3',
  'P1',
  'P2',
  'P3',
  'S1',
  'S2',
  'S3',
  'ES1',
  'ES2',
  'Head',
]

export const NIVEIS_CARREIRA_OPCOES = [
  { value: 'E', label: 'Estagiário' },
  { value: 'J1', label: 'Junior 1' },
  { value: 'J2', label: 'Junior 2' },
  { value: 'J3', label: 'Junior 3' },
  { value: 'P1', label: 'Pleno 1' },
  { value: 'P2', label: 'Pleno 2' },
  { value: 'P3', label: 'Pleno 3' },
  { value: 'S1', label: 'Senior 1' },
  { value: 'S2', label: 'Senior 2' },
  { value: 'S3', label: 'Senior 3' },
  { value: 'ES1', label: 'Especialista 1' },
  { value: 'ES2', label: 'Especialista 2' },
  { value: 'Head', label: 'Head' },
]

export function isNivelCarreiraValido(nivel) {
  return nivel != null && NIVEIS_CARREIRA_VALIDOS.includes(nivel)
}

export function sanitizeNivelCarreira(nivel) {
  const trimmed = nivel?.trim()
  return isNivelCarreiraValido(trimmed) ? trimmed : null
}
