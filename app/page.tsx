'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const SolarSystem = dynamic(() => import('./components/SolarSystem'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-black text-white">
      加载中...
    </div>
  ),
});

// 干支计算工具
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SOLAR_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
];

// 常用城市
const CITIES = {
  '北京': { lat: 39.9, lon: 116.4 },
  '上海': { lat: 31.2, lon: 121.5 },
  '西安': { lat: 34.3, lon: 108.9 },
  '南京': { lat: 32.1, lon: 118.8 },
  '洛阳': { lat: 34.6, lon: 112.4 },
  '成都': { lat: 30.7, lon: 104.1 },
};

function getGanZhiYear(year: number): string {
  const offset = (year - 4) % 60;
  const stemIndex = offset % 10;
  const branchIndex = offset % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

// 生成60甲子列表
function generate60JiaZi(): Array<{ name: string; year: number; startYear: number }> {
  const jiaziList: Array<{ name: string; year: number; startYear: number }> = [];
  const baseYear = 4; // 公元4年是甲子年

  for (let i = 0; i < 60; i++) {
    const year = baseYear + i;
    const stemIndex = i % 10;
    const branchIndex = i % 12;
    const name = HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];

    // 计算最近的年份
    const currentYear = new Date().getFullYear();
    const cycles = Math.floor((currentYear - baseYear) / 60);
    const recentYear = baseYear + i + cycles * 60;
    if (recentYear > currentYear) {
      jiaziList.push({
        name,
        year: i,
        startYear: recentYear - 60
      });
    } else {
      jiaziList.push({
        name,
        year: i,
        startYear: recentYear
      });
    }
  }

  return jiaziList;
}

const JIAZI_LIST = generate60JiaZi();

function getGanZhiMonth(year: number, month: number): string {
  const yearStemIndex = (year - 4) % 10;
  const monthStemIndex = (yearStemIndex % 5) * 2 + (month - 1);
  const stem = HEAVENLY_STEMS[monthStemIndex % 10];
  const branch = EARTHLY_BRANCHES[(month - 1) % 12];
  return stem + branch;
}

function getGanZhiDay(date: Date): string {
  const baseDate = new Date('1949-10-01');
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const offset = (daysDiff + 10) % 60;
  const stemIndex = offset % 10;
  const branchIndex = offset % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
}

function getCurrentSolarTerm(date: Date): string {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const index = Math.floor((dayOfYear * 24) / 365) % 24;
  return SOLAR_TERMS[index];
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [location, setLocation] = useState({ latitude: 39.9, longitude: 116.4, name: '北京' });
  const [selectedBody, setSelectedBody] = useState<{ name: string; info: any } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showJiaziModal, setShowJiaziModal] = useState(false);
  const [targetPlanet, setTargetPlanet] = useState<string | undefined>(undefined);

  // 甲子与行星的对应关系（根据传统五行理论）
  const jiaziToPlanet: Record<string, string> = {
    // 水行（水星）
    '甲子': 'mercury', '乙丑': 'mercury',
    '丙子': 'mercury', '丁丑': 'mercury',
    '戊子': 'mercury', '己丑': 'mercury',
    '庚子': 'mercury', '辛丑': 'mercury',
    '壬子': 'mercury', '癸丑': 'mercury',

    // 木行（木星）
    '壬寅': 'jupiter', '癸卯': 'jupiter',
    '壬辰': 'jupiter', '癸巳': 'jupiter',
    '壬午': 'jupiter', '癸未': 'jupiter',
    '壬申': 'jupiter', '癸酉': 'jupiter',
    '壬戌': 'jupiter', '癸亥': 'jupiter',

    // 火行（火星）
    '丙寅': 'mars', '丁卯': 'mars',
    '丙辰': 'mars', '丁巳': 'mars',
    '丙午': 'mars', '丁未': 'mars',
    '丙申': 'mars', '丁酉': 'mars',
    '丙戌': 'mars', '丁亥': 'mars',

    // 土行（土星）
    '戊寅': 'saturn', '己卯': 'saturn',
    '戊辰': 'saturn', '己巳': 'saturn',
    '戊午': 'saturn', '己未': 'saturn',
    '戊申': 'saturn', '己酉': 'saturn',
    '戊戌': 'saturn', '己亥': 'saturn',

    // 金行（金星）
    '庚寅': 'venus', '辛卯': 'venus',
    '庚辰': 'venus', '辛巳': 'venus',
    '庚午': 'venus', '辛未': 'venus',
    '庚申': 'venus', '辛酉': 'venus',
    '庚戌': 'venus', '辛亥': 'venus',

    // 水星补充（其余甲子）
    '甲寅': 'mercury', '乙卯': 'mercury',
    '甲辰': 'mercury', '乙巳': 'mercury',
    '甲午': 'mercury', '乙未': 'mercury',
    '甲申': 'mercury', '乙酉': 'mercury',
    '甲戌': 'mercury', '乙亥': 'mercury',

    // 地球作为默认
    'default': 'earth'
  };

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setCurrentTime((prev) => new Date(prev.getTime() + 1000 * 60 * 60 * 24));
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const day = currentTime.getDate();

  const ganZhiYear = getGanZhiYear(year);
  const ganZhiMonth = getGanZhiMonth(year, month);
  const ganZhiDay = getGanZhiDay(currentTime);
  const currentTerm = getCurrentSolarTerm(currentTime);

  const handleBodyClick = (name: string, info: any) => {
    setSelectedBody({ name, info });
  };

  const handleLocationChange = (cityName: string) => {
    const city = CITIES[cityName as keyof typeof CITIES];
    if (city) {
      setLocation({ latitude: city.lat, longitude: city.lon, name: cityName });
      setShowLocationModal(false);
    }
  };

  const handleJiaziSelect = (startYear: number, jiaziName: string) => {
    console.log('handleJiaziSelect called:', { startYear, jiaziName });

    setCurrentTime(new Date(startYear, 0, 1));
    setShowJiaziModal(false);
    setIsPlaying(false);

    // 根据甲子设置对应的行星
    const planet = jiaziToPlanet[jiaziName] || jiaziToPlanet['default'];
    console.log('Mapped to planet:', planet);

    if (planet) {
      console.log('Setting target planet to:', planet);
      setTargetPlanet(planet);
    } else {
      console.log('No planet found, using earth as default');
      setTargetPlanet('earth');
    }
  };

  const handleResetToNow = () => {
    setCurrentTime(new Date());
    setTargetPlanet(undefined);
    setIsPlaying(false);
  };

  return (
    <div className="w-full h-screen text-white overflow-hidden relative" style={{ background: 'transparent' }}>
      <SolarSystem
        time={currentTime}
        location={{ latitude: location.latitude, longitude: location.longitude }}
        onBodyClick={handleBodyClick}
        targetPlanet={targetPlanet}
      />

      {/* 顶部标题 */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-blue-400">
          六十甲子天文可视化系统
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          中国传统历法与现代天文计算的3D展示
        </p>
      </div>

      {/* 信息面板 */}
      <div className="absolute top-4 right-4 bg-black/80 p-6 rounded-lg backdrop-blur-sm border border-blue-500/30 max-w-sm z-10">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">当前状态</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">公历日期:</span>
            <span className="text-white font-mono">
              {year}-{String(month).padStart(2, '0')}-{String(day).padStart(2, '0')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">干支纪年:</span>
            <span className="text-yellow-400 font-bold">{ganZhiYear}年</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">干支纪月:</span>
            <span className="text-green-400">{ganZhiMonth}月</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">干支纪日:</span>
            <span className="text-blue-400">{ganZhiDay}日</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">当前节气:</span>
            <span className="text-red-400 font-bold">{currentTerm}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">观测位置:</span>
            <button
              onClick={() => setShowLocationModal(true)}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              {location.name} ({location.longitude.toFixed(1)}°E, {location.latitude.toFixed(1)}°N)
            </button>
          </div>
        </div>

        {/* 天体详细信息 */}
        {selectedBody && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">{selectedBody.name}</h3>
            <div className="text-xs space-y-1">
              {Object.entries(selectedBody.info).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400">{key}:</span>
                  <span className="text-white">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 时间轴控制 */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/80 p-4 rounded-lg backdrop-blur-sm border border-blue-500/30 z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            {isPlaying ? '暂停' : '播放'}
          </button>

          <button
            onClick={handleResetToNow}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            回到现在
          </button>

          <button
            onClick={() => setShowJiaziModal(true)}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            60甲子
          </button>

          <input
            type="date"
            value={currentTime.toISOString().split('T')[0]}
            onChange={(e) => setCurrentTime(new Date(e.target.value))}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
          />

          <div className="text-sm text-gray-400">
            <span>时间步进: 1天/秒</span>
          </div>

          <div className="ml-auto text-sm text-gray-400">
            <span>提示: 点击天体查看详细信息</span>
          </div>
        </div>
      </div>

      {/* 地理位置选择模态框 */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg border border-blue-500/50 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">选择观测位置</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.keys(CITIES).map((city) => (
                <button
                  key={city}
                  onClick={() => handleLocationChange(city)}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-blue-500 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">或输入经纬度:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="纬度"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  id="custom-lat"
                />
                <input
                  type="number"
                  placeholder="经度"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  id="custom-lon"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const lat = parseFloat((document.getElementById('custom-lat') as HTMLInputElement).value);
                  const lon = parseFloat((document.getElementById('custom-lon') as HTMLInputElement).value);
                  if (!isNaN(lat) && !isNaN(lon)) {
                    setLocation({ latitude: lat, longitude: lon, name: '自定义' });
                    setShowLocationModal(false);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                确认
              </button>
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 60甲子选择模态框 */}
      {showJiaziModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg border border-purple-500/50 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">选择60甲子年份</h2>
            <p className="text-sm text-gray-400 mb-4">点击任意甲子，天体将运行到对应年份位置</p>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {JIAZI_LIST.map((jiazi, index) => {
                  const currentYear = currentTime.getFullYear();
                  const jiaziYear = jiazi.startYear + Math.floor((currentYear - jiazi.startYear) / 60) * 60;
                  const isSelected = jiaziYear === currentYear;

                  return (
                    <button
                      key={index}
                      onClick={() => handleJiaziSelect(jiaziYear, jiazi.name)}
                      className={`px-3 py-2 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-purple-600 border-purple-400 text-white font-bold'
                          : 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-purple-500 text-white'
                      }`}
                    >
                      <div className="text-lg">{jiazi.name}</div>
                      <div className="text-xs text-gray-400">{jiaziYear}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowJiaziModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
