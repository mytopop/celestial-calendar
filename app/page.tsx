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

// 干支计算
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SOLAR_TERMS = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
];
const ZODIAC_NAMES = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'
];

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
  return HEAVENLY_STEMS[offset % 10] + EARTHLY_BRANCHES[offset % 12];
}

function getGanZhiMonth(year: number, month: number): string {
  const yearStemIndex = (year - 4) % 10;
  const monthStemIndex = (yearStemIndex % 5) * 2 + (month - 1);
  return HEAVENLY_STEMS[monthStemIndex % 10] + EARTHLY_BRANCHES[(month - 1) % 12];
}

function getGanZhiDay(date: Date): string {
  const baseDate = new Date('1949-10-01');
  const daysDiff = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const offset = (daysDiff + 10) % 60;
  return HEAVENLY_STEMS[offset % 10] + EARTHLY_BRANCHES[offset % 12];
}

function getCurrentSolarTerm(date: Date): string {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return SOLAR_TERMS[Math.floor((dayOfYear * 24) / 365) % 24];
}

// 简易太阳黄经 → 星座
function getSunZodiac(date: Date): string {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  // 春分≈3月20日=第79天 → 黄经0°
  const adjustedDay = dayOfYear - 79;
  const deg = ((adjustedDay / 365.25) * 360 + 360) % 360;
  return ZODIAC_NAMES[Math.floor(deg / 30)];
}

function generate60JiaZi() {
  const list: Array<{ name: string; year: number }> = [];
  const baseYear = 4;
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 60; i++) {
    const stemIndex = i % 10;
    const branchIndex = i % 12;
    const name = HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex];
    const cycles = Math.floor((currentYear - baseYear) / 60);
    let year = baseYear + i + cycles * 60;
    if (year > currentYear) year -= 60;
    list.push({ name, year });
  }
  return list;
}

const JIAZI_LIST = generate60JiaZi();

