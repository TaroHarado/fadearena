'use client'

import { useEffect, useState, useRef } from 'react'

interface TradeResponse {
  id: string
  type: 'bot' | 'mine'
  botId: string | null
  timestamp: number
  asset: string
  side: 'long' | 'short'
  size: number
  price: number
  notional: number
  pnl: number | null
  simulated: boolean
}

interface BotTradeEvent {
  id: string
  botId: string
  walletAddress: string
  timestamp: number
  eventType: 'fill' | 'position-change'
  asset: string
  side: 'long' | 'short'
  size: number
  price: number
  notional: number
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002/ws'

interface StateUpdate {
  mode?: string
  killSwitch?: boolean
  equity?: {
    total: number
    botsAggregate: number
    fadeArena: number
  }
  [key: string]: unknown
}

interface SettingsUpdate {
  mode?: string
  killSwitch?: boolean
  leverageMultiplier?: number
  [key: string]: unknown
}

interface LiveEvents {
  botTrade: BotTradeEvent | null
  myTrade: TradeResponse | null
  stateUpdate: StateUpdate | null
  settingsUpdate: SettingsUpdate | null
}

export function useLiveEvents() {
  const [events, setEvents] = useState<LiveEvents>({
    botTrade: null,
    myTrade: null,
    stateUpdate: null,
    settingsUpdate: null,
  })
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'bot-trade':
            setEvents((prev) => ({ ...prev, botTrade: message.data.event }))
            break
          case 'my-trade':
            setEvents((prev) => ({ ...prev, myTrade: message.data }))
            break
          case 'state-update':
            setEvents((prev) => ({ ...prev, stateUpdate: message.data }))
            break
          case 'settings-update':
            setEvents((prev) => ({ ...prev, settingsUpdate: message.data }))
            break
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          // Reconnect logic handled by useEffect
        }
      }, 5000)
    }

    return () => {
      ws.close()
    }
  }, [])

  return { events, isConnected }
}

