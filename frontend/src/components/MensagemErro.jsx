import './Feedback.css'

// Banner de erro padrão. Não renderiza nada quando não há mensagem.
function MensagemErro({ mensagem }) {
  if (!mensagem) return null
  return <div className="ui-alert-erro" role="alert">{mensagem}</div>
}

export default MensagemErro
