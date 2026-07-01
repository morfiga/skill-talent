import './Feedback.css'

// Indicador de carregamento padrão (spinner + texto opcional)
function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="ui-loading">
      <div className="ui-spinner" role="status" aria-label={texto || 'Carregando'} />
      {texto && <p className="ui-loading-texto">{texto}</p>}
    </div>
  )
}

export default Carregando
