import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "weight-log-entries-v3";
const SETTINGS_KEY = "weight-tracker-settings-v3";

const INITIAL_DATA = [
  { date: "2026-04-02", weight: 74.2, id: 1 },
  { date: "2026-04-03", weight: 74.7, id: 2 },
  { date: "2026-04-04", weight: 75.4, id: 3 },
  { date: "2026-04-06", weight: 74.4, id: 4 },
  { date: "2026-04-07", weight: 74.4, id: 5 },
  { date: "2026-04-08", weight: 72.8, id: 6 },
  { date: "2026-04-09", weight: 74.1, id: 7 },
  { date: "2026-04-10", weight: 73.8, id: 8 },
  { date: "2026-04-14", weight: 73.9, id: 9 },
  { date: "2026-04-16", weight: 72.9, id: 10 },
  { date: "2026-04-17", weight: 73.1, id: 11 },
  { date: "2026-04-18", weight: 73.7, id: 12 },
  { date: "2026-04-19", weight: 74.3, id: 13 },
  { date: "2026-04-20", weight: 73.8, id: 14 },
  { date: "2026-04-22", weight: 73.9, id: 15 },
];

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" });
}
function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(new Date(dateStr).setDate(diff));
  return mon.toISOString().split("T")[0];
}
function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: "저체중", color: "#60a5fa" };
  if (bmi < 23) return { label: "정상", color: "#10b981" };
  if (bmi < 25) return { label: "과체중", color: "#f59e0b" };
  if (bmi < 30) return { label: "비만", color: "#f87171" };
  return { label: "고도비만", color: "#ef4444" };
}

