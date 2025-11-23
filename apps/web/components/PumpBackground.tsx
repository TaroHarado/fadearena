'use client'

import { useEffect, useRef } from 'react'

export function PumpBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle system with vibrant colors
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      opacity: number
      life: number
    }

    const particles: Particle[] = []
    const particleCount = 80

    const colors = [
      'rgba(255, 0, 255, 0.6)',   // pink
      'rgba(139, 92, 246, 0.6)',  // purple
      'rgba(0, 212, 255, 0.6)',   // blue
      'rgba(0, 255, 136, 0.6)',   // green
      'rgba(255, 107, 53, 0.6)',  // orange
    ]

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.8 + 0.2,
        life: Math.random() * 100,
      })
    }

    let animationFrameId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height)
      )
      gradient.addColorStop(0, 'rgba(255, 0, 255, 0.05)')
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.03)')
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0.02)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life += 0.5

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Pulsing opacity
        particle.opacity = 0.3 + Math.sin(particle.life * 0.1) * 0.3

        // Draw particle with glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        )
        gradient.addColorStop(0, particle.color.replace('0.6', particle.opacity.toString()))
        gradient.addColorStop(1, particle.color.replace('0.6', '0'))
        ctx.fillStyle = gradient
        ctx.fill()

        // Draw connections
        particles.forEach((other) => {
          const dx = particle.x - other.x
          const dy = particle.y - other.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 200) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            const opacity = (0.2 * (1 - distance / 200)) * particle.opacity
            ctx.strokeStyle = particle.color.replace('0.6', opacity.toString())
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <>
      {/* Gradient overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pump-pink/10 via-transparent to-pump-blue/10 animate-pump-gradient" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-pump-purple/5 to-transparent animate-pump-pulse" />
      </div>
      
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />
    </>
  )
}

