import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Calendar as CalendarIcon, Settings as SettingsIcon, CheckCircle2, Flame, ChevronLeft, ChevronRight, ShieldCheck, Trophy, Share2, Target, TrendingUp } from 'lucide-react';

const T = {
  en: {
    today:"Today",calendar:"Calendar",settings:"Settings",challenge:"Challenge",
    todaysGoal:"Today's Goal",checkedIn:"Checked In ✓",awake:"I'm Awake ☀️",undoCheckIn:"Undo check-in",yesterdayCheckIn:"Miss yesterday? Check in →",
    daysStreak:"days",consistency:"Consistency is Key",routine:"Morning Routine",
    current:"Current",best:"Best",badges:"Badges Earned",dismiss:"See My Progress →",
    streak3:"3 Day Streak",streak7:"7 Day Streak",mastery14:"14 Day Mastery",
    keptItUp:"You've kept it up for",morningsThisMonth:"mornings this month.",
    yourChallenge:"Your Challenge",currentTarget:"Tomorrow's Goal",ultimateGoal:"Final Wake Goal",
    shiftMessage:"Morning Streak shifts your target 10 minutes earlier each successful day.",
    streakRules:"Streak Rules",compassionate:"Compassionate mode",compDesc:"Streaks never fully reset. Missing a day pauses, not breaks.",
    saveBtn:"Save My Challenge",saved:"Saved ✓",language:"Language",
    challengeTitle:"My Challenge",stepsCompleted:"steps completed",stepsRemaining:"steps remaining",
    tomorrowTarget:"Tomorrow's Target",wakeEarlier:"Wake 10 minutes earlier than today",
    motto:'"Each morning counts. You\'re getting there."',
    daysActive:"Days Active",timeShifted:"Time Shifted",streakLabel:"Streak",
    goalReached:"🎉 Goal Reached!",goalReachedDesc:"You've reached your target wake time!",
    onboardingTitle:"Good morning! 🌅",onboardingDesc:"Let's set up your wake-up challenge.",onboardingCurrent:"What time do you wake up now?",onboardingGoal:"What time do you want to wake up?",onboardingBtn:"Start My Challenge →",
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
    daysShort:["S","M","T","W","T","F","S"]
  },
  ko: {
    today:"오늘",calendar:"캘린더",settings:"설정",challenge:"챌린지",
    todaysGoal:"오늘의 목표",checkedIn:"체크인 완료 ✓",awake:"일어났어요 ☀️",undoCheckIn:"체크인 취소",yesterdayCheckIn:"어제 체크인 하기 →",
    daysStreak:"일 연속",consistency:"꾸준함이 핵심입니다",routine:"모닝 루틴",
    current:"현재",best:"최고",badges:"획득한 배지",dismiss:"진행상황 보기 →",
    streak3:"3일 스트릭",streak7:"7일 스트릭",mastery14:"14일 마스터",
    keptItUp:"이번 달에 총",morningsThisMonth:"번의 아침을 지켜냈어요.",
    yourChallenge:"나의 챌린지",currentTarget:"내일 목표",ultimateGoal:"최종 기상 목표",
    shiftMessage:"성공할 때마다 목표 기상 시간이 10분씩 자동으로 앞당겨집니다.",
    streakRules:"스트릭 규칙",compassionate:"컴패셔네이트 모드",compDesc:"스트릭이 완전히 초기화되지 않습니다. 하루를 놓쳐도 끊기지 않고 멈춥니다.",
    saveBtn:"나의 챌린지 저장하기",saved:"저장됨 ✓",language:"언어 설정",
    challengeTitle:"나의 챌린지",stepsCompleted:"단계 완료",stepsRemaining:"단계 남음",
    tomorrowTarget:"내일의 목표",wakeEarlier:"오늘보다 10분 일찍 일어나기",
    motto:'"매일 아침이 쌓입니다. 잘 하고 있어요."',
    daysActive:"활성 일수",timeShifted:"앞당긴 시간",streakLabel:"스트릭",
    goalReached:"🎉 목표 달성!",goalReachedDesc:"목표 기상 시간에 도달했습니다!",
    onboardingTitle:"좋은 아침이에요! 🌅",onboardingDesc:"기상 챌린지를 설정해볼게요.",onboardingCurrent:"지금 보통 몇 시에 일어나요?",onboardingGoal:"목표 기상 시간은 몇 시예요?",onboardingBtn:"챌린지 시작하기 →",
    months:["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
    daysShort:["일","월","화","수","목","금","토"]
  }
};

const KEY = 'ms_v3';
const SHIFT = 10;

function fmt(m) {
  const h = Math.floor(m/60), mn = m%60, ap = h>=12?'PM':'AM';
  return `${h%12||12}:${String(mn).padStart(2,'0')} ${ap}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monthLabel(t, lang, y, m) {
  return lang==='ko' ? `${y}년 ${t.months[m]}` : `${t.months[m]} ${y}`;
}
function loadState() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return { ...defaultState(), ...JSON.parse(s) };
  } catch {}
  return defaultState();
}
function defaultState() {
  return {
    streak:0, bestStreak:0,
    checkedDays:[],
    currentTargetTime:480, ultimateGoalTime:420, startingWakeTime:660,
    compassionateMode:true, lastShiftDate:null, language:'ko', onboarded:false
  };
}

export default function App() {
  const [tab, setTab] = useState('today');
  const [celebrate, setCelebrate] = useState(false);
  const [justChecked, setJustChecked] = useState(false);
  const [s, setS] = useState(loadState);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  const lang = s.language === 'ko' ? 'ko' : 'en';
  const t = T[lang];
  const today = todayStr();
  const checked = s.checkedDays.includes(today);

  const checkIn = useCallback(() => {
    if (s.checkedDays.includes(today)) return;
    const yesterday = yesterdayStr();
    const last = s.checkedDays.at(-1);
    const streak = (last === yesterday || s.compassionateMode) ? s.streak + 1 : 1;
    const nextTarget = s.currentTargetTime > s.ultimateGoalTime
      ? Math.max(s.ultimateGoalTime, s.currentTargetTime - SHIFT)
      : s.currentTargetTime;
    setS(prev => ({
      ...prev,
      checkedDays: [...prev.checkedDays, today],
      streak, bestStreak: Math.max(streak, prev.bestStreak),
      currentTargetTime: nextTarget, lastShiftDate: today
    }));
    setJustChecked(true);
    setTimeout(() => setJustChecked(false), 3000);
  }, [s, today]);

  const undoCheckIn = useCallback(() => {
    if (!s.checkedDays.includes(today)) return;
    setS(prev => ({
      ...prev,
      checkedDays: prev.checkedDays.filter(d => d !== today),
      streak: Math.max(0, prev.streak - 1),
      currentTargetTime: Math.min(prev.currentTargetTime + SHIFT, prev.startingWakeTime),
      lastShiftDate: null
    }));
    setCelebrate(false);
    setJustChecked(false);
  }, [s, today]);

  const yesterday = yesterdayStr();
  const canCheckYesterday = !s.checkedDays.includes(yesterday);

  const checkInYesterday = useCallback(() => {
    if (!canCheckYesterday) return;
    setS(prev => ({
      ...prev,
      checkedDays: [...prev.checkedDays, yesterday].sort(),
      streak: prev.streak + 1,
      bestStreak: Math.max(prev.streak + 1, prev.bestStreak),
      currentTargetTime: prev.currentTargetTime > prev.ultimateGoalTime
        ? Math.max(prev.ultimateGoalTime, prev.currentTargetTime - SHIFT)
        : prev.currentTargetTime,
      lastShiftDate: yesterday
    }));
  }, [canCheckYesterday, yesterday]);

  const update = useCallback((patch) => {
    setS(prev => {
      const d = typeof patch === 'function' ? patch(prev) : patch;
      return { ...prev, ...d };
    });
  }, []);

  const finishOnboarding = useCallback((currentTime, goalTime) => {
    setS(prev => ({
      ...prev,
      currentTargetTime: currentTime,
      ultimateGoalTime: goalTime,
      startingWakeTime: currentTime,
      onboarded: true
    }));
  }, []);

  const content = () => {
    if (!s.onboarded) return <Onboarding t={t} lang={lang} onDone={finishOnboarding} onLangChange={l=>update({language:l})}/>;
    if (celebrate) return <Celebration t={t} lang={lang} s={s} onClose={() => { setCelebrate(false); setTab('challenge'); }}/>;
    if (tab==='calendar') return <Cal t={t} lang={lang} s={s}/>;
    if (tab==='challenge') return <Challenge t={t} lang={lang} s={s}/>;
    if (tab==='settings') return <Sett t={t} lang={lang} s={s} update={update}/>;
    return <Home t={t} s={s} onCheckIn={checkIn} onUndo={undoCheckIn} checked={checked} justChecked={justChecked} canCheckYesterday={canCheckYesterday} onCheckYesterday={checkInYesterday} onGoToSettings={()=>setTab('settings')}/>;
  };

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, bottom:0,
      background:'#0F172A', display:'flex', justifyContent:'center'
    }}>
      <div style={{
        width:'100%', maxWidth:'430px', height:'100%',
        background:'#1A1A2E', color:'white',
        display:'flex', flexDirection:'column', overflow:'hidden'
      }}>
        {/* 스크롤 콘텐츠 */}
        <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch' }}>
          {content()}
        </div>

        {/* 하단 네비 — flex item, 절대 밀리지 않음 */}
        {!celebrate && s.onboarded && (
          <div style={{
            flexShrink:0, background:'#1A1A2E',
            borderTop:'1px solid rgba(255,255,255,0.08)',
            display:'flex', justifyContent:'space-around', alignItems:'center',
            paddingTop:10, paddingBottom:16, paddingLeft:8, paddingRight:8
          }}>
            <NB label={t.today} icon={<CheckCircle2 size={22}/>} active={tab==='today'} onClick={()=>setTab('today')}/>
            <NB label={t.calendar} icon={<CalendarIcon size={22}/>} active={tab==='calendar'} onClick={()=>setTab('calendar')}/>
            <NB label={t.challenge} icon={<TrendingUp size={22}/>} active={tab==='challenge'} onClick={()=>setTab('challenge')}/>
            <NB label={t.settings} icon={<SettingsIcon size={22}/>} active={tab==='settings'} onClick={()=>setTab('settings')}/>
          </div>
        )}
      </div>
    </div>
  );
}

const CONFETTI_EMOJIS = ['🎉','⭐','✨','🌟','💫','🎊','☀️','🌅'];

const Confetti = memo(() => {
  const particles = useMemo(() => Array.from({length: 18}, (_, i) => ({
    id: i,
    emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
    x: 10 + Math.random() * 80,
    delay: Math.random() * 0.6,
    duration: 1.5 + Math.random() * 1.0,
    size: 22 + Math.floor(Math.random() * 22),
  })), []);

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, bottom:0,
      pointerEvents:'none', zIndex:9999, overflow:'hidden'
    }}>
      <style>{`
        @keyframes rise {
          0%   { transform: translateY(0) scale(0.4) rotate(0deg); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateY(-110vh) scale(1.3) rotate(40deg); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left: `${p.x}%`,
          bottom: '10%',
          fontSize: p.size,
          animation: `rise ${p.duration}s cubic-bezier(0.2, 0.8, 0.4, 1) ${p.delay}s forwards`,
        }}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
});


