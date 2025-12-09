/**
 * RatingSlider - Componente de avaliação com slider de 1 a 5
 * 
 * Usado nas avaliações do gestor para permitir que o usuário selecione
 * um nível de concordância através de um slider interativo.
 * 
 * @param {number|null} value - Valor atual selecionado (1 a 5) ou null se não selecionado
 * @param {function} onChange - Função chamada quando o valor muda, recebe o novo valor como parâmetro
 * @param {boolean} disabled - Se true, desabilita o slider
 * 
 * Níveis de avaliação:
 * 1 - Discordo totalmente
 * 2 - Discordo parcialmente
 * 3 - Neutro
 * 4 - Concordo parcialmente
 * 5 - Concordo totalmente
 */
import './RatingSlider.css'

const RATING_LABELS = {
  1: 'Discordo totalmente',
  2: 'Discordo parcialmente',
  3: 'Neutro',
  4: 'Concordo parcialmente',
  5: 'Concordo totalmente'
}

function RatingSlider({ value, onChange, disabled = false }) {
  const handleChange = (e) => {
    const newValue = parseInt(e.target.value)
    onChange(newValue)
  }

  return (
    <div className="rating-slider-container">
      <div className="slider-wrapper">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value || 3}
          onChange={handleChange}
          disabled={disabled}
          className={`rating-slider ${!value ? 'no-value' : ''}`}
        />
        <div className="slider-marks">
          {[1, 2, 3, 4, 5].map((mark) => (
            <div
              key={mark}
              className={`slider-mark ${value === mark ? 'active' : ''}`}
              onClick={() => !disabled && onChange(mark)}
            >
              <span className="mark-number">{mark}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`rating-description ${!value ? 'no-value-text' : ''}`}>
        {value ? (
          <>
            <span className="rating-value">{value}</span>
            <span className="rating-separator">-</span>
            <span className="rating-text">{RATING_LABELS[value]}</span>
          </>
        ) : (
          <span className="rating-placeholder">Selecione uma opção acima</span>
        )}
      </div>
    </div>
  )
}

export default RatingSlider

