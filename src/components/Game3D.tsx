'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { GameEntity, GameState, PowerUp, createSphere, checkCollision, clampPosition, createExplosion, playSound, ObjectPool } from '@/lib/gameUtils'

interface PlayerControllerProps {
  onGameStateChange: (state: Partial<GameState>) => void
  gameState: GameState
}

function PlayerController({ onGameStateChange, gameState }: PlayerControllerProps) {
  const playerRef = useRef<THREE.Mesh>(null!)
  const { scene, camera } = useThree()
  
  // Game entities
  const entitiesRef = useRef<GameEntity[]>([])
  const bulletsRef = useRef<GameEntity[]>([])
  const enemiesRef = useRef<GameEntity[]>([])
  const powerUpsRef = useRef<GameEntity[]>([])
  
  // Input state
  const keysRef = useRef<{ [key: string]: boolean }>({})
  const mouseRef = useRef({ x: 0, y: 0 })
  const lastShotRef = useRef(0)
  
  // Game timing
  const waveTimerRef = useRef(0)
  const enemySpawnTimerRef = useRef(0)
  
  // Object pools
  const bulletPoolRef = useRef<ObjectPool<THREE.Mesh> | null>(null)
  const enemyPoolRef = useRef<ObjectPool<THREE.Mesh> | null>(null)
  
  // Initialize object pools
  useEffect(() => {
    bulletPoolRef.current = new ObjectPool(() => createSphere(0.1, 0x00ff00, 0x004400), 20)
    enemyPoolRef.current = new ObjectPool(() => createSphere(0.5, 0xff0000, 0x440000), 10)
  }, [])
  
  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    
    const handleMouseClick = () => {
      if (gameState.status === 'playing') {
        shootBullet()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleMouseClick)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleMouseClick)
    }
  }, [gameState.status])
  
  // Shooting function
  const shootBullet = useCallback(() => {
    const now = Date.now()
    if (now - lastShotRef.current < 150) return // Fire rate limit
    
    lastShotRef.current = now
    
    if (!playerRef.current || !bulletPoolRef.current) return
    
    const bullet = bulletPoolRef.current.get()
    bullet.position.copy(playerRef.current.position)
    bullet.position.z += 1
    
    const bulletEntity: GameEntity = {
      id: `bullet-${now}`,
      mesh: bullet,
      position: bullet.position,
      velocity: new THREE.Vector3(0, 0, 20),
      health: 1,
      maxHealth: 1,
      type: 'bullet',
      active: true,
      radius: 0.1
    }
    
    bulletsRef.current.push(bulletEntity)
    scene.add(bullet)
    
    playSound(800, 0.1, 'square')
  }, [scene])
  
  // Enemy spawning
  const spawnEnemy = useCallback(() => {
    if (!enemyPoolRef.current) return
    
    const enemy = enemyPoolRef.current.get()
    enemy.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 15,
      -30
    )
    
    const enemyEntity: GameEntity = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      mesh: enemy,
      position: enemy.position,
      velocity: new THREE.Vector3(0, 0, 5 + Math.random() * 3),
      health: 3,
      maxHealth: 3,
      type: 'enemy',
      active: true,
      radius: 0.5
    }
    
    enemiesRef.current.push(enemyEntity)
    scene.add(enemy)
  }, [scene])
  
  // Power-up spawning
  const spawnPowerUp = useCallback(() => {
    if (Math.random() > 0.1) return // 10% chance
    
    const powerUp = createSphere(0.3, 0x00ffff, 0x0088ff)
    powerUp.position.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 10,
      -20
    )
    
    const powerUpEntity: GameEntity = {
      id: `powerup-${Date.now()}`,
      mesh: powerUp,
      position: powerUp.position,
      velocity: new THREE.Vector3(0, 0, 3),
      health: 1,
      maxHealth: 1,
      type: 'powerup',
      active: true,
      radius: 0.3
    }
    
    powerUpsRef.current.push(powerUpEntity)
    scene.add(powerUp)
  }, [scene])
  
  // Game loop
  useFrame((state, delta) => {
    if (gameState.status !== 'playing' || !playerRef.current) return
    
    const player = playerRef.current
    const keys = keysRef.current
    
    // Player movement
    const moveSpeed = 15 * delta
    if (keys['KeyW'] || keys['ArrowUp']) {
      player.position.y += moveSpeed
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
      player.position.y -= moveSpeed
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
      player.position.x -= moveSpeed
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
      player.position.x += moveSpeed
    }
    
    // Constrain player to bounds
    clampPosition(player.position, { x: 12, y: 8, z: 0 })
    
    // Mouse look (subtle effect)
    const targetRotationY = mouseRef.current.x * 0.2
    const targetRotationX = mouseRef.current.y * 0.1
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotationY, 0.1)
    player.rotation.x = THREE.MathUtils.lerp(player.rotation.x, targetRotationX, 0.1)
    
    // Camera follow player
    const cameraTarget = new THREE.Vector3(
      player.position.x * 0.2,
      player.position.y * 0.2 + 2,
      player.position.z + 8
    )
    state.camera.position.lerp(cameraTarget, 0.05)
    state.camera.lookAt(player.position)
    
    // Update bullets
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      bullet.position.add(bullet.velocity.clone().multiplyScalar(delta))
      bullet.mesh.position.copy(bullet.position)
      
      // Remove bullets that are too far
      if (bullet.position.z > 50 || bullet.position.z < -50) {
        scene.remove(bullet.mesh)
        if (bulletPoolRef.current) {
          bulletPoolRef.current.release(bullet.mesh)
        }
        return false
      }
      
      return bullet.active
    })
    
    // Update enemies
    enemiesRef.current = enemiesRef.current.filter(enemy => {
      enemy.position.add(enemy.velocity.clone().multiplyScalar(delta))
      enemy.mesh.position.copy(enemy.position)
      
      // Simple AI: move toward player occasionally
      if (Math.random() < 0.01) {
        const toPlayer = player.position.clone().sub(enemy.position).normalize()
        enemy.velocity.add(toPlayer.multiplyScalar(2))
        enemy.velocity.clampLength(0, 8)
      }
      
      // Remove enemies that are too far
      if (enemy.position.z > 20) {
        scene.remove(enemy.mesh)
        if (enemyPoolRef.current) {
          enemyPoolRef.current.release(enemy.mesh)
        }
        return false
      }
      
      return enemy.active && enemy.health > 0
    })
    
    // Update power-ups
    powerUpsRef.current = powerUpsRef.current.filter(powerUp => {
      powerUp.position.add(powerUp.velocity.clone().multiplyScalar(delta))
      powerUp.mesh.position.copy(powerUp.position)
      
      // Rotate power-ups
      powerUp.mesh.rotation.x += delta * 2
      powerUp.mesh.rotation.y += delta * 3
      
      // Remove power-ups that are too far
      if (powerUp.position.z > 20) {
        scene.remove(powerUp.mesh)
        return false
      }
      
      return powerUp.active
    })
    
    // Collision detection
    const playerEntity: GameEntity = {
      id: 'player',
      mesh: player,
      position: player.position,
      velocity: new THREE.Vector3(),
      health: gameState.health,
      maxHealth: gameState.maxHealth,
      type: 'player',
      active: true,
      radius: 0.4
    }
    
    // Bullet vs Enemy collisions
    bulletsRef.current.forEach(bullet => {
      enemiesRef.current.forEach(enemy => {
        if (checkCollision(bullet, enemy)) {
          enemy.health -= 1
          bullet.active = false
          
          createExplosion(scene, enemy.position.clone())
          playSound(300, 0.2, 'sawtooth')
          
          if (enemy.health <= 0) {
            onGameStateChange({ 
              score: gameState.score + 100,
              enemiesRemaining: gameState.enemiesRemaining - 1
            })
            enemy.active = false
            scene.remove(enemy.mesh)
            if (enemyPoolRef.current) {
              enemyPoolRef.current.release(enemy.mesh)
            }
          }
          
          scene.remove(bullet.mesh)
          if (bulletPoolRef.current) {
            bulletPoolRef.current.release(bullet.mesh)
          }
        }
      })
    })
    
    // Player vs Enemy collisions
    enemiesRef.current.forEach(enemy => {
      if (checkCollision(playerEntity, enemy)) {
        onGameStateChange({ 
          health: Math.max(0, gameState.health - 1)
        })
        
        createExplosion(scene, enemy.position.clone())
        playSound(200, 0.5, 'sawtooth')
        
        enemy.active = false
        scene.remove(enemy.mesh)
        if (enemyPoolRef.current) {
          enemyPoolRef.current.release(enemy.mesh)
        }
        
        if (gameState.health <= 1) {
          onGameStateChange({ status: 'gameover' })
        }
      }
    })
    
    // Player vs PowerUp collisions
    powerUpsRef.current.forEach((powerUp, index) => {
      if (checkCollision(playerEntity, powerUp)) {
        const newPowerUp: PowerUp = {
          id: powerUp.id,
          type: 'shield',
          duration: 10,
          active: true,
          startTime: Date.now()
        }
        
        onGameStateChange({
          activePowerUps: [...gameState.activePowerUps, newPowerUp],
          health: Math.min(gameState.maxHealth, gameState.health + 1)
        })
        
        playSound(600, 0.3, 'sine')
        
        scene.remove(powerUp.mesh)
        powerUpsRef.current.splice(index, 1)
      }
    })
    
    // Enemy spawning
    enemySpawnTimerRef.current += delta
    if (enemySpawnTimerRef.current > 2 - (gameState.level * 0.1)) {
      spawnEnemy()
      enemySpawnTimerRef.current = 0
      
      // Occasionally spawn power-ups
      if (Math.random() < 0.3) {
        setTimeout(() => spawnPowerUp(), 1000)
      }
    }
    
    // Wave progression
    if (enemiesRef.current.length === 0 && gameState.enemiesRemaining <= 0) {
      waveTimerRef.current += delta
      if (waveTimerRef.current > 3) {
        onGameStateChange({
          wave: gameState.wave + 1,
          level: gameState.level + 1,
          enemiesRemaining: 5 + gameState.wave
        })
        waveTimerRef.current = 0
      }
    }
  })
  
  return (
    <mesh ref={playerRef} position={[0, 0, 0]}>
      <boxGeometry args={[0.8, 0.3, 1.2]} />
      <meshStandardMaterial 
        color="#00aaff" 
        emissive="#003366"
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

function GameEnvironment() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 0, 10]} intensity={0.5} color="#00aaff" />
      
      {/* Background */}
      <Stars 
        radius={300} 
        depth={60} 
        count={3000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.5}
      />
      
      {/* Space fog */}
      <fog attach="fog" args={['#000011', 30, 100]} />
    </>
  )
}

