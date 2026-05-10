import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  CheckCircle2,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Trophy,
  Share2,
  Clock
} from 'lucide-react';

const translations = {
  en: {
    today: "Today",
    calendar: "Calendar",
    settings: "Settings",
    todaysGoal: "Today's Goal",
    checkedIn: "Checked In ✓",
    awake: "I'm Awake ☀️",
    daysStreak: "days",
    consistency: "Consistency is Key",
    routine: "Morning Routine",
    current: "Current",
    best: "Best",
    badges: "Badges Earned",
    dismiss: "Dismiss",
    streak3: "3 Day Streak",
    streak7: "7 Day Streak",
    mastery14: "14 Day Mastery",
    keptItUp: "You've kept it up for",
    morningsThisMonth: "mornings this month.",
    yourChallenge: "Your Challenge",
    currentTarget: "Current",
    ultimateGoal: "Goal",
    shiftMessage: "Morning Streak will shift your target 10 minutes earlier each successful day.",
    reminders: "Gentle Reminders",
    nudge: "Morning nudge",
    nudgeDesc: "A soft reminder near your current target time.",
    streakRules: "Streak Rules",
    compassionate: "Compassionate mode",
    compDesc: "Streaks never fully reset. Missing a day pauses, not breaks.",
    saveBtn: "Save My Challenge",
    saved: "Saved ✓",
    language: "Language",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    daysShort: ["S", "M", "T", "W", "T", "F", "S"]
  },
  ko: {
    today: "오늘",
    calendar: "캘린더",
    settings: "설정",
    todaysGoal: "오늘의 목표",
    checkedIn: "체크인 완료 ✓",
    awake: "일어났어요 ☀️",
    daysStreak: "일 연속",
    consistency: "꾸준함이 핵심입니다",
    routine: "모닝 루틴",
    current: "현재",
    best: "최고",
    badges: "획득한 배지",
    dismiss: "닫기",
    streak3: "3일 스트릭",
    streak7: "7일 스트릭",
    mastery14: "14일 마스터",
    keptItUp: "이번 달에 총",
    morningsThisMonth: "번의 아침을 지켜냈어요.",
    yourChallenge: "나의 챌린지",
    currentTarget: "현재 목표",
    ultimateGoal: "최종 목표",
    shiftMessage: "성공할 때마다 목표 기상 시간이 10분씩 자동으로 앞당겨집니다.",
    reminders: "알림 설정",
    nudge: "기상 넛지",
    nudgeDesc: "목표 시간 즈음에 부드러운 알림을 보냅니다.",
    streakRules: "스트릭 규칙",
    compassionate: "컴패셔네이트 모드",
    compDesc: "스트릭이 완전히 초기화되지 않습니다. 하루를 놓쳐도 끊기지 않고 멈춥니다.",
    saveBtn: "나의 챌린지 저장하기",
    saved: "저장됨 ✓",
    language: "언어 설정",
    months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
    daysShort: ["일", "월", "화", "수", "목", "금", "토"]
  }
};

const STORAGE_KEY = 'morning_streak_data_v1';
const SHIFT_MINUTES = 10;
const MINUTES_PER_DAY = 24 * 60;

/** Celebration 미니 그리드용 플레이스홀더 (디자인용 고정 패턴). */
const MINI_CAL_PLACEHOLDER_DAYS = Object.freeze([
  25, 26, 27, 28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8
]);

const SUPPORTED_LANGUAGES = Object.freeze(['en', 'ko']);

function getDefaultAppState() {
  return {
    streak: 5,
    bestStreak: 14,
    checkedDays: ['2023-10-02', '2023-10-03', '2023-10-04', '2023-10-05'],
    currentTargetTime: 480,
    ultimateGoalTime: 420,
    nudgeEnabled: true,
    compassionateMode: true,
    lastShiftDate: null,
    language: 'en'
  };
}

function coerceLanguage(lang) {
  return lang === 'ko' ? 'ko' : 'en';
}

function clampMinutes(raw, fallback) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(MINUTES_PER_DAY - 1, Math.round(raw)));
}

