import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Calendar as CalendarIcon, Settings as SettingsIcon, CheckCircle2, Flame, ChevronLeft, ChevronRight, ShieldCheck, Trophy, TrendingUp, Target } from 'lucide-react';

// ── 번역 ──────────────────────────────────────────────────────────────────────
const T = {
  en: {
    today:"Today", calendar:"Calendar", settings:"Settings", challenge:"Challenge",
    todaysGoal:"Today's Goal", checkedIn:"Checked In ✓", awake:"I'm Awake ☀️",
    lateCheckIn:"I Woke Up Late 🌙", lateCheckedIn:"Logged (Late) ◐",
    undoCheckIn:"Undo check-in", undoLateCheckIn:"Undo late log", lateEncouragement:"Showing up even late? That's amazing. 👍",
    daysStreak:"days", consistency:"Consistency is Key", routine:"Morning Routine",
    current:"Current", best:"Best",
    keptItUp:"You've kept it up for", morningsThisMonth:"mornings this month.",
    yourChallenge:"Your Challenge", currentTarget:"Tomorrow's Goal", ultimateGoal:"Final Wake Goal",
    shiftMessage:"Morning Streak shifts your target 10 minutes earlier each successful day.",
    streakRules:"Streak Rules", compassionate:"Streak Protection Mode",
    compDesc:"Even if you miss a day, your progress is saved. Pick up right where you left off.",
    saveBtn:"Save My Challenge", saved:"Saved ✓", language:"Language",
    challengeTitle:"My Challenge", stepsCompleted:"steps completed", stepsRemaining:"steps remaining",
    tomorrowTarget:"Tomorrow's Target", wakeEarlier:"Wake 10 minutes earlier than today",
    motto:'"Each morning counts. You\'re getting there."',
    daysActive:"Days Active", timeShifted:"Time Shifted", streakLabel:"Streak",
    goalReached:"🎉 Goal Reached!", goalReachedDesc:"You've reached your target wake time!",
    tomorrowGoalPrompt:"Tomorrow's Goal", tomorrowGoalDesc:"Adjust tomorrow's wake time in Settings",
    tomorrowGoalBtn:"Go to Settings →",
    onboardingTitle:"Good morning! 🌅", onboardingDesc:"Let's set up your wake-up challenge.",
    onboardingCurrent:"What time do you usually wake up?", onboardingGoal:"What's your goal wake time?",
    onboardingBtn:"Start My Challenge →",
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
    daysShort:["S","M","T","W","T","F","S"]
  },
  ko: {
    today:"오늘", calendar:"캘린더", settings:"설정", challenge:"챌린지",
    todaysGoal:"오늘의 목표", checkedIn:"체크인 완료 ✓", awake:"일어났어요 ☀️",
    lateCheckIn:"늦게 일어났어요 🌙", lateCheckedIn:"기록됨 (늦잠) ◐",
    undoCheckIn:"체크인 취소", undoLateCheckIn:"늦잠 기록 취소", lateEncouragement:"늦잠도 기록하러 온 당신 멋져요 👍",
    daysStreak:"일 연속", consistency:"꾸준함이 핵심입니다", routine:"모닝 루틴",
    current:"현재", best:"최고",
    keptItUp:"이번 달에 총", morningsThisMonth:"번의 아침을 지켜냈어요.",
    yourChallenge:"나의 챌린지", currentTarget:"내일 목표", ultimateGoal:"최종 기상 목표",
    shiftMessage:"성공할 때마다 목표 기상 시간이 10분씩 자동으로 앞당겨집니다.",
    streakRules:"스트릭 규칙", compassionate:"연속 기록 보호 모드",
    compDesc:"하루를 빠져도 기록이 사라지지 않아요. 다음 날 바로 이어서 시작할 수 있어요.",
    saveBtn:"나의 챌린지 저장하기", saved:"저장됨 ✓", language:"언어 설정",
    challengeTitle:"나의 챌린지", stepsCompleted:"단계 완료", stepsRemaining:"단계 남음",
    tomorrowTarget:"내일의 목표", wakeEarlier:"오늘보다 10분 일찍 일어나기",
    motto:'"매일 아침이 쌓입니다. 잘 하고 있어요."',
    daysActive:"활성 일수", timeShifted:"앞당긴 시간", streakLabel:"스트릭",
    goalReached:"🎉 목표 달성!", goalReachedDesc:"목표 기상 시간에 도달했습니다!",
    tomorrowGoalPrompt:"내일의 목표", tomorrowGoalDesc:"설정에서 내일 기상 목표를 조정해보세요",
    tomorrowGoalBtn:"설정으로 가기 →",
    onboardingTitle:"좋은 아침이에요! 🌅", onboardingDesc:"기상 챌린지를 설정해볼게요.",
    onboardingCurrent:"지금 보통 몇 시에 일어나요?", onboardingGoal:"목표 기상 시간은 몇 시예요?",
    onboardingBtn:"챌린지 시작하기 →",
    months:["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
    daysShort:["일","월","화","수","목","금","토"]
  }
};

// ── 상수 & 유틸 ───────────────────────────────────────────────────────────────
const KEY = 'ms_v6';
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
function getNowMinutes() {
  const n = new Date(); return n.getHours()*60 + n.getMinutes();
}
function monthLabel(t, lang, y, m) {
  return lang==='ko' ? `${y}년 ${t.months[m]}` : `${t.months[m]} ${y}`;
}
function defaultState() {
  return {
    streak:0, bestStreak:0, checkedDays:[], lateCheckedDays:[],
    currentTargetTime:480, ultimateGoalTime:420, startingWakeTime:480,
    compassionateMode:true, language:'ko', onboarded:false, lastShiftDate:null
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    }
  } catch {}
  return defaultState();
}

// ── 폭죽 ─────────────────────────────────────────────────────────────────────
const EMOJIS = ['🎉','⭐','✨','🌟','💫','🎊','☀️','🌅'];
const Confetti = memo(() => {
  const pts = useMemo(() => Array.from({length:18},(_,i)=>({
    id:i, emoji:EMOJIS[i%EMOJIS.length],
    x:10+Math.random()*80, delay:Math.random()*0.6,
    dur:1.5+Math.random(), size:22+Math.floor(Math.random()*22)
  })),[]);
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,pointerEvents:'none',zIndex:9999,overflow:'hidden'}}>
      <style>{`@keyframes rise{0%{transform:translateY(0) scale(0.4);opacity:1}70%{opacity:1}100%{transform:translateY(-110vh) scale(1.3);opacity:0}}`}</style>
      {pts.map(p=>(
        <div key={p.id} style={{position:'absolute',left:`${p.x}%`,bottom:'10%',fontSize:p.size,animation:`rise ${p.dur}s cubic-bezier(0.2,0.8,0.4,1) ${p.delay}s forwards`}}>
          {p.emoji}
        </div>
      ))}
    </div>
  );
});

// ── 엄지척 격려 효과 ─────────────────────────────────────────────────────────
const ThumbsUp = memo(({message}) => {
  const pts = useMemo(() => Array.from({length:8},(_,i)=>({
    id:i, x:15+Math.random()*70,
    delay:Math.random()*0.4,
    dur:1.8+Math.random()*0.8,
    size:24+Math.floor(Math.random()*20)
  })),[]);
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,pointerEvents:'none',zIndex:9999,overflow:'hidden',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
      <style>{`
        @keyframes thumbrise{0%{transform:translateY(0) scale(0.3);opacity:1}60%{opacity:1}100%{transform:translateY(-110vh) scale(1.4);opacity:0}}
        @keyframes fadeinup{0%{transform:translateY(30px);opacity:0}20%{transform:translateY(0);opacity:1}80%{opacity:1}100%{opacity:0}}
      `}</style>
      {pts.map(p=>(
        <div key={p.id} style={{position:'absolute',left:`${p.x}%`,bottom:'15%',fontSize:p.size,animation:`thumbrise ${p.dur}s cubic-bezier(0.2,0.8,0.4,1) ${p.delay}s forwards`}}>
          👍
        </div>
      ))}
      <div style={{position:'absolute',bottom:'12%',left:0,right:0,textAlign:'center',animation:'fadeinup 3.5s ease forwards',padding:'0 32px'}}>
        <div style={{background:'rgba(245,166,35,0.15)',border:'1.5px solid rgba(245,166,35,0.4)',borderRadius:20,padding:'14px 24px',display:'inline-block',backdropFilter:'blur(8px)'}}>
          <p style={{color:'#F5A623',fontWeight:900,fontSize:15,margin:0,lineHeight:1.5}}>{message}</p>
        </div>
      </div>
    </div>
  );
});

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('today');
  const [justChecked, setJustChecked] = useState(false);
  const [justLate, setJustLate] = useState(false);
  const [s, setS] = useState(loadState);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  const lang = s.language === 'ko' ? 'ko' : 'en';
  const t = T[lang];
  const TODAY = todayStr();
  const YESTERDAY = yesterdayStr();

  const checked = s.checkedDays.includes(TODAY);
  const lateChecked = (s.lateCheckedDays||[]).includes(TODAY);
  const nowMin = getNowMinutes();
  const tooLate = !checked && !lateChecked && nowMin > s.currentTargetTime;


  const flash = useCallback((isLate=false) => {
    if (isLate) {
      setJustLate(true);
      setTimeout(() => setJustLate(false), 3500);
    } else {
      setJustChecked(true);
      setTimeout(() => setJustChecked(false), 3000);
    }
  }, []);

  const checkIn = useCallback(() => {
    if (checked) return;
    const last = s.checkedDays.at(-1);
    const streak = (last === YESTERDAY || s.compassionateMode) ? s.streak+1 : 1;
    const nextTarget = s.currentTargetTime > s.ultimateGoalTime
      ? Math.max(s.ultimateGoalTime, s.currentTargetTime - SHIFT)
      : s.currentTargetTime;
    setS(prev => ({
      ...prev,
      checkedDays: [...prev.checkedDays, TODAY],
      streak, bestStreak: Math.max(streak, prev.bestStreak),
      currentTargetTime: nextTarget, lastShiftDate: TODAY
    }));
    flash();
  }, [s, TODAY, YESTERDAY, checked, flash]);

  const checkInLate = useCallback(() => {
    if (checked || lateChecked) return;
    setS(prev => ({
      ...prev,
      lateCheckedDays: [...(prev.lateCheckedDays||[]), TODAY]
    }));
    flash(true);
  }, [checked, lateChecked, TODAY, flash]);

  const undoCheckIn = useCallback(() => {
    if (!checked) return;
    setS(prev => ({
      ...prev,
      checkedDays: prev.checkedDays.filter(d => d !== TODAY),
      streak: Math.max(0, prev.streak-1),
      currentTargetTime: Math.min(prev.currentTargetTime+SHIFT, prev.startingWakeTime),
      lastShiftDate: null
    }));
    setJustChecked(false);
  }, [checked, TODAY]);

  const undoLateCheckIn = useCallback(() => {
    if (!lateChecked) return;
    setS(prev => ({
      ...prev,
      lateCheckedDays: (prev.lateCheckedDays||[]).filter(d => d !== TODAY)
    }));
    setJustChecked(false);
    setJustLate(false);
  }, [lateChecked, TODAY]);



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

  // ── 렌더 ──
  const renderScreen = () => {
    if (!s.onboarded) return <Onboarding t={t} lang={lang} onDone={finishOnboarding} onLangChange={l=>update({language:l})}/>;
    if (tab==='calendar') return <Cal t={t} lang={lang} s={s}/>;
    if (tab==='challenge') return <Challenge t={t} lang={lang} s={s}/>;
    if (tab==='settings') return <Sett t={t} lang={lang} s={s} update={update}/>;
    return (
      <Home
        t={t} s={s}
        checked={checked} lateChecked={lateChecked} tooLate={tooLate}
        justChecked={justChecked} justLate={justLate}
        onCheckIn={checkIn}
        onLateCheckIn={checkInLate}
        onUndo={undoCheckIn}
        onUndoLate={undoLateCheckIn}
        onGoToSettings={()=>setTab('settings')}
      />
    );
  };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0F172A',display:'flex',justifyContent:'center'}}>
      <div style={{width:'100%',maxWidth:'430px',height:'100%',background:'#1A1A2E',color:'white',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden',WebkitOverflowScrolling:'touch'}}>
          {renderScreen()}
        </div>
        {s.onboarded && (
          <div style={{flexShrink:0,background:'#1A1A2E',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',justifyContent:'space-around',alignItems:'center',paddingTop:10,paddingBottom:16,paddingLeft:8,paddingRight:8}}>
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

// ── NavBtn ────────────────────────────────────────────────────────────────────
const NB = memo(({label,icon,active,onClick}) => (
  <button type="button" onClick={onClick} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',color:active?'#3A7BD5':'#6b7280',transform:active?'scale(1.1)':'scale(1)',transition:'all 0.2s',padding:'4px 8px'}}>
    {icon}
    <span style={{fontSize:9,fontWeight:700}}>{label}</span>
  </button>
));

// ── Home ──────────────────────────────────────────────────────────────────────
const Home = memo(({t,s,checked,lateChecked,tooLate,justChecked,justLate,onCheckIn,onLateCheckIn,onUndo,onUndoLate,onGoToSettings}) => (
  <div className="px-8 pt-16 pb-8 flex flex-col items-center">
    {justChecked && <Confetti/>}
    {justLate && <ThumbsUp message={t.lateEncouragement}/>}

    {/* 상단 목표 표시 */}
    {checked ? (
      <div style={{width:'100%',marginBottom:32,background:'rgba(58,123,213,0.15)',borderRadius:24,border:'1.5px solid rgba(58,123,213,0.5)',padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
        <p style={{fontSize:11,fontWeight:900,letterSpacing:'0.15em',color:'#7EB8FF',textTransform:'uppercase',margin:0}}>{t.tomorrowGoalPrompt}</p>
        <p style={{fontSize:28,fontWeight:900,color:'#98C1FF',margin:0}}>{fmt(s.currentTargetTime)}</p>
        <p style={{fontSize:14,fontWeight:700,color:'#FFFFFF',textAlign:'center',lineHeight:1.5,margin:0}}>{t.tomorrowGoalDesc}</p>
        <button type="button" onClick={onGoToSettings} style={{marginTop:6,padding:'10px 24px',background:'#3A7BD5',color:'white',fontSize:13,fontWeight:900,borderRadius:999,border:'none',cursor:'pointer'}}>
          {t.tomorrowGoalBtn}
        </button>
      </div>
    ) : (
      <h2 className="text-xl font-bold mb-14 text-white/90 tracking-tight">
        {t.todaysGoal}: <span className="text-[#98C1FF]">{fmt(s.currentTargetTime)}</span>
      </h2>
    )}

    {/* 체크인 버튼 */}
    <div className="relative mb-6">
      {!checked && !lateChecked && !tooLate && <div className="absolute inset-0 bg-[#3A7BD5] rounded-full blur-[40px] opacity-20 animate-pulse"/>}
      {tooLate && <div className="absolute inset-0 bg-[#F5A623] rounded-full blur-[40px] opacity-10"/>}
      <button
        type="button"
        onClick={checked||lateChecked ? undefined : tooLate ? onLateCheckIn : onCheckIn}
        disabled={checked||lateChecked}
        className={`w-52 h-52 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-500 z-10 relative
          ${checked ? 'bg-[#3A7BD5]/20 border-2 border-[#3A7BD5]/40'
          : lateChecked ? 'bg-[#F5A623]/10 border-2 border-[#F5A623]/40'
          : tooLate ? 'bg-gradient-to-br from-[#F5A623] to-[#E08A00] hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(245,166,35,0.4)]'
          : 'bg-gradient-to-br from-[#98C1FF] to-[#3A7BD5] hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(58,123,213,0.4)]'}`}
      >
        <span className={`font-black text-xl tracking-tight ${checked?'text-[#3A7BD5]':lateChecked?'text-[#F5A623]':'text-[#1A1A2E]'}`}>
          {checked ? t.checkedIn : lateChecked ? t.lateCheckedIn : tooLate ? t.lateCheckIn : t.awake}
        </span>
        {justChecked && (
          <span className="absolute -bottom-2 text-[10px] font-black animate-bounce" style={{color:lateChecked?'#F5A623':'#3A7BD5'}}>
            {lateChecked ? '◐ 기록됨' : '✨ +1'}
          </span>
        )}
      </button>
    </div>

    {/* 체크인 취소 / 늦잠 취소 */}
    {checked && (
      <button type="button" onClick={onUndo} className="mb-8 px-5 py-2 rounded-full border border-white/10 text-white/70 text-xs font-bold hover:border-red-500/40 hover:text-red-400 transition-all">
        {t.undoCheckIn}
      </button>
    )}
    {lateChecked && (
      <button type="button" onClick={onUndoLate} className="mb-8 px-5 py-2 rounded-full border border-white/10 text-white/70 text-xs font-bold hover:border-red-500/40 hover:text-red-400 transition-all">
        {t.undoLateCheckIn}
      </button>
    )}
    {!checked && !lateChecked && <div className="mb-8"/>}

    {/* 스트릭 */}
    <div className="flex items-center gap-3 mb-10 bg-white/5 px-6 py-3 rounded-full border border-white/5">
      <Flame className="text-[#F5A623]" size={32} fill="#F5A623"/>
      <span className="text-3xl font-black italic">{s.streak} <span className="text-lg not-italic font-bold text-white/80 ml-1">{t.daysStreak}</span></span>
    </div>

    {/* 이미지 */}
    <div className="w-full rounded-[32px] overflow-hidden shadow-2xl aspect-[4/3] relative border border-white/10">
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent z-10 opacity-80"/>
      <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600" alt="Sunrise" className="w-full h-full object-cover"/>
      <p className="absolute bottom-6 left-0 right-0 text-center z-20 text-white/80 uppercase tracking-[0.3em] text-[10px] font-black">{t.consistency}</p>
    </div>


  </div>
));

// ── Calendar ──────────────────────────────────────────────────────────────────
const Cal = memo(({t,lang,s}) => {
  const now = new Date();
  const TODAY = todayStr();
  const MIN_YEAR=2026, MIN_MONTH=0;
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth());
  const cset = useMemo(()=>new Set(s.checkedDays),[s.checkedDays]);
  const lset = useMemo(()=>new Set(s.lateCheckedDays||[]),[s.lateCheckedDays]);
  const prefix = `${viewY}-${String(viewM+1).padStart(2,'0')}`;
  const cnt = s.checkedDays.filter(d=>d.startsWith(prefix)).length;
  const fd = new Date(viewY,viewM,1).getDay();
  const dim = new Date(viewY,viewM+1,0).getDate();
  const isMin = viewY===MIN_YEAR && viewM===MIN_MONTH;
  const isMax = viewY===now.getFullYear() && viewM===now.getMonth();
  const goPrev = () => { if(isMin)return; if(viewM===0){setViewY(y=>y-1);setViewM(11);}else setViewM(m=>m-1); };
  const goNext = () => { if(isMax)return; if(viewM===11){setViewY(y=>y+1);setViewM(0);}else setViewM(m=>m+1); };
  return (
    <div className="px-6 pt-10 pb-12">
      <div className="mb-6"><h1 className="text-lg font-black tracking-tighter uppercase text-white/90">{t.routine}</h1></div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[{icon:<Flame size={20} className="text-[#F5A623]" fill="#F5A623"/>,val:s.streak,lbl:t.current},
          {icon:<Trophy size={20} className="text-[#3A7BD5]"/>,val:s.bestStreak,lbl:t.best}].map((x,i)=>(
          <div key={i} className="bg-white/5 p-5 rounded-[20px] border border-white/5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">{x.icon}<span className="text-xl font-black">{x.val}</span></div>
            <span className="text-[9px] uppercase tracking-widest text-white/70 font-bold">{x.lbl}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-6">
        <button type="button" onClick={goPrev} className="p-2 bg-white/5 rounded-full" style={{opacity:isMin?0.2:1}}>
          <ChevronLeft size={20}/>
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tighter">{monthLabel(t,lang,viewY,viewM)}</h2>
          {!isMax && <button type="button" onClick={()=>{setViewY(now.getFullYear());setViewM(now.getMonth());}} className="text-[10px] text-[#3A7BD5] font-bold mt-1">{lang==='ko'?'오늘로 이동 →':'Go to today →'}</button>}
        </div>
        <button type="button" onClick={goNext} className="p-2 bg-white/5 rounded-full" style={{opacity:isMax?0.2:1}}>
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
            const ck=cset.has(ds), lk=lset.has(ds), it=ds===TODAY, fut=ds>TODAY;
            return <div key={ds} className="flex justify-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black
                ${ck?'bg-[#3A7BD5] text-white':lk?'border-2 border-[#F5A623] text-[#F5A623]':it?'border-2 border-[#3A7BD5] text-[#3A7BD5]':fut?'text-white/20':'text-white/60'}`}>
                {ck?<CheckCircle2 size={17}/>:lk?'◐':day}
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

// ── Challenge ─────────────────────────────────────────────────────────────────
const Challenge = memo(({t,lang,s}) => {
  const {currentTargetTime:cur,ultimateGoalTime:goal,startingWakeTime:start,streak,checkedDays} = s;
  const total=Math.max(1,Math.round((start-goal)/SHIFT));
  const done=Math.min(total,Math.round((start-cur)/SHIFT));
  const rem=Math.max(0,total-done);
  const pct=done/total;
  const reached=cur<=goal;
  const nextT=reached?goal:cur-SHIFT;
  return (
    <div className="px-6 pt-10 pb-12">
      <div className="mb-8"><h1 className="text-lg font-black tracking-tighter uppercase text-white/90">{t.challengeTitle}</h1></div>
      <div className="mb-10">
        <div className="flex justify-between text-sm font-black mb-3">
          <span className="text-white/70">{fmt(start)}</span>
          <span className="text-[#F5A623] text-base">{fmt(cur)}</span>
          <span className="text-white/70">{fmt(goal)}</span>
        </div>
        <div className="relative h-3 bg-white/10 rounded-full mb-4">
          <div className="h-full bg-gradient-to-r from-[#F5A623] to-[#3A7BD5] rounded-full transition-all duration-700" style={{width:`${pct*100}%`}}/>
          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-[#F5A623] rounded-full border-2 border-[#1A1A2E] shadow-lg" style={{left:`calc(${pct*100}% - 10px)`}}/>
        </div>
        <p className="text-center text-sm text-white/70 font-bold">{done} {t.stepsCompleted} · {rem} {t.stepsRemaining}</p>
      </div>
      {reached ? (
        <div className="bg-[#3A7BD5]/20 p-7 rounded-[28px] border border-[#3A7BD5]/30 mb-8 text-center">
          <p className="text-3xl font-black mb-2">{t.goalReached}</p>
          <p className="text-white/70 text-sm">{t.goalReachedDesc}</p>
        </div>
      ) : (
        <div className="bg-white/5 p-7 rounded-[28px] border border-white/5 mb-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-10"><Target size={48}/></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-3">{t.tomorrowTarget}</p>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-4xl font-black text-[#98C1FF]">{fmt(nextT)}</span>
            <span className="text-sm text-white/70 font-bold">-10 min</span>
          </div>
          <p className="text-sm text-white/70 mb-3">{t.wakeEarlier}</p>
          <p className="text-xs text-white/50 italic">{t.motto}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[{l:t.daysActive,v:checkedDays.length,u:''},{l:t.timeShifted,v:done*SHIFT,u:' min'},{l:t.streakLabel,v:streak,u:''}].map(({l,v,u})=>(
          <div key={l} className="bg-white/5 p-4 rounded-[20px] border border-white/5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/70 font-black mb-2">{l}</p>
            <p className="text-xl font-black">{v}<span className="text-xs text-white/60">{u}</span></p>
          </div>
        ))}
      </div>
      <div className="bg-white/5 p-5 rounded-[20px] border border-white/5 flex gap-4 items-center">
        <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5] shrink-0"><TrendingUp size={20}/></div>
        <p className="text-xs text-white/70 leading-relaxed">
          {lang==='ko'?`꾸준함이 핵심입니다. ${checkedDays.length}일 동안 리듬을 유지했어요.`:`Consistent progress is key. You've adjusted your rhythm for ${checkedDays.length} days.`}
        </p>
      </div>
    </div>
  );
});

// ── Settings ──────────────────────────────────────────────────────────────────
const Sett = memo(({t,lang,s,update}) => {
  const [saved,setSaved] = useState(false);
  useEffect(()=>{ if(!saved)return; const id=setTimeout(()=>setSaved(false),2000); return()=>clearTimeout(id); },[saved]);
  const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,v));
  return (
    <div className="px-6 pt-10 pb-12">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-xl font-black">{t.settings}</h1>
        <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
          {['ko','en'].map(l=>(
            <button key={l} type="button" onClick={()=>update({language:l})}
              className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang===l?'bg-[#3A7BD5] text-white':'text-gray-500'}`}>
              {l==='ko'?'KOR':'ENG'}
            </button>
          ))}
        </div>
      </div>
      <section className="mb-8">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-5">{t.yourChallenge}</h3>
        <div className="grid grid-cols-2 gap-4">
          <TP label={t.currentTarget} value={s.currentTargetTime} onChange={v=>update(prev=>({currentTargetTime:clamp(v,prev.ultimateGoalTime+SHIFT,1439),startingWakeTime:clamp(v,prev.ultimateGoalTime+SHIFT,1439)}))}/>
          <TP label={t.ultimateGoal} value={s.ultimateGoalTime} onChange={v=>update(prev=>({ultimateGoalTime:clamp(v,0,prev.currentTargetTime-SHIFT)}))}/>
        </div>
        <p className="text-xs text-white/60 mt-5 px-2 italic">{t.shiftMessage}</p>
      </section>
      <section className="mb-10">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-5">{t.streakRules}</h3>
        <div className="bg-white/5 p-6 rounded-[28px] border border-[#3A7BD5]/20 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-[#3A7BD5]/10 rounded-2xl text-[#3A7BD5]"><ShieldCheck size={20}/></div>
            <div>
              <p className="font-black mb-1">{t.compassionate}</p>
              <p className="text-[11px] text-white/70 max-w-[180px]">{t.compDesc}</p>
            </div>
          </div>
          <Tog enabled={s.compassionateMode} onToggle={()=>update(prev=>({compassionateMode:!prev.compassionateMode}))}/>
        </div>
      </section>
      <button type="button" onClick={()=>setSaved(true)}
        className={`w-full py-6 font-black rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${saved?'bg-emerald-500 text-white':'bg-[#3A7BD5] text-white'}`}>
        {saved?<><CheckCircle2 size={18}/>{t.saved}</>:t.saveBtn}
      </button>
    </div>
  );
});

// ── TimePicker ────────────────────────────────────────────────────────────────
const TP = memo(({label,value,onChange}) => (
  <div className="bg-white/5 p-5 rounded-[28px] border border-white/5 flex flex-col items-center gap-2">
    <span style={{height:36,display:'flex',alignItems:'center',textAlign:'center'}} className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-tight px-1">{label}</span>
    <button type="button" onClick={()=>onChange(value+SHIFT)} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronLeft size={22} className="rotate-90"/></button>
    <div className="text-xl font-black text-[#98C1FF]">{fmt(value)}</div>
    <button type="button" onClick={()=>onChange(value-SHIFT)} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronLeft size={22} className="-rotate-90"/></button>
  </div>
));

// ── Toggle ────────────────────────────────────────────────────────────────────
const Tog = memo(({enabled,onToggle,disabled}) => (
  <button type="button" onClick={onToggle} disabled={disabled}
    style={{width:56,height:28,borderRadius:14,border:'none',cursor:disabled?'not-allowed':'pointer',background:enabled?'#3A7BD5':'#374151',position:'relative',transition:'background 0.3s',opacity:disabled?0.5:1,flexShrink:0}}>
    <div style={{position:'absolute',top:3,left:3,width:22,height:22,borderRadius:'50%',background:'white',transform:enabled?'translateX(28px)':'translateX(0)',transition:'transform 0.3s'}}/>
  </button>
));

// ── Onboarding ────────────────────────────────────────────────────────────────
const Onboarding = memo(({t,lang,onDone,onLangChange}) => {
  const [cur,setCur] = useState(660);
  const [goal,setGoal] = useState(420);
  const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,v));
  return (
    <div className="px-8 pt-12 pb-12 flex flex-col items-center min-h-full">
      <div className="w-full flex justify-end mb-8">
        <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
          {['ko','en'].map(l=>(
            <button key={l} type="button" onClick={()=>onLangChange(l)}
              className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang===l?'bg-[#3A7BD5] text-white':'text-gray-500'}`}>
              {l==='ko'?'KOR':'ENG'}
            </button>
          ))}
        </div>
      </div>
      <div className="text-5xl mb-6">🌅</div>
      <h1 className="text-2xl font-black text-center mb-3 tracking-tight">{t.onboardingTitle}</h1>
      <p className="text-sm text-white/70 text-center mb-12 leading-relaxed">{t.onboardingDesc}</p>
      <div className="w-full grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white/5 p-5 rounded-[28px] border border-white/5 flex flex-col items-center gap-2">
          <span style={{height:36,display:'flex',alignItems:'center',textAlign:'center'}} className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-tight px-1">{t.onboardingCurrent}</span>
          <button type="button" onClick={()=>setCur(v=>clamp(v+SHIFT,goal+SHIFT,1439))} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronLeft size={22} className="rotate-90"/></button>
          <div className="text-xl font-black text-[#98C1FF]">{fmt(cur)}</div>
          <button type="button" onClick={()=>setCur(v=>clamp(v-SHIFT,goal+SHIFT,1439))} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronLeft size={22} className="-rotate-90"/></button>
        </div>
        <div className="bg-white/5 p-5 rounded-[28px] border border-[#3A7BD5]/20 flex flex-col items-center gap-2">
          <span style={{height:36,display:'flex',alignItems:'center',textAlign:'center'}} className="text-[10px] font-black uppercase tracking-widest text-white/70 leading-tight px-1">{t.onboardingGoal}</span>
          <button type="button" onClick={()=>setGoal(v=>clamp(v+SHIFT,0,cur-SHIFT))} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronLeft size={22} className="rotate-90"/></button>
          <div className="text-xl font-black text-[#F5A623]">{fmt(goal)}</div>
          <button type="button" onClick={()=>setGoal(v=>clamp(v-SHIFT,0,cur-SHIFT))} className="text-white/50 hover:text-[#3A7BD5] p-1"><ChevronLeft size={22} className="-rotate-90"/></button>
        </div>
      </div>
      <div className="w-full bg-white/5 p-4 rounded-2xl border border-white/5 mb-10 text-center">
        <p className="text-xs text-white/70 leading-relaxed">
          {lang==='ko'?`${fmt(cur)}에서 ${fmt(goal)}까지 — 매일 10분씩 앞당겨요`:`${fmt(cur)} → ${fmt(goal)} — shifting 10 min earlier each day`}
        </p>
      </div>
      <button type="button" onClick={()=>onDone(cur,goal)}
        className="w-full py-5 bg-[#3A7BD5] text-white font-black rounded-2xl uppercase tracking-widest text-sm">
        {t.onboardingBtn}
      </button>
    </div>
  );
});
