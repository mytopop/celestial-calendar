'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { Body } from 'astronomy-engine';
import { useThree } from '@react-three/fiber';

// 行星数据接口
interface PlanetData {
  name: string;
  size: number;
  color: string;
  distance: number;
  body: Body;
  hasRings?: boolean;
  hasStripes?: boolean;
  hasCraters?: boolean;
  hasAtmosphere?: boolean;
  hasLand?: boolean;
  type: string;
}

// 天体数据(包含真实外观特征)
const PLANETS: Record<string, PlanetData> = {
  mercury: {
    name: '水星',
    size: 1.2,
    color: '#8c7853', // 深棕灰色，陨石坑表面
    distance: 12,
    body: Body.Mercury,
    hasCraters: true,
    type: 'rocky'
  },
  venus: {
    name: '金星',
    size: 1.8,
    color: '#f5e6a3', // 浅黄白色，浓厚大气
    distance: 18,
    body: Body.Venus,
    hasAtmosphere: true,
    type: 'rocky'
  },
  earth: {
    name: '地球',
    size: 2,
    color: '#1e4d7c', // 深海蓝色
    distance: 24,
    body: Body.Earth,
    hasLand: true,
    type: 'rocky'
  },
  mars: {
    name: '火星',
    size: 1.5,
    color: '#c1440e', // 锈红色，氧化铁表面
    distance: 30,
    body: Body.Mars,
    hasCraters: true,
    type: 'rocky'
  },
  jupiter: {
    name: '木星',
    size: 5,
    color: '#d4a574', // 米黄褐色
    distance: 45,
    body: Body.Jupiter,
    hasStripes: true,
    type: 'gas'
  },
  saturn: {
    name: '土星',
    size: 4,
    color: '#e3d595', // 金土色
    distance: 60,
    body: Body.Saturn,
    hasRings: true,
    type: 'gas'
  },
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
  hasRings?: boolean;
  hasStripes?: boolean;
  hasCraters?: boolean;
  hasAtmosphere?: boolean;
  hasLand?: boolean;
}