/** localStorage 원본을 안전하게 맞춥니다. 깨진 language / boolean 때문에 UI가 충돌하지 않도록 합니다. */
function normalizePersistedState(raw) {
  const d = getDefaultAppState();
  if (!raw || typeof raw !== 'object') return d;

  const streak =
    typeof raw.streak === 'number' && Number.isFinite(raw.streak) ? Math.max(0, Math.floor(raw.streak)) : d.streak;
  const bestStreak =
    typeof raw.bestStreak === 'number' && Number.isFinite(raw.bestStreak)
      ? Math.max(0, Math.floor(raw.bestStreak))
      : d.bestStreak;

  return {
    ...d,
    ...raw,
    streak,
    bestStreak,
    checkedDays: Array.isArray(raw.checkedDays) ? raw.checkedDays.filter((x) => typeof x === 'string') : d.checkedDays,
    currentTargetTime: clampMinutes(raw.currentTargetTime, d.currentTargetTime),
    ultimateGoalTime: clampMinutes(raw.ultimateGoalTime, d.ultimateGoalTime),
    nudgeEnabled: typeof raw.nudgeEnabled === 'boolean' ? raw.nudgeEnabled : d.nudgeEnabled,
    compassionateMode: typeof raw.compassionateMode === 'boolean' ? raw.compassionateMode : d.compassionateMode,
    lastShiftDate: raw.lastShiftDate == null || typeof raw.lastShiftDate !== 'string' ? null : raw.lastShiftDate,
    language: SUPPORTED_LANGUAGES.includes(raw.language) ? raw.language : coerceLanguage(raw.language)
  };
}

function loadPersistedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizePersistedState(JSON.parse(saved));
  } catch {
    /* ignore */
  }
  return getDefaultAppState();
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/** 로컬 캘린더 기준 YYYY-MM-DD (체크인·캘린더 표기와 통일). */
function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return toLocalDateKey(new Date());
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
}

function formatMonthHeading(t, lang, year, monthIndex) {
  return lang === 'en'
    ? `${t.months[monthIndex]} ${year}`
    : `${year}년 ${t.months[monthIndex]}`;
}

