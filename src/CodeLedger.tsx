// @ts-nocheck — migrated single-file UI; strict style-object typing deferred
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import type { Goal, Note, Profile, ProgressMap, Session, ToastState } from "./types";
import { backupSchema } from "./schema";
import { initStorage, load, save } from "./storage";
import { LANGS, LANG_MAP, MASTERY, defaultProfile, defaultProgress } from "./constants";
import { uid, fmtDate, fmtDateShort, fmtTime, daysSince, pluralize } from "./utils";

/* ═══════════════════════════════════════════════════════════════
   CodeLedger v3 — Distinguished Principal Engineer Edition
   A state-of-the-art developer learning tracker.
   
   Features:
   - 7-view architecture (Dashboard, Languages, Notes, Goals, Sessions, Review, Analytics)
   - Pomodoro timer with configurable durations
   - Command palette (Cmd/Ctrl+K) with fuzzy search
   - Keyboard shortcuts throughout
   - Spaced repetition with flashcard review mode
   - Heatmap contribution graph (GitHub-style)
   - Analytics with streak calendar, language breakdown, weekly trends
   - JSON export/import for full data portability
   - Micro-animations and polished transitions
   - Responsive down to 480px
   - Persistent storage across sessions
   ═══════════════════════════════════════════════════════════════ */

