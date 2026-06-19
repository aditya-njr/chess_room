import { useState } from 'react'
import { API_BASE, getDefaultName, getPlayerId, saveDisplayName } from '../utils'

export default function Lobby({ onJoinRoom }) {
  const [name, setName] = useState(getDefaultName)
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')

  const enterRoom = (code) => {
    const displayName = name.trim() || getDefaultName()
    saveDisplayName(displayName)
    onJoinRoom(code, displayName, getPlayerId())
  }

  const createRoom = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/rooms`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create room')
      const data = await res.json()
      setCreatedCode(data.room_code)
      enterRoom(data.room_code)
    } catch (err) {
      setError(err.message || 'Could not create room')
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    const code = roomCode.trim().toUpperCase()
    if (!code) {
      setError('Enter a room code')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/rooms/${code}`)
      if (!res.ok) throw new Error('Room not found')
      enterRoom(code)
    } catch (err) {
      setError(err.message || 'Could not join room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="lobby-form">
        <label>
          Your name
          <input
            type="text"
            placeholder="Guest-AB12"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            style={{ display: 'block', width: '100%', marginTop: '0.35rem' }}
          />
        </label>
        <p className="lobby-hint">Each browser gets a unique name automatically.</p>

        <div className="lobby-actions">
          <button onClick={createRoom} disabled={loading}>
            Create room
          </button>
        </div>

        {createdCode && (
          <div>
            <p style={{ margin: '0 0 0.5rem', color: '#a0a0b0' }}>
              Share this code with your opponent:
            </p>
            <div className="room-code-display">{createdCode}</div>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #0f3460', width: '100%' }} />

        <label>
          Join with code
          <input
            type="text"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{ display: 'block', width: '100%', marginTop: '0.35rem' }}
          />
        </label>

        <div className="lobby-actions">
          <button className="secondary" onClick={joinRoom} disabled={loading}>
            Join room
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  )
}