function GameUI({ gameState, onStartGame, onTogglePause }: {
  gameState: GameState
  onStartGame: () => void
  onTogglePause: () => void
}) {
  const formatTime = (ms: number) => Math.floor(ms / 1000)
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Main Menu */}
      {gameState.status === 'menu' && (
        <div className="flex items-center justify-center w-full h-full bg-black/80 pointer-events-auto">
          <div className="text-center space-y-8 max-w-md">
            <h1 className="text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              SPACE SHOOTER
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Defend the galaxy from alien invaders in this immersive 3D experience
            </p>
            
            <div className="space-y-4 text-left text-gray-300">
              <div className="flex items-center space-x-3">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm">WASD</kbd>
                <span>Move spaceship</span>
              </div>
              <div className="flex items-center space-x-3">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm">Mouse</kbd>
                <span>Look around</span>
              </div>
              <div className="flex items-center space-x-3">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm">Click</kbd>
                <span>Shoot</span>
              </div>
              <div className="flex items-center space-x-3">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-sm">P</kbd>
                <span>Pause</span>
              </div>
            </div>
            
            <button 
              onClick={onStartGame}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-4 text-xl font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              START MISSION
            </button>
          </div>
        </div>
      )}
      
      {/* Game HUD */}
      {gameState.status === 'playing' && (
        <div className="absolute inset-4">
          {/* Top HUD */}
          <div className="flex justify-between items-start">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 space-y-2">
              <div className="text-2xl font-bold text-white">Score: {gameState.score.toLocaleString()}</div>
              <div className="text-lg text-blue-300">Wave: {gameState.wave}</div>
              <div className="text-lg text-purple-300">Level: {gameState.level}</div>
            </div>
            
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4">
              <button
                onClick={onTogglePause}
                className="text-white hover:text-blue-300 text-xl font-bold transition-colors"
              >
                PAUSE
              </button>
            </div>
          </div>
          
          {/* Bottom HUD */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-4">
            <div className="flex justify-between items-center">
              {/* Health Bar */}
              <div className="flex items-center space-x-4">
                <div className="text-white font-bold">HEALTH</div>
                <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-300"
                    style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
                  />
                </div>
                <div className="text-white">{gameState.health}/{gameState.maxHealth}</div>
              </div>
              
              {/* Active Power-ups */}
              <div className="flex items-center space-x-4">
                {gameState.activePowerUps.map(powerUp => (
                  <div key={powerUp.id} className="bg-blue-600/80 rounded-lg px-3 py-1 text-sm text-white">
                    {powerUp.type.toUpperCase()}: {formatTime(powerUp.duration * 1000)}s
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pause Screen */}
      {gameState.status === 'paused' && (
        <div className="flex items-center justify-center w-full h-full bg-black/80 pointer-events-auto">
          <div className="text-center space-y-6">
            <h2 className="text-6xl font-bold text-white">PAUSED</h2>
            <button 
              onClick={onTogglePause}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-bold rounded-lg transition-colors"
            >
              RESUME
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState.status === 'gameover' && (
        <div className="flex items-center justify-center w-full h-full bg-black/90 pointer-events-auto">
          <div className="text-center space-y-8">
            <h2 className="text-8xl font-bold text-red-400 mb-4">GAME OVER</h2>
            <div className="space-y-4 text-2xl text-white">
              <div>Final Score: {gameState.score.toLocaleString()}</div>
              <div>Waves Completed: {gameState.wave - 1}</div>
              <div>Level Reached: {gameState.level}</div>
            </div>
            <button 
              onClick={onStartGame}
              className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white px-12 py-4 text-xl font-bold rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Game3D() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    score: 0,
    level: 1,
    health: 10,
    maxHealth: 10,
    shield: 0,
    maxShield: 5,
    lives: 3,
    wave: 1,
    enemiesRemaining: 5,
    activePowerUps: []
  })
  
  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      score: 0,
      level: 1,
      health: prev.maxHealth,
      wave: 1,
      enemiesRemaining: 5,
      activePowerUps: []
    }))
  }, [])
  
  const togglePause = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: prev.status === 'playing' ? 'paused' : 'playing'
    }))
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        e.preventDefault()
        togglePause()
      }
      if (e.code === 'Escape' && gameState.status !== 'menu') {
        e.preventDefault()
        setGameState(prev => ({ ...prev, status: 'menu' }))
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState.status, togglePause])
  
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ 
          position: [0, 2, 8], 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        <GameEnvironment />
        {gameState.status === 'playing' && (
          <PlayerController 
            gameState={gameState}
            onGameStateChange={updateGameState}
          />
        )}
      </Canvas>
      
      <GameUI 
        gameState={gameState}
        onStartGame={startGame}
        onTogglePause={togglePause}
      />
    </div>
  )
}