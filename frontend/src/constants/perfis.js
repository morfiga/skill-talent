export const PERFIL_COLABORADOR = 'colaborador'
export const PERFIL_LIDER = 'lider'
export const PERFIL_GESTOR = 'gestor'

export const PERFIS_VALIDOS = [PERFIL_COLABORADOR, PERFIL_LIDER, PERFIL_GESTOR]

export const PERFIS_OPCOES = [
  { value: PERFIL_COLABORADOR, label: 'Colaborador' },
  { value: PERFIL_LIDER, label: 'Líder' },
  { value: PERFIL_GESTOR, label: 'Gestor' },
]

export function isPerfilValido(perfil) {
  return perfil != null && PERFIS_VALIDOS.includes(perfil)
}

export function sanitizePerfil(perfil) {
  const trimmed = perfil?.trim()
  return isPerfilValido(trimmed) ? trimmed : PERFIL_COLABORADOR
}

export function getPerfilLabel(perfil) {
  return PERFIS_OPCOES.find(opcao => opcao.value === perfil)?.label || perfil || ''
}

export function isLiderOuGestor(perfil) {
  return perfil === PERFIL_LIDER || perfil === PERFIL_GESTOR
}