// ─── App ───
export default function CodeLedger() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [profile, setProfile] = useState<Profile>(() => defaultProfile());
  const [progress, setProgress] = useState<ProgressMap>(() => defaultProgress());
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selLang, setSelLang] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [pomoLang, setPomoLang] = useState("");
  const [pomoDesc, setPomoDesc] = useState("");
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoDuration, setPomoDuration] = useState(25);
  const pomoRef = useRef(null);
  const toastRef = useRef(null);

  // Load
  useEffect(() => {
    (async () => {
      await initStorage();
      const [p, pr, n, g, s] = await Promise.all([
        load("cl3-profile", defaultProfile()), load("cl3-progress", defaultProgress()),
        load<Note[]>("cl3-notes", []), load<Goal[]>("cl3-goals", []), load<Session[]>("cl3-sessions", []),
      ]);
      setProfile(p); setProgress(pr); setNotes(n); setGoals(g); setSessions(s); setLoaded(true);
    })();
  }, []);

  // Save
  useEffect(() => { if (loaded) save("cl3-profile", profile); }, [profile, loaded]);
  useEffect(() => { if (loaded) save("cl3-progress", progress); }, [progress, loaded]);
  useEffect(() => { if (loaded) save("cl3-notes", notes); }, [notes, loaded]);
  useEffect(() => { if (loaded) save("cl3-goals", goals); }, [goals, loaded]);
  useEffect(() => { if (loaded) save("cl3-sessions", sessions); }, [sessions, loaded]);

  // Toast
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((p) => !p); }
      if (e.key === "Escape") { setCmdOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Pomodoro timer
  useEffect(() => {
    if (pomoRunning && pomoSeconds > 0) {
      pomoRef.current = setTimeout(() => setPomoSeconds((s) => s - 1), 1000);
      return () => clearTimeout(pomoRef.current);
    }
    if (pomoRunning && pomoSeconds === 0) {
      setPomoRunning(false);
      logSession({ id: uid(), langId: pomoLang || null, minutes: pomoDuration, description: pomoDesc || `Pomodoro (${pomoDuration}m)`, date: new Date().toISOString(), type: "pomodoro" });
      showToast(`Pomodoro complete! ${pomoDuration}m logged.`);
      setPomoActive(false);
    }
  }, [pomoRunning, pomoSeconds]);

  const updateProgress = useCallback((lid, updater) => {
    setProgress((p) => ({ ...p, [lid]: { ...p[lid], ...updater(p[lid]) } }));
  }, []);

  const logSession = useCallback((session) => {
    setSessions((p) => [session, ...p]);
    if (session.langId) {
      updateProgress(session.langId, (p) => ({ studyMinutes: (p.studyMinutes || 0) + session.minutes, lastStudied: new Date().toISOString() }));
    }
    setProfile((prev) => {
      const now = new Date().toISOString();
      const todayStr = now.slice(0, 10);
      const lastStr = prev.lastStudyDate ? prev.lastStudyDate.slice(0, 10) : null;
      let streak;
      if (!lastStr) streak = 1;
      else if (lastStr === todayStr) streak = prev.streakDays;
      else if (daysSince(prev.lastStudyDate) === 1) streak = prev.streakDays + 1;
      else streak = 1;
      return { ...prev, totalStudyMinutes: prev.totalStudyMinutes + session.minutes, lastStudyDate: now, streakDays: streak };
    });
  }, [updateProgress]);

  const markReviewed = useCallback((id) => {
    setNotes((p) => p.map((n) => n.id === id ? { ...n, reviewCount: (n.reviewCount || 0) + 1, lastReviewed: new Date().toISOString() } : n));
    showToast("Marked as reviewed");
  }, [showToast]);

  // Export
  const exportData = useCallback(() => {
    const data = JSON.stringify({ profile, progress, notes, goals, sessions, exportedAt: new Date().toISOString(), version: 3 }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `codeledger-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("Data exported successfully");
  }, [profile, progress, notes, goals, sessions, showToast]);

  // Import
  const importData = useCallback((jsonStr: string) => {
    try {
      const raw = JSON.parse(jsonStr) as unknown;
      const parsed = backupSchema.safeParse(raw);
      if (!parsed.success) {
        showToast("Invalid backup format", "error");
        return;
      }
      const d = parsed.data;
      if (d.profile) setProfile(d.profile);
      if (d.progress) setProgress(d.progress as ProgressMap);
      if (d.notes) setNotes(d.notes as Note[]);
      if (d.goals) setGoals(d.goals as Goal[]);
      if (d.sessions) setSessions(d.sessions as Session[]);
      showToast("Data imported successfully");
    } catch {
      showToast("Invalid JSON file", "error");
    }
  }, [showToast]);

  if (!loaded) return (
    <div style={S.loadingScreen}>
      <style>{CSS}</style>
      <div className="cl-loader">◇</div>
      <p style={{ color: "#666", marginTop: 20, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>CodeLedger</p>
    </div>
  );

  const navItems = [
    { id: "dashboard", icon: "▣", label: "Dashboard", key: "1" },
    { id: "languages", icon: "◆", label: "Languages", key: "2" },
    { id: "notes", icon: "✎", label: "Notes", key: "3" },
    { id: "goals", icon: "◎", label: "Goals", key: "4" },
    { id: "sessions", icon: "▶", label: "Sessions", key: "5" },
    { id: "review", icon: "↻", label: "Review", key: "6" },
    { id: "analytics", icon: "◫", label: "Analytics", key: "7" },
    { id: "settings", icon: "⚙", label: "Settings", key: "8" },
  ];

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      {/* ── Toast ── */}
      {toast && (
        <div className="cl-toast" style={{ ...S.toast, background: toast.type === "error" ? "#7f1d1d" : "#064e3b", borderColor: toast.type === "error" ? "#dc2626" : "#059669" }}>
          <span style={{ fontSize: 14 }}>{toast.type === "error" ? "✕" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Command Palette ── */}
      {cmdOpen && <CommandPalette
        navItems={navItems} notes={notes} goals={goals} langs={LANGS}
        onNavigate={(v, lang) => { setView(v); if (lang) setSelLang(lang); setCmdOpen(false); }}
        onClose={() => setCmdOpen(false)}
        onStartPomo={() => { setCmdOpen(false); setPomoActive(true); }}
      />}

      {/* ── Pomodoro Overlay ── */}
      {pomoActive && (
        <div style={S.overlay} onClick={() => { if (!pomoRunning) setPomoActive(false); }}>
          <div style={S.pomoModal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, color: "#fff", marginBottom: 8 }}>Pomodoro Timer</h2>
            <div style={S.pomoTime}>
              {String(Math.floor(pomoSeconds / 60)).padStart(2, "0")}:{String(pomoSeconds % 60).padStart(2, "0")}
            </div>
            {!pomoRunning && pomoSeconds === pomoDuration * 60 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {[15, 25, 45, 60].map((m) => (
                    <button key={m} onClick={() => { setPomoDuration(m); setPomoSeconds(m * 60); }}
                      style={{ ...S.btn, flex: 1, background: pomoDuration === m ? "#059669" : "#1a1a1a", border: "1px solid #333", padding: "8px" }}>
                      {m}m
                    </button>
                  ))}
                </div>
                <select style={S.input} value={pomoLang} onChange={(e) => setPomoLang(e.target.value)}>
                  <option value="">General study</option>
                  {LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <input style={S.input} placeholder="What are you working on?" value={pomoDesc} onChange={(e) => setPomoDesc(e.target.value)} />
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              {!pomoRunning ? (
                <>
                  <button style={{ ...S.btn, background: "#059669", padding: "12px 32px", fontSize: 15 }}
                    onClick={() => { if (pomoSeconds === 0) setPomoSeconds(pomoDuration * 60); setPomoRunning(true); }}>
                    {pomoSeconds < pomoDuration * 60 && pomoSeconds > 0 ? "Resume" : "Start"}
                  </button>
                  <button style={{ ...S.btn, background: "#333", padding: "12px 24px" }}
                    onClick={() => { setPomoActive(false); setPomoSeconds(pomoDuration * 60); setPomoRunning(false); }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button style={{ ...S.btn, background: "#d97706", padding: "12px 32px", fontSize: 15 }}
                  onClick={() => setPomoRunning(false)}>
                  Pause
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="cl-sidebar" style={{ ...S.sidebar, ...(sideOpen ? {} : S.sidebarCollapsed) }}>
        <div style={S.sidebarHeader}>
          <div style={S.logo}>
            <span style={S.logoIcon}>◇</span>
            {sideOpen && <span style={S.logoText}>CodeLedger</span>}
          </div>
          <button style={S.collapseBtn} onClick={() => setSideOpen(!sideOpen)}>{sideOpen ? "◂" : "▸"}</button>
        </div>
        <nav style={S.nav}>
          {navItems.map((item) => (
            <button key={item.id} style={{ ...S.navItem, ...(view === item.id ? S.navActive : {}) }}
              onClick={() => { setView(item.id); setSelLang(null); }}>
              <span style={S.navIcon}>{item.icon}</span>
              {sideOpen && <span style={{ flex: 1 }}>{item.label}</span>}
              {sideOpen && <span style={S.navKey}>{item.key}</span>}
            </button>
          ))}
        </nav>
        {sideOpen && (
          <div style={S.sidebarFooter}>
            <button style={S.pomoBtn} onClick={() => setPomoActive(true)}>
              <span>⏱</span> Start Pomodoro
            </button>
            <div style={S.streak}>
              <span>🔥</span> {profile.streakDays} day streak
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 4, fontFamily: "var(--mono)" }}>⌘K to search</div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>
        {view === "dashboard" && <Dashboard profile={profile} progress={progress} notes={notes} goals={goals} sessions={sessions}
          onNav={(v, l) => { setView(v); if (l) setSelLang(l); }} onStartPomo={() => setPomoActive(true)} />}
        {view === "languages" && !selLang && <LangsGrid progress={progress} onSelect={setSelLang} />}
        {view === "languages" && selLang && <LangDetail langId={selLang} data={progress[selLang]}
          notes={notes.filter((n) => n.langId === selLang)} onUpdate={(u) => updateProgress(selLang, u)}
          onBack={() => setSelLang(null)} onAddNote={(n) => { setNotes((p) => [n, ...p]); showToast("Note saved"); }} />}
        {view === "notes" && <NotesView notes={notes} onAdd={(n) => { setNotes((p) => [n, ...p]); showToast("Note created"); }}
          onDelete={(id) => { setNotes((p) => p.filter((n) => n.id !== id)); showToast("Note deleted"); }}
          onUpdate={(id, u) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...u } : n)))} />}
        {view === "goals" && <GoalsView goals={goals}
          onAdd={(g) => { setGoals((p) => [g, ...p]); showToast("Goal set"); }}
          onToggle={(id) => { setGoals((p) => p.map((g) => g.id === id ? { ...g, completed: !g.completed, completedAt: !g.completed ? new Date().toISOString() : null } : g)); showToast("Goal updated"); }}
          onDelete={(id) => { setGoals((p) => p.filter((g) => g.id !== id)); showToast("Goal removed"); }} />}
        {view === "sessions" && <SessionsView sessions={sessions} onLog={(s) => { logSession(s); showToast(`${s.minutes}m logged`); }}
          onStartPomo={() => setPomoActive(true)} />}
        {view === "review" && <ReviewView notes={notes} progress={progress} onMark={markReviewed} />}
        {view === "analytics" && <AnalyticsView sessions={sessions} progress={progress} notes={notes} goals={goals} profile={profile} />}
        {view === "settings" && <SettingsView profile={profile} onUpdate={(u) => setProfile((p) => ({ ...p, ...u }))}
          onExport={exportData} onImport={importData}
          onReset={() => { if (confirm("Erase ALL data permanently?")) { setProfile(defaultProfile()); setProgress(defaultProgress()); setNotes([]); setGoals([]); setSessions([]); showToast("All data reset"); } }} />}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════
// COMMAND PALETTE
// ══════════════════════════════════════════
function CommandPalette({ navItems, notes, goals, langs, onNavigate, onClose, onStartPomo }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    const items = [];
    // Nav
    navItems.forEach((n) => { if (!q || n.label.toLowerCase().includes(q)) items.push({ type: "nav", label: n.label, icon: n.icon, action: () => onNavigate(n.id) }); });
    // Languages
    langs.forEach((l) => { if (!q || l.name.toLowerCase().includes(q)) items.push({ type: "lang", label: l.name, icon: l.icon, color: l.color, action: () => onNavigate("languages", l.id) }); });
    // Pomodoro
    if (!q || "pomodoro".includes(q) || "timer".includes(q)) items.push({ type: "action", label: "Start Pomodoro Timer", icon: "⏱", action: onStartPomo });
    // Notes
    notes.slice(0, 50).forEach((n) => { if (q && (n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q))) items.push({ type: "note", label: n.title, icon: "✎", action: () => onNavigate("notes") }); });
    // Goals
    goals.slice(0, 30).forEach((g) => { if (q && g.title.toLowerCase().includes(q)) items.push({ type: "goal", label: g.title, icon: "◎", action: () => onNavigate("goals") }); });
    return items.slice(0, 12);
  }, [query, navItems, notes, goals, langs, onNavigate, onStartPomo]);

  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [query]);

  const handleKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[sel]) { results[sel].action(); }
    if (e.key === "Escape") onClose();
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.cmdModal} onClick={(e) => e.stopPropagation()}>
        <div style={S.cmdInputWrap}>
          <span style={{ color: "#555", fontSize: 16 }}>⌘</span>
          <input ref={inputRef} style={S.cmdInput} placeholder="Search commands, languages, notes..."
            value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKey} />
        </div>
        <div style={S.cmdResults}>
          {results.map((r, i) => (
            <button key={i} style={{ ...S.cmdItem, ...(i === sel ? S.cmdItemActive : {}) }}
              onClick={r.action} onMouseEnter={() => setSel(i)}>
              <span style={{ color: r.color || "#888", fontSize: 14 }}>{r.icon}</span>
              <span style={{ flex: 1, color: "#ddd" }}>{r.label}</span>
              <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase" }}>{r.type}</span>
            </button>
          ))}
          {results.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#555" }}>No results</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function Dashboard({ profile, progress, notes, goals, sessions, onNav, onStartPomo }) {
  const activeLangs = Object.entries(progress).filter(([, d]) => d.mastery > 0);
  const hours = Math.floor(profile.totalStudyMinutes / 60);
  const mins = profile.totalStudyMinutes % 60;
  const weekSessions = sessions.filter((s) => daysSince(s.date) < 7);
  const weekMins = weekSessions.reduce((a, s) => a + s.minutes, 0);
  const recentNotes = notes.slice(0, 4);
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 5);
  const todayMins = sessions.filter((s) => daysSince(s.date) === 0).reduce((a, s) => a + s.minutes, 0);

  // Top 5 languages by study time
  const topLangs = Object.entries(progress).filter(([, d]) => d.studyMinutes > 0).sort((a, b) => b[1].studyMinutes - a[1].studyMinutes).slice(0, 5);

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={S.vt}>
              {profile.name ? <><span style={{ fontFamily: "var(--serif)", fontWeight: 400, fontStyle: "italic", color: "#888" }}>Welcome back, </span>{profile.name}</> : "Your Learning Dashboard"}
            </h1>
            <p style={S.vs}>
              {hours > 0 ? `${hours}h ${mins}m invested` : "Start your first session"} · {pluralize(activeLangs.length, "language")} active · {pluralize(notes.length, "note")} captured
            </p>
          </div>
          <button style={{ ...S.btn, background: "linear-gradient(135deg, #059669, #047857)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}
            onClick={onStartPomo}>
            <span>⏱</span> Start Focus Session
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="cl-stats" style={S.statsRow}>
        {[
          { label: "Today", value: todayMins > 0 ? `${todayMins}m` : "—", accent: "#3178c6", sub: todayMins >= 60 ? "Great pace" : "Keep going" },
          { label: "This Week", value: weekMins > 0 ? `${Math.floor(weekMins / 60)}h ${weekMins % 60}m` : "—", accent: "#059669", sub: `${weekSessions.length} sessions` },
          { label: "Streak", value: `${profile.streakDays}`, accent: "#dc2626", sub: profile.streakDays >= 7 ? "On fire!" : "Build momentum" },
          { label: "Notes", value: notes.length, accent: "#d97706", sub: `${notes.filter((n) => !n.lastReviewed).length} unreviewed` },
          { label: "Goals", value: `${goals.filter((g) => g.completed).length}/${goals.length}`, accent: "#7c3aed", sub: `${goals.filter((g) => !g.completed).length} active` },
        ].map((s, i) => (
          <div key={i} className="cl-stat-card" style={S.statCard}>
            <div style={{ ...S.statAccent, background: s.accent }} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statValue}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Mastery map */}
      <section style={S.sec}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={S.secT}>Mastery Map</h2>
          <button style={S.linkBtn} onClick={() => onNav("languages")}>View all →</button>
        </div>
        <div style={S.mastGrid}>
          {LANGS.map((lang) => {
            const d = progress[lang.id];
            const pct = (d.mastery / 7) * 100;
            return (
              <button key={lang.id} className="cl-mast-card" style={S.mastCard} onClick={() => onNav("languages", lang.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...S.langDot, background: lang.color }}>{lang.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#ddd" }}>{lang.name}</span>
                </div>
                <div style={S.mastBar}><div style={{ ...S.mastFill, width: `${pct}%`, background: lang.color }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MASTERY[d.mastery].color, fontWeight: 600, fontSize: 10 }}>{MASTERY[d.mastery].label}</span>
                  {d.studyMinutes > 0 && <span style={{ fontSize: 10, color: "#555" }}>{Math.floor(d.studyMinutes / 60)}h</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Two columns */}
      <div className="cl-two-col" style={S.twoCol}>
        <section style={S.sec}>
          <h2 style={S.secT}>Recent Notes</h2>
          {recentNotes.length === 0 ? <p style={S.empty}>Capture your first insight.</p> : recentNotes.map((n) => {
            const l = LANG_MAP[n.langId];
            return (
              <div key={n.id} style={S.miniCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: l?.color || "#888", fontWeight: 600, fontSize: 11 }}>{l?.name || "General"}</span>
                  <span style={{ fontSize: 10, color: "#444" }}>{fmtDateShort(n.createdAt)}</span>
                </div>
                <div style={{ fontSize: 13, color: "#ccc" }}>{n.title}</div>
              </div>
            );
          })}
        </section>
        <section style={S.sec}>
          <h2 style={S.secT}>Active Goals</h2>
          {activeGoals.length === 0 ? <p style={S.empty}>Set your first target.</p> : activeGoals.map((g) => {
            const l = LANG_MAP[g.langId];
            const overdue = g.deadline && new Date(g.deadline) < new Date();
            return (
              <div key={g.id} style={S.miniCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: l?.color || "#7c3aed", fontSize: 12 }}>◎</span>
                  <span style={{ fontSize: 13, color: "#ccc", flex: 1 }}>{g.title}</span>
                  {g.deadline && <span style={{ fontSize: 10, color: overdue ? "#dc2626" : "#555" }}>{overdue ? "Overdue" : fmtDateShort(g.deadline)}</span>}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* Top languages bar chart */}
      {topLangs.length > 0 && (
        <section style={S.sec}>
          <h2 style={S.secT}>Top Languages by Study Time</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topLangs.map(([id, d]) => {
              const l = LANG_MAP[id];
              const maxM = topLangs[0][1].studyMinutes;
              const pct = (d.studyMinutes / maxM) * 100;
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 90, fontSize: 12, color: l.color, fontWeight: 600, textAlign: "right" }}>{l.name}</span>
                  <div style={{ flex: 1, height: 20, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
                    <div className="cl-bar-fill" style={{ height: "100%", width: `${pct}%`, background: l.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                  </div>
                  <span style={{ width: 50, fontSize: 11, color: "#888", fontFamily: "var(--mono)", textAlign: "right" }}>{Math.floor(d.studyMinutes / 60)}h {d.studyMinutes % 60}m</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// LANGUAGES GRID
// ══════════════════════════════════════════
function LangsGrid({ progress, onSelect }) {
  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <h1 style={S.vt}>Languages & Frameworks</h1>
        <p style={S.vs}>Select a language to track topics, adjust mastery, and log notes.</p>
      </header>
      <div style={S.langGrid}>
        {LANGS.map((lang) => {
          const d = progress[lang.id];
          return (
            <button key={lang.id} className="cl-lang-card" style={S.langCard} onClick={() => onSelect(lang.id)}>
              <div style={{ ...S.langIcon, borderColor: lang.color, color: lang.color }}>{lang.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{lang.name}</div>
              <div style={{ color: MASTERY[d.mastery].color, fontSize: 12, fontWeight: 600 }}>{MASTERY[d.mastery].label}</div>
              <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#555" }}>
                {d.studyMinutes > 0 && <span>{Math.floor(d.studyMinutes / 60)}h</span>}
                {d.topics.length > 0 && <span>{d.topics.length} topics</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// LANGUAGE DETAIL
// ══════════════════════════════════════════
function LangDetail({ langId, data, notes, onUpdate, onBack, onAddNote }) {
  const lang = LANG_MAP[langId];
  const [newTopic, setNewTopic] = useState("");
  const [noteForm, setNoteForm] = useState(null); // null = hidden

  const addTopic = () => {
    if (!newTopic.trim()) return;
    onUpdate((p) => ({ topics: [...(p.topics || []), { id: uid(), name: newTopic.trim(), completed: false, addedAt: new Date().toISOString() }] }));
    setNewTopic("");
  };
  const toggleTopic = (tid) => onUpdate((p) => ({ topics: p.topics.map((t) => t.id === tid ? { ...t, completed: !t.completed } : t) }));
  const removeTopic = (tid) => onUpdate((p) => ({ topics: p.topics.filter((t) => t.id !== tid) }));

  const submitNote = () => {
    if (!noteForm?.title?.trim()) return;
    onAddNote({
      id: uid(), langId, title: noteForm.title.trim(), content: noteForm.content?.trim() || "",
      tags: (noteForm.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(), reviewCount: 0, lastReviewed: null,
    });
    setNoteForm(null);
  };

  const done = (data.topics || []).filter((t) => t.completed).length;
  const total = (data.topics || []).length;

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <button style={S.backBtn} onClick={onBack}>← Back to Languages</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <div style={{ ...S.langDetailIcon, borderColor: lang.color, color: lang.color }}>{lang.icon}</div>
          <div>
            <h1 style={S.vt}>{lang.name}</h1>
            <p style={{ color: MASTERY[data.mastery].color, fontSize: 14, fontWeight: 600 }}>
              {MASTERY[data.mastery].label} — Level {data.mastery}/7
            </p>
            <p style={{ color: "#555", fontSize: 12, marginTop: 2 }}>Next: {MASTERY[data.mastery].next}</p>
          </div>
        </div>
      </header>

      {/* Mastery */}
      <section style={S.sec}>
        <h2 style={S.secT}>Mastery Level</h2>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {MASTERY.map((m) => (
            <button key={m.lv} onClick={() => onUpdate(() => ({ mastery: m.lv }))}
              style={{
                width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", transition: "all 0.2s", fontFamily: "var(--mono)",
                background: data.mastery >= m.lv ? m.color : "#222",
                border: data.mastery === m.lv ? `2px solid ${m.color}` : "2px solid transparent",
                boxShadow: data.mastery === m.lv ? `0 0 16px ${m.color}30` : "none",
              }} title={m.label}>
              {m.lv}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {MASTERY.map((m) => <span key={m.lv} style={{ width: 38, textAlign: "center", fontSize: 8, color: data.mastery === m.lv ? m.color : "#444" }}>{m.label}</span>)}
        </div>
      </section>

      {/* Topics */}
      <section style={S.sec}>
        <h2 style={S.secT}>Topics {total > 0 && <span style={{ color: "#555", fontWeight: 400 }}>({done}/{total})</span>}</h2>
        {total > 0 && <div style={S.mastBar}><div style={{ ...S.mastFill, width: `${(done / total) * 100}%`, background: lang.color }} /></div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 12 }}>
          {(data.topics || []).map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px" }}>
              <button style={{ ...S.chk, ...(t.completed ? { background: lang.color, borderColor: lang.color } : {}) }}
                onClick={() => toggleTopic(t.id)}>{t.completed && "✓"}</button>
              <span style={{ color: t.completed ? "#555" : "#ccc", fontSize: 13, flex: 1, textDecoration: t.completed ? "line-through" : "none" }}>{t.name}</span>
              <button style={S.removeBtn} onClick={() => removeTopic(t.id)}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Add a topic..." value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTopic()} />
          <button style={{ ...S.btn, background: lang.color }} onClick={addTopic}>Add</button>
        </div>
      </section>

      {/* Notes */}
      <section style={S.sec}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={S.secT}>Notes ({notes.length})</h2>
          <button style={{ ...S.btn, background: lang.color }} onClick={() => setNoteForm(noteForm ? null : { title: "", content: "", tags: "" })}>
            {noteForm ? "Cancel" : "+ Note"}
          </button>
        </div>
        {noteForm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <input style={S.input} placeholder="Note title" value={noteForm.title}
              onChange={(e) => setNoteForm((p) => ({ ...p, title: e.target.value }))} />
            <textarea style={{ ...S.input, minHeight: 100, resize: "vertical", fontFamily: "var(--mono)" }}
              placeholder="Notes, code snippets, insights..." value={noteForm.content}
              onChange={(e) => setNoteForm((p) => ({ ...p, content: e.target.value }))} />
            <input style={S.input} placeholder="Tags (comma-separated)" value={noteForm.tags}
              onChange={(e) => setNoteForm((p) => ({ ...p, tags: e.target.value }))} />
            <button style={{ ...S.btn, background: lang.color }} onClick={submitNote}>Save Note</button>
          </div>
        )}
        {notes.map((n) => <NoteCard key={n.id} note={n} />)}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════
// SHARED: Note Card
// ══════════════════════════════════════════
function NoteCard({ note, onDelete, showLang = false }) {
  const [open, setOpen] = useState(false);
  const lang = LANG_MAP[note.langId];
  return (
    <div style={S.noteCard}>
      <div style={S.noteHeader} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {showLang && lang && <span style={{ color: lang.color, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{lang.name}</span>}
          <span style={{ fontWeight: 600, fontSize: 13, color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "#444" }}>{fmtDateShort(note.createdAt)}</span>
          {onDelete && <button style={S.removeBtn} onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}>×</button>}
          <span style={{ color: "#444", fontSize: 12 }}>{open ? "▴" : "▾"}</span>
        </div>
      </div>
      {open && note.content && <pre style={S.noteContent}>{note.content}</pre>}
      {note.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {note.tags.map((t, i) => <span key={i} style={{ ...S.tag, borderColor: lang?.color || "#3178c6", color: lang?.color || "#3178c6" }}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// NOTES VIEW
// ══════════════════════════════════════════
function NotesView({ notes, onAdd, onDelete, onUpdate }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", langId: "", tags: "" });

  const filtered = notes
    .filter((n) => filter === "all" || n.langId === filter)
    .filter((n) => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase()) || n.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())));

  const submit = () => {
    if (!form.title.trim()) return;
    onAdd({ id: uid(), langId: form.langId || null, title: form.title.trim(), content: form.content.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), createdAt: new Date().toISOString(), reviewCount: 0, lastReviewed: null });
    setForm({ title: "", content: "", langId: "", tags: "" }); setShowForm(false);
  };

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: 8 }}>
          <div><h1 style={S.vt}>Notes</h1><p style={S.vs}>{pluralize(notes.length, "note")} across all languages</p></div>
          <button style={{ ...S.btn, background: "#3178c6" }} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New Note"}</button>
        </div>
      </header>
      {showForm && (
        <div style={{ ...S.sec, display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={S.input} placeholder="Note title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select style={S.input} value={form.langId} onChange={(e) => setForm((p) => ({ ...p, langId: e.target.value }))}>
            <option value="">General</option>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <textarea style={{ ...S.input, minHeight: 120, resize: "vertical", fontFamily: "var(--mono)" }} placeholder="Notes, code, insights..." value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
          <input style={S.input} placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
          <button style={{ ...S.btn, background: "#3178c6" }} onClick={submit}>Save Note</button>
        </div>
      )}
      <div className="cl-filter-row" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input style={{ ...S.input, flex: 1, minWidth: 180 }} placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={{ ...S.input, width: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Languages</option>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? <p style={S.empty}>{search ? "No matches." : "No notes yet."}</p>
        : filtered.map((n) => <NoteCard key={n.id} note={n} onDelete={onDelete} showLang />)}
    </div>
  );
}

// ══════════════════════════════════════════
// GOALS VIEW
// ══════════════════════════════════════════
function GoalsView({ goals, onAdd, onToggle, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", langId: "", deadline: "", description: "" });
  const [tab, setTab] = useState("active");

  const submit = () => {
    if (!form.title.trim()) return;
    onAdd({ id: uid(), title: form.title.trim(), langId: form.langId || null, deadline: form.deadline || null,
      description: form.description.trim(), completed: false, completedAt: null, createdAt: new Date().toISOString() });
    setForm({ title: "", langId: "", deadline: "", description: "" }); setShowForm(false);
  };

  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);
  const displayed = tab === "active" ? active : completed;

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: 8 }}>
          <div><h1 style={S.vt}>Goals</h1><p style={S.vs}>{active.length} active · {completed.length} completed</p></div>
          <button style={{ ...S.btn, background: "#7c3aed" }} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ New Goal"}</button>
        </div>
      </header>
      {showForm && (
        <div style={{ ...S.sec, display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={S.input} placeholder="Goal title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select style={S.input} value={form.langId} onChange={(e) => setForm((p) => ({ ...p, langId: e.target.value }))}>
            <option value="">General</option>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input style={S.input} type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
          <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <button style={{ ...S.btn, background: "#7c3aed" }} onClick={submit}>Set Goal</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button style={{ ...S.tabBtn, ...(tab === "active" ? S.tabActive : {}) }} onClick={() => setTab("active")}>Active ({active.length})</button>
        <button style={{ ...S.tabBtn, ...(tab === "completed" ? S.tabActive : {}) }} onClick={() => setTab("completed")}>Completed ({completed.length})</button>
      </div>
      {displayed.length === 0 ? <p style={S.empty}>{tab === "active" ? "No active goals." : "Nothing completed yet."}</p>
        : displayed.map((g) => {
          const l = LANG_MAP[g.langId]; const overdue = g.deadline && !g.completed && new Date(g.deadline) < new Date();
          return (
            <div key={g.id} style={{ ...S.goalCard, ...(overdue ? { borderColor: "#dc2626" } : {}) }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <button style={{ ...S.chk, ...(g.completed ? { background: "#059669", borderColor: "#059669" } : {}) }} onClick={() => onToggle(g.id)}>{g.completed && "✓"}</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: g.completed ? "#555" : "#ddd", textDecoration: g.completed ? "line-through" : "none" }}>{g.title}</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, marginTop: 4, flexWrap: "wrap" }}>
                    {l && <span style={{ color: l.color }}>{l.name}</span>}
                    {g.deadline && <span style={{ color: overdue ? "#dc2626" : "#666" }}>{overdue ? "Overdue: " : "Due: "}{fmtDate(g.deadline)}</span>}
                    {g.completedAt && <span style={{ color: "#059669" }}>Done {fmtDate(g.completedAt)}</span>}
                  </div>
                  {g.description && <p style={{ color: "#666", fontSize: 12, marginTop: 6 }}>{g.description}</p>}
                </div>
                <button style={S.removeBtn} onClick={() => onDelete(g.id)}>×</button>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ══════════════════════════════════════════
// SESSIONS VIEW
// ══════════════════════════════════════════
function SessionsView({ sessions, onLog, onStartPomo }) {
  const [form, setForm] = useState({ langId: "", minutes: 30, description: "" });

  const submit = () => {
    if (!form.minutes || form.minutes < 1) return;
    onLog({ id: uid(), langId: form.langId || null, minutes: parseInt(form.minutes), description: form.description.trim(), date: new Date().toISOString(), type: "manual" });
    setForm({ langId: "", minutes: 30, description: "" });
  };

  // Heatmap
  const today = new Date();
  const startDate = new Date(today); startDate.setDate(startDate.getDate() - 90); startDate.setDate(startDate.getDate() - startDate.getDay());
  const hm = []; const cursor = new Date(startDate);
  while (cursor <= today) { const ds = cursor.toISOString().slice(0, 10); const m = sessions.filter((s) => s.date.slice(0, 10) === ds).reduce((a, s) => a + s.minutes, 0); hm.push({ date: ds, mins: m, row: cursor.getDay() }); cursor.setDate(cursor.getDate() + 1); }
  while (hm.length % 7 !== 0) hm.push(null);
  const maxM = Math.max(1, ...hm.filter(Boolean).map((d) => d.mins));
  const weeks = Math.ceil(hm.length / 7);

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div><h1 style={S.vt}>Study Sessions</h1><p style={S.vs}>{pluralize(sessions.length, "session")} logged</p></div>
          <button style={{ ...S.btn, background: "linear-gradient(135deg, #059669, #047857)", display: "flex", alignItems: "center", gap: 8 }}
            onClick={onStartPomo}><span>⏱</span> Pomodoro</button>
        </div>
      </header>

      <section style={S.sec}>
        <h2 style={S.secT}>Log a Session</h2>
        <div className="cl-session-form" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <select style={S.input} value={form.langId} onChange={(e) => setForm((p) => ({ ...p, langId: e.target.value }))}>
            <option value="">General</option>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input style={{ ...S.input, width: 70 }} type="number" min="1" max="720" value={form.minutes} onChange={(e) => setForm((p) => ({ ...p, minutes: e.target.value }))} />
            <span style={{ color: "#666", fontSize: 12 }}>min</span>
          </div>
          <input style={{ ...S.input, flex: 1, minWidth: 150 }} placeholder="What did you work on?" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <button style={{ ...S.btn, background: "#059669" }} onClick={submit}>Log</button>
        </div>
      </section>

      <section style={S.sec}>
        <h2 style={S.secT}>Last 90 Days</h2>
        <div style={{ display: "inline-grid", gridTemplateRows: "repeat(7, 12px)", gridTemplateColumns: `repeat(${weeks}, 12px)`, gridAutoFlow: "column", gap: 3, overflowX: "auto" }}>
          {hm.map((d, i) => d ? <div key={i} title={`${d.date}: ${d.mins}m`} style={{ width: 10, height: 10, borderRadius: 2, background: d.mins === 0 ? "#161616" : `rgba(5, 150, 105, ${Math.max(0.25, d.mins / maxM)})` }} /> : <div key={i} style={{ width: 10, height: 10 }} />)}
        </div>
      </section>

      <section style={S.sec}>
        <h2 style={S.secT}>History</h2>
        {sessions.length === 0 && <p style={S.empty}>No sessions yet.</p>}
        {sessions.slice(0, 40).map((s) => { const l = LANG_MAP[s.langId]; return (
          <div key={s.id} className="cl-session-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #1a1a1a", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              {l && <span style={{ color: l.color, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{l.name}</span>}
              <span style={{ color: "#bbb", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description || "Study session"}</span>
              {s.type === "pomodoro" && <span style={{ fontSize: 10, color: "#059669", border: "1px solid #059669", padding: "1px 6px", borderRadius: 8 }}>⏱</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <span style={{ color: "#059669", fontWeight: 600, fontFamily: "var(--mono)", fontSize: 13 }}>{s.minutes}m</span>
              <span style={{ color: "#444", fontSize: 11 }}>{fmtDateShort(s.date)} {fmtTime(s.date)}</span>
            </div>
          </div>
        ); })}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════
// REVIEW VIEW — Flashcard mode + list
// ══════════════════════════════════════════
function ReviewView({ notes, progress, onMark }) {
  const [mode, setMode] = useState("list"); // list | flashcard
  const [fcIdx, setFcIdx] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);

  const due = notes.filter((n) => { if (!n.lastReviewed) return true; return daysSince(n.lastReviewed) >= Math.pow(2, n.reviewCount || 0); });
  const stale = Object.entries(progress).filter(([, d]) => d.mastery > 0 && d.lastStudied && daysSince(d.lastStudied) > 7).sort((a, b) => daysSince(b[1].lastStudied) - daysSince(a[1].lastStudied));

  const fcNote = due[fcIdx];

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: 8 }}>
          <div><h1 style={S.vt}>Review & Reinforce</h1><p style={S.vs}>{pluralize(due.length, "note")} due for review</p></div>
          {due.length > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ ...S.tabBtn, ...(mode === "list" ? S.tabActive : {}) }} onClick={() => setMode("list")}>List</button>
              <button style={{ ...S.tabBtn, ...(mode === "flashcard" ? S.tabActive : {}) }} onClick={() => { setMode("flashcard"); setFcIdx(0); setFcFlipped(false); }}>Flashcards</button>
            </div>
          )}
        </div>
      </header>

      {mode === "flashcard" && fcNote ? (
        <section style={S.sec}>
          <div style={{ textAlign: "center", marginBottom: 12, color: "#555", fontSize: 12 }}>{fcIdx + 1} / {due.length}</div>
          <div className="cl-flashcard" style={S.flashcard} onClick={() => setFcFlipped(!fcFlipped)}>
            {!fcFlipped ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: LANG_MAP[fcNote.langId]?.color || "#888", marginBottom: 8, fontWeight: 700 }}>{LANG_MAP[fcNote.langId]?.name || "General"}</div>
                <div style={{ fontSize: 20, color: "#fff", fontWeight: 700 }}>{fcNote.title}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 16 }}>Tap to reveal</div>
              </div>
            ) : (
              <div style={{ textAlign: "left", width: "100%" }}>
                <div style={{ fontSize: 14, color: "#ddd", fontWeight: 600, marginBottom: 8 }}>{fcNote.title}</div>
                {fcNote.content ? <pre style={{ ...S.noteContent, maxHeight: 200 }}>{fcNote.content}</pre> : <p style={{ color: "#666", fontStyle: "italic" }}>No content</p>}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
            <button style={{ ...S.btn, background: "#333" }} onClick={() => { setFcFlipped(false); setFcIdx((i) => Math.max(0, i - 1)); }}>← Prev</button>
            <button style={{ ...S.btn, background: "#059669" }} onClick={() => { onMark(fcNote.id); setFcFlipped(false); if (fcIdx < due.length - 1) setFcIdx(fcIdx + 1); else setMode("list"); }}>✓ Got it</button>
            <button style={{ ...S.btn, background: "#333" }} onClick={() => { setFcFlipped(false); setFcIdx((i) => Math.min(due.length - 1, i + 1)); }}>Next →</button>
          </div>
        </section>
      ) : (
        <section style={S.sec}>
          <h2 style={S.secT}>Due Notes ({due.length})</h2>
          {due.length === 0 ? <p style={S.empty}>All caught up!</p> : due.slice(0, 15).map((n) => {
            const l = LANG_MAP[n.langId];
            return (
              <div key={n.id} style={S.noteCard}>
                <div style={{ ...S.noteHeader, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 150 }}>
                    {l && <span style={{ color: l.color, fontWeight: 700, fontSize: 11 }}>{l.name}</span>}
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#ddd" }}>{n.title}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#555", fontFamily: "var(--mono)" }}>×{n.reviewCount || 0}</span>
                    <span style={{ fontSize: 10, color: "#444" }}>{n.lastReviewed ? `${daysSince(n.lastReviewed)}d ago` : "never"}</span>
                    <button style={{ ...S.btn, background: "#059669", padding: "5px 12px", fontSize: 11 }} onClick={() => onMark(n.id)}>✓ Reviewed</button>
                  </div>
                </div>
                {n.content && <pre style={{ ...S.noteContent, maxHeight: 120 }}>{n.content}</pre>}
              </div>
            );
          })}
        </section>
      )}

      <section style={S.sec}>
        <h2 style={S.secT}>Stale Languages</h2>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 10 }}>Not studied in 7+ days</p>
        {stale.length === 0 ? <p style={S.empty}>Nothing stale. Consistent across the board.</p> : stale.map(([id, d]) => {
          const l = LANG_MAP[id];
          return <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#0d0d0d", borderRadius: 6, marginBottom: 4, border: "1px solid #1a1a1a" }}>
            <span style={{ color: l.color, fontWeight: 700 }}>{l.icon} {l.name}</span>
            <span style={{ color: "#dc2626", fontSize: 12 }}>{daysSince(d.lastStudied)}d idle</span>
          </div>;
        })}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════
// ANALYTICS VIEW
// ══════════════════════════════════════════
function AnalyticsView({ sessions, progress, notes, goals, profile }) {
  // Weekly trend (last 8 weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let w = 7; w >= 0; w--) {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
      const label = fmtDateShort(weekStart);
      const mins = sessions.filter((s) => { const d = new Date(s.date); return d >= weekStart && d <= weekEnd; }).reduce((a, s) => a + s.minutes, 0);
      weeks.push({ label, mins });
    }
    return weeks;
  }, [sessions]);

  const maxWeekMins = Math.max(1, ...weeklyData.map((w) => w.mins));

  // Language distribution
  const langDist = useMemo(() => {
    return Object.entries(progress)
      .filter(([, d]) => d.studyMinutes > 0)
      .sort((a, b) => b[1].studyMinutes - a[1].studyMinutes);
  }, [progress]);

  const totalStudyMins = langDist.reduce((a, [, d]) => a + d.studyMinutes, 0) || 1;

  // Session types
  const pomoSessions = sessions.filter((s) => s.type === "pomodoro").length;
  const manualSessions = sessions.length - pomoSessions;

  // Completion rate
  const completedGoals = goals.filter((g) => g.completed).length;
  const goalRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

  // Notes per week (last 4)
  const notesPerWeek = useMemo(() => {
    const w = [0, 0, 0, 0];
    notes.forEach((n) => { const d = daysSince(n.createdAt); if (d < 7) w[0]++; else if (d < 14) w[1]++; else if (d < 21) w[2]++; else if (d < 28) w[3]++; });
    return w;
  }, [notes]);

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}>
        <h1 style={S.vt}>Analytics</h1>
        <p style={S.vs}>Deep dive into your learning patterns and progress.</p>
      </header>

      {/* Summary cards */}
      <div className="cl-stats" style={S.statsRow}>
        {[
          { label: "Total Study Time", value: `${Math.floor(profile.totalStudyMinutes / 60)}h ${profile.totalStudyMinutes % 60}m`, accent: "#3178c6" },
          { label: "Pomodoros", value: pomoSessions, accent: "#059669" },
          { label: "Manual Logs", value: manualSessions, accent: "#d97706" },
          { label: "Goal Completion", value: `${goalRate}%`, accent: "#7c3aed" },
          { label: "Avg Notes/Week", value: (notesPerWeek.reduce((a, b) => a + b, 0) / 4).toFixed(1), accent: "#dc2626" },
        ].map((s, i) => (
          <div key={i} className="cl-stat-card" style={S.statCard}>
            <div style={{ ...S.statAccent, background: s.accent }} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statValue}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Weekly trend */}
      <section style={S.sec}>
        <h2 style={S.secT}>Weekly Study Trend</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px" }}>
          {weeklyData.map((w, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#666", fontFamily: "var(--mono)" }}>{w.mins > 0 ? `${Math.floor(w.mins / 60)}h` : ""}</span>
              <div style={{ width: "100%", maxWidth: 40, borderRadius: 4, background: w.mins > 0 ? `rgba(49, 120, 198, ${Math.max(0.3, w.mins / maxWeekMins)})` : "#161616", height: `${Math.max(4, (w.mins / maxWeekMins) * 100)}%`, transition: "height 0.4s ease" }} />
              <span style={{ fontSize: 9, color: "#444" }}>{w.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Language distribution */}
      {langDist.length > 0 && (
        <section style={S.sec}>
          <h2 style={S.secT}>Language Distribution</h2>
          <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
            {langDist.map(([id, d]) => {
              const l = LANG_MAP[id]; const pct = (d.studyMinutes / totalStudyMins) * 100;
              return <div key={id} title={`${l.name}: ${Math.round(pct)}%`} style={{ width: `${pct}%`, background: l.color, minWidth: pct > 3 ? 2 : 0 }} />;
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {langDist.slice(0, 8).map(([id, d]) => {
              const l = LANG_MAP[id];
              return <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ color: "#bbb" }}>{l.name}</span>
                <span style={{ color: "#555", fontFamily: "var(--mono)" }}>{Math.round((d.studyMinutes / totalStudyMins) * 100)}%</span>
              </div>;
            })}
          </div>
        </section>
      )}

      {/* Notes per week */}
      <section style={S.sec}>
        <h2 style={S.secT}>Notes Created (Last 4 Weeks)</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 80 }}>
          {notesPerWeek.map((n, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#ddd", fontFamily: "var(--mono)" }}>{n}</span>
              <div style={{ width: "100%", maxWidth: 60, height: Math.max(4, (n / Math.max(1, ...notesPerWeek)) * 40), background: "#d97706", borderRadius: 4, transition: "height 0.3s" }} />
              <span style={{ fontSize: 10, color: "#555" }}>{["This wk", "1 wk ago", "2 wk ago", "3 wk ago"][i]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════
// SETTINGS VIEW
// ══════════════════════════════════════════
function SettingsView({ profile, onUpdate, onExport, onImport, onReset }) {
  const fileRef = useRef(null);

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImport(reader.result);
    reader.readAsText(file);
  };

  return (
    <div className="cl-view" style={S.vc}>
      <header style={S.vh}><h1 style={S.vt}>Settings</h1></header>

      <section style={S.sec}>
        <h2 style={S.secT}>Profile</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
          <label style={S.label}>Your Name</label>
          <input style={S.input} value={profile.name} placeholder="Enter your name" onChange={(e) => onUpdate({ name: e.target.value })} />
          <div style={{ color: "#555", fontSize: 12 }}>Tracking since {fmtDate(profile.startedAt)}</div>
        </div>
      </section>

      <section style={S.sec}>
        <h2 style={S.secT}>Data Management</h2>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 12 }}>Export your data as JSON for backup, or import a previous backup.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ ...S.btn, background: "#3178c6" }} onClick={onExport}>Export JSON</button>
          <button style={{ ...S.btn, background: "#333" }} onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
        </div>
      </section>

      <section style={S.sec}>
        <h2 style={{ ...S.secT, color: "#dc2626" }}>Danger Zone</h2>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 12 }}>Permanently delete all data. This cannot be undone.</p>
        <button style={{ ...S.btn, background: "#dc2626" }} onClick={onReset}>Reset All Data</button>
      </section>

      <section style={{ ...S.sec, borderColor: "#1a1a1a", background: "#0d0d0d" }}>
        <h2 style={S.secT}>Keyboard Shortcuts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 13 }}>
          {[["⌘ K", "Command palette"], ["Esc", "Close dialogs"], ["1-8", "Navigate views (via palette)"]].map(([k, v], idx) => (
            <Fragment key={idx}>
              <span style={{ fontFamily: "var(--mono)", color: "#888", background: "#1a1a1a", padding: "2px 8px", borderRadius: 4, fontSize: 11, textAlign: "center" }}>{k}</span>
              <span style={{ color: "#888" }}>{v}</span>
            </Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════
// CSS
// ══════════════════════════════════════════
const CSS = `
  :root { --mono: 'JetBrains Mono', monospace; --sans: 'DM Sans', sans-serif; --serif: 'Instrument Serif', serif; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #333; }
  ::selection { background: #3178c630; }
  textarea, input, select, button { font-family: var(--sans); }
  @keyframes pulse { 0%,100%{opacity:.3;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }
  @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .cl-loader { font-size: 48px; color: #3178c6; animation: pulse 1.8s infinite ease-in-out; }
  .cl-toast { animation: toastIn 0.25s ease; }
  .cl-stat-card:hover { border-color: #333 !important; }
  .cl-mast-card:hover { border-color: #333 !important; transform: translateY(-1px); }
  .cl-lang-card:hover { border-color: #333 !important; transform: translateY(-2px); }
  .cl-flashcard { cursor: pointer; transition: transform 0.2s; }
  .cl-flashcard:hover { transform: scale(1.01); }
  .cl-bar-fill { transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
  @media (max-width: 768px) {
    .cl-two-col { grid-template-columns: 1fr !important; }
    .cl-view { padding: 20px 14px !important; }
    .cl-stats { grid-template-columns: repeat(2, 1fr) !important; }
    .cl-filter-row { flex-direction: column !important; }
    .cl-session-form { flex-direction: column !important; align-items: stretch !important; }
    .cl-session-card { flex-direction: column !important; align-items: flex-start !important; }
    .cl-sidebar { display: none !important; }
  }
`;

// ══════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════
const S = {
  app: { display: "flex", height: "100vh", background: "#080808", color: "#e0e0e0", fontFamily: "var(--sans)", fontSize: 14, overflow: "hidden" },
  loadingScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", width: "100%", background: "#080808" },

  // Toast
  toast: { position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 500, color: "#fff", backdropFilter: "blur(12px)" },

  // Overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, animation: "fadeIn 0.15s ease" },

  // Command palette
  cmdModal: { width: "100%", maxWidth: 560, background: "#111", border: "1px solid #222", borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", animation: "slideIn 0.15s ease" },
  cmdInputWrap: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #1a1a1a" },
  cmdInput: { flex: 1, background: "none", border: "none", color: "#ddd", fontSize: 15, outline: "none", fontFamily: "var(--sans)" },
  cmdResults: { maxHeight: 340, overflowY: "auto" },
  cmdItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left" },
  cmdItemActive: { background: "#1a1a1a" },

  // Pomodoro
  pomoModal: { background: "#111", border: "1px solid #222", borderRadius: 16, padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", animation: "slideIn 0.2s ease" },
  pomoTime: { fontSize: 72, fontWeight: 300, color: "#fff", fontFamily: "var(--mono)", letterSpacing: -2, margin: "20px 0", lineHeight: 1 },

  // Sidebar
  sidebar: { width: 220, background: "#0b0b0b", borderRight: "1px solid #151515", display: "flex", flexDirection: "column", transition: "width 0.2s", flexShrink: 0, overflow: "hidden" },
  sidebarCollapsed: { width: 52 },
  sidebarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 12px", borderBottom: "1px solid #151515" },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoIcon: { fontSize: 22, color: "#3178c6", fontWeight: 700 },
  logoText: { fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "var(--mono)", letterSpacing: -0.5 },
  collapseBtn: { background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 14, padding: "4px 6px" },
  nav: { flex: 1, display: "flex", flexDirection: "column", padding: "8px 6px", gap: 1 },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 6, background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13, fontWeight: 500, textAlign: "left", transition: "all 0.15s", whiteSpace: "nowrap" },
  navActive: { background: "#141414", color: "#ddd" },
  navIcon: { fontSize: 14, width: 18, textAlign: "center", flexShrink: 0 },
  navKey: { fontSize: 10, color: "#333", fontFamily: "var(--mono)" },
  sidebarFooter: { padding: "12px", borderTop: "1px solid #151515", display: "flex", flexDirection: "column", gap: 8 },
  pomoBtn: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: "linear-gradient(135deg, #064e3b, #065f46)", border: "none", color: "#6ee7b7", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  streak: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666", fontFamily: "var(--mono)" },

  // Main
  main: { flex: 1, overflow: "auto", background: "#080808" },
  vc: { padding: "32px 40px", maxWidth: 1100, margin: "0 auto" },
  vh: { marginBottom: 28 },
  vt: { fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -0.5, fontFamily: "var(--sans)", lineHeight: 1.2 },
  vs: { color: "#555", fontSize: 13, marginTop: 4 },

  // Stats
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 28 },
  statCard: { background: "#0d0d0d", borderRadius: 8, padding: "14px 14px", position: "relative", overflow: "hidden", border: "1px solid #161616", transition: "border-color 0.2s" },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  statValue: { fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--mono)", marginTop: 2 },
  statLabel: { fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 },

  // Section
  sec: { marginBottom: 24, background: "#0d0d0d", borderRadius: 10, padding: "20px", border: "1px solid #161616" },
  secT: { fontSize: 14, fontWeight: 700, color: "#aaa", marginBottom: 14, fontFamily: "var(--mono)", letterSpacing: -0.3 },
  empty: { color: "#444", fontSize: 13, fontStyle: "italic", padding: "10px 0" },
  linkBtn: { background: "none", border: "none", color: "#3178c6", cursor: "pointer", fontSize: 12, fontWeight: 600 },

  // Mastery grid
  mastGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: 8 },
  mastCard: { background: "#0a0a0a", borderRadius: 8, padding: "12px", border: "1px solid #161616", cursor: "pointer", textAlign: "left", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 6 },
  langDot: { width: 22, height: 22, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff" },
  mastBar: { height: 3, borderRadius: 2, background: "#1a1a1a", overflow: "hidden", marginBottom: 4 },
  mastFill: { height: "100%", borderRadius: 2, transition: "width 0.4s ease" },

  // Lang grid
  langGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 },
  langCard: { background: "#0d0d0d", borderRadius: 10, padding: "22px 14px", border: "1px solid #161616", cursor: "pointer", textAlign: "center", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  langIcon: { width: 44, height: 44, borderRadius: 10, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  langDetailIcon: { width: 52, height: 52, borderRadius: 12, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 },

  // Notes
  noteCard: { background: "#0a0a0a", borderRadius: 8, border: "1px solid #161616", padding: "12px", marginBottom: 6 },
  noteHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  noteContent: { whiteSpace: "pre-wrap", fontSize: 12, color: "#888", fontFamily: "var(--mono)", marginTop: 10, lineHeight: 1.6, background: "#080808", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 280 },
  tag: { fontSize: 10, padding: "2px 8px", borderRadius: 10, border: "1px solid", fontWeight: 600 },
  miniCard: { padding: "8px 0", borderBottom: "1px solid #141414" },

  // Goals
  goalCard: { background: "#0a0a0a", borderRadius: 8, border: "1px solid #161616", padding: "14px", marginBottom: 6 },

  // Flashcard
  flashcard: { background: "linear-gradient(135deg, #111, #0d0d0d)", border: "1px solid #222", borderRadius: 16, padding: "40px 32px", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" },

  // Form elements
  input: { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: "10px 12px", color: "#ddd", fontSize: 13, outline: "none", fontFamily: "var(--sans)", transition: "border-color 0.15s" },
  btn: { padding: "10px 18px", borderRadius: 6, border: "none", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s" },
  label: { fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 },
  backBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13, fontWeight: 500, padding: 0 },
  chk: { width: 20, height: 20, borderRadius: 4, border: "2px solid #333", background: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.15s" },
  removeBtn: { background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1, transition: "color 0.15s" },
  tabBtn: { background: "none", border: "1px solid #1a1a1a", borderRadius: 6, padding: "7px 14px", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" },
  tabActive: { background: "#161616", color: "#ddd", borderColor: "#222" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
};