// 天体组件(支持真实外观特征)
function CelestialBody({
  size,
  color,
  position,
  emissive,
  name,
  onClick,
  hasRings,
  hasStripes,
  hasCraters,
  hasAtmosphere,
  hasLand
}: CelestialBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // 行星自转动画
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // 自转速度
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  const handlePointerOver = (event: any) => {
    event.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (event: any) => {
    event.stopPropagation();
    setHovered(false);
  };

  return (
    <group position={position} ref={groupRef}>
      {/* 行星本体 */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        scale={hovered ? 1.1 : 1}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive || '#000000'}
          emissiveIntensity={emissive ? 1 : 0}
          roughness={hasCraters ? 0.9 : 0.5}
          metalness={0.1}
        />
      </mesh>

      {/* 土星光环 */}
      {hasRings && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
          <meshStandardMaterial
            color="#c9b896"
            side={THREE.DoubleSide}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* 木星条纹 */}
      {hasStripes && (
        <group>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[size * 0.7, 0.1, 8, 32]} />
            <meshStandardMaterial color="#b5a279" />
          </mesh>
          <mesh rotation={[0, 0, 0.3]}>
            <torusGeometry args={[size * 0.5, 0.08, 8, 32]} />
            <meshStandardMaterial color="#a89060" />
          </mesh>
          <mesh rotation={[0, 0, -0.3]}>
            <torusGeometry args={[size * 0.6, 0.09, 8, 32]} />
            <meshStandardMaterial color="#9c8550" />
          </mesh>
        </group>
      )}

      {/* 大气层光晕 */}
      {hasAtmosphere && (
        <mesh>
          <sphereGeometry args={[size * 1.05, 32, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* 名称标签 - 始终显示，但悬停时更大 */}
      {name && (
        <Text
          position={[0, size + (hasRings ? size * 2.5 : 2), 0]}
          fontSize={hovered ? 1.5 : 1}
          color={hovered ? "#ffeb3b" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#000000"
        >
          {name}
        </Text>
      )}
    </group>
  );
}

// 相机控制器 - 改进的平滑动画
function CameraController({ targetPosition }: { targetPosition: [number, number, number] | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (targetPosition && controlsRef.current && !isAnimating.current) {
      const target = new THREE.Vector3(...targetPosition);
      const distance = 25; // 增加距离，让用户能看到更多行星

      // 禁用OrbitControls的自动更新，避免冲突
      const controls = controlsRef.current;
      controls.enabled = false;
      isAnimating.current = true;

      // 平滑移动相机
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      const endPosition = target.clone().add(new THREE.Vector3(distance, distance * 0.6, distance));

      // 取消之前的动画
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      const duration = 1200; // 1.2秒动画
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (progress <= 1) {
          const eased = easeInOutCubic(progress);
          camera.position.lerpVectors(startPosition, endPosition, eased);
          (controls.target as THREE.Vector3).lerpVectors(startTarget, target, eased);

          animationRef.current = requestAnimationFrame(animate);
        } else {
          // 动画完成，重新启用OrbitControls
          controls.enabled = true;
          controls.update();
          isAnimating.current = false;
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    // 清理函数
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      isAnimating.current = false;
    };
  }, [targetPosition, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={5}
      maxDistance={300}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      zoomSpeed={1.2}
      panSpeed={0.8}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      }}
    />
  );
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
      <lineBasicMaterial color={color} transparent opacity={0.15} linewidth={1} />
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

  // 计算天体位置（基于真实轨道周期）
  const calculatePosition = (body: any, distance: number) => {
    try {
      // 真实的行星公转周期（单位：地球日）
      const orbitalPeriods: Record<string, number> = {
        'Mercury': 87.97,    // 水星：87.97天
        'Venus': 224.7,      // 金星：224.7天
        'Earth': 365.256,    // 地球：365.256天
        'Mars': 686.98,      // 火星：686.98天
        'Jupiter': 4332.59,  // 木星：4332.59天（11.86年）
        'Saturn': 10759.22,  // 土星：10759.22天（29.46年）
        'Moon': 27.32        // 月球：27.32天（朔望月）
      };

      // 获取当前时间相对于基准时间的总天数
      const baseDate = new Date('2000-01-01');
      const daysSinceEpoch = (time.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);

      // 查找对应行星的轨道周期
      const bodyKey = Object.keys(Body).find(key => Body[key as keyof typeof Body] === body);
      const period = orbitalPeriods[bodyKey || 'Earth'] || 365.256;

      // 计算角度：完整轨道圈数 = 总天数 / 轨道周期
      const angle = (daysSinceEpoch / period) * Math.PI * 2;

      const x = distance * Math.cos(angle);
      const z = distance * Math.sin(angle);
      const y = 0;

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
    console.log('SolarSystemScene: targetPlanet changed to:', targetPlanet);
    if (targetPlanet) {
      const planet = PLANETS[targetPlanet as keyof typeof PLANETS];
      console.log('Found planet data:', planet);
      if (planet) {
        const pos = calculatePosition(planet.body, planet.distance);
        console.log('Calculated position for', planet.name, ':', pos);
        setTargetPosition(pos);
      } else {
        console.log('Planet not found in PLANETS:', targetPlanet);
      }
    }
  }, [targetPlanet, time]); // 添加time依赖，确保时间变化时重新计算

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#ffff00" castShadow />
      <directionalLight position={[50, 50, 50]} intensity={0.5} />
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
          hasLand={PLANETS.earth.hasLand}
          onClick={() => {
            const pos = calculatePosition(Body.Earth, PLANETS.earth.distance);
            handleBodyClick(PLANETS.earth.name, {
              type: 'planet',
              distance: '1 AU',
              period: '365.25 天'
            }, pos);
          }}
        />
        <CelestialBody
          size={0.3}
          color="#cccccc"
          position={calculatePosition(Body.Moon, 2)}
          name="月球"
          hasCraters={true}
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
          <group key={key}>
            <Orbit radius={planet.distance} color={planet.color} />
            <group position={pos}>
              <CelestialBody
                size={planet.size}
                color={planet.color}
                position={[0, 0, 0]}
                name={planet.name}
                hasRings={planet.hasRings}
                hasStripes={planet.hasStripes}
                hasCraters={planet.hasCraters}
                hasAtmosphere={planet.hasAtmosphere}
                hasLand={planet.hasLand}
                onClick={() => handleBodyClick(planet.name, {
                  type: 'planet',
                  distance: `${planet.distance} AU`,
                  period: key === 'jupiter' ? '11.86 年' : key === 'saturn' ? '29.46 年' : '未知'
                }, pos)}
              />
            </group>
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