export default function WeightTracker() {
  const [entries, setEntries] = useState([]);
  const [settings, setSettings] = useState({ height: "", goalWeight: "" });
  const [inputWeight, setInputWeight] = useState("");
  const [inputDate, setInputDate] = useState(getTodayStr());
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("chart");
  const [showSettings, setShowSettings] = useState(false);
  const [settingDraft, setSettingDraft] = useState({ height: "", goalWeight: "" });
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setEntries(JSON.parse(saved));
      } else {
        setEntries(INITIAL_DATA);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
      }
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const sv = JSON.parse(savedSettings);
        setSettings(sv);
        setSettingDraft(sv);
      }
    } catch (_) {
      setEntries(INITIAL_DATA);
    }
    setLoaded(true);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  const persist = (newEntries, newSettings) => {
    try {
      if (newEntries !== undefined) localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
      if (newSettings !== undefined) localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (_) {}
  };

  const handleAdd = () => {
    const w = parseFloat(inputWeight);
    if (!inputWeight || isNaN(w) || w < 20 || w > 300) {
      showToast("올바른 몸무게를 입력해 주세요 (20~300kg)", "error"); return;
    }
    const newEntry = { date: inputDate, weight: w, id: Date.now() };
    const existing = entries.findIndex((e) => e.date === inputDate);
    let updated;
    if (existing >= 0) {
      updated = entries.map((e, i) => (i === existing ? newEntry : e));
      showToast("기록이 업데이트되었어요 ✓");
    } else {
      updated = [...entries, newEntry].sort((a, b) => a.date.localeCompare(b.date));
      showToast("기록이 저장되었어요 ✓");
    }
    setEntries(updated);
    persist(updated, undefined);
    setInputWeight("");
    inputRef.current?.focus();
  };

  const handleDelete = (id) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    persist(updated, undefined);
    showToast("삭제되었어요", "info");
  };

  const handleSaveSettings = () => {
    const h = parseFloat(settingDraft.height);
    const g = parseFloat(settingDraft.goalWeight);
    if (settingDraft.height && (isNaN(h) || h < 100 || h > 250)) {
      showToast("키를 올바르게 입력해 주세요 (100~250cm)", "error"); return;
    }
    if (settingDraft.goalWeight && (isNaN(g) || g < 20 || g > 300)) {
      showToast("목표 체중을 올바르게 입력해 주세요", "error"); return;
    }
    const newS = { height: settingDraft.height, goalWeight: settingDraft.goalWeight };
    setSettings(newS);
    persist(undefined, newS);
    setShowSettings(false);
    showToast("설정이 저장되었어요 ✓");
  };

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const diff = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;
  const totalDiff = entries.length >= 2 ? (entries[entries.length - 1].weight - entries[0].weight).toFixed(1) : null;

  const heightM = parseFloat(settings.height) / 100;
  const bmi = latest && heightM > 0 ? (latest.weight / (heightM * heightM)).toFixed(1) : null;
  const bmiInfo = bmi ? bmiCategory(parseFloat(bmi)) : null;
  const idealBroca = heightM > 0 ? ((parseFloat(settings.height) - 100) * 0.9).toFixed(1) : null;
  const idealBMI22 = heightM > 0 ? (22 * heightM * heightM).toFixed(1) : null;
  const goalW = parseFloat(settings.goalWeight);
  const toGoal = latest && goalW ? (latest.weight - goalW).toFixed(1) : null;

  const weekMap = {};
  entries.forEach((e) => {
    const wk = getWeekKey(e.date);
    if (!weekMap[wk]) weekMap[wk] = [];
    weekMap[wk].push(e.weight);
  });
  const weeklyAvgs = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wk, ws]) => ({ week: wk, avg: (ws.reduce((a, b) => a + b, 0) / ws.length).toFixed(1), count: ws.length }));

  const recent = entries.slice(-30);
  const weights = recent.map((e) => e.weight);
  const allVals = [...weights];
  if (goalW) allVals.push(goalW);
  const minW = allVals.length ? Math.floor(Math.min(...allVals) - 1.5) : 50;
  const maxW = allVals.length ? Math.ceil(Math.max(...allVals) + 1.5) : 80;
  const range = maxW - minW || 1;
  const svgW = 600, svgH = 200;
  const pad = { l: 40, r: 36, t: 16, b: 28 };
  const chartW = svgW - pad.l - pad.r;
  const chartH = svgH - pad.t - pad.b;
  const toY = (w) => pad.t + chartH - ((w - minW) / range) * chartH;
  const pts = recent.map((e, i) => ({
    x: pad.l + (i / Math.max(recent.length - 1, 1)) * chartW,
    y: toY(e.weight), entry: e,
  }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = pts.length
    ? `M${pts[0].x},${pad.t + chartH} ` + pts.map((p) => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${pad.t + chartH} Z`
    : "";
  const goalY = goalW ? toY(goalW) : null;

  if (!loaded) return (
    <div style={st.loading}><div style={st.spinner} /></div>
  );

  return (
    <div style={st.root}>
      {toast && (
        <div style={{ ...st.toast, background: toast.type === "error" ? "#ef4444" : toast.type === "info" ? "#64748b" : "#10b981" }}>
          {toast.msg}
        </div>
      )}
      {showSettings && (
        <div style={st.overlay} onClick={() => setShowSettings(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.modalTitle}>⚙️ 내 정보 설정</div>
            <label style={st.mlabel}>키 (cm)</label>
            <input style={st.minput} type="number" placeholder="예: 175" value={settingDraft.height}
              onChange={(e) => setSettingDraft({ ...settingDraft, height: e.target.value })} />
            <label style={st.mlabel}>목표 체중 (kg)</label>
            <input style={st.minput} type="number" placeholder="예: 70" step="0.1" value={settingDraft.goalWeight}
              onChange={(e) => setSettingDraft({ ...settingDraft, goalWeight: e.target.value })} />
            <div style={st.mbtns}>
              <button style={st.cancelBtn} onClick={() => setShowSettings(false)}>취소</button>
              <button style={st.saveBtn} onClick={handleSaveSettings}>저장</button>
            </div>
          </div>
        </div>
      )}
      <div style={st.container}>
        <div style={st.header}>
          <div style={st.headerLeft}>
            <div style={st.logo}>⚖️</div>
            <div>
              <div style={st.title}>체중 기록장</div>
              <div style={st.subtitle}>형주님의 건강 트래커</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {latest && (
              <div style={st.latestBadge}>
                <span style={st.latestNum}>{latest.weight}</span>
                <span style={st.latestUnit}>kg</span>
                {diff !== null && (
                  <span style={{ ...st.diffBadge, color: parseFloat(diff) <= 0 ? "#10b981" : "#f87171" }}>
                    {parseFloat(diff) > 0 ? "+" : ""}{diff}
                  </span>
                )}
              </div>
            )}
            <button style={st.gearBtn} onClick={() => { setSettingDraft(settings); setShowSettings(true); }}>⚙️</button>
          </div>
        </div>
        {settings.height && latest && (
          <div style={st.bmiCard}>
            <div style={st.bmiLeft}>
              <div style={st.smallLabel}>BMI</div>
              <div style={{ ...st.bmiNum, color: bmiInfo.color }}>{bmi}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: bmiInfo.color, marginTop: 2 }}>{bmiInfo.label}</div>
            </div>
            <div style={st.vline} />
            <div style={{ flex: 1 }}>
              <div style={st.smallLabel}>적정 체중 범위</div>
              {[
                ["BMI 정상 기준", `${(18.5 * heightM * heightM).toFixed(1)}~${(22.9 * heightM * heightM).toFixed(1)}kg`],
                ["브로카 공식", `${idealBroca}kg`],
                ["BMI 22 기준", `${idealBMI22}kg`],
              ].map(([label, val]) => (
                <div key={label} style={st.idealRow}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {settings.goalWeight && latest && (
          <div style={st.goalCard}>
            <div>
              <div style={st.smallLabel}>목표 체중</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{settings.goalWeight} kg</div>
            </div>
            <div style={{ flex: 1, paddingLeft: 16 }}>
              {parseFloat(toGoal) === 0 ? (
                <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>🎉 목표 달성!</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7, color: parseFloat(toGoal) > 0 ? "#f87171" : "#10b981" }}>
                    {parseFloat(toGoal) > 0 ? `${toGoal}kg 더 감량 필요` : `목표 ${Math.abs(parseFloat(toGoal))}kg 초과 달성`}
                  </div>
                  <div style={st.progressBar}>
                    {(() => {
                      if (!entries.length || !goalW) return null;
                      const start = entries[0].weight;
                      const total = start - goalW;
                      const done = start - latest.weight;
                      const pct = total === 0 ? 100 : Math.min(Math.max((done / total) * 100, 0), 100);
                      return <div style={{ ...st.progressFill, width: `${pct}%`, background: pct >= 100 ? "#10b981" : "#6366f1" }} />;
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {entries.length >= 2 && (
          <div style={st.statsRow}>
            {[
              { label: "총 변화", val: `${parseFloat(totalDiff) > 0 ? "+" : ""}${totalDiff}kg`, color: parseFloat(totalDiff) <= 0 ? "#10b981" : "#f87171" },
              { label: "최저", val: `${Math.min(...entries.map(e => e.weight))}kg` },
              { label: "최고", val: `${Math.max(...entries.map(e => e.weight))}kg` },
              { label: "기록 수", val: `${entries.length}일` },
            ].map((item, i) => (
              <div key={i} style={st.statBox}>
                <div style={st.statLabel}>{item.label}</div>
                <div style={{ ...st.statVal, color: item.color || "#1e1b4b" }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}
        <div style={st.inputCard}>
          <div style={st.inputRow}>
            <input type="date" value={inputDate} onChange={(e) => setInputDate(e.target.value)} style={st.dateInput} />
            <div style={{ flex: 1, position: "relative" }}>
              <input ref={inputRef} type="number" placeholder="00.0" value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={st.weightInput} step="0.1" min="20" max="300" />
              <span style={st.kgLabel}>kg</span>
            </div>
            <button onClick={handleAdd} style={st.addBtn}>저장</button>
          </div>
        </div>
        <div style={st.tabs}>
          {[["log", "📋 기록"], ["chart", "📈 그래프"], ["weekly", "📅 주간"]].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ ...st.tab, ...(activeTab === t ? st.tabActive : {}) }}>{label}</button>
          ))}
        </div>
        {activeTab === "chart" && (
          <div style={st.card}>
            {recent.length < 2 ? <div style={st.empty}>기록이 2개 이상이면 그래프가 표시돼요</div> : (
              <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                  const y = pad.t + t * chartH;
                  return (
                    <g key={i}>
                      <line x1={pad.l} y1={y} x2={svgW - pad.r} y2={y} stroke="#e2e8f0" strokeWidth="0.5" />
                      <text x={pad.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{(maxW - t * range).toFixed(1)}</text>
                    </g>
                  );
                })}
                {goalY && (
                  <>
                    <line x1={pad.l} y1={goalY} x2={svgW - pad.r} y2={goalY} stroke="#10b981" strokeWidth="1.5" strokeDasharray="5,4" />
                    <text x={svgW - pad.r + 2} y={goalY + 4} fontSize="9" fill="#10b981">목표</text>
                  </>
                )}
                <path d={area} fill="url(#ag)" />
                <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinejoin="round" />
                {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="white" strokeWidth="1.5" />)}
                {pts.filter((_, i) => i % Math.ceil(recent.length / 7) === 0 || i === recent.length - 1).map((p, i) => (
                  <text key={i} x={p.x} y={svgH - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.entry.date.slice(5)}</text>
                ))}
              </svg>
            )}
          </div>
        )}
        {activeTab === "weekly" && (
          <div style={st.card}>
            {weeklyAvgs.length === 0 && <div style={st.empty}>기록이 없어요.</div>}
            {[...weeklyAvgs].reverse().map((w, i, arr) => {
              const prevW = arr[i + 1];
              const d = prevW ? (parseFloat(w.avg) - parseFloat(prevW.avg)).toFixed(1) : null;
              const weekEnd = new Date(w.week);
              weekEnd.setDate(weekEnd.getDate() + 6);
              return (
                <div key={w.week} style={st.logItem}>
                  <div>
                    <div style={st.logDate}>{w.week.slice(5)} ~ {weekEnd.toISOString().slice(5, 10)}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{w.count}회 평균</div>
                  </div>
                  <div style={st.logRight}>
                    <span style={st.logWeight}>{w.avg} kg</span>
                    {d !== null && <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(d) <= 0 ? "#10b981" : "#f87171" }}>{parseFloat(d) > 0 ? "+" : ""}{d}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activeTab === "log" && (
          <div style={st.card}>
            {entries.length === 0 && <div style={st.empty}>아직 기록이 없어요.</div>}
            {[...entries].reverse().map((e, i, arr) => {
              const prevEntry = arr[i + 1];
              const d = prevEntry ? (e.weight - prevEntry.weight).toFixed(1) : null;
              return (
                <div key={e.id} style={st.logItem}>
                  <div style={st.logDate}>{formatDate(e.date)}</div>
                  <div style={st.logRight}>
                    <span style={st.logWeight}>{e.weight} kg</span>
                    {d !== null && <span style={{ fontSize: 12, fontWeight: 700, color: parseFloat(d) <= 0 ? "#10b981" : "#f87171" }}>{parseFloat(d) > 0 ? "+" : ""}{d}</span>}
                    <button onClick={() => handleDelete(e.id)} style={st.delBtn}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!settings.height && (
          <div style={st.nudge} onClick={() => { setSettingDraft(settings); setShowSettings(true); }}>
            ⚙️ 키와 목표 체중을 설정하면 BMI · 적정 체중 · 목표 진행률을 볼 수 있어요 →
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  root: { minHeight: "100vh", background: "linear-gradient(135deg,#f8faff,#eff2ff)", fontFamily: "'Noto Sans KR','Apple SD Gothic Neo',sans-serif", padding: "40px 40px 48px" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" },
  spinner: { width: 28, height: 28, border: "3px solid #e0e7ff", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  toast: { position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "10px 22px", borderRadius: 99, fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.18)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: 20, padding: "28px 24px", width: "min(90vw,340px)", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#1e1b4b", marginBottom: 18 },
  mlabel: { fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 6 },
  minput: { width: "100%", border: "1.5px solid #e0e7ff", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 14, outline: "none" },
  mbtns: { display: "flex", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: "10px", border: "1.5px solid #e0e7ff", borderRadius: 10, background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#64748b", fontFamily: "inherit" },
  saveBtn: { flex: 1, border: "none", borderRadius: 10, background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "10px" },
  container: { maxWidth: 900, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logo: { fontSize: 30 },
  title: { fontSize: 21, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-0.5px" },
  subtitle: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  latestBadge: { background: "#fff", borderRadius: 14, padding: "7px 14px", boxShadow: "0 2px 12px rgba(99,102,241,0.12)", display: "flex", alignItems: "baseline", gap: 4 },
  latestNum: { fontSize: 24, fontWeight: 800, color: "#4338ca" },
  latestUnit: { fontSize: 12, color: "#94a3b8", fontWeight: 500 },
  diffBadge: { fontSize: 12, fontWeight: 700, marginLeft: 4 },
  gearBtn: { background: "#fff", border: "1.5px solid #e0e7ff", borderRadius: 10, padding: "7px 10px", fontSize: 16, cursor: "pointer" },
  bmiCard: { background: "#fff", borderRadius: 16, padding: "16px", boxShadow: "0 2px 12px rgba(99,102,241,0.08)", marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" },
  bmiLeft: { textAlign: "center", minWidth: 66 },
  smallLabel: { fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
  bmiNum: { fontSize: 28, fontWeight: 900, lineHeight: 1.1 },
  vline: { width: 1, background: "#f1f5f9", alignSelf: "stretch" },
  idealRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  goalCard: { background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(99,102,241,0.08)", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 },
  progressBar: { height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 99, transition: "width 0.5s ease" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 },
  statBox: { background: "#fff", borderRadius: 12, padding: "11px 6px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  statLabel: { fontSize: 10, color: "#94a3b8", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.5px" },
  statVal: { fontSize: 13, fontWeight: 800 },
  inputCard: { background: "#fff", borderRadius: 16, padding: "14px", boxShadow: "0 2px 14px rgba(99,102,241,0.1)", marginBottom: 12 },
  inputRow: { display: "flex", gap: 8, alignItems: "center" },
  dateInput: { flex: "0 0 auto", border: "1.5px solid #e0e7ff", borderRadius: 10, padding: "9px 8px", fontSize: 13, color: "#374151", outline: "none", fontFamily: "inherit" },
  weightInput: { width: "100%", border: "1.5px solid #e0e7ff", borderRadius: 10, padding: "9px 32px 9px 12px", fontSize: 20, fontWeight: 800, color: "#1e1b4b", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  kgLabel: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8", fontWeight: 600 },
  addBtn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 15, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" },
  tabs: { display: "flex", gap: 8, marginBottom: 10 },
  tab: { flex: 1, padding: "9px", borderRadius: 10, border: "1.5px solid #e0e7ff", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#94a3b8", fontFamily: "inherit" },
  tabActive: { background: "#eef2ff", borderColor: "#a5b4fc", color: "#4338ca" },
  card: { background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(99,102,241,0.08)", overflow: "hidden" },
  empty: { textAlign: "center", color: "#94a3b8", padding: "40px 20px", fontSize: 14 },
  logItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid #f1f5f9" },
  logDate: { fontSize: 13, color: "#475569", fontWeight: 500 },
  logRight: { display: "flex", alignItems: "center", gap: 8 },
  logWeight: { fontSize: 16, fontWeight: 800, color: "#1e1b4b" },
  delBtn: { background: "none", border: "none", color: "#cbd5e1", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px", fontFamily: "inherit" },
  nudge: { marginTop: 14, background: "#eef2ff", borderRadius: 12, padding: "12px 16px", fontSize: 12, color: "#6366f1", fontWeight: 600, cursor: "pointer", textAlign: "center" },
};