// 甲子五行对应天体（地心模型中可跳转）
const WUXING_TO_BODY: Record<string, string> = {
  '甲': '木星', '乙': '木星',
  '丙': '火星', '丁': '火星',
  '戊': '土星', '己': '土星',
  '庚': '金星', '辛': '金星',
  '壬': '水星', '癸': '水星',
};

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [location, setLocation] = useState({ latitude: 39.9, longitude: 116.4, name: '北京' });
  const [selectedBody, setSelectedBody] = useState<{ name: string; info: any } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showJiaziModal, setShowJiaziModal] = useState(false);
  const [targetPlanet, setTargetPlanet] = useState<string | undefined>(undefined);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime(prev => new Date(prev.getTime() + 1000 * 60 * 60 * 24 * playbackSpeed));
    }, 50);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  const year = currentTime.getFullYear();
  const month = currentTime.getMonth() + 1;
  const day = currentTime.getDate();
  const ganZhiYear = getGanZhiYear(year);
  const ganZhiMonth = getGanZhiMonth(year, month);
  const ganZhiDay = getGanZhiDay(currentTime);
  const currentTerm = getCurrentSolarTerm(currentTime);
  const sunZodiac = getSunZodiac(currentTime);

  const handleBodyClick = (name: string, info: any) => {
    setSelectedBody({ name, info });
  };

  const handleJiaziSelect = (jiaziYear: number, jiaziName: string) => {
    setCurrentTime(new Date(jiaziYear, 0, 1));
    setShowJiaziModal(false);
    // 甲子天干 → 对应行星
    const stem = jiaziName[0];
    const bodyName = WUXING_TO_BODY[stem] || '太阳';
    setTargetPlanet(bodyName);
    setTimeout(() => setIsPlaying(true), 500);
  };

  const handleResetToNow = () => {
    setCurrentTime(new Date());
    setTargetPlanet(undefined);
    setIsPlaying(false);
  };

  return (
    <div className="w-full h-screen text-white overflow-hidden relative" style={{ background: '#000000' }}>
      <SolarSystem
        time={currentTime}
        location={{ latitude: location.latitude, longitude: location.longitude }}
        onBodyClick={handleBodyClick}
        targetPlanet={targetPlanet}
      />

      {/* 顶部标题 */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-3xl font-bold text-indigo-400">
          地心天球 · 黄道历法
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          以地球为观测中心，太阳与五星运行于黄道十二宫
        </p>
      </div>

      {/* 信息面板 */}
      <div className="absolute top-4 right-4 bg-black/80 p-5 rounded-lg backdrop-blur-sm border border-indigo-500/30 max-w-sm z-10">
        <h2 className="text-xl font-bold mb-3 text-indigo-400">天象信息</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">公历:</span>
            <span className="text-white font-mono">{year}-{String(month).padStart(2,'0')}-{String(day).padStart(2,'0')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">干支年:</span>
            <span className="text-yellow-400 font-bold">{ganZhiYear}年</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">干支月:</span>
            <span className="text-green-400">{ganZhiMonth}月</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">干支日:</span>
            <span className="text-blue-400">{ganZhiDay}日</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">节气:</span>
            <span className="text-red-400 font-bold">{currentTerm}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">太阳所在:</span>
            <span className="text-purple-400 font-bold">{sunZodiac}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">观测地:</span>
            <button onClick={() => setShowLocationModal(true)} className="text-purple-400 hover:text-purple-300 underline">
              {location.name}
            </button>
          </div>
        </div>

        {selectedBody && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-1">{selectedBody.name}</h3>
            <div className="text-xs space-y-1">
              {Object.entries(selectedBody.info).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400">{k}:</span>
                  <span className="text-white">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 时间轴控制 */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/80 p-4 rounded-lg backdrop-blur-sm border border-indigo-500/30 z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => setIsPlaying(!isPlaying)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors">
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button onClick={handleResetToNow}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors">
            回到现在
          </button>
          <button onClick={() => setShowJiaziModal(true)}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
            60甲子
          </button>
          <input type="date"
            value={currentTime.toISOString().split('T')[0]}
            onChange={(e) => setCurrentTime(new Date(e.target.value))}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
          />
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
            <span className="text-sm text-gray-400 px-2">速度:</span>
            {[1, 5, 10, 30, 60, 365].map(speed => (
              <button key={speed} onClick={() => setPlaybackSpeed(speed)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}>
                {speed === 1 ? '1x' : speed === 365 ? '1年/秒' : speed + 'x'}
              </button>
            ))}
          </div>
          <div className="ml-auto text-sm text-gray-400">
            地心模型：地球居中，观日月五星运行黄道
          </div>
        </div>
      </div>

      {/* 位置选择 */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg border border-indigo-500/50 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-indigo-400 mb-4">选择观测位置</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.keys(CITIES).map(city => (
                <button key={city} onClick={() => {
                  const c = CITIES[city as keyof typeof CITIES];
                  setLocation({ latitude: c.lat, longitude: c.lon, name: city });
                  setShowLocationModal(false);
                }} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-600 hover:border-indigo-500 transition-colors">
                  {city}
                </button>
              ))}
            </div>
            <button onClick={() => setShowLocationModal(false)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 60甲子 */}
      {showJiaziModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg border border-purple-500/50 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold text-purple-400 mb-2">六十甲子</h2>
            <p className="text-sm text-gray-400 mb-4">点击甲子 → 跳转到对应年份，天干五行定位对应行星</p>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {JIAZI_LIST.map((jz, i) => {
                  const isSelected = jz.year === year;
                  const stem = jz.name[0];
                  const planetName = WUXING_TO_BODY[stem] || '';
                  return (
                    <button key={i} onClick={() => handleJiaziSelect(jz.year, jz.name)}
                      className={`px-2 py-2 rounded-lg border transition-colors ${
                        isSelected ? 'bg-purple-600 border-purple-400 text-white font-bold'
                          : 'bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-purple-500 text-white'
                      }`}>
                      <div className="text-lg">{jz.name}</div>
                      <div className="text-xs text-gray-400">{jz.year}</div>
                      <div className="text-xs text-indigo-400">{planetName}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setShowJiaziModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
