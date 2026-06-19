import { useCallback, useEffect, useRef, useState } from 'react'
import { wsUrl } from '../utils'

export function useGameSocket(roomCode, playerName, playerId, enabled) {
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [myColor, setMyColor] = useState(null)
  const [error, setError] = useState('')
  const [lastEvent, setLastEvent] = useState(null)
  const wsRef = useRef(null)
  const myColorRef = useRef(null)

  const applyColor = useCallback((color) => {
    if (color === 'white' || color === 'black') {
      myColorRef.current = color
      setMyColor(color)
    }
  }, [])

  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  useEffect(() => {
    if (!enabled || !roomCode || !playerId) return undefined

    let closed = false
    setGameState(null)
    setMyColor(null)
    myColorRef.current = null

    const ws = new WebSocket(wsUrl(roomCode))
    wsRef.current = ws

    const join = () => {
      ws.send(
        JSON.stringify({
          type: 'join',
          name: playerName,
          playerId,
        }),
      )
    }

    ws.onopen = () => {
      if (closed) return
      setConnected(true)
      setError('')
      join()
    }

    ws.onmessage = (event) => {
      if (closed) return
      const data = JSON.parse(event.data)
      setLastEvent(data)

      if (data.type === 'error') {
        setError(data.message)
        return
      }

      setError('')

      if (data.type === 'joined' && data.color) {
        applyColor(data.color)
      }

      if (data.fen) {
        const { color: _ignoredColor, type: _ignoredType, ...rest } = data
        setGameState((prev) => ({ ...prev, ...rest }))
      }

      if (
        (data.type === 'player_joined' || data.type === 'player_reconnected') &&
        !myColorRef.current
      ) {
        join()
      }
    }

    ws.onclose = () => {
      if (!closed) setConnected(false)
    }

    ws.onerror = () => {
      if (!closed) setError('Connection error — is the backend running on port 8000?')
    }

    return () => {
      closed = true
      ws.close()
      wsRef.current = null
    }
  }, [enabled, roomCode, playerName, playerId, applyColor])

  const sendMove = useCallback(
    (from, to, promotion) => {
      send({ type: 'move', from, to, promotion })
    },
    [send],
  )

  const resign = useCallback(() => {
    send({ type: 'resign' })
  }, [send])

  const sync = useCallback(() => {
    send({ type: 'sync' })
  }, [send])

  return {
    connected,
    gameState,
    myColor,
    error,
    lastEvent,
    sendMove,
    resign,
    sync,
  }
}
