import './Feedback.css'

// Estado vazio padrão (ícone + texto + dica/ação opcionais)
function EstadoVazio({ icone = '📭', texto, dica, acao }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty-icone">{icone}</div>
      {texto && <p className="ui-empty-texto">{texto}</p>}
      {dica && <p className="ui-empty-dica">{dica}</p>}
      {acao && <div className="ui-empty-acao">{acao}</div>}
    </div>
  )
}

export default EstadoVazio
