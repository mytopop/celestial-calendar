'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as Astronomy from 'astronomy-engine';
import { useThree } from '@react-three/fiber';

// 黄道十二宫数据
const ZODIAC_SIGNS = [
  { name: '白羊座', symbol: '♈', latin: 'Aries', startDeg: 0 },
  { name: '金牛座', symbol: '♉', latin: 'Taurus', startDeg: 30 },
  { name: '双子座', symbol: '♊', latin: 'Gemini', startDeg: 60 },
  { name: '巨蟹座', symbol: '♋', latin: 'Cancer', startDeg: 90 },
  { name: '狮子座', symbol: '♌', latin: 'Leo', startDeg: 120 },
  { name: '处女座', symbol: '♍', latin: 'Virgo', startDeg: 150 },
  { name: '天秤座', symbol: '♎', latin: 'Libra', startDeg: 180 },
  { name: '天蝎座', symbol: '♏', latin: 'Scorpio', startDeg: 210 },
  { name: '射手座', symbol: '♐', latin: 'Sagittarius', startDeg: 240 },
  { name: '摩羯座', symbol: '♑', latin: 'Capricorn', startDeg: 270 },
  { name: '水瓶座', symbol: '♒', latin: 'Aquarius', startDeg: 300 },
  { name: '双鱼座', symbol: '♓', latin: 'Pisces', startDeg: 330 },
];

// 24节气
const SOLAR_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
];

// 地心模型中的天体
interface GeocentricBody {
  name: string;
  size: number;
  color: string;
  orbitRadius: number; // 3D场景中的轨道半径
  body: Astronomy.Body;
  type: string;
  emissive?: string;
  hasRings?: boolean;
}

const BODIES: GeocentricBody[] = [
  { name: '太阳', size: 3, color: '#ffdd44', orbitRadius: 20, body: Astronomy.Body.Sun, type: 'star', emissive: '#ffdd44' },
  { name: '月球', size: 1.2, color: '#cccccc', orbitRadius: 8, body: Astronomy.Body.Moon, type: 'satellite' },
  { name: '水星', size: 0.8, color: '#8c7853', orbitRadius: 28, body: Astronomy.Body.Mercury, type: 'planet' },
  { name: '金星', size: 1.2, color: '#f5e6a3', orbitRadius: 34, body: Astronomy.Body.Venus, type: 'planet' },
  { name: '火星', size: 1, color: '#c1440e', orbitRadius: 42, body: Astronomy.Body.Mars, type: 'planet' },
  { name: '木星', size: 3.5, color: '#d4a574', orbitRadius: 56, body: Astronomy.Body.Jupiter, type: 'planet' },
  { name: '土星', size: 3, color: '#e3d595', orbitRadius: 70, body: Astronomy.Body.Saturn, type: 'planet', hasRings: true },
];

// 用astronomy-engine计算天体的地心黄道经度
function getGeocentricEclipticLongitude(body: Astronomy.Body, date: Date): number {
  try {
    const t = new Astronomy.AstroTime(date);

    if (body === Astronomy.Body.Sun) {
      // 太阳用地心黄经：SunPosition().elon
      return Astronomy.SunPosition(t).elon;
    }

    // 行星和月球：EclipticLongitude 返回地心黄道经度
    return Astronomy.EclipticLongitude(body, t);
  } catch (e) {
    // fallback
    return 0;
  }
}

// 黄道经度转3D坐标（地心模型）
function eclipticToPosition(longitudeDeg: number, radius: number, latitudeDeg: number = 0): [number, number, number] {
  const lonRad = (longitudeDeg * Math.PI) / 180;
  const latRad = (latitudeDeg * Math.PI) / 180;
  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  return [x, y, z];
}

// 获取当前节气索引
function getCurrentSolarTermIndex(date: Date): number {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor((dayOfYear * 24) / 365) % 24;
}

// 获取太阳所在黄道十二宫索引
function getZodiacIndex(sunLongitude: number): number {
  const normalized = ((sunLongitude % 360) + 360) % 360;
  return Math.floor(normalized / 30);
}

