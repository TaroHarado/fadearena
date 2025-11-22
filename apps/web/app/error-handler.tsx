'use client'

import { useEffect } from 'react'

/**
 * Error handler для игнорирования ошибок от расширений браузера
 * (например, кошельки, которые пытаются переопределить window.ethereum)
 */
export function ErrorHandler() {
  useEffect(() => {
    // Перехватываем ошибки от расширений браузера
    const originalError = window.onerror
    const originalUnhandledRejection = window.onunhandledrejection

    window.onerror = (message, source, lineno, colno, error) => {
      // Игнорируем ошибки связанные с переопределением ethereum от расширений
      const messageStr = typeof message === 'string' ? message : String(message || '')
      const sourceStr = typeof source === 'string' ? source : String(source || '')
      
      if (
        messageStr.includes('Cannot redefine property: ethereum') ||
        messageStr.includes('Cannot redefine property') ||
        sourceStr.includes('chrome-extension://') ||
        sourceStr.includes('moz-extension://') ||
        sourceStr.includes('evmAsk.js')
      ) {
        console.warn('Ignored browser extension error:', messageStr)
        return true // Предотвращаем показ ошибки
      }

      // Для остальных ошибок вызываем оригинальный обработчик
      if (originalError) {
        return originalError.call(window, message, source, lineno, colno, error)
      }
      return false
    }

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || String(reason || '')
      const stack = reason?.stack || ''

      // Игнорируем ошибки от расширений
      if (
        message.includes('Cannot redefine property: ethereum') ||
        message.includes('Cannot redefine property') ||
        stack.includes('chrome-extension://') ||
        stack.includes('moz-extension://') ||
        stack.includes('evmAsk.js')
      ) {
        console.warn('Ignored browser extension promise rejection:', message)
        event.preventDefault() // Предотвращаем показ ошибки
        return
      }

      // Для остальных ошибок вызываем оригинальный обработчик
      if (originalUnhandledRejection) {
        originalUnhandledRejection.call(window, event)
      }
    }

    // Также перехватываем ошибки через addEventListener
    const errorListener = (event: ErrorEvent) => {
      const message = event.message || ''
      const source = event.filename || ''
      
      if (
        message.includes('Cannot redefine property: ethereum') ||
        message.includes('Cannot redefine property') ||
        source.includes('chrome-extension://') ||
        source.includes('moz-extension://') ||
        source.includes('evmAsk.js')
      ) {
        console.warn('Ignored browser extension error event:', message)
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('error', errorListener, true)

    return () => {
      window.onerror = originalError
      window.onunhandledrejection = originalUnhandledRejection
      window.removeEventListener('error', errorListener, true)
    }
  }, [])

  return null
}