function monthPrefix(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function nextWakeTargetAfterSuccessfulDay(currentMinutes, ultimateMinutes, shiftMinutes = SHIFT_MINUTES) {
  if (currentMinutes <= ultimateMinutes) return currentMinutes;
  return Math.max(ultimateMinutes, currentMinutes - shiftMinutes);
}

/** 체크인 한 번으로 갱신될 상태 조각을 계산합니다. 해당일 이미 체크인이면 null. */
function computeCheckInPatch(prevState, todayKey, yesterdayKey) {
  if (prevState.checkedDays.includes(todayKey)) return null;

  const lastCheckIn = prevState.checkedDays.at(-1);
  let streak = prevState.streak + 1;
  if (lastCheckIn !== yesterdayKey && !prevState.compassionateMode) {
    streak = 1;
  }

  const checkedDays = [...prevState.checkedDays, todayKey];
  const bestStreak = Math.max(streak, prevState.bestStreak);
  const currentTargetTime = nextWakeTargetAfterSuccessfulDay(
    prevState.currentTargetTime,
    prevState.ultimateGoalTime
  );

  return {
    checkedDays,
    streak,
    bestStreak,
    currentTargetTime,
    lastShiftDate: todayKey
  };
}

const NAV_ICON_TODAY = <CheckCircle2 size={24} />;
const NAV_ICON_CALENDAR = <CalendarIcon size={24} />;
const NAV_ICON_SETTINGS = <SettingsIcon size={24} />;

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [showCelebration, setShowCelebration] = useState(false);
  const [state, setState] = useState(loadPersistedState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 저장 공간 부족·프라이빗 모드 등 — UI 상태는 계속 동작 */
    }
  }, [state]);

  const lang = coerceLanguage(state.language);
  const t = useMemo(() => translations[lang], [lang]);

  const isCheckedToday = useMemo(
    () => state.checkedDays.includes(getTodayKey()),
    [state.checkedDays]
  );

  const handleCheckIn = useCallback(() => {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();
    const patch = computeCheckInPatch(state, today, yesterday);
    if (!patch) return;
    setState((prev) => ({ ...prev, ...patch }));
    setShowCelebration(true);
  }, [state]);

  /**
   * 객체 또는 (prev => partial) 업데이터. 항상 최신 prev 기준으로 병합하고,
   * language / boolean 타입을 맞추며 값이 바뀌지 않았으면 prev를 반환해 불필요한 리렌더·persist를 막습니다.
   */
  const updateSettings = useCallback((patch) => {
    setState((prev) => {
      const delta = typeof patch === 'function' ? patch(prev) : patch;
      if (delta == null || typeof delta !== 'object' || Array.isArray(delta)) return prev;

      const next = { ...prev };

      const assignIfChanged = (key, value) => {
        if (prev[key] !== value) {
          next[key] = value;
        }
      };

      if ('language' in delta) {
        assignIfChanged('language', coerceLanguage(delta.language));
      }
      if ('compassionateMode' in delta) {
        assignIfChanged('compassionateMode', Boolean(delta.compassionateMode));
      }
      if ('nudgeEnabled' in delta) {
        assignIfChanged('nudgeEnabled', Boolean(delta.nudgeEnabled));
      }
      if ('currentTargetTime' in delta) {
        assignIfChanged('currentTargetTime', clampMinutes(delta.currentTargetTime, prev.currentTargetTime));
      }
      if ('ultimateGoalTime' in delta) {
        assignIfChanged('ultimateGoalTime', clampMinutes(delta.ultimateGoalTime, prev.ultimateGoalTime));
      }
      if ('streak' in delta && typeof delta.streak === 'number' && Number.isFinite(delta.streak)) {
        assignIfChanged('streak', Math.max(0, Math.floor(delta.streak)));
      }
      if ('bestStreak' in delta && typeof delta.bestStreak === 'number' && Number.isFinite(delta.bestStreak)) {
        assignIfChanged('bestStreak', Math.max(0, Math.floor(delta.bestStreak)));
      }
      if ('checkedDays' in delta && Array.isArray(delta.checkedDays)) {
        const normalized = delta.checkedDays.filter((x) => typeof x === 'string');
        const sameLength = normalized.length === prev.checkedDays.length;
        const sameItems =
          sameLength && normalized.every((dayKey, idx) => dayKey === prev.checkedDays[idx]);
        if (!sameItems) assignIfChanged('checkedDays', normalized);
      }
      if ('lastShiftDate' in delta) {
        const v =
          delta.lastShiftDate == null
            ? null
            : typeof delta.lastShiftDate === 'string'
              ? delta.lastShiftDate
              : prev.lastShiftDate;
        assignIfChanged('lastShiftDate', v);
      }

      for (const k of Object.keys(delta)) {
        if (
          k !== 'language' &&
          k !== 'compassionateMode' &&
          k !== 'nudgeEnabled' &&
          k !== 'currentTargetTime' &&
          k !== 'ultimateGoalTime' &&
          k !== 'streak' &&
          k !== 'bestStreak' &&
          k !== 'checkedDays' &&
          k !== 'lastShiftDate'
        ) {
          assignIfChanged(k, delta[k]);
        }
      }

      let changed = false;
      for (const k of Object.keys(next)) {
        if (prev[k] !== next[k]) {
          changed = true;
          break;
        }
      }

      return changed ? next : prev;
    });
  }, []);

  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
    setActiveTab('calendar');
  }, []);

  const goToTodayTab = useCallback(() => setActiveTab('today'), []);
  const goToCalendarTab = useCallback(() => setActiveTab('calendar'), []);
  const goToSettingsTab = useCallback(() => setActiveTab('settings'), []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#0F172A] font-sans">
      <div className="w-full max-w-[390px] h-[844px] bg-[#1A1A2E] text-white flex flex-col relative overflow-hidden shadow-2xl rounded-[40px] border-[8px] border-black">
        <div className="flex-1 overflow-y-auto overscroll-contain pb-24 scrollbar-hide">
          {showCelebration ? (
            <CelebrationView
              t={t}
              lang={lang}
              streak={state.streak}
              best={state.bestStreak}
              onClose={closeCelebration}
            />
          ) : activeTab === 'calendar' ? (
            <CalendarView t={t} lang={lang} checkedDays={state.checkedDays} />
          ) : activeTab === 'settings' ? (
            <SettingsView t={t} state={state} updateSettings={updateSettings} />
          ) : (
            <HomeView
              t={t}
              currentTargetTime={state.currentTargetTime}
              streak={state.streak}
              onCheckIn={handleCheckIn}
              isCheckedToday={isCheckedToday}
            />
          )}
        </div>

        {!showCelebration && (
          <nav className="absolute bottom-0 left-0 right-0 bg-[#1A1A2E]/95 border-t border-white/5 flex justify-around items-center py-5 px-2 z-10 backdrop-blur-md">
            <NavBtn
              label={t.today}
              icon={NAV_ICON_TODAY}
              active={activeTab === 'today'}
              onClick={goToTodayTab}
            />
            <NavBtn
              label={t.calendar}
              icon={NAV_ICON_CALENDAR}
              active={activeTab === 'calendar'}
              onClick={goToCalendarTab}
            />
            <NavBtn
              label={t.settings}
              icon={NAV_ICON_SETTINGS}
              active={activeTab === 'settings'}
              onClick={goToSettingsTab}
            />
          </nav>
        )}
      </div>
    </div>
  );
}