// 天体组件
function CelestialBody({
  size, color, position, emissive, name, onClick, hasRings
}: {
  size: number; color: string; position: [number, number, number];
  emissive?: string; name?: string; onClick?: () => void; hasRings?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.3;
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        scale={hovered ? 1.15 : 1}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive || '#000000'}
          emissiveIntensity={emissive ? 1.5 : 0}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* 土星光环 */}
      {hasRings && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
          <meshStandardMaterial color="#c9b896" side={THREE.DoubleSide} transparent opacity={0.75} />
        </mesh>
      )}

      {/* 发光光晕 */}
      {emissive && (
        <mesh>
          <sphereGeometry args={[size * 1.6, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}

      {/* 名称标签 */}
      {name && (
        <Text
          position={[0, size + 2, 0]}
          fontSize={hovered ? 1.4 : 0.9}
          color={hovered ? '#ffeb3b' : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.12}
          outlineColor="#000000"
        >
          {name}
        </Text>
      )}
    </group>
  );
}

// 轨道环
function OrbitRing({ radius, color = '#334455', segments = 128 }: { radius: number; color?: string; segments?: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius, segments]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap(v => [v.x, v.y, v.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.2} />
    </line>
  );
}

// 黄道十二宫环（带星座标注）
function ZodiacRing({ radius }: { radius: number }) {
  return (
    <group>
      {/* 黄道面圆环 */}
      <OrbitRing radius={radius} color="#4a3b6b" segments={256} />
      {/* 更粗的外环 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.3, radius + 0.3, 128]} />
        <meshBasicMaterial color="#1a1430" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* 宫位分隔线 + 标注 */}
      {ZODIAC_SIGNS.map((sign, i) => {
        const angleDeg = sign.startDeg;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x1 = Math.cos(angleRad) * (radius - 1.5);
        const z1 = Math.sin(angleRad) * (radius - 1.5);
        const x2 = Math.cos(angleRad) * (radius + 1.5);
        const z2 = Math.sin(angleRad) * (radius + 1.5);

        // 标注位置：宫位中心
        const midAngle = ((angleDeg + 15) * Math.PI) / 180;
        const labelR = radius + 3;
        const lx = Math.cos(midAngle) * labelR;
        const lz = Math.sin(midAngle) * labelR;

        return (
          <group key={sign.latin}>
            {/* 分隔线 */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([x1, 0, z1, x2, 0, z2]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#6b5b8a" transparent opacity={0.4} />
            </line>
            {/* 符号 */}
            <Text
              position={[lx, 0, lz]}
              fontSize={2}
              color="#9b8bc4"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.08}
              outlineColor="#000000"
            >
              {sign.symbol}
            </Text>
            {/* 名称 */}
            <Text
              position={[lx, -2.2, lz]}
              fontSize={0.9}
              color="#7b6ba4"
              anchorX="center"
              anchorY="middle"
            >
              {sign.name}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// 节气标注点（在黄道环上）
function SolarTermMarkers({ radius, currentIndex }: { radius: number; currentIndex: number }) {
  return (
    <group>
      {SOLAR_TERMS.map((term, i) => {
        // 节气角度：从春分(0°)开始，每个15°
        // 立春在315°（春分前45°），惊蛰在345°...
        // 简化：均匀分布
        const angleDeg = (i / 24) * 360;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const z = Math.sin(angleRad) * radius;
        const isCurrent = i === currentIndex;

        return (
          <group key={term} position={[x, 0, z]}>
            <mesh>
              <sphereGeometry args={[isCurrent ? 0.5 : 0.25, 12, 12]} />
              <meshBasicMaterial color={isCurrent ? '#ff6b6b' : '#4a90d9'} />
            </mesh>
            {isCurrent && (
              <Text
                position={[0, 1.5, 0]}
                fontSize={0.7}
                color="#ff6b6b"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.1}
                outlineColor="#000000"
              >
                {term}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}

// 相机控制器
function CameraController({ targetPosition }: { targetPosition: [number, number, number] | null }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const anim = useRef<{
    startPos: THREE.Vector3; endPos: THREE.Vector3;
    startTarget: THREE.Vector3; endTarget: THREE.Vector3;
    startTime: number; duration: number;
  } | null>(null);

  if (targetPosition && controlsRef.current) {
    const target = new THREE.Vector3(...targetPosition);
    const dist = 20;
    const endPos = target.clone().add(new THREE.Vector3(dist, dist * 0.5, dist));
    anim.current = {
      startPos: camera.position.clone(), endPos,
      startTarget: controlsRef.current.target.clone(), endTarget: target,
      startTime: performance.now(), duration: 1000
    };
  }

  useFrame(() => {
    if (anim.current && controlsRef.current) {
      const s = anim.current;
      const t = Math.min((performance.now() - s.startTime) / s.duration, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(s.startPos, s.endPos, e);
      (controlsRef.current.target as THREE.Vector3).lerpVectors(s.startTarget, s.endTarget, e);
      if (t >= 1) anim.current = null;
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan enableZoom enableRotate
      minDistance={5} maxDistance={250}
      enableDamping dampingFactor={0.05}
      rotateSpeed={0.6} zoomSpeed={1.2}
    />
  );
}

// 地球（中心球体，带大气层）
function Earth({ onClick }: { onClick?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.2;
  });

  return (
    <group>
      {/* 地球本体 */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        scale={hovered ? 1.05 : 1}
      >
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial
          color="#1e5d8c"
          roughness={0.4}
          metalness={0.15}
        />
      </mesh>
      {/* 大气层 */}
      <mesh>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial color="#66aadd" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {/* 标签 */}
      <Text
        position={[0, 4.5, 0]}
        fontSize={hovered ? 1.4 : 1}
        color={hovered ? '#ffeb3b' : '#66ccff'}
        anchorX="center" anchorY="middle"
        outlineWidth={0.12} outlineColor="#000000"
      >
        地球（观测点）
      </Text>
    </group>
  );
}

// 天球网格（半透明球壳表示天球）
function CelestialSphere({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshBasicMaterial color="#0a0a20" transparent opacity={0.03} side={THREE.BackSide} />
    </mesh>
  );
}

// 主场景
interface GeocentricSceneProps {
  time: Date;
  location: { latitude: number; longitude: number };
  onBodyClick?: (name: string, info: any) => void;
  targetPlanet?: string;
}

function GeocentricScene({ time, location, onBodyClick, targetPlanet }: GeocentricSceneProps) {
  const [targetPosition, setTargetPosition] = useState<[number, number, number] | null>(null);

  // 计算所有天体位置
  const bodyPositions = useMemo(() => {
    return BODIES.map(body => {
      const eclLon = getGeocentricEclipticLongitude(body.body, time);
      const pos = eclipticToPosition(eclLon, body.orbitRadius);
      return { ...body, eclipticLongitude: eclLon, position: pos };
    });
  }, [time]);

  // 当前节气
  const currentTermIndex = getCurrentSolarTermIndex(time);

  // 太阳黄经 → 当前星座
  const sunBody = bodyPositions.find(b => b.name === '太阳');
  const sunEclLon = sunBody?.eclipticLongitude || 0;
  const currentZodiacIndex = getZodiacIndex(sunEclLon);
  const currentZodiac = ZODIAC_SIGNS[currentZodiacIndex];

  const handleBodyClick = (name: string, info: any, pos?: [number, number, number]) => {
    if (pos) setTargetPosition(pos);
    onBodyClick?.(name, { ...info, zodiac: currentZodiac?.name });
  };

  // 外部targetPlanet触发
  const prevTargetRef = useRef<string | undefined>(undefined);
  if (targetPlanet && targetPlanet !== prevTargetRef.current) {
    prevTargetRef.current = targetPlanet;
    const found = bodyPositions.find(b => {
      const key = Object.keys(Astronomy.Body).find(k => Astronomy.Body[k as keyof typeof Astronomy.Body] === b.body);
      return key?.toLowerCase() === targetPlanet || b.name === targetPlanet;
    });
    if (found) setTargetPosition(found.position);
  }

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#6699cc" />
      <directionalLight position={[30, 30, 30]} intensity={0.4} />
      <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} />
      <CameraController targetPosition={targetPosition} />

      {/* 天球 */}
      <CelestialSphere radius={90} />

      {/* 地球在中心 */}
      <Earth onClick={() => handleBodyClick('地球', { type: '观测点', note: '地心模型中心' }, [0, 0, 0])} />

      {/* 黄道十二宫环 */}
      <ZodiacRing radius={50} />

      {/* 节气标注（在黄道环上） */}
      <SolarTermMarkers radius={50} currentIndex={currentTermIndex} />

      {/* 各天体 */}
      {bodyPositions.map(body => (
        <group key={body.name}>
          {/* 轨道线（黄道面上的圆） */}
          <OrbitRing radius={body.orbitRadius} color={body.color} />
          {/* 天体 */}
          <CelestialBody
            size={body.size}
            color={body.color}
            position={body.position}
            emissive={body.emissive}
            name={body.name}
            hasRings={body.hasRings}
            onClick={() => handleBodyClick(body.name, {
              type: body.type,
              eclipticLongitude: `${body.eclipticLongitude.toFixed(1)}°`,
              zodiac: ZODIAC_SIGNS[getZodiacIndex(body.eclipticLongitude)]?.name || '未知'
            }, body.position)}
          />
        </group>
      ))}

      {/* 当前星座指示线（太阳到黄道环） */}
      {sunBody && (() => {
        const zodiacAngleRad = ((currentZodiacIndex * 30 + 15) * Math.PI) / 180;
        const ringR = 50;
        return (
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([
                  sunBody.position[0], sunBody.position[1], sunBody.position[2],
                  Math.cos(zodiacAngleRad) * ringR, 0, Math.sin(zodiacAngleRad) * ringR
                ]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ff6b6b" transparent opacity={0.3} />
          </line>
        );
      })()}
    </>
  );
}

// 导出组件
interface SolarSystemProps {
  time: Date;
  location: { latitude: number; longitude: number };
  onBodyClick?: (name: string, info: any) => void;
  targetPlanet?: string;
}

export default function SolarSystem({ time, location, onBodyClick, targetPlanet }: SolarSystemProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white text-xl" style={{ background: '#000' }}>
        3D渲染失败，请检查浏览器WebGL支持
      </div>
    );
  }

  return (
    <div className="w-full h-screen" style={{ background: '#000000' }}>
      <Canvas
        camera={{ position: [60, 40, 60], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000005' }}
        onError={() => setHasError(true)}
      >
        <GeocentricScene time={time} location={location} onBodyClick={onBodyClick} targetPlanet={targetPlanet} />
      </Canvas>
    </div>
  );
}
