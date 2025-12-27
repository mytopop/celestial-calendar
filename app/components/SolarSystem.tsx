'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Body, Horizon, Equator } from 'astronomy-engine';

// 天体数据
const PLANETS = {
  mercury: { name: '水星', size: 1.2, color: '#aaaaaa', distance: 12, body: Body.Mercury },
  venus: { name: '金星', size: 1.8, color: '#ffd700', distance: 18, body: Body.Venus },
  earth: { name: '地球', size: 2, color: '#4169e1', distance: 24, body: Body.Earth },
  mars: { name: '火星', size: 1.5, color: '#ff4500', distance: 30, body: Body.Mars },
  jupiter: { name: '木星', size: 5, color: '#ffa500', distance: 45, body: Body.Jupiter },
  saturn: { name: '土星', size: 4, color: '#f4a460', distance: 60, body: Body.Saturn },
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

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
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
}

// 太阳系场景
function SolarSystemScene({ time, location, onBodyClick }: SolarSystemSceneProps) {
  const [selectedBody, setSelectedBody] = useState<string | null>(null);

  // 计算天体位置
  const calculatePosition = (body: any, distance: number) => {
    try {
      const observer = { latitude: location.latitude, longitude: location.longitude, height: 0 };
      // 先获取天体的赤道坐标
      const equator = Equator(body, time, observer, true, true);
      // 然后计算地平坐标
      const pos = Horizon(time, observer, equator.ra, equator.dec, 'normal');

      const x = distance * Math.cos(pos.altitude) * Math.sin(pos.azimuth);
      const y = distance * Math.sin(pos.altitude);
      const z = distance * Math.cos(pos.altitude) * Math.cos(pos.azimuth);

      return [x, y, z] as [number, number, number];
    } catch {
      return [distance, 0, 0] as [number, number, number];
    }
  };

  // 计算当前节气索引
  const getCurrentSolarTermIndex = () => {
    const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor((dayOfYear * 24) / 365) % 24;
  };

  const currentTermIndex = getCurrentSolarTermIndex();

  const handleBodyClick = (name: string, info: any) => {
    setSelectedBody(name);
    if (onBodyClick) {
      onBodyClick(name, info);
    }
  };

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffff00" />
      <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} />

      {/* 太阳 */}
      <CelestialBody
        size={5}
        color="#ffff00"
        position={[0, 0, 0]}
        emissive="#ffff00"
        name="太阳"
        onClick={() => handleBodyClick('太阳', { type: 'star', mass: '1.989 × 10^30 kg' })}
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
          onClick={() => handleBodyClick(PLANETS.earth.name, {
            type: 'planet',
            distance: '1 AU',
            period: '365.25 天'
          })}
        />
        <Orbit radius={2} color="#666666" />
        <CelestialBody
          size={0.3}
          color="#cccccc"
          position={calculatePosition(Body.Moon, 2)}
          name="月球"
          onClick={() => handleBodyClick('月球', { type: 'satellite', period: '27.3 天' })}
        />
      </group>

      {/* 五星 */}
      {Object.entries(PLANETS).filter(([key]) => key !== 'earth').map(([key, planet]) => (
        <group key={key} position={calculatePosition(planet.body, planet.distance)}>
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
            })}
          />
        </group>
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={150}
      />
    </>
  );
}

interface SolarSystemProps {
  time: Date;
  location: { latitude: number; longitude: number };
  onBodyClick?: (name: string, info: any) => void;
}

// 主组件
export default function SolarSystem({ time, location, onBodyClick }: SolarSystemProps) {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{ position: [50, 30, 50], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SolarSystemScene time={time} location={location} onBodyClick={onBodyClick} />
      </Canvas>
    </div>
  );
}