const NB = memo(({label,icon,active,onClick}) => (
  <button type="button" onClick={onClick} style={{
    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
    background:'none', border:'none', cursor:'pointer',
    color: active ? '#3A7BD5' : '#6b7280',
    transform: active ? 'scale(1.1)' : 'scale(1)',
    transition:'all 0.2s', padding:'4px 8px'
  }}>
    {icon}
    <span style={{fontSize:9, fontWeight:700}}>{label}</span>
  </button>
));

const Home = memo(({t,s,onCheckIn,onUndo,checked,justChecked,canCheckYesterday,onCheckYesterday,onGoToSettings}) => (
  <div className="px-8 pt-16 pb-8 flex flex-col items-center">
    {justChecked && <Confetti/>}
    {checked ? (
      <div className="w-full mb-10 bg-[#3A7BD5]/10 rounded-[28px] border border-[#3A7BD5]/40 p-6 flex flex-col items-center gap-3">
        <p className="text-sm font-black uppercase tracking-widest text-[#3A7BD5]">{t.tomorrowGoalPrompt}</p>
        <p className="text-[#98C1FF] font-black text-4xl">{fmt(s.currentTargetTime)}</p>
        <p className="text-base text-white font-bold text-center leading-snug">{t.tomorrowGoalDesc}</p>
        <button type="button" onClick={onGoToSettings}
          className="mt-2 px-6 py-3 bg-[#3A7BD5] text-white text-sm font-black rounded-full transition-all active:scale-95 shadow-lg">
          {t.tomorrowGoalBtn}
        </button>
      </div>
    ) : (
      <h2 className="text-xl font-bold mb-14 text-white/90 tracking-tight">
        {t.todaysGoal}: <span className="text-[#98C1FF]">{fmt(s.currentTargetTime)}</span>
      </h2>
    )}
    <div className="relative mb-6">
      {!checked && <div className="absolute inset-0 bg-[#3A7BD5] rounded-full blur-[40px] opacity-20 animate-pulse"/>}
      <button type="button" onClick={onCheckIn} disabled={checked}
        className={`w-52 h-52 rounded-full flex items-center justify-center transition-all duration-500 z-10 relative
          ${checked ? 'bg-[#3A7BD5]/20 border-2 border-[#3A7BD5]/40'
          : 'bg-gradient-to-br from-[#98C1FF] to-[#3A7BD5] hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(58,123,213,0.4)]'}`}>
        <span className={`${checked?'text-[#3A7BD5]':'text-[#1A1A2E]'} font-black text-xl tracking-tight`}>
          {checked ? t.checkedIn : t.awake}
        </span>
      </button>
    </div>
    {checked && (
      <button type="button" onClick={onUndo}
        className="mb-8 px-5 py-2 rounded-full border border-white/10 text-white/70 text-xs font-bold hover:border-red-500/40 hover:text-red-400 transition-all">
        {t.undoCheckIn}
      </button>
    )}
    {!checked && <div className="mb-8"/>}
    <div className="flex items-center gap-3 mb-14 bg-white/5 px-6 py-3 rounded-full border border-white/5">
      <Flame className="text-[#F5A623]" size={32} fill="#F5A623"/>
      <span className="text-3xl font-black italic">{s.streak} <span className="text-lg not-italic font-bold text-white/85 ml-1">{t.daysStreak}</span></span>
    </div>
    <div className="w-full rounded-[32px] overflow-hidden shadow-2xl aspect-[4/3] relative border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent z-10 opacity-80"/>
      <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600" alt="Sunrise" className="w-full h-full object-cover"/>
      <p className="absolute bottom-6 left-0 right-0 text-center z-20 text-white/85 uppercase tracking-[0.3em] text-[10px] font-black">{t.consistency}</p>
    </div>
  </div>
));

