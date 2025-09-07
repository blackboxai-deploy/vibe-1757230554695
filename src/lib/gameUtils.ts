import * as THREE from 'three'

export interface GameEntity {
  id: string
  mesh: THREE.Mesh
  position: THREE.Vector3
  velocity: THREE.Vector3
  health: number
  maxHealth: number
  type: 'player' | 'enemy' | 'bullet' | 'powerup'
  active: boolean
  radius: number
}

export interface PowerUp {
  id: string
  type: 'shield' | 'weapon' | 'health'
  duration: number
  active: boolean
  startTime: number
}

export interface GameState {
  status: 'menu' | 'playing' | 'paused' | 'gameover'
  score: number
  level: number
  health: number
  maxHealth: number
  shield: number
  maxShield: number
  lives: number
  wave: number
  enemiesRemaining: number
  activePowerUps: PowerUp[]
}

export class Vector3Pool {
  private pool: THREE.Vector3[] = []
  
  get(): THREE.Vector3 {
    return this.pool.pop() || new THREE.Vector3()
  }
  
  release(vector: THREE.Vector3): void {
    vector.set(0, 0, 0)
    this.pool.push(vector)
  }
}

export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  
  constructor(createFn: () => T, initialSize = 10) {
    this.createFn = createFn
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn())
    }
  }
  
  get(): T {
    return this.pool.pop() || this.createFn()
  }
  
  release(item: T): void {
    this.pool.push(item)
  }
}

export const createSphere = (radius: number, color: number, emissive = 0x000000) => {
  const geometry = new THREE.SphereGeometry(radius, 8, 8)
  const material = new THREE.MeshStandardMaterial({ 
    color, 
    emissive,
    metalness: 0.8,
    roughness: 0.2
  })
  return new THREE.Mesh(geometry, material)
}

export const createBox = (width: number, height: number, depth: number, color: number) => {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshStandardMaterial({ 
    color,
    metalness: 0.8,
    roughness: 0.3
  })
  return new THREE.Mesh(geometry, material)
}

export const checkCollision = (entity1: GameEntity, entity2: GameEntity): boolean => {
  const distance = entity1.position.distanceTo(entity2.position)
  return distance < (entity1.radius + entity2.radius)
}

export const clampPosition = (position: THREE.Vector3, bounds: { x: number, y: number, z: number }) => {
  position.x = Math.max(-bounds.x, Math.min(bounds.x, position.x))
  position.y = Math.max(-bounds.y, Math.min(bounds.y, position.y))
  position.z = Math.max(-bounds.z, Math.min(bounds.z, position.z))
}

export const lerpVector3 = (a: THREE.Vector3, b: THREE.Vector3, t: number) => {
  return a.clone().lerp(b, t)
}

export const createExplosion = (scene: THREE.Scene, position: THREE.Vector3) => {
  const particleCount = 20
  const particles = new THREE.Group()
  
  for (let i = 0; i < particleCount; i++) {
    const particle = createSphere(0.1, 0xff4444, 0xff2222)
    particle.position.copy(position)
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    )
    
    particle.userData = { velocity, life: 1.0 }
    particles.add(particle)
  }
  
  scene.add(particles)
  
  // Animate particles
  const animate = () => {
    let hasActiveParticles = false
    
    particles.children.forEach((particle) => {
      const mesh = particle as THREE.Mesh
      const userData = mesh.userData
      
      if (userData.life > 0) {
        hasActiveParticles = true
        mesh.position.add(userData.velocity.clone().multiplyScalar(0.016))
        userData.velocity.multiplyScalar(0.95)
        userData.life -= 0.02
        
        const material = mesh.material as THREE.MeshStandardMaterial
        material.opacity = userData.life
        material.transparent = true
      }
    })
    
    if (hasActiveParticles) {
      requestAnimationFrame(animate)
    } else {
      scene.remove(particles)
      particles.children.forEach(child => {
        const mesh = child as THREE.Mesh
        mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
        }
      })
    }
  }
  
  animate()
}

export const playSound = (frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    oscillator.type = type
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)
  } catch (error) {
    // Audio not supported or blocked
  }
}