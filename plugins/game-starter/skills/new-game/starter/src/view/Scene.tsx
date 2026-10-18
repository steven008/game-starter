import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { PLAYER_COLORS, PLAYER_RADIUS } from '../shared/constants.ts'
import type { GameState, Player } from '../shared/types.ts'

/**
 * The 3D view: draws whatever GameState says, decides nothing. The sim's (x, y) on the floor is the scene's (x, z),
 * height is y. Per-frame movement happens in useFrame on refs, never in React state, so nothing re-renders 60 times a
 * second.
 */
export function Scene({ state, mySlot }: { state: GameState; mySlot: number | null }) {
  const { w, h } = state.arena
  return (
    <Canvas shadows="percentage" camera={{ position: [w / 2, Math.max(w, h) * 0.9, h * 1.35], fov: 45 }}
      onCreated={({ camera }) => camera.lookAt(w / 2, 0, h / 2)}>
      <color attach="background" args={['#1d2330']} />
      <hemisphereLight args={['#dfe8ff', '#3a3f4a', 0.9]} />
      <directionalLight position={[w * 0.3, 12, h * 0.2]} intensity={1.6} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-w} shadow-camera-right={w}
        shadow-camera-top={h} shadow-camera-bottom={-h} />
      <mesh rotation-x={-Math.PI / 2} position={[w / 2, 0, h / 2]} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#5b6b52" />
      </mesh>
      {Object.values(state.players).map(p => p && <Avatar key={p.slot} player={p} me={p.slot === mySlot} />)}
    </Canvas>
  )
}

const EASE = 18   // how fast a drawn player catches up with the server's position, per second

function Avatar({ player, me }: { player: Player; me: boolean }) {
  const ref = useRef<Group>(null)
  // Where it first appears; after that useFrame moves it (a position prop would snap it back on every state).
  const [start] = useState((): [number, number, number] => [player.x, player.z, player.y])
  useFrame((_, dt) => {   // react-three-fiber always calls the latest render's callback, so `player` is current
    const g = ref.current
    if (!g) return
    const p = player
    const k = 1 - Math.exp(-EASE * dt)
    g.position.x += (p.x - g.position.x) * k
    g.position.z += (p.y - g.position.z) * k
    g.position.y += (p.z - g.position.y) * k
    g.rotation.y = -p.angle
  })
  const color = PLAYER_COLORS[player.slot % PLAYER_COLORS.length]
  return (
    <group ref={ref} position={start}>
      <mesh position-y={0.45} castShadow>
        <capsuleGeometry args={[PLAYER_RADIUS * 0.8, 0.4, 6, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[PLAYER_RADIUS * 0.7, 0.65, 0]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.3]} />
        <meshStandardMaterial color="#20242c" />
      </mesh>
      {me && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[PLAYER_RADIUS * 1.1, PLAYER_RADIUS * 1.3, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  )
}
