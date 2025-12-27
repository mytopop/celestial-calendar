'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Body } from 'astronomy-engine';
import { useThree } from '@react-three/fiber';

// 天体数据
const PLANETS = {
  mercury: { name: '水星', size: 1.2, color: '#00ffff', distance: 12, body: Body.Mercury },
  venus: { name: '金星', size: 1.8, color: '#ffd700', distance: 18, body: Body.Venus },
  earth: { name: '地球', size: 2, color: '#1e90ff', distance: 24, body: Body.Earth },
  mars: { name: '火星', size: 1.5, color: '#ff6347', distance: 30, body: Body.Mars },
  jupiter: { name: '木星', size: 5, color: '#ffa07a', distance: 45, body: Body.Jupiter },
  saturn: { name: '土星', size: 4, color: '#daa520', distance: 60, body: Body.Saturn },
};

// 24节气
const SOLAR_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
];

interface CelestialBodyProps {
  size: number;
  color: string;
  position: [number, number, number];
  emissive?: string;
  name?: string;
  onClick?: () => void;
}

// 天体组件
function CelestialBody({ size, color, position, emissive, name, onClick }: CelestialBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handleClick = (event: any) => {
    event.stopPropagation();
    console.log('Clicked on:', name);
    if (onClick) {
      onClick();
    }
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onDoubleClick={handleClick}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive || '#000000'}
          emissiveIntensity={emissive ? 1 : 0}
        />
      </mesh>
      {name && (
        <Text
          position={[0, size + 2, 0]}
          fontSize={1.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.1}
          outlineColor="#000000"
        >
          {name}
        </Text>
      )}
    </group>
  );
}

// 相机控制器
function CameraController({ targetPosition }: { targetPosition: [number, number, number] | null }) {
  const { camera, controls } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (targetPosition && controls) {
      console.log('CameraController: Moving to target:', targetPosition);
      const target = new THREE.Vector3(...targetPosition);
      const distance = 10;

      // 平滑移动相机
      const startPosition = camera.position.clone();
      const endPosition = target.clone().add(new THREE.Vector3(distance, distance, distance));

      console.log('Camera animation from:', startPosition, 'to:', endPosition);

      let progress = 0;
      const animate = () => {
        progress += 0.02;
        if (progress <= 1) {
          camera.position.lerpVectors(startPosition, endPosition, easeInOutCubic(progress));
          camera.lookAt(target);
          requestAnimationFrame(animate);
        } else {
          console.log('Camera animation complete');
        }
      };

      animate();
    }
  }, [targetPosition]);

  return <OrbitControls ref={controlsRef} enablePan={true} enableZoom={true} enableRotate={true} minDistance={5} maxDistance={200} />;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 轨道组件
function Orbit({ radius, color = '#444444' }: { radius: number; color?: string }) {
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
    );
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap((v) => [v.x, v.y, v.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  );
}

