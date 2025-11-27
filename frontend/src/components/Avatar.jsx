import { useState } from 'react'

function Avatar({ avatar, nome, size = 50, className = '' }) {
  const [imageError, setImageError] = useState(false)
  
  // Verificar se avatar é uma URL
  const isUrl = avatar && !imageError && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('//'))
  
  // Obter inicial do nome
  const getInitial = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const initial = getInitial(nome)

  return (
    <div 
      className={`avatar-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: isUrl ? 'transparent' : '#6366f1',
        color: isUrl ? 'inherit' : 'white',
        fontSize: `${size * 0.4}px`,
        fontWeight: '600',
        flexShrink: 0
      }}
    >
      {isUrl ? (
        <img 
          src={avatar} 
          alt={nome || 'Avatar'} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={() => {
            setImageError(true)
          }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  )
}

export default Avatar