const NavBtn = memo(function NavBtn({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-[#3A7BD5] scale-110' : 'text-gray-500 hover:text-gray-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
  );
});

const HomeView = memo(function HomeView({
  t,
  currentTargetTime,
  streak,
  onCheckIn,
  isCheckedToday
}) {
  return (
    <div className="px-8 pt-16 pb-8 flex flex-col items-center animate-in fade-in duration-700">
      <h2 className="text-xl font-bold mb-14 text-white/90 tracking-tight">
        {t.todaysGoal}: <span className="text-[#98C1FF]">{formatTime(currentTargetTime)}</span>
      </h2>

      <div className="relative mb-14">
        {!isCheckedToday && (
          <div className="absolute inset-0 bg-[#3A7BD5] rounded-full blur-[40px] opacity-20 animate-pulse" />
        )}
        <button
          type="button"
          onClick={onCheckIn}
          disabled={isCheckedToday}
          className={`w-52 h-52 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-500 z-10 relative
            ${isCheckedToday
              ? 'bg-gray-800/50 border border-white/10 opacity-60 cursor-not-allowed'
              : 'bg-gradient-to-br from-[#98C1FF] to-[#3A7BD5] hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(58,123,213,0.4)]'}`}
        >
          <span
            className={`${isCheckedToday ? 'text-white/40' : 'text-[#1A1A2E]'} font-black text-xl tracking-tight`}
          >
            {isCheckedToday ? t.checkedIn : t.awake}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-14 bg-white/5 px-6 py-3 rounded-full border border-white/5">
        <Flame className="text-[#F5A623]" size={32} fill="#F5A623" />
        <span className="text-3xl font-black italic">
          {streak}{' '}
          <span className="text-lg not-italic font-bold text-white/60 ml-1">{t.daysStreak}</span>
        </span>
      </div>

      <div className="w-full rounded-[32px] overflow-hidden shadow-2xl aspect-[4/3] relative border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent z-10 opacity-80" />
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600"
          alt="Sunrise"
          className="w-full h-full object-cover"
        />
        <p className="absolute bottom-6 left-0 right-0 text-center z-20 text-white/60 uppercase tracking-[0.3em] text-[10px] font-black">
          {t.consistency}
        </p>
      </div>
    </div>
  );
});

const BadgeCard = memo(function BadgeCard({ days, label, active }) {
  return (
    <div
      className={`min-w-[130px] p-6 rounded-[24px] flex flex-col items-center gap-4 transition-all ${active ? 'bg-white/5 border border-white/10 shadow-xl' : 'opacity-20 grayscale bg-black/20'}`}
    >
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center ${active ? 'bg-[#3A7BD5]/20 text-[#3A7BD5]' : 'bg-gray-800'}`}
      >
        <div className="border-2 border-current rounded-lg w-7 h-7 flex items-center justify-center text-[10px] font-black">
          {days}
        </div>
      </div>
      <span className="text-[10px] font-black text-center leading-tight uppercase tracking-tighter">{label}</span>
    </div>
  );
});

const CelebrationView = memo(function CelebrationView({ t, lang, streak, best, onClose }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const miniCells = useMemo(
    () =>
      MINI_CAL_PLACEHOLDER_DAYS.map((dayNum, index) => ({
        dayNum,
        index,
        /** 디자인용 목업 — 실데이터 연동 시 교체 가능 */
        filled: index < 7
      })),
    []
  );

  const heading = useMemo(() => formatMonthHeading(t, lang, year, month), [t, lang, year, month]);

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in slide-in-from-bottom-10 duration-500">
      <div className="flex justify-between items-center mb-8">
        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-black tracking-tighter uppercase opacity-60">{t.routine}</h1>
        <button type="button" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <Share2 size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={24} className="text-[#F5A623]" fill="#F5A623" />
            <span className="text-2xl font-black">{streak}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t.current}</span>
        </div>
        <div className="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={24} className="text-[#3A7BD5]" />
            <span className="text-2xl font-black">{best}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t.best}</span>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-3xl font-black mb-6 tracking-tighter">{heading}</h2>
        <div className="grid grid-cols-7 gap-y-4">
          {miniCells.map(({ dayNum, index, filled }) => (
            <div key={`${index}-${dayNum}`} className="flex justify-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${filled ? 'bg-[#3A7BD5] shadow-lg shadow-blue-500/30' : 'text-white/20 border border-white/5'}`}
              >
                {filled ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{dayNum}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-black mb-5 tracking-tight">{t.badges}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          <BadgeCard days={3} label={t.streak3} active={streak >= 3} />
          <BadgeCard days={7} label={t.streak7} active={streak >= 7} />
          <BadgeCard days={14} label={t.mastery14} active={streak >= 14} />
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-black rounded-2xl transition-all uppercase tracking-widest text-xs mt-auto"
      >
        {t.dismiss}
      </button>
    </div>
  );
});

const CalendarView = memo(function CalendarView({ t, lang, checkedDays }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = getTodayKey();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonthCount = new Date(year, month + 1, 0).getDate();

  const heading = useMemo(() => formatMonthHeading(t, lang, year, month), [t, lang, year, month]);

  const checkedSet = useMemo(() => new Set(checkedDays), [checkedDays]);

  const successCountThisMonth = useMemo(() => {
    const prefix = monthPrefix(year, month);
    let n = 0;
    for (const day of checkedDays) {
      if (day.startsWith(prefix)) n += 1;
    }
    return n;
  }, [checkedDays, year, month]);

  const cells = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonthCount; d += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      list.push({
        day: d,
        dateStr,
        checked: checkedSet.has(dateStr),
        isToday: dateStr === todayKey
      });
    }
    return list;
  }, [year, month, daysInMonthCount, checkedSet, todayKey]);

  const emptyLead = useMemo(() => Array.from({ length: firstDayOfMonth }, (_, i) => i), [firstDayOfMonth]);

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center mb-12 opacity-60">
        <h1 className="text-lg font-black tracking-tighter uppercase">{t.routine}</h1>
      </div>

      <h2 className="text-4xl font-black text-center mb-10 tracking-tighter leading-none">{heading}</h2>

      <div className="bg-white/5 p-7 rounded-[32px] border border-white/5 mb-10 shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-7 text-center text-[10px] text-white/30 font-black mb-8 tracking-widest">
          {t.daysShort.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-5">
          {emptyLead.map((slot) => (
            <div key={`pad-${slot}`} />
          ))}
          {cells.map(({ day, dateStr, checked, isToday: isTodayCell }) => (
            <div key={dateStr} className="flex justify-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all
                  ${checked ? 'bg-[#3A7BD5] text-white shadow-xl shadow-blue-500/20' : isTodayCell ? 'border-2 border-[#3A7BD5] text-[#3A7BD5]' : 'text-white/60 hover:bg-white/5'}`}
              >
                {checked ? <CheckCircle2 size={18} /> : day}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-lg font-bold text-white/50 mb-10 px-4 leading-snug">
        {t.keptItUp} <span className="text-white font-black text-xl">{successCountThisMonth}</span> {t.morningsThisMonth}
      </p>

      <div className="rounded-[32px] overflow-hidden aspect-video shadow-2xl relative border border-white/5">
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600"
          alt="Landscape"
          className="w-full h-full object-cover grayscale opacity-40"
        />
      </div>
    </div>
  );
});

const SettingsView = memo(function SettingsView({ t, state, updateSettings }) {
  const [isSaved, setIsSaved] = useState(false);

  const uiLang = coerceLanguage(state.language);

  useEffect(() => {
    if (!isSaved) return undefined;
    const id = window.setTimeout(() => setIsSaved(false), 2000);
    return () => window.clearTimeout(id);
  }, [isSaved]);

  const handleSave = useCallback(() => setIsSaved(true), []);

  const toggleCompassionate = useCallback(() => {
    updateSettings((prev) => ({ compassionateMode: !prev.compassionateMode }));
  }, [updateSettings]);

  const toggleNudge = useCallback(() => {
    updateSettings((prev) => ({ nudgeEnabled: !prev.nudgeEnabled }));
  }, [updateSettings]);

  const selectEnglish = useCallback(() => {
    updateSettings({ language: 'en' });
  }, [updateSettings]);

  const selectKorean = useCallback(() => {
    updateSettings({ language: 'ko' });
  }, [updateSettings]);

  return (
    <div className="px-6 pt-10 pb-12 flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-xl font-black tracking-tight">{t.settings}</h1>
        <div
          role="radiogroup"
          aria-label={t.language}
          className="flex bg-white/5 p-1.5 rounded-xl border border-white/5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={uiLang === 'en'}
            onClick={selectEnglish}
            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${uiLang === 'en' ? 'bg-[#3A7BD5] text-white shadow-lg' : 'text-gray-500'}`}
          >
            EN
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={uiLang === 'ko'}
            onClick={selectKorean}
            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${uiLang === 'ko' ? 'bg-[#3A7BD5] text-white shadow-lg' : 'text-gray-500'}`}
          >
            KO
          </button>
        </div>
      </div>

      <section className="mb-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6 px-1">{t.yourChallenge}</h3>
        <div className="grid grid-cols-2 gap-5">
          <TimePicker
            label={t.currentTarget}
            value={state.currentTargetTime}
            onChange={(val) => updateSettings({ currentTargetTime: val })}
          />
          <TimePicker
            label={t.ultimateGoal}
            value={state.ultimateGoalTime}
            onChange={(val) => updateSettings({ ultimateGoalTime: val })}
          />
        </div>
        <p className="text-xs text-white/30 mt-6 px-2 leading-relaxed italic">{t.shiftMessage}</p>
      </section>

      <section className="mb-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6 px-1">{t.reminders}</h3>
        <div className="bg-white/5 p-7 rounded-[28px] border border-white/5 flex items-center justify-between shadow-sm">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5]">
              <Clock size={20} />
            </div>
            <div>
              <p className="font-black mb-1">{t.nudge}</p>
              <p className="text-[11px] text-white/30 max-w-[180px] leading-tight">{t.nudgeDesc}</p>
            </div>
          </div>
          <Toggle enabled={state.nudgeEnabled} onToggle={toggleNudge} />
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6 px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{t.streakRules}</h3>
          <ShieldCheck size={12} className="text-white/20" />
        </div>
        <div className="bg-white/5 p-7 rounded-[28px] border border-white/5 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div
              className={`p-3 rounded-2xl transition-colors ${state.compassionateMode ? 'bg-[#3A7BD5]/10 text-[#3A7BD5]' : 'bg-white/5 text-white/20'}`}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black">{t.compassionate}</span>
              </div>
              <p className="text-[11px] text-white/30 max-w-[180px] leading-tight">{t.compDesc}</p>
            </div>
          </div>
          <Toggle enabled={state.compassionateMode} onToggle={toggleCompassionate} />
        </div>
      </section>

      <button
        type="button"
        onClick={handleSave}
        className={`w-full py-6 font-black rounded-2xl shadow-2xl transition-all active:scale-[0.97] mt-auto flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#3A7BD5] text-white hover:bg-[#4A8BE5] shadow-blue-500/20'}`}
      >
        {isSaved ? (
          <>
            <CheckCircle2 size={18} />
            {t.saved}
          </>
        ) : (
          t.saveBtn
        )}
      </button>
    </div>
  );
});

