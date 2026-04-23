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
        {entries.length >= 2 &