// 节气标注
function SolarTermMarker({
  angle,
  radius,
  label
}: {
  angle: number;
  radius: number;
  label: string;
}) {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return (
    <group position={[x, 0, z]}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#4A90E2" />
      </mesh>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.5}
        color="#4A90E2"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

interface SolarSystemSceneProps {
  time: Date;
  location: { latitude: number; longitude: number };
  onBodyClick?: (name: string, info: any) => void;
  targetPlanet?: string;
}

// 太阳系场景
function SolarSystemScene({ time, location, onBodyClick, targetPlanet }: SolarSystemSceneProps) {
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<[number, number, number] | null>(null);

  // 计算天体位置（简化轨道模型）
  const calculatePosition = (body: any, distance: number) => {
    try {
      // 基于时间计算角度，让行星沿圆形轨道运动
      const dayOfYear = (time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24);
      const baseAngle = (dayOfYear / 365) * Math.PI * 2;

      // 不同行星有不同的轨道速度
      const speedFactors: Record<string, number> = {
        'mercury': 4.15,
        'venus': 1.62,
        'earth': 1.0,
        'mars': 0.53,
        'jupiter': 0.084,
        'saturn': 0.034
      };

      const bodyKey = Object.keys(Body).find(key => Body[key as keyof typeof Body] === body);
      const speed = speedFactors[bodyKey || 'earth'] || 1.0;
      const angle = baseAngle * speed;

      const x = distance * Math.cos(angle);
      const z = distance * Math.sin(angle);
      const y = 0;

      console.log(`${bodyKey} at distance ${distance}: angle=${angle.toFixed(2)}, pos=[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);

      return [x, y, z] as [number, number, number];
    } catch (error) {
      console.error('Error calculating position:', error);
      return [distance, 0, 0] as [number, number, number];
    }
  };

  // 计算当前节气索引
  const getCurrentSolarTermIndex = () => {
    const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor((dayOfYear * 24) / 365) % 24;
  };

  const currentTermIndex = getCurrentSolarTermIndex();

  const handleBodyClick = (name: string, info: any, position?: [number, number, number]) => {
    console.log('handleBodyClick called:', name, 'position:', position);
    setSelectedBody(name);
    if (position) {
      console.log('Setting target position:', position);
      setTargetPosition(position);
    }
    if (onBodyClick) {
      onBodyClick(name, info);
    }
  };

  // 监听targetPlanet变化，自动跳转到对应行星
  useEffect(() => {
    if (targetPlanet) {
      const planet = PLANETS[targetPlanet as keyof typeof PLANETS];
      if (planet) {
        const pos = calculatePosition(planet.body, planet.distance);
        setTargetPosition(pos);
      }
    }
  }, [targetPlanet]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffff00" />
      <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} />
      <CameraController targetPosition={targetPosition} />

      {/* 太阳 */}
      <CelestialBody
        size={5}
        color="#ffff00"
        position={[0, 0, 0]}
        emissive="#ffff00"
        name="太阳"
        onClick={() => handleBodyClick('太阳', { type: 'star', mass: '1.989 × 10^30 kg' }, [0, 0, 0])}
      />

      {/* 地球轨道和节气标注 */}
      <Orbit radius={PLANETS.earth.distance} />
      {SOLAR_TERMS.map((term, index) => {
        const angle = (index / 24) * Math.PI * 2;
        return (
          <SolarTermMarker
            key={term}
            angle={angle}
            radius={PLANETS.earth.distance}
            label={index === currentTermIndex ? `${term}(当前)` : term}
          />
        );
      })}

      {/* 地球和月球 */}
      <group position={calculatePosition(Body.Earth, PLANETS.earth.distance)}>
        <CelestialBody
          size={PLANETS.earth.size}
          color={PLANETS.earth.color}
          position={[0, 0, 0]}
          name={PLANETS.earth.name}
          onClick={() => {
            const pos = calculatePosition(Body.Earth, PLANETS.earth.distance);
            handleBodyClick(PLANETS.earth.name, {
              type: 'planet',
              distance: '1 AU',
              period: '365.25 天'
            }, pos);
          }}
        />
        <Orbit radius={2} color="#666666" />
        <CelestialBody
          size={0.3}
          color="#cccccc"
          position={calculatePosition(Body.Moon, 2)}
          name="月球"
          onClick={() => {
            const earthPos = calculatePosition(Body.Earth, PLANETS.earth.distance);
            const moonLocalPos = calculatePosition(Body.Moon, 2);
            const moonPos: [number, number, number] = [
              earthPos[0] + moonLocalPos[0],
              earthPos[1] + moonLocalPos[1],
              earthPos[2] + moonLocalPos[2]
            ];
            handleBodyClick('月球', { type: 'satellite', period: '27.3 天' }, moonPos);
          }}
        />
      </group>

      {/* 五星 */}
      {Object.entries(PLANETS).filter(([key]) => key !== 'earth').map(([key, planet]) => {
        const pos = calculatePosition(planet.body, planet.distance);
        return (
          <group key={key} position={pos}>
            <Orbit radius={planet.distance} color={planet.color} />
            <CelestialBody
              size={planet.size}
              color={planet.color}
              position={[0, 0, 0]}
              name={planet.name}
              onClick={() => handleBodyClick(planet.name, {
                type: 'planet',
                distance: `${planet.distance} AU`,
                period: key === 'jupiter' ? '11.86 年' : key === 'saturn' ? '29.46 年' : '未知'
              }, pos)}
            />
          </group>
        );
      })}
    </>
  );
}

interface SolarSystemProps {
  time: Date;
  location: { latitude: number; longitude: number };
  onBodyClick?: (name: string, info: any) => void;
  targetPlanet?: string;
}

// 主组件
export default function SolarSystem({ time, location, onBodyClick, targetPlanet }: SolarSystemProps) {
  return (
    <div className="w-full h-screen" style={{ background: 'transparent' }}>
      <Canvas
        camera={{ position: [50, 30, 50], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SolarSystemScene time={time} location={location} onBodyClick={onBodyClick} targetPlanet={targetPlanet} />
      </Canvas>
    </div>
  );
}