const Celebration = memo(({t,lang,s,onClose}) => {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const fd = new Date(y,m,1).getDay(), dim = new Date(y,m+1,0).getDate();
  const today = todayStr();
  const cset = useMemo(()=>new Set(s.checkedDays),[s.checkedDays]);
  return (
    <div className="px-6 pt-10 pb-12 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft size={24}/></button>
        <h1 className="text-lg font-black tracking-tighter uppercase opacity-90">{t.routine}</h1>
        <button type="button" className="p-2 hover:bg-white/5 rounded-full"><Share2 size={24}/></button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[{icon:<Flame size={24} className="text-[#F5A623]" fill="#F5A623"/>,val:s.streak,lbl:t.current},
          {icon:<Trophy size={24} className="text-[#3A7BD5]"/>,val:s.bestStreak,lbl:t.best}].map((x,i)=>(
          <div key={i} className="bg-white/5 p-6 rounded-[24px] border border-white/5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">{x.icon}<span className="text-2xl font-black">{x.val}</span></div>
            <span className="text-[10px] text-white/75 font-bold">{t.daysStreak}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/75 font-bold mt-0.5">{x.lbl}</span>
          </div>
        ))}
      </div>
      <div className="mb-8">
        <h2 className="text-2xl font-black mb-5 tracking-tighter">{monthLabel(t,lang,y,m)}</h2>
        <div className="grid grid-cols-7 text-center text-[10px] text-white/70 font-black mb-3 tracking-widest">
          {t.daysShort.map((d,i)=><span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-3">
          {Array.from({length:fd}).map((_,i)=><div key={`p${i}`}/>)}
          {Array.from({length:dim},(_,i)=>{
            const day=i+1, ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const ck=cset.has(ds), it=ds===today;
            return <div key={ds} className="flex justify-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black
                ${ck?'bg-[#3A7BD5] text-white':it?'border-2 border-[#F5A623] text-[#F5A623]':'text-white/25'}`}>
                {ck?<CheckCircle2 size={16}/>:day}
              </div>
            </div>;
          })}
        </div>
      </div>
      <div className="mb-8">
        <h3 className="text-xl font-black mb-5">{t.badges}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[[3,t.streak3],[7,t.streak7],[14,t.mastery14]].map(([d,l])=>(
            <div key={d} className={`min-w-[120px] p-5 rounded-[20px] flex flex-col items-center gap-3 ${s.streak>=d?'bg-white/5 border border-white/10':'opacity-20 grayscale bg-black/20'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.streak>=d?'bg-[#3A7BD5]/20 text-[#3A7BD5]':'bg-gray-800'}`}>
                <div className="border-2 border-current rounded-md w-6 h-6 flex items-center justify-center text-[10px] font-black">{d}</div>
              </div>
              <span className="text-[10px] font-black text-center uppercase">{l}</span>
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={onClose} className="w-full py-5 bg-[#3A7BD5] text-white font-black rounded-2xl uppercase tracking-widest text-xs">
        {t.dismiss}
      </button>
    </div>
  );
});

const Cal = memo(({t,lang,s}) => {
  const now = new Date();
  const today = todayStr();
  const MIN_YEAR = 2026, MIN_MONTH = 0;

  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());

  const cset = useMemo(()=>new Set(s.checkedDays),[s.checkedDays]);
  const prefix = `${viewY}-${String(viewM+1).padStart(2,'0')}`;
  const cnt = s.checkedDays.filter(d=>d.startsWith(prefix)).length;
  const fd = new Date(viewY,viewM,1).getDay();
  const dim = new Date(viewY,viewM+1,0).getDate();

  const isMinMonth = viewY === MIN_YEAR && viewM === MIN_MONTH;
  const isMaxMonth = viewY === now.getFullYear() && viewM === now.getMonth();

  const goPrev = () => {
    if (isMinMonth) return;
    if (viewM === 0) { setViewY(y=>y-1); setViewM(11); }
    else setViewM(m=>m-1);
  };
  const goNext = () => {
    if (isMaxMonth) return;
    if (viewM === 11) { setViewY(y=>y+1); setViewM(0); }
    else setViewM(m=>m+1);
  };

  return (
    <div className="px-6 pt-10 pb-12">
      <div className="mb-6 opacity-90"><h1 className="text-lg font-black tracking-tighter uppercase">{t.routine}</h1></div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[{icon:<Flame size={20} className="text-[#F5A623]" fill="#F5A623"/>,val:s.streak,lbl:t.current},
          {icon:<Trophy size={20} className="text-[#3A7BD5]"/>,val:s.bestStreak,lbl:t.best}].map((x,i)=>(
          <div key={i} className="bg-white/5 p-5 rounded-[20px] border border-white/5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">{x.icon}<span className="text-xl font-black">{x.val}</span></div>
            <span className="text-[9px] uppercase tracking-widest text-white/75 font-bold">{x.lbl}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={goPrev}
          className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all"
          style={{opacity: isMinMonth ? 0.2 : 1, pointerEvents: isMinMonth ? 'none' : 'auto'}}>
          <ChevronLeft size={20}/>
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tighter">{monthLabel(t,lang,viewY,viewM)}</h2>
          {!isMaxMonth && (
            <button type="button" onClick={()=>{setViewY(now.getFullYear()); setViewM(now.getMonth());}}
              className="text-[10px] text-[#3A7BD5] font-bold mt-1">
              {lang==='ko' ? '오늘로 이동 →' : 'Go to today →'}
            </button>
          )}
        </div>
        <button type="button" onClick={goNext}
          className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all"
          style={{opacity: isMaxMonth ? 0.2 : 1, pointerEvents: isMaxMonth ? 'none' : 'auto'}}>
          <ChevronRight size={20}/>
        </button>
      </div>

      <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 mb-8">
        <div className="grid grid-cols-7 text-center text-[10px] text-white/70 font-black mb-5 tracking-widest">
          {t.daysShort.map((d,i)=><span key={i}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-4">
          {Array.from({length:fd}).map((_,i)=><div key={`p${i}`}/>)}
          {Array.from({length:dim},(_,i)=>{
            const day=i+1, ds=`${viewY}-${String(viewM+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const ck=cset.has(ds), it=ds===today, isFuture=ds>today;
            return <div key={ds} className="flex justify-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black
                ${ck?'bg-[#3A7BD5] text-white':it?'border-2 border-[#3A7BD5] text-[#3A7BD5]':isFuture?'text-white/50':'text-white/85'}`}>
                {ck?<CheckCircle2 size={17}/>:day}
              </div>
            </div>;
          })}
        </div>
      </div>

      <p className="text-center text-lg font-bold text-white/80 mb-8 px-4">
        {t.keptItUp} <span className="text-white font-black text-xl">{cnt}</span> {t.morningsThisMonth}
      </p>
      <div className="rounded-[32px] overflow-hidden aspect-video border border-white/5">
        <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600" alt="Landscape" className="w-full h-full object-cover grayscale opacity-40"/>
      </div>
    </div>
  );
});
const Challenge = memo(({t,lang,s}) => {
  const {currentTargetTime:cur,ultimateGoalTime:goal,startingWakeTime:start,streak,checkedDays} = s;
  const total=Math.round((start-goal)/SHIFT), done=Math.round((start-cur)/SHIFT);
  const rem=Math.max(0,total-done), pct=total>0?Math.min(1,done/total):1;
  const reached=cur<=goal, nextT=reached?goal:cur-SHIFT;
  return (
    <div className="px-6 pt-10 pb-12">
      <div className="mb-8 opacity-90"><h1 className="text-lg font-black tracking-tighter uppercase">{t.challengeTitle}</h1></div>
      <div className="mb-10">
        <div className="flex justify-between text-sm font-black mb-3">
          <span className="text-white/75">{fmt(start)}</span>
          <span className="text-[#F5A623] text-base">{fmt(cur)}</span>
          <span className="text-white/75">{fmt(goal)}</span>
        </div>
        <div className="relative h-3 bg-white/10 rounded-full mb-4">
          <div className="h-full bg-gradient-to-r from-[#F5A623] to-[#3A7BD5] rounded-full transition-all duration-700" style={{width:`${pct*100}%`}}/>
          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F5A623] rounded-full border-2 border-[#1A1A2E] shadow-lg transition-all duration-700" style={{left:`calc(${pct*100}% - 10px)`}}/>
        </div>
        <p className="text-center text-sm text-white/75 font-bold">{done} {t.stepsCompleted} · {rem} {t.stepsRemaining}</p>
      </div>
      {reached ? (
        <div className="bg-[#3A7BD5]/20 p-7 rounded-[28px] border border-[#3A7BD5]/30 mb-8 text-center">
          <p className="text-3xl font-black mb-2">{t.goalReached}</p>
          <p className="text-white/85 text-sm">{t.goalReachedDesc}</p>
        </div>
      ) : (
        <div className="bg-white/5 p-7 rounded-[28px] border border-white/5 mb-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-10"><Target size={48}/></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-3">{t.tomorrowTarget}</p>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-black text-[#98C1FF]">{fmt(nextT)}</span>
            <span className="text-sm text-white/75 font-bold">-10 min</span>
          </div>
          <p className="text-sm text-white/80 mb-3">{t.wakeEarlier}</p>
          <p className="text-xs text-white/70 italic">{t.motto}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[{l:t.daysActive,v:checkedDays.length,u:''},{l:t.timeShifted,v:done*SHIFT,u:' min'},{l:t.streakLabel,v:streak,u:''}].map(({l,v,u})=>(
          <div key={l} className="bg-white/5 p-4 rounded-[20px] border border-white/5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/70 font-black mb-2">{l}</p>
            <p className="text-xl font-black">{v}<span className="text-xs text-white/75">{u}</span></p>
          </div>
        ))}
      </div>
      <div className="bg-white/5 p-5 rounded-[20px] border border-white/5 flex gap-4 items-center">
        <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5] shrink-0"><TrendingUp size={20}/></div>
        <p className="text-xs text-white/75 leading-relaxed">
          {lang==='ko' ? `꾸준함이 핵심입니다. ${checkedDays.length}일 동안 리듬을 유지했어요.`
            : `Consistent progress is key. You've adjusted your rhythm for ${checkedDays.length} days.`}
        </p>
      </div>
    </div>
  );
});

const Sett = memo(({t,lang,s,update}) => {
  const [saved,setSaved]=useState(false);
  useEffect(()=>{ if(!saved)return; const id=setTimeout(()=>setSaved(false),2000); return()=>clearTimeout(id); },[saved]);
  const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,v));
  return (
    <div className="px-6 pt-10 pb-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-xl font-black">{t.settings}</h1>
        <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
          {['en','ko'].map(l=>(
            <button key={l} type="button" onClick={()=>update({language:l})}
              className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang===l?'bg-[#3A7BD5] text-white':'text-white/50'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <section className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-5">{t.yourChallenge}</h3>
        <div className="grid grid-cols-2 gap-4">
          <TP label={t.currentTarget} value={s.currentTargetTime} onChange={v=>update(prev=>({currentTargetTime:clamp(v,prev.ultimateGoalTime+SHIFT,1439), startingWakeTime:clamp(v,prev.ultimateGoalTime+SHIFT,1439)}))} />
          <TP label={t.ultimateGoal} value={s.ultimateGoalTime} onChange={v=>update(prev=>({ultimateGoalTime:clamp(v,0,prev.currentTargetTime-SHIFT)}))} />
        </div>
        <p className="text-xs text-white/70 mt-5 px-2 italic">{t.shiftMessage}</p>
      </section>

      <section className="mb-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-5">{t.streakRules}</h3>
        <div className="bg-white/5 p-6 rounded-[28px] border border-[#3A7BD5]/20 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5]"><ShieldCheck size={20}/></div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black">{t.compassionate}</span>

              </div>
              <p className="text-[11px] text-white/70 max-w-[180px]">{t.compDesc}</p>
            </div>
          </div>
          <Tog enabled={s.compassionateMode} onToggle={()=>update(prev=>({compassionateMode:!prev.compassionateMode}))}/>
        </div>
      </section>
      <button type="button" onClick={()=>setSaved(true)}
        className={`w-full py-6 font-black rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs
          ${saved?'bg-emerald-500 text-white':'bg-[#3A7BD5] text-white'}`}>
        {saved?<><CheckCircle2 size={18}/>{t.saved}</>:t.saveBtn}
      </button>
    </div>
  );
});

const TP = memo(({label,value,onChange}) => (
  <div className="bg-white/5 p-5 rounded-[28px] border border-white/5 flex flex-col items-center gap-2">
    <span style={{height:32, display:'flex', alignItems:'center', textAlign:'center'}}
      className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-tight px-1">
      {label}
    </span>
    <button type="button" onClick={()=>onChange(value+SHIFT)} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronRight size={22} className="-rotate-90"/></button>
    <div className="text-xl font-black text-[#98C1FF]">{fmt(value)}</div>
    <button type="button" onClick={()=>onChange(value-SHIFT)} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronRight size={22} className="rotate-90"/></button>
  </div>
));

const Onboarding = memo(({t, lang, onDone, onLangChange}) => {
  const [currentTime, setCurrentTime] = useState(660);
  const [goalTime, setGoalTime] = useState(420);
  const clamp = (v,mn,mx) => Math.max(mn, Math.min(mx, v));

  return (
    <div className="px-8 pt-12 pb-12 flex flex-col items-center min-h-full">
      {/* 언어 토글 — 우측 상단 */}
      <div className="w-full flex justify-end mb-8">
        <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
          {['ko','en'].map(l => (
            <button key={l} type="button" onClick={()=>onLangChange(l)}
              className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all
                ${lang===l ? 'bg-[#3A7BD5] text-white shadow-lg' : 'text-white/50'}`}>
              {l === 'ko' ? 'KOR' : 'ENG'}
            </button>
          ))}
        </div>
      </div>

      <div className="text-5xl mb-6">🌅</div>
      <h1 className="text-2xl font-black text-center mb-3 tracking-tight">{t.onboardingTitle}</h1>
      <p className="text-sm text-white/80 text-center mb-12 leading-relaxed">{t.onboardingDesc}</p>

      <div className="w-full grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white/5 p-5 rounded-[28px] border border-white/5 flex flex-col items-center gap-2">
          <span style={{height:36, display:'flex', alignItems:'center', textAlign:'center'}}
            className="text-[10px] font-black uppercase tracking-widest text-white/75 leading-tight px-1">
            {t.onboardingCurrent}
          </span>
          <button type="button" onClick={()=>setCurrentTime(v=>clamp(v+10, goalTime+10, 1439))}
            className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronRight size={22} className="-rotate-90"/></button>
          <div className="text-xl font-black text-[#98C1FF]">{fmt(currentTime)}</div>
          <button type="button" onClick={()=>setCurrentTime(v=>clamp(v-10, goalTime+10, 1439))}
            className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronRight size={22} className="rotate-90"/></button>
        </div>
        <div className="bg-white/5 p-5 rounded-[28px] border border-[#3A7BD5]/20 flex flex-col items-center gap-2">
          <span style={{height:36, display:'flex', alignItems:'center', textAlign:'center'}}
            className="text-[10px] font-black uppercase tracking-widest text-white/75 leading-tight px-1">
            {t.onboardingGoal}
          </span>
          <button type="button" onClick={()=>setGoalTime(v=>clamp(v+10, 0, currentTime-10))}
            className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronRight size={22} className="-rotate-90"/></button>
          <div className="text-xl font-black text-[#F5A623]">{fmt(goalTime)}</div>
          <button type="button" onClick={()=>setGoalTime(v=>clamp(v-10, 0, currentTime-10))}
            className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronRight size={22} className="rotate-90"/></button>
        </div>
      </div>

      <div className="w-full bg-white/5 p-4 rounded-2xl border border-white/5 mb-10 text-center">
        <p className="text-xs text-white/75 leading-relaxed">
          {lang==='ko'
            ? `${fmt(currentTime)}에서 ${fmt(goalTime)}까지 — 매일 10분씩 앞당겨요`
            : `${fmt(currentTime)} → ${fmt(goalTime)} — shifting 10 min earlier each day`}
        </p>
      </div>

      <button type="button" onClick={()=>onDone(currentTime, goalTime)}
        className="w-full py-5 bg-[#3A7BD5] text-white font-black rounded-2xl uppercase tracking-widest text-sm">
        {t.onboardingBtn}
      </button>
    </div>
  );
});


const Tog = memo(({enabled,onToggle,disabled}) => (
  <button type="button" onClick={onToggle} disabled={disabled}
    style={{
      width:56, height:28, borderRadius:14, border:'none', cursor:disabled?'not-allowed':'pointer',
      background:enabled?'#3A7BD5':'#374151', position:'relative', transition:'background 0.3s',
      opacity:disabled?0.5:1, flexShrink:0
    }}>
    <div style={{
      position:'absolute', top:3, left:3, width:22, height:22,
      borderRadius:'50%', background:'white',
      transform:enabled?'translateX(28px)':'translateX(0)',
      transition:'transform 0.3s'
    }}/>
  </button>
));