const TimePicker = memo(function TimePicker({ label, value, onChange }) {
  const adjust = useCallback(
    (delta) => onChange(Math.max(0, Math.min(MINUTES_PER_DAY - 1, value + delta))),
    [value, onChange]
  );

  return (
    <div className="bg-white/5 p-6 rounded-[28px] border border-white/5 flex flex-col items-center gap-4 group hover:bg-white/[0.07] transition-all">
      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
      <button type="button" onClick={() => adjust(-15)} className="text-white/20 hover:text-[#3A7BD5] p-1 transition-colors">
        <ChevronRight size={24} className="-rotate-90" />
      </button>
      <div className="text-xl font-black tabular-nums py-1 text-[#98C1FF]">{formatTime(value)}</div>
      <button type="button" onClick={() => adjust(15)} className="text-white/20 hover:text-[#3A7BD5] p-1 transition-colors">
        <ChevronRight size={24} className="rotate-90" />
      </button>
    </div>
  );
});

const Toggle = memo(function Toggle({ enabled, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`w-14 h-7 rounded-full relative transition-all duration-500 ${enabled ? 'bg-[#3A7BD5] shadow-lg shadow-blue-500/30' : 'bg-gray-800'} ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}
    >
      <div
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-500 ${enabled ? 'translate-x-7' : ''}`}
      />
    </button>
  );
});
