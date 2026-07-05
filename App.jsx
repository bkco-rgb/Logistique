import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

// ════════ BK POCHETTE CONGO — Gestion de stock v2 ════════
// Deux interfaces : Utilisation quotidienne / Espace Gérant (mot de passe)

const C = {
  paper: "#F7F6F1",
  card: "#FFFFFF",
  ink: "#17171C",
  muted: "#71717A",
  border: "#E5E3DA",
  magenta: "#D6338F",
  magentaSoft: "#FBE9F3",
  cyan: "#0E96B5",
  cyanSoft: "#E5F5F9",
  amber: "#D99000",
  amberSoft: "#FBF1DA",
  red: "#D23A2B",
  redSoft: "#FBE7E4",
  violet: "#7C4DC4",
  violetSoft: "#F0E9FB",
  green: "#1E9E68",
  greenSoft: "#E4F5EC",
};

const PIE_COLORS = ["#D6338F", "#0E96B5", "#D99000", "#7C4DC4", "#1E9E68", "#D23A2B"];
const STORAGE_KEY = "bk-pochette-v2";
const BACKUP_KEY = "bk-pochette-v2-backup";
const DEFAULT_PASSWORD = "1705";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Stockage : utilise window.storage (artefact) sinon le localStorage du téléphone ──
const storageAPI = (typeof window !== "undefined" && window.storage) ? window.storage : {
  async get(key) {
    const v = localStorage.getItem(key);
    if (v === null) throw new Error("clé absente : " + key);
    return { key, value: v };
  },
  async set(key, value) { localStorage.setItem(key, value); return { key, value }; },
  async delete(key) { localStorage.removeItem(key); return { key, deleted: true }; },
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const IPHONES = [
  "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
  "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
  "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
  "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
  "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
  "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
  "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
  "iPhone 17", "iPhone 17e", "iPhone 17 Pro", "iPhone 17 Pro Max",
];
const SAMSUNGS = [
  "Galaxy S10e", "Galaxy S10", "Galaxy S10+", "Galaxy S10 5G", "Galaxy S10 Lite",
  "Galaxy S20", "Galaxy S20+", "Galaxy S20 Ultra", "Galaxy S20 FE",
  "Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S21 FE",
  "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra",
  "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S23 FE",
  "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S24 FE",
  "Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra", "Galaxy S25 Slim",
  "Galaxy S26", "Galaxy S26+", "Galaxy S26 Ultra",
  "Galaxy Note 8", "Galaxy Note 9", "Galaxy Note 10", "Galaxy Note 10+", "Galaxy Note 10 Lite",
  "Galaxy Note 20", "Galaxy Note 20 Ultra",
  "Galaxy Z Flip3", "Galaxy Z Fold3", "Galaxy Z Flip4", "Galaxy Z Fold4",
  "Galaxy Z Flip5", "Galaxy Z Fold5", "Galaxy Z Flip6", "Galaxy Z Fold6",
  "Galaxy Z Flip7", "Galaxy Z Fold7", "Galaxy Z Flip8", "Galaxy Z Fold8",
];

const initialBrands = () => [
  {
    id: "brand-apple",
    name: "Apple (iPhone)",
    models: IPHONES.map((n, i) => ({ id: "ap-" + i, name: n, qty: 0, threshold: null, stocked: false, costPrice: null, goal: null })),
  },
  {
    id: "brand-samsung",
    name: "Samsung",
    models: SAMSUNGS.map((n, i) => ({ id: "sa-" + i, name: n, qty: 0, threshold: null, stocked: false, costPrice: null, goal: null })),
  },
];

// Migration : garantit que les anciens modèles ont bien tous les champs (prix, etc.)
const migrateBrands = (bs) =>
  (bs || []).map((b) => ({ ...b, models: (b.models || []).map((m) => ({ costPrice: null, goal: null, ...m })) }));


// ── Logo BK Pochette (bleu, façon icône d'app) ──
function LogoBK({ size = 84 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ display: "block", filter: "drop-shadow(0 6px 16px rgba(30,58,204,.35))" }}>
      <defs>
        <linearGradient id="bkg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#486AF5" />
          <stop offset="1" stopColor="#1830BE" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="115" fill="url(#bkg)" />
      <ellipse cx="256" cy="70" rx="330" ry="180" fill="rgba(255,255,255,.10)" />
      <circle cx="109" cy="109" r="36" fill="rgba(255,255,255,.16)" />
      <circle cx="109" cy="109" r="23" fill="#10208C" />
      <circle cx="109" cy="109" r="15" fill="#5A82FF" />
      <circle cx="104" cy="102" r="5" fill="rgba(255,255,255,.75)" />
      <text x="262" y="342" textAnchor="middle" fontFamily="'Space Grotesk', Arial, sans-serif" fontWeight="700" fontSize="235" fill="rgba(10,22,110,.85)" transform="translate(7,8)">BK</text>
      <text x="262" y="342" textAnchor="middle" fontFamily="'Space Grotesk', Arial, sans-serif" fontWeight="700" fontSize="235" fill="#FFFFFF">BK</text>
      <path d="M403 102 l8 17 17 8 -17 8 -8 17 -8 -17 -17 -8 17 -8 z" fill="#FF5CB0" />
    </svg>
  );
}

// ── Petits composants UI ──
function Badge({ children, bg, fg }) {
  return (
    <span style={{ background: bg, color: fg, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 99, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function KPI({ label, value, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.ink, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function InkLevel({ qty, threshold, max }) {
  const ratio = max > 0 ? Math.min(qty / max, 1) : 0;
  const status = qty <= 0 ? "empty" : qty <= threshold ? "low" : "ok";
  const color = status === "empty" ? C.red : status === "low" ? C.amber : C.cyan;
  const segments = 10;
  const filled = Math.round(ratio * segments);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 10, borderRadius: 2, background: i < filled ? color : "#EDECE5", border: `1px solid ${i < filled ? color : C.border}`, transition: "background 300ms" }} />
      ))}
    </div>
  );
}

// Bouton de suppression à double confirmation (pas de popup)
function DangerButton({ onConfirm, label = "🗑", confirmLabel = "Confirmer ?", style: st }) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 3000);
    return () => clearTimeout(t);
  }, [arm]);
  return (
    <button
      onClick={() => { if (arm) { onConfirm(); setArm(false); } else setArm(true); }}
      style={{ background: arm ? C.red : "transparent", color: arm ? "#FFF" : C.red, border: `1.5px solid ${arm ? C.red : C.redSoft}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", ...st }}
    >
      {arm ? confirmLabel : label}
    </button>
  );
}

export default function BKPochetteStock() {
  const [loaded, setLoaded] = useState(false);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [globalThreshold, setGlobalThreshold] = useState(5);
  const [currency, setCurrency] = useState("FC");
  const [defaultCost, setDefaultCost] = useState(0);   // coût d'achat global par pochette
  const [globalGoal, setGlobalGoal] = useState(0);     // objectif de stock par défaut
  const [budgetCap, setBudgetCap] = useState(0);       // plafond budgétaire
  const [budgetPeriod, setBudgetPeriod] = useState("week"); // week | month
  const [scoreHistory, setScoreHistory] = useState([]);    // scores de santé hebdomadaires (J)
  const [brands, setBrands] = useState([]);
  const [movements, setMovements] = useState([]);
  const [annexes, setAnnexes] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);

  const [view, setView] = useState("home"); // home | daily | admin | login
  const [adminTab, setAdminTab] = useState("dash");
  const [toast, setToast] = useState(null);

  // Connexion
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  // ── Chargement / sauvegarde persistante (double copie anti-perte) ──
  useEffect(() => {
    (async () => {
      let data = null;
      let recovered = false;
      try {
        const res = await storageAPI.get(STORAGE_KEY);
        if (res && res.value) data = JSON.parse(res.value);
      } catch (e) { /* clé principale absente ou illisible */ }
      if (!data) {
        // La copie de secours prend le relais si la principale est perdue ou corrompue
        try {
          const res = await storageAPI.get(BACKUP_KEY);
          if (res && res.value) { data = JSON.parse(res.value); recovered = true; }
        } catch (e) { /* pas de secours non plus : première utilisation */ }
      }
      if (data) {
        setPassword(data.password || DEFAULT_PASSWORD);
        setGlobalThreshold(data.globalThreshold ?? 5);
        setCurrency(data.currency || "FC");
        setDefaultCost(data.defaultCost ?? 0);
        setGlobalGoal(data.globalGoal ?? 0);
        setBudgetCap(data.budgetCap ?? 0);
        setBudgetPeriod(data.budgetPeriod || "week");
        setScoreHistory(data.scoreHistory || []);
        setBrands(migrateBrands(data.brands) .length ? migrateBrands(data.brands) : initialBrands());
        setMovements(data.movements || []);
        setAnnexes(data.annexes || []);
      } else {
        setBrands(initialBrands());
      }
      setLoaded(true);
      if (recovered) setTimeout(() => setToast("✓ Données restaurées depuis la copie de secours."), 400);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const payload = JSON.stringify({ password, globalThreshold, currency, defaultCost, globalGoal, budgetCap, budgetPeriod, scoreHistory, brands, movements, annexes, savedAt: new Date().toISOString() });
      let ok = false;
      try {
        await storageAPI.set(STORAGE_KEY, payload);
        ok = true;
      } catch (e) { console.error("Sauvegarde principale impossible", e); }
      try {
        await storageAPI.set(BACKUP_KEY, payload);
        ok = true;
      } catch (e) { console.error("Copie de secours impossible", e); }
      if (ok) setLastSaved(nowTime());
      else setToast("⚠ Sauvegarde impossible — vérifie ta connexion, puis refais une action.");
    })();
  }, [password, globalThreshold, currency, defaultCost, globalGoal, budgetCap, budgetPeriod, scoreHistory, brands, movements, annexes, loaded]);

  // ── Export / Import (transfert vers un autre téléphone) ──
  const buildExport = () =>
    JSON.stringify({ app: "bk-pochette-congo", version: 2, exportedAt: new Date().toISOString(), password, globalThreshold, currency, defaultCost, globalGoal, budgetCap, budgetPeriod, scoreHistory, brands, movements, annexes }, null, 2);

  const importData = (text) => {
    try {
      const d = JSON.parse(text);
      if (!Array.isArray(d.brands)) throw new Error("format");
      setPassword(d.password || DEFAULT_PASSWORD);
      setGlobalThreshold(d.globalThreshold ?? 5);
      setCurrency(d.currency || "FC");
      setDefaultCost(d.defaultCost ?? 0);
      setGlobalGoal(d.globalGoal ?? 0);
      setBudgetCap(d.budgetCap ?? 0);
      setBudgetPeriod(d.budgetPeriod || "week");
      setScoreHistory(d.scoreHistory || []);
      setBrands(migrateBrands(d.brands));
      setMovements(d.movements || []);
      setAnnexes(d.annexes || []);
      showToast("✓ Données importées avec succès — tout est restauré.");
      return true;
    } catch (e) {
      showToast("⚠ Fichier invalide — aucune donnée n'a été modifiée.");
      return false;
    }
  };

  // ── Réinitialisation (zone dangereuse) ──
  const clearMovements = () => {
    setMovements([]);
    setScoreHistory([]);
    showToast("\ud83e\uddf9 Historique effac\u00e9 \u2014 le stock actuel et les r\u00e9glages sont conserv\u00e9s.");
  };
  const resetAll = () => {
    setBrands(initialBrands());
    setMovements([]); setAnnexes([]); setScoreHistory([]);
    setGlobalThreshold(5); setDefaultCost(0); setGlobalGoal(0); setBudgetCap(0); setBudgetPeriod("week");
    showToast("\u267b Application r\u00e9initialis\u00e9e. Ton mot de passe est conserv\u00e9.");
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // ── Helpers stock ──
  const effThreshold = (m) => (m.threshold === null || m.threshold === undefined ? globalThreshold : m.threshold);

  const allModels = useMemo(
    () => brands.flatMap((b) => b.models.map((m) => ({ ...m, brandId: b.id, brandName: b.name }))),
    [brands]
  );

  const alertModels = useMemo(
    () => allModels.filter((m) => m.stocked && m.qty <= effThreshold(m)),
    [allModels, globalThreshold]
  );

  const updateModel = (brandId, modelId, patch) => {
    setBrands((prev) => prev.map((b) =>
      b.id !== brandId ? b : { ...b, models: b.models.map((m) => (m.id === modelId ? { ...m, ...patch } : m)) }
    ));
  };

  // Corriger directement la quantité exacte d'un modèle (correction d'approvisionnement)
  const setExactQty = (brandId, modelId, newQty) => {
    const brand = brands.find((b) => b.id === brandId);
    const model = brand?.models.find((m) => m.id === modelId);
    if (!model || isNaN(newQty) || newQty < 0) return;
    const old = model.qty;
    if (old === newQty) { showToast("La quantité est déjà à " + newQty + "."); return; }
    updateModel(brandId, modelId, { qty: newQty, stocked: model.stocked || newQty > 0, max: Math.max(model.max || 0, newQty) });
    setMovements((prev) => [
      { id: uid(), brandId, modelId, brandName: brand.name, modelName: model.name, type: "adj", qty: newQty, oldQty: old, note: `correction : ${old} → ${newQty}`, date: todayISO(), time: nowTime() },
      ...prev,
    ]);
    showToast(`✓ Quantité de ${model.name} corrigée : ${old} → ${newQty}.`);
  };

  const recordMovement = ({ brandId, modelId, type, qty, note = "" }) => {
    const brand = brands.find((b) => b.id === brandId);
    const model = brand?.models.find((m) => m.id === modelId);
    if (!model) return false;
    if ((type === "out" || type === "comp") && qty > model.qty) {
      showToast(`Stock insuffisant : il reste ${model.qty} pochette${model.qty > 1 ? "s" : ""} pour ${model.name}.`);
      return false;
    }
    const newQty = type === "in" ? model.qty + qty : model.qty - qty;
    updateModel(brandId, modelId, { qty: newQty, stocked: model.stocked || type === "in", max: Math.max(model.max || 0, newQty) });
    setMovements((prev) => [
      { id: uid(), brandId, modelId, brandName: brand.name, modelName: model.name, type, qty, note, date: todayISO(), time: nowTime(), resolved: type === "comp" ? false : undefined },
      ...prev,
    ]);
    const th = effThreshold(model);
    if (type !== "in" && newQty <= th) {
      showToast(newQty <= 0 ? `🚨 ${model.name} est ÉPUISÉ !` : `⚠ ${model.name} : plus que ${newQty} pochette${newQty > 1 ? "s" : ""} !`);
    } else {
      showToast(type === "in" ? `+${qty} ajouté à ${model.name}.` : type === "comp" ? `Compensation enregistrée : −${qty} ${model.name}.` : `Sortie enregistrée : −${qty} ${model.name}.`);
    }
    return true;
  };

  // ── Statistiques ──
  const stats = useMemo(() => {
    const t = todayISO();
    const week = new Date(); week.setDate(week.getDate() - 6);
    const weekISO = week.toISOString().slice(0, 10);
    const sales = movements.filter((m) => m.type === "out");
    const comps = movements.filter((m) => m.type === "comp");
    const salesByModel = {};
    sales.forEach((m) => {
      const k = m.modelName;
      salesByModel[k] = (salesByModel[k] || 0) + m.qty;
    });
    const ranked = Object.entries(salesByModel).sort((a, b) => b[1] - a[1]);
    // séries des 14 derniers jours
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const lbl = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      const vendu = sales.filter((m) => m.date === iso).reduce((s, m) => s + m.qty, 0);
      const perte = comps.filter((m) => m.date === iso).reduce((s, m) => s + m.qty, 0);
      days.push({ jour: lbl, ventes: vendu, pertes: perte });
    }
    const stockByBrand = brands.map((b) => ({ name: b.name, value: b.models.reduce((s, m) => s + m.qty, 0) })).filter((x) => x.value > 0);
    const stockedModels = allModels.filter((m) => m.stocked);
    const leastSold = stockedModels
      .map((m) => ({ name: m.name, sold: salesByModel[m.name] || 0, qty: m.qty }))
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 5);

    // ── Statistiques avancées ──
    const totalSalesQty = sales.reduce((s, m) => s + m.qty, 0);
    const totalCompsQty = comps.reduce((s, m) => s + m.qty, 0);
    // Taux de perte : part des compensations dans le total des sorties
    const lossRate = totalSalesQty + totalCompsQty > 0
      ? Math.round((totalCompsQty / (totalSalesQty + totalCompsQty)) * 100) : 0;
    // Moyenne de ventes/jour sur 7 jours
    const sales7 = sales.filter((m) => m.date >= weekISO).reduce((s, m) => s + m.qty, 0);
    const avgPerDay = Math.round((sales7 / 7) * 10) / 10;
    // Meilleur jour (toutes ventes confondues)
    const byDay = {};
    sales.forEach((m) => { byDay[m.date] = (byDay[m.date] || 0) + m.qty; });
    const bestEntry = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    const bestDay = bestEntry ? { date: bestEntry[0], qty: bestEntry[1] } : null;
    // Ventes par marque
    const brandSalesMap = {};
    sales.forEach((m) => { brandSalesMap[m.brandName] = (brandSalesMap[m.brandName] || 0) + m.qty; });
    const brandSales = Object.entries(brandSalesMap).map(([name, ventes]) => ({ name: name.replace(" (iPhone)", ""), ventes }));
    // Prévision de rupture : vitesse de vente sur 14 jours → jours restants
    const d14 = new Date(); d14.setDate(d14.getDate() - 13);
    const iso14 = d14.toISOString().slice(0, 10);
    const sold14ByModel = {};
    movements.filter((m) => (m.type === "out" || m.type === "comp") && m.date >= iso14)
      .forEach((m) => { sold14ByModel[m.modelId] = (sold14ByModel[m.modelId] || 0) + m.qty; });
    const forecast = allModels
      .filter((m) => m.qty > 0 && sold14ByModel[m.id] > 0)
      .map((m) => {
        const perDay = sold14ByModel[m.id] / 14;
        return { name: m.name, qty: m.qty, perDay: Math.round(perDay * 10) / 10, daysLeft: Math.ceil(m.qty / perDay) };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);
    // Modèles dormants : en stock mais aucune vente depuis 30 jours
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    const iso30 = d30.toISOString().slice(0, 10);
    const soldRecently = new Set(sales.filter((m) => m.date >= iso30).map((m) => m.modelId));
    const dormant = allModels
      .filter((m) => m.qty > 0 && !soldRecently.has(m.id))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6)
      .map((m) => ({ name: m.name, qty: m.qty }));

    return {
      lossRate, avgPerDay, bestDay, brandSales, forecast, dormant,
      totalStock: allModels.reduce((s, m) => s + m.qty, 0),
      todaySales: sales.filter((m) => m.date === t).reduce((s, m) => s + m.qty, 0),
      weekSales: sales.filter((m) => m.date >= weekISO).reduce((s, m) => s + m.qty, 0),
      totalComps: comps.reduce((s, m) => s + m.qty, 0),
      unresolvedComps: comps.filter((m) => !m.resolved),
      top5: ranked.slice(0, 5).map(([name, qty]) => ({ name: name.replace("Galaxy ", "").replace("iPhone ", "iP "), full: name, ventes: qty })),
      leastSold,
      days,
      stockByBrand,
    };
  }, [movements, brands, allModels]);

  // ── Styles communs ──
  const input = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#FFF", color: C.ink, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const label = { fontSize: 11.5, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5 };
  const btnPrimary = { background: C.magenta, color: "#FFF", border: "none", borderRadius: 8, padding: "11px 18px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const btnGhost = { background: "transparent", color: C.ink, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
  const card = { background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16 };

  if (!loaded) {
    return <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', system-ui, sans-serif", color: C.muted }}>Chargement du stock…</div>;
  }

  // ════════ ÉCRAN D'ACCUEIL ════════
  const HomeScreen = () => (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "40px 18px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, animation: "floaty 3.5s ease-in-out infinite" }}><LogoBK size={92} /></div>
      <div style={{ fontSize: 12, letterSpacing: 3, color: C.magenta, fontWeight: 700, textTransform: "uppercase" }}>BK Pochette Congo</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "8px 0 6px" }}>Gestion de stock</h1>
      <p style={{ color: C.muted, fontSize: 14.5, margin: "0 0 30px" }}>Personnalisation de pochettes de téléphone</p>

      {alertModels.length > 0 && (
        <div className="pulse-alert" style={{ background: C.redSoft, border: `1.5px solid ${C.red}`, borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: 13.5, color: C.red, fontWeight: 700 }}>
          ⚠ {alertModels.length} modèle{alertModels.length > 1 ? "s" : ""} en alerte de stock
        </div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        <button className="home-card" onClick={() => setView("daily")} style={{ ...card, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", gap: 14, alignItems: "center", borderColor: C.cyan }}>
          <div style={{ fontSize: 34 }}>📱</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.ink }}>Utilisation quotidienne</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Enregistrer les sorties de pochettes et les compensations</div>
          </div>
        </button>
        <button className="home-card" onClick={() => { setPwInput(""); setPwError(false); setView("login"); }} style={{ ...card, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", gap: 14, alignItems: "center", borderColor: C.magenta }}>
          <div style={{ fontSize: 34 }}>🔐</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.ink }}>Espace Gérant</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Stock, approvisionnement, rapports et statistiques — accès protégé</div>
          </div>
        </button>
      </div>
    </div>
  );

  // ════════ CONNEXION GÉRANT ════════
  const LoginScreen = () => (
    <div style={{ maxWidth: 380, margin: "0 auto", padding: "60px 18px" }}>
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><LogoBK size={72} /></div>
        <div style={{ fontWeight: 700, fontSize: 19, marginBottom: 4 }}>Espace Gérant</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 18 }}>Entre ton mot de passe pour continuer</div>
        <input
          style={{ ...input, textAlign: "center", fontSize: 20, letterSpacing: 6, borderColor: pwError ? C.red : C.border }}
          type="password" inputMode="numeric" value={pwInput} autoFocus
          onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") tryLogin(); }}
          placeholder="••••"
        />
        {pwError && <div style={{ color: C.red, fontSize: 13, fontWeight: 700, marginTop: 8 }}>Mot de passe incorrect</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button style={{ ...btnGhost, flex: 1 }} onClick={() => setView("home")}>Retour</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={tryLogin}>Entrer</button>
        </div>
      </div>
    </div>
  );

  const tryLogin = () => {
    if (pwInput === password) { setView("admin"); setAdminTab("dash"); setPwInput(""); }
    else setPwError(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: "'Space Grotesk', system-ui, sans-serif", color: C.ink, paddingBottom: 70 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        ::selection { background: ${C.magentaSoft}; }
        input:focus, select:focus, textarea:focus { border-color: ${C.magenta} !important; box-shadow: 0 0 0 3px ${C.magentaSoft}; }
        button:focus-visible { outline: 2px solid ${C.magenta}; outline-offset: 2px; }
        button { transition: transform .12s ease, box-shadow .2s ease, background .2s ease, opacity .2s ease; }
        button:active { transform: scale(.96); }
        input, select, textarea { transition: border-color .2s ease, box-shadow .2s ease; }
        header { box-shadow: 0 4px 24px rgba(0,0,0,.18); border-bottom: 3px solid ${C.magenta}; animation: slideDown .4s cubic-bezier(.2,.7,.3,1) both; }
        nav button { transition: background .25s ease, transform .15s ease; }
        main > * { animation: fadeUp .45s cubic-bezier(.2,.7,.3,1) both; }
        main > *:nth-child(1){animation-delay:.02s} main > *:nth-child(2){animation-delay:.06s}
        main > *:nth-child(3){animation-delay:.10s} main > *:nth-child(4){animation-delay:.14s}
        main > *:nth-child(5){animation-delay:.18s} main > *:nth-child(6){animation-delay:.22s}
        main > *:nth-child(7){animation-delay:.26s} main > *:nth-child(8){animation-delay:.30s}
        main > *:nth-child(n+9){animation-delay:.34s}
        .home-card { transition: transform .22s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease, border-color .2s ease; box-shadow: 0 2px 10px rgba(23,23,28,.05); }
        .home-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(23,23,28,.10); }
        .home-card:active { transform: translateY(-1px) scale(.98); }
        .toast-anim { animation: toastUp .32s cubic-bezier(.2,.9,.3,1.25) both; }
        .pulse-alert { animation: pulseAlert 2s ease-in-out infinite; }
        .score-pop { animation: popIn .55s cubic-bezier(.2,.9,.3,1.3) both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastUp { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes pulseAlert { 0%,100% { box-shadow: 0 0 0 0 rgba(210,58,43,.30); } 50% { box-shadow: 0 0 0 8px rgba(210,58,43,0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @media (prefers-reduced-motion: reduce) { *, main > * { transition: none !important; animation: none !important; } }
      `}</style>

      {view === "home" && <HomeScreen />}
      {view === "login" && <LoginScreen />}
      {view === "daily" && (
        <DailyInterface
          brands={brands} allModels={allModels} alertModels={alertModels} movements={movements}
          effThreshold={effThreshold} recordMovement={recordMovement} goHome={() => setView("home")}
          ui={{ input, label, btnPrimary, btnGhost, card }}
        />
      )}
      {view === "admin" && (
        <AdminInterface
          adminTab={adminTab} setAdminTab={setAdminTab}
          brands={brands} setBrands={setBrands} allModels={allModels} alertModels={alertModels}
          movements={movements} setMovements={setMovements} stats={stats}
          globalThreshold={globalThreshold} setGlobalThreshold={setGlobalThreshold}
          password={password} setPassword={setPassword}
          currency={currency} setCurrency={setCurrency}
          defaultCost={defaultCost} setDefaultCost={setDefaultCost}
          globalGoal={globalGoal} setGlobalGoal={setGlobalGoal}
          budgetCap={budgetCap} setBudgetCap={setBudgetCap}
          budgetPeriod={budgetPeriod} setBudgetPeriod={setBudgetPeriod}
          scoreHistory={scoreHistory} setScoreHistory={setScoreHistory}
          buildExport={buildExport} importData={importData} lastSaved={lastSaved} clearMovements={clearMovements} resetAll={resetAll}
          annexes={annexes} setAnnexes={setAnnexes}
          effThreshold={effThreshold} recordMovement={recordMovement} updateModel={updateModel} setExactQty={setExactQty}
          goHome={() => setView("home")} showToast={showToast}
          ui={{ input, label, btnPrimary, btnGhost, card }}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#FFF", padding: "11px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 6px 24px rgba(0,0,0,0.25)", zIndex: 100, maxWidth: "90vw" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ════════════════ INTERFACE QUOTIDIENNE ════════════════
function DailyInterface({ brands, allModels, alertModels, movements, effThreshold, recordMovement, goHome, ui }) {
  const { input, label, btnPrimary, btnGhost, card } = ui;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // {brandId, modelId}
  const [qty, setQty] = useState("1");
  const [mode, setMode] = useState("out"); // out | comp
  const [note, setNote] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allModels.filter((m) => (m.name + " " + m.brandName).toLowerCase().includes(q)).slice(0, 12);
  }, [search, allModels]);

  const sel = selected ? allModels.find((m) => m.id === selected.modelId) : null;
  const today = todayISO();
  const todayMoves = movements.filter((m) => m.date === today && (m.type === "out" || m.type === "comp"));

  const submit = () => {
    const q = parseInt(qty, 10);
    if (!sel || isNaN(q) || q <= 0) return;
    const ok = recordMovement({ brandId: selected.brandId, modelId: selected.modelId, type: mode, qty: q, note: note.trim() });
    if (ok) { setQty("1"); setNote(""); setSelected(null); setSearch(""); }
  };

  return (
    <>
      <header style={{ background: C.ink, color: "#FFF", padding: "16px 18px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 2.5, color: C.cyan, fontWeight: 700, textTransform: "uppercase" }}>BK Pochette Congo</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>📱 Utilisation quotidienne</div>
          </div>
          <button onClick={goHome} style={{ background: "rgba(255,255,255,0.1)", color: "#FFF", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>← Accueil</button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px", display: "grid", gap: 14 }}>
        {alertModels.length > 0 && (
          <div className="pulse-alert" style={{ background: C.redSoft, border: `1.5px solid ${C.red}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontWeight: 700, color: C.red, fontSize: 14, marginBottom: 6 }}>⚠ Modèles bientôt épuisés</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {alertModels.map((m) => (
                <span key={m.id} style={{ background: "#FFF", border: `1px solid ${m.qty <= 0 ? C.red : C.amber}`, color: m.qty <= 0 ? C.red : C.amber, fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>
                  {m.name} · {m.qty <= 0 ? "épuisé" : `${m.qty} rest.`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recherche de modèle */}
        <div style={card}>
          <span style={label}>Chercher un modèle</span>
          <input style={input} value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null); }} placeholder='Ex : "13 pro", "s24 ultra", "flip"…' />
          {results.length > 0 && !selected && (
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {results.map((m) => (
                <button key={m.id} onClick={() => { setSelected({ brandId: m.brandId, modelId: m.id }); }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#FFF", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, textAlign: "left" }}>
                  <span><strong>{m.name}</strong> <span style={{ color: C.muted, fontSize: 12.5 }}>· {m.brandName}</span></span>
                  <span style={{ fontWeight: 700, color: m.qty <= 0 ? C.red : m.qty <= effThreshold(m) ? C.amber : C.green, fontVariantNumeric: "tabular-nums" }}>{m.qty}</span>
                </button>
              ))}
            </div>
          )}
          {search.trim() && results.length === 0 && !selected && (
            <div style={{ marginTop: 10, fontSize: 13.5, color: C.muted }}>Aucun modèle trouvé. Demande au gérant de l'ajouter.</div>
          )}
        </div>

        {/* Fiche du modèle sélectionné */}
        {sel && (
          <div style={{ ...card, borderColor: mode === "comp" ? C.violet : C.magenta }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{sel.name}</div>
                <div style={{ fontSize: 12.5, color: C.muted }}>{sel.brandName}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: sel.qty <= 0 ? C.red : sel.qty <= effThreshold(sel) ? C.amber : C.ink, fontVariantNumeric: "tabular-nums" }}>{sel.qty}</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>en stock</div>
              </div>
            </div>
            <div style={{ margin: "10px 0" }}>
              <InkLevel qty={sel.qty} threshold={effThreshold(sel)} max={sel.max || Math.max(sel.qty, effThreshold(sel) * 2, 1)} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setMode("out")} style={{ ...btnGhost, flex: 1, background: mode === "out" ? C.magentaSoft : "transparent", borderColor: mode === "out" ? C.magenta : C.border, color: mode === "out" ? C.magenta : C.ink, fontWeight: 700, fontSize: 13.5 }}>
                🛍 Vente / Commande
              </button>
              <button onClick={() => setMode("comp")} style={{ ...btnGhost, flex: 1, background: mode === "comp" ? C.violetSoft : "transparent", borderColor: mode === "comp" ? C.violet : C.border, color: mode === "comp" ? C.violet : C.ink, fontWeight: 700, fontSize: 13.5 }}>
                ♻ Compensation / Erreur
              </button>
            </div>
            {mode === "comp" && (
              <div style={{ background: C.violetSoft, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: C.violet, fontWeight: 600, marginBottom: 12 }}>
                Cette pochette remplace une commande ratée ou une perte. Elle sera comptée à part et signalée au gérant pour ravitaillement.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <span style={label}>Quantité</span>
                <input style={input} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div>
                <span style={label}>Note (facultatif)</span>
                <input style={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "comp" ? "Ex : impression ratée" : "Ex : commande client"} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...btnGhost, flex: 1 }} onClick={() => { setSelected(null); setSearch(""); }}>Annuler</button>
              <button style={{ ...btnPrimary, flex: 2, background: mode === "comp" ? C.violet : C.magenta }} onClick={submit}>
                {mode === "comp" ? "Enregistrer la compensation" : "Enregistrer la sortie"}
              </button>
            </div>
          </div>
        )}

        {/* Activité du jour */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Aujourd'hui</div>
          {todayMoves.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Aucune sortie enregistrée pour le moment.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {todayMoves.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${C.paper}` }}>
                  <div>
                    <strong>{m.modelName}</strong>
                    {m.type === "comp" && <span style={{ marginLeft: 6 }}><Badge bg={C.violetSoft} fg={C.violet}>COMPENSATION</Badge></span>}
                    {m.note && <span style={{ color: C.muted, fontSize: 12.5 }}> — {m.note}</span>}
                    <span style={{ color: C.muted, fontSize: 12 }}> · {m.time}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: m.type === "comp" ? C.violet : C.magenta, whiteSpace: "nowrap" }}>−{m.qty}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ════════════════ INTERFACE GÉRANT ════════════════
function AdminInterface({
  adminTab, setAdminTab, brands, setBrands, allModels, alertModels, movements, setMovements,
  stats, globalThreshold, setGlobalThreshold, password, setPassword, annexes, setAnnexes,
  currency, setCurrency, defaultCost, setDefaultCost, globalGoal, setGlobalGoal,
  budgetCap, setBudgetCap, budgetPeriod, setBudgetPeriod, scoreHistory, setScoreHistory, buildExport, importData, lastSaved, clearMovements, resetAll,
  effThreshold, recordMovement, updateModel, setExactQty, goHome, showToast, ui,
}) {
  const { input, label, btnPrimary, btnGhost, card } = ui;

  const TABS = [
    ["dash", "📊 Tableau de bord"],
    ["stock", "📦 Stock"],
    ["renta", "🎯 Pilotage"],
    ["pertes", "♻ Pertes"],
    ["annexes", "🧰 Annexes"],
    ["historique", "🗓 Historique"],
    ["params", "⚙ Réglages"],
  ];

  return (
    <>
      <header style={{ background: C.ink, color: "#FFF", padding: "16px 18px 12px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: 2.5, color: C.magenta, fontWeight: 700, textTransform: "uppercase" }}>BK Pochette Congo</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>🔐 Espace Gérant</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {lastSaved && <span style={{ fontSize: 11, color: "#8AE0A0", fontWeight: 600, whiteSpace: "nowrap" }}>💾 {lastSaved}</span>}
              <button onClick={goHome} style={{ background: "rgba(255,255,255,0.1)", color: "#FFF", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>🔒 Quitter</button>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 5, marginTop: 14, overflowX: "auto", paddingBottom: 2 }}>
            {TABS.map(([key, lbl]) => (
              <button key={key} onClick={() => setAdminTab(key)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", background: adminTab === key ? C.magenta : "rgba(255,255,255,0.08)", color: "#FFF" }}>
                {lbl}{key === "pertes" && stats.unresolvedComps.length > 0 ? ` (${stats.unresolvedComps.length})` : ""}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px", display: "grid", gap: 14 }}>
        {adminTab === "dash" && <DashTab stats={stats} alertModels={alertModels} ui={ui} />}
        {adminTab === "stock" && <StockTab brands={brands} setBrands={setBrands} globalThreshold={globalThreshold} effThreshold={effThreshold} recordMovement={recordMovement} updateModel={updateModel} setExactQty={setExactQty} showToast={showToast} ui={ui} />}
        {adminTab === "renta" && <RentaTab movements={movements} allModels={allModels} currency={currency}
          defaultCost={defaultCost} setDefaultCost={setDefaultCost} globalGoal={globalGoal} setGlobalGoal={setGlobalGoal}
          budgetCap={budgetCap} setBudgetCap={setBudgetCap} budgetPeriod={budgetPeriod} setBudgetPeriod={setBudgetPeriod}
          scoreHistory={scoreHistory} setScoreHistory={setScoreHistory} updateModel={updateModel}
          effThreshold={effThreshold} showToast={showToast} ui={ui} />}
        {adminTab === "pertes" && <PertesTab stats={stats} movements={movements} setMovements={setMovements} brands={brands} recordMovement={recordMovement} showToast={showToast} ui={ui} />}
        {adminTab === "annexes" && <AnnexesTab annexes={annexes} setAnnexes={setAnnexes} showToast={showToast} ui={ui} />}
        {adminTab === "historique" && <HistoriqueTab movements={movements} ui={ui} />}
        {adminTab === "params" && <ParamsTab password={password} setPassword={setPassword} globalThreshold={globalThreshold} setGlobalThreshold={setGlobalThreshold} currency={currency} setCurrency={setCurrency} buildExport={buildExport} importData={importData} lastSaved={lastSaved} clearMovements={clearMovements} resetAll={resetAll} showToast={showToast} ui={ui} />}
      </main>
    </>
  );
}

// ── Onglet Tableau de bord ──
function DashTab({ stats, alertModels, ui }) {
  const { card } = ui;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <KPI label="Pochettes en stock" value={stats.totalStock} />
        <KPI label="Sorties aujourd'hui" value={stats.todaySales} color={C.magenta} />
        <KPI label="Sorties · 7 jours" value={stats.weekSales} color={C.cyan} />
        <KPI label="Modèles en alerte" value={alertModels.length} color={alertModels.length > 0 ? C.red : C.green} />
        <KPI label="Pertes (compensations)" value={stats.totalComps} color={C.violet} sub={stats.unresolvedComps.length > 0 ? `${stats.unresolvedComps.length} à ravitailler` : "tout ravitaillé"} />
        <KPI label="Moyenne / jour (7j)" value={stats.avgPerDay} sub="pochettes vendues" color={C.cyan} />
        <KPI label="Taux de perte" value={stats.lossRate + "%"} color={stats.lossRate > 10 ? C.red : C.green} sub="part des compensations" />
        {stats.bestDay && <KPI label="Meilleur jour" value={stats.bestDay.qty} sub={fmtDate(stats.bestDay.date)} color={C.magenta} />}
      </div>

      {alertModels.length === 0 && (
        <div style={{ background: C.greenSoft, border: `1.5px solid ${C.green}`, borderRadius: 12, padding: "10px 14px", fontSize: 13.5, color: C.green, fontWeight: 700 }}>
          ✓ Aucune alerte de stock — tous les modèles sont au-dessus de leur seuil.
        </div>
      )}

      {alertModels.length > 0 && (
        <div className="pulse-alert" style={{ background: C.redSoft, border: `1.5px solid ${C.red}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, color: C.red, fontSize: 14, marginBottom: 6 }}>⚠ À réapprovisionner</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {alertModels.map((m) => (
              <span key={m.id} style={{ background: "#FFF", border: `1px solid ${m.qty <= 0 ? C.red : C.amber}`, color: m.qty <= 0 ? C.red : C.amber, fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>
                {m.name} · {m.qty <= 0 ? "épuisé" : `${m.qty} rest.`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>📈 Ventes et pertes — 14 derniers jours</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Rose = ventes · Violet = compensations (pertes)</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.days} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="jour" tick={{ fontSize: 10.5 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="ventes" stroke={C.magenta} strokeWidth={2.5} dot={{ r: 2.5 }} name="Ventes" />
            <Line type="monotone" dataKey="pertes" stroke={C.violet} strokeWidth={2} dot={{ r: 2 }} name="Pertes" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>🏆 Modèles les plus vendus</div>
        {stats.top5.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muted }}>Pas encore de ventes enregistrées.</div>
        ) : (
          <ResponsiveContainer width="100%" height={60 + stats.top5.length * 38}>
            <BarChart data={stats.top5} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11.5 }} width={90} />
              <Tooltip />
              <Bar dataKey="ventes" fill={C.magenta} radius={[0, 6, 6, 0]} name="Ventes" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⏳ Rupture estimée</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Selon la vitesse de vente des 14 derniers jours</div>
          {stats.forecast.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Pas assez de ventes récentes pour estimer.</div>
          ) : (
            stats.forecast.map((f, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${C.paper}` }}>
                <span><strong>{f.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>· {f.qty} en stock · ~{f.perDay}/j</span></span>
                <span style={{ fontWeight: 700, color: f.daysLeft <= 3 ? C.red : f.daysLeft <= 7 ? C.amber : C.green, whiteSpace: "nowrap" }}>
                  {f.daysLeft} j
                </span>
              </div>
            ))
          )}
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>🏷 Ventes par marque</div>
          {stats.brandSales.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Pas encore de ventes.</div>
          ) : (
            <ResponsiveContainer width="100%" height={50 + stats.brandSales.length * 42}>
              <BarChart data={stats.brandSales} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11.5 }} width={80} />
                <Tooltip />
                <Bar dataKey="ventes" fill={C.cyan} radius={[0, 6, 6, 0]} name="Ventes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>😴 Modèles dormants</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>En stock mais aucune vente depuis 30 jours — argent immobilisé</div>
          {stats.dormant.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Aucun modèle dormant — bonne rotation du stock !</div>
          ) : (
            stats.dormant.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${C.paper}` }}>
                <span>{d.name}</span>
                <span style={{ color: C.amber, fontWeight: 700 }}>{d.qty} en stock</span>
              </div>
            ))
          )}
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>🐢 Modèles les moins vendus</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Parmi les modèles déjà stockés</div>
          {stats.leastSold.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Aucun modèle stocké pour l'instant.</div>
          ) : (
            stats.leastSold.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${C.paper}` }}>
                <span>{m.name}</span>
                <span style={{ color: C.muted, fontSize: 13 }}>{m.sold} vendue{m.sold > 1 ? "s" : ""} · {m.qty} en stock</span>
              </div>
            ))
          )}
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>🥧 Stock par marque</div>
          {stats.stockByBrand.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Le stock est vide — approvisionne des modèles dans l'onglet Stock.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={stats.stockByBrand} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {stats.stockByBrand.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}

// ── Onglet Stock (marques & modèles) ──
function StockTab({ brands, setBrands, globalThreshold, effThreshold, recordMovement, updateModel, setExactQty, showToast, ui }) {
  const { input, label, btnPrimary, btnGhost, card } = ui;
  const [search, setSearch] = useState("");
  const [openBrand, setOpenBrand] = useState(null);
  const [expanded, setExpanded] = useState(null); // model id
  const [showAddModel, setShowAddModel] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [onlyStocked, setOnlyStocked] = useState(false);

  // formulaires
  const [nmBrand, setNmBrand] = useState(brands[0]?.id || "");
  const [nmName, setNmName] = useState("");
  const [nmQty, setNmQty] = useState("");
  const [nmSeuil, setNmSeuil] = useState("");
  const [nbName, setNbName] = useState("");
  const [inQty, setInQty] = useState("");
  const [thVal, setThVal] = useState("");
  const [adjQty, setAdjQty] = useState("");
  const [costVal, setCostVal] = useState("");
  const [goalVal, setGoalVal] = useState("");

  const addBrand = () => {
    if (!nbName.trim()) return;
    setBrands([...brands, { id: uid(), name: nbName.trim(), models: [] }]);
    setNbName(""); setShowAddBrand(false);
    showToast(`Marque « ${nbName.trim()} » ajoutée.`);
  };

  const addModel = () => {
    if (!nmName.trim() || !nmBrand) { showToast("Choisis la marque et le nom du modèle."); return; }
    const qty = nmQty === "" ? 0 : Math.max(0, parseInt(nmQty, 10) || 0);
    const seuil = nmSeuil === "" ? null : Math.max(0, parseInt(nmSeuil, 10) || 0);
    setBrands(brands.map((b) => b.id !== nmBrand ? b : {
      ...b, models: [...b.models, { id: uid(), name: nmName.trim(), qty, threshold: seuil, stocked: qty > 0, max: qty }],
    }));
    setNmName(""); setNmQty(""); setNmSeuil(""); setShowAddModel(false);
    showToast(`Modèle « ${nmName.trim()} » ajouté${qty > 0 ? ` avec ${qty} pochettes` : " (sans quantité)"}.`);
  };

  const deleteModel = (brandId, modelId) => {
    setBrands(brands.map((b) => b.id !== brandId ? b : { ...b, models: b.models.filter((m) => m.id !== modelId) }));
    showToast("Modèle supprimé.");
  };

  const deleteBrand = (brandId) => {
    setBrands(brands.filter((b) => b.id !== brandId));
    showToast("Marque supprimée.");
  };

  const q = search.trim().toLowerCase();

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={{ ...btnPrimary, flex: 1, minWidth: 150 }} onClick={() => { setShowAddModel(!showAddModel); setShowAddBrand(false); }}>
          {showAddModel ? "Fermer" : "+ Nouveau modèle"}
        </button>
        <button style={{ ...btnGhost, flex: 1, minWidth: 150 }} onClick={() => { setShowAddBrand(!showAddBrand); setShowAddModel(false); }}>
          {showAddBrand ? "Fermer" : "+ Nouvelle marque"}
        </button>
      </div>

      {showAddBrand && (
        <div style={card}>
          <span style={label}>Nom de la marque</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={input} value={nbName} onChange={(e) => setNbName(e.target.value)} placeholder="Ex : Tecno, Infinix, Xiaomi…" />
            <button style={btnPrimary} onClick={addBrand}>Ajouter</button>
          </div>
        </div>
      )}

      {showAddModel && (
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Ajouter un modèle</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <span style={label}>Marque</span>
              <select style={input} value={nmBrand} onChange={(e) => setNmBrand(e.target.value)}>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <span style={label}>Nom du modèle</span>
              <input style={input} value={nmName} onChange={(e) => setNmName(e.target.value)} placeholder="Ex : Galaxy A54" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={label}>Quantité (facultatif)</span>
                <input style={input} type="number" min="0" value={nmQty} onChange={(e) => setNmQty(e.target.value)} placeholder="0 par défaut" />
              </div>
              <div>
                <span style={label}>Seuil (facultatif)</span>
                <input style={input} type="number" min="0" value={nmSeuil} onChange={(e) => setNmSeuil(e.target.value)} placeholder={`Global : ${globalThreshold}`} />
              </div>
            </div>
            <button style={btnPrimary} onClick={addModel}>Enregistrer le modèle</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input style={{ ...input, flex: 1 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Chercher un modèle…" />
        <button onClick={() => setOnlyStocked(!onlyStocked)}
          style={{ ...btnGhost, whiteSpace: "nowrap", background: onlyStocked ? C.cyanSoft : "transparent", borderColor: onlyStocked ? C.cyan : C.border, color: onlyStocked ? C.cyan : C.ink, fontSize: 13 }}>
          {onlyStocked ? "✓ Stockés" : "Tous"}
        </button>
      </div>

      {brands.map((b) => {
        let models = b.models;
        if (q) models = models.filter((m) => m.name.toLowerCase().includes(q));
        if (onlyStocked) models = models.filter((m) => m.stocked || m.qty > 0);
        if (q && models.length === 0) return null;
        const totalQty = b.models.reduce((s, m) => s + m.qty, 0);
        const isOpen = q ? true : openBrand === b.id;
        return (
          <div key={b.id} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <button onClick={() => setOpenBrand(isOpen && !q ? null : b.id)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 16 }}>
              <span style={{ fontWeight: 700 }}>{b.name} <span style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>· {b.models.length} modèles · {totalQty} pochettes</span></span>
              <span style={{ color: C.muted }}>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {models.length === 0 && <div style={{ padding: "12px 16px", fontSize: 13.5, color: C.muted }}>Aucun modèle {onlyStocked ? "stocké" : ""} dans cette marque.</div>}
                {models.map((m) => {
                  const th = effThreshold(m);
                  const status = !m.stocked && m.qty === 0 ? "new" : m.qty <= 0 ? "empty" : m.qty <= th ? "low" : "ok";
                  const isExp = expanded === m.id;
                  return (
                    <div key={m.id} style={{ borderBottom: `1px solid ${C.paper}` }}>
                      <button onClick={() => { setExpanded(isExp ? null : m.id); setInQty(""); setAdjQty(String(m.qty)); setThVal(m.threshold === null ? "" : String(m.threshold)); setCostVal(m.costPrice === null || m.costPrice === undefined ? "" : String(m.costPrice)); setGoalVal(m.goal === null || m.goal === undefined ? "" : String(m.goal)); }}
                        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 16px", background: isExp ? C.paper : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, textAlign: "left" }}>
                        <span>
                          {m.name}
                          {status === "new" && <span style={{ marginLeft: 6 }}><Badge bg="#EFEFEF" fg={C.muted}>SANS STOCK</Badge></span>}
                          {status === "low" && <span style={{ marginLeft: 6 }}><Badge bg={C.amberSoft} fg={C.amber}>BAS</Badge></span>}
                          {status === "empty" && <span style={{ marginLeft: 6 }}><Badge bg={C.redSoft} fg={C.red}>ÉPUISÉ</Badge></span>}
                        </span>
                        <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: status === "empty" ? C.red : status === "low" ? C.amber : C.ink }}>{m.qty}</span>
                      </button>
                      {isExp && (
                        <div style={{ padding: "4px 16px 14px", background: C.paper, display: "grid", gap: 10 }}>
                          <InkLevel qty={m.qty} threshold={th} max={m.max || Math.max(m.qty, th * 2, 1)} />
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <span style={label}>Ajouter au stock</span>
                              <input style={input} type="number" min="1" value={inQty} onChange={(e) => setInQty(e.target.value)} placeholder="Quantité" />
                            </div>
                            <button style={{ ...btnPrimary, background: C.cyan }} onClick={() => {
                              const v = parseInt(inQty, 10);
                              if (!isNaN(v) && v > 0) { recordMovement({ brandId: b.id, modelId: m.id, type: "in", qty: v, note: "approvisionnement" }); setInQty(""); }
                            }}>+ Approvisionner</button>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <span style={label}>✏ Corriger la quantité exacte</span>
                              <input style={input} type="number" min="0" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder={`Actuel : ${m.qty}`} />
                            </div>
                            <button style={{ ...btnGhost, borderColor: C.amber, color: C.amber, fontWeight: 700 }} onClick={() => {
                              const v = parseInt(adjQty, 10);
                              if (!isNaN(v) && v >= 0) setExactQty(b.id, m.id, v);
                            }}>Corriger</button>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div style={{ flex: 1, minWidth: 100 }}>
                              <span style={label}>💰 Coût d'achat (vide = global)</span>
                              <input style={input} type="number" min="0" step="0.01" value={costVal} onChange={(e) => setCostVal(e.target.value)} placeholder="Coût unitaire" />
                            </div>
                            <div style={{ flex: 1, minWidth: 100 }}>
                              <span style={label}>🎯 Objectif de stock</span>
                              <input style={input} type="number" min="0" value={goalVal} onChange={(e) => setGoalVal(e.target.value)} placeholder="Vide = global" />
                            </div>
                            <button style={{ ...btnGhost, borderColor: C.green, color: C.green, fontWeight: 700 }} onClick={() => {
                              const cp = costVal === "" ? null : Math.max(0, parseFloat(costVal) || 0);
                              const gl = goalVal === "" ? null : Math.max(0, parseInt(goalVal, 10) || 0);
                              updateModel(b.id, m.id, { costPrice: cp, goal: gl });
                              showToast(`Coût et objectif de ${m.name} enregistrés.`);
                            }}>Enregistrer</button>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div style={{ flex: 1, minWidth: 120 }}>
                              <span style={label}>Seuil d'alerte (vide = global {globalThreshold})</span>
                              <input style={input} type="number" min="0" value={thVal} onChange={(e) => setThVal(e.target.value)} placeholder={`Global : ${globalThreshold}`} />
                            </div>
                            <button style={btnGhost} onClick={() => {
                              const v = thVal === "" ? null : Math.max(0, parseInt(thVal, 10) || 0);
                              updateModel(b.id, m.id, { threshold: v });
                              showToast(v === null ? "Seuil global appliqué." : `Seuil fixé à ${v}.`);
                            }}>Enregistrer le seuil</button>
                            <DangerButton onConfirm={() => deleteModel(b.id, m.id)} label="🗑 Supprimer" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!q && (
                  <div style={{ padding: "10px 16px", display: "flex", justifyContent: "flex-end" }}>
                    <DangerButton onConfirm={() => deleteBrand(b.id)} label="🗑 Supprimer la marque" confirmLabel="Supprimer toute la marque ?" />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Onglet Pertes / Compensations ──
function PertesTab({ stats, movements, setMovements, brands, recordMovement, showToast, ui }) {
  const { btnPrimary, card } = ui;
  // regrouper les compensations non ravitaillées par modèle
  const groups = useMemo(() => {
    const g = {};
    stats.unresolvedComps.forEach((m) => {
      const k = m.modelId;
      if (!g[k]) g[k] = { brandId: m.brandId, modelId: m.modelId, modelName: m.modelName, brandName: m.brandName, qty: 0, ids: [] };
      g[k].qty += m.qty;
      g[k].ids.push(m.id);
    });
    return Object.values(g);
  }, [stats.unresolvedComps]);

  const resolved = movements.filter((m) => m.type === "comp" && m.resolved);

  const ravitailler = (grp) => {
    const ok = recordMovement({ brandId: grp.brandId, modelId: grp.modelId, type: "in", qty: grp.qty, note: "ravitaillement perte/compensation" });
    if (ok) {
      setMovements((prev) => prev.map((m) => (grp.ids.includes(m.id) ? { ...m, resolved: true } : m)));
    }
  };

  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>♻ Défaillances à ravitailler</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
          Pochettes utilisées pour compenser des erreurs ou pertes. Clique « Ravitailler » quand tu as remplacé le stock perdu.
        </div>
        {groups.length === 0 ? (
          <div style={{ background: C.greenSoft, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: C.green, fontWeight: 700 }}>
            ✓ Aucune défaillance en attente — tout est ravitaillé !
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {groups.map((g) => (
              <div key={g.modelId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: `1.5px solid ${C.violet}`, background: C.violetSoft, borderRadius: 10, padding: "11px 14px" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{g.modelName}</div>
                  <div style={{ fontSize: 12.5, color: C.muted }}>{g.brandName} · <strong style={{ color: C.violet }}>{g.qty} pochette{g.qty > 1 ? "s" : ""} perdue{g.qty > 1 ? "s" : ""}</strong></div>
                </div>
                <button style={{ ...btnPrimary, background: C.violet, whiteSpace: "nowrap" }} onClick={() => ravitailler(g)}>
                  + Ravitailler {g.qty}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Historique des compensations ravitaillées</div>
        {resolved.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muted }}>Aucune compensation ravitaillée pour l'instant.</div>
        ) : (
          resolved.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderBottom: `1px solid ${C.paper}` }}>
              <span><strong>{m.modelName}</strong>{m.note && <span style={{ color: C.muted, fontSize: 12.5 }}> — {m.note}</span>}<span style={{ color: C.muted, fontSize: 12 }}> · {fmtDate(m.date)}</span></span>
              <span style={{ color: C.green, fontWeight: 700 }}>✓ −{m.qty}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ── Onglet Annexes (feuilles, encres, emballages…) ──
function AnnexesTab({ annexes, setAnnexes, showToast, ui }) {
  const { input, label, btnPrimary, btnGhost, card } = ui;
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [seuil, setSeuil] = useState("");
  const [unit, setUnit] = useState("pièces");

  const add = () => {
    const q = parseInt(qty, 10);
    const s = parseInt(seuil, 10);
    if (!name.trim() || isNaN(q) || isNaN(s)) { showToast("Remplis le nom, la quantité et le seuil."); return; }
    setAnnexes([...annexes, { id: uid(), name: name.trim(), qty: q, threshold: s, unit, max: Math.max(q, s * 2) }]);
    setName(""); setQty(""); setSeuil("");
    showToast(`« ${name.trim()} » ajouté aux annexes.`);
  };

  const adjust = (id, delta) => {
    setAnnexes(annexes.map((a) => {
      if (a.id !== id) return a;
      const nq = Math.max(0, a.qty + delta);
      if (delta < 0 && nq <= a.threshold) showToast(`⚠ ${a.name} : plus que ${nq} ${a.unit} !`);
      return { ...a, qty: nq, max: Math.max(a.max || 0, nq) };
    }));
  };

  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🧰 Articles annexes</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Feuilles, encres, emballages et autres consommables — en option, à côté des pochettes.</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex : Film vinyle brillant)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div><span style={label}>Quantité</span><input style={input} type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div><span style={label}>Seuil</span><input style={input} type="number" min="0" value={seuil} onChange={(e) => setSeuil(e.target.value)} /></div>
            <div><span style={label}>Unité</span>
              <select style={input} value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option>pièces</option><option>feuilles</option><option>rouleaux</option><option>ml</option><option>paquets</option>
              </select>
            </div>
          </div>
          <button style={btnPrimary} onClick={add}>+ Ajouter l'article</button>
        </div>
      </div>

      {annexes.map((a) => {
        const status = a.qty <= 0 ? "empty" : a.qty <= a.threshold ? "low" : "ok";
        return (
          <div key={a.id} style={{ ...card, borderColor: status === "ok" ? C.border : status === "low" ? C.amber : C.red }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</span>
                {status === "low" && <span style={{ marginLeft: 6 }}><Badge bg={C.amberSoft} fg={C.amber}>BAS</Badge></span>}
                {status === "empty" && <span style={{ marginLeft: 6 }}><Badge bg={C.redSoft} fg={C.red}>ÉPUISÉ</Badge></span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>{a.qty} <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{a.unit}</span></div>
            </div>
            <InkLevel qty={a.qty} threshold={a.threshold} max={a.max || Math.max(a.qty, a.threshold * 2, 1)} />
            <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
              <button style={{ ...btnGhost, padding: "7px 14px" }} onClick={() => adjust(a.id, -1)} disabled={a.qty <= 0}>−1</button>
              <button style={{ ...btnGhost, padding: "7px 14px" }} onClick={() => adjust(a.id, 1)}>+1</button>
              <button style={{ ...btnGhost, padding: "7px 14px" }} onClick={() => adjust(a.id, 10)}>+10</button>
              <DangerButton onConfirm={() => setAnnexes(annexes.filter((x) => x.id !== a.id))} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── Onglet Historique ──
function HistoriqueTab({ movements, ui }) {
  const history = useMemo(() => {
    const byDate = {};
    movements.forEach((m) => { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m); });
    return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));
  }, [movements]);

  if (history.length === 0) {
    return <div style={{ textAlign: "center", padding: "50px 20px", color: C.muted }}>
      <div style={{ fontSize: 42, marginBottom: 10 }}>🗓</div>
      <div style={{ fontWeight: 700, color: C.ink, fontSize: 17 }}>Aucun mouvement enregistré</div>
    </div>;
  }

  return history.map(([date, moves]) => {
    const out = moves.filter((m) => m.type === "out").reduce((s, m) => s + m.qty, 0);
    const comp = moves.filter((m) => m.type === "comp").reduce((s, m) => s + m.qty, 0);
    const inn = moves.filter((m) => m.type === "in").reduce((s, m) => s + m.qty, 0);
    return (
      <div key={date} style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 14, textTransform: "capitalize" }}>{fmtDate(date)}</div>
          <div style={{ fontSize: 12.5, display: "flex", gap: 8 }}>
            {out > 0 && <span style={{ color: C.magenta, fontWeight: 700 }}>−{out} vente{out > 1 ? "s" : ""}</span>}
            {comp > 0 && <span style={{ color: C.violet, fontWeight: 700 }}>−{comp} compensation{comp > 1 ? "s" : ""}</span>}
            {inn > 0 && <span style={{ color: C.cyan, fontWeight: 700 }}>+{inn} entrée{inn > 1 ? "s" : ""}</span>}
          </div>
        </div>
        {moves.map((m) => (
          <div key={m.id} style={{ padding: "9px 16px", borderBottom: `1px solid ${C.paper}`, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
            <div>
              <strong>{m.modelName}</strong>
              {m.type === "comp" && <span style={{ marginLeft: 6 }}><Badge bg={C.violetSoft} fg={C.violet}>COMPENSATION{m.resolved ? " ✓" : ""}</Badge></span>}
              {m.type === "in" && <span style={{ marginLeft: 6 }}><Badge bg={C.cyanSoft} fg={C.cyan}>ENTRÉE</Badge></span>}
              {m.type === "adj" && <span style={{ marginLeft: 6 }}><Badge bg={C.amberSoft} fg={C.amber}>CORRECTION</Badge></span>}
              {m.note && <span style={{ color: C.muted, fontSize: 12.5 }}> — {m.note}</span>}
              <span style={{ color: C.muted, fontSize: 12 }}> · {m.time}</span>
            </div>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: m.type === "in" ? C.cyan : m.type === "comp" ? C.violet : m.type === "adj" ? C.amber : C.magenta }}>
              {m.type === "adj" ? "= " + m.qty : (m.type === "in" ? "+" : "−") + m.qty}
            </div>
          </div>
        ))}
      </div>
    );
  });
}

// ── Onglet Réglages ──
function ParamsTab({ password, setPassword, globalThreshold, setGlobalThreshold, currency, setCurrency, buildExport, importData, lastSaved, clearMovements, resetAll, showToast, ui }) {
  const { input, label, btnPrimary, btnGhost, card } = ui;
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [th, setTh] = useState(String(globalThreshold));
  const [cur, setCur] = useState(currency);
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState("");

  const downloadBackup = () => {
    try {
      const blob = new Blob([buildExport()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bk-pochette-sauvegarde-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showToast("✓ Fichier de sauvegarde téléchargé.");
    } catch (e) {
      setShowExport(true);
      showToast("Téléchargement bloqué — copie le texte affiché à la place.");
    }
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setImportText(String(r.result)); showToast("Fichier lu — clique « Importer et remplacer » pour confirmer."); };
    r.onerror = () => showToast("⚠ Impossible de lire ce fichier.");
    r.readAsText(f);
    e.target.value = "";
  };

  let importPreview = null;
  if (importText.trim()) {
    try {
      const d = JSON.parse(importText);
      if (Array.isArray(d.brands)) {
        importPreview = {
          brands: d.brands.length,
          models: d.brands.reduce((s, b) => s + (b.models?.length || 0), 0),
          movements: (d.movements || []).length,
          date: d.exportedAt ? new Date(d.exportedAt).toLocaleDateString("fr-FR") : "?",
        };
      }
    } catch (e) { /* aperçu impossible */ }
  }

  const changePw = () => {
    if (oldPw !== password) { showToast("L'ancien mot de passe est incorrect."); return; }
    if (!newPw || newPw.length < 4) { showToast("Le nouveau mot de passe doit avoir au moins 4 caractères."); return; }
    if (newPw !== newPw2) { showToast("Les deux nouveaux mots de passe ne correspondent pas."); return; }
    setPassword(newPw);
    setOldPw(""); setNewPw(""); setNewPw2("");
    showToast("✓ Mot de passe changé avec succès.");
  };

  const saveTh = () => {
    const v = Math.max(0, parseInt(th, 10) || 0);
    setGlobalThreshold(v);
    showToast(`Seuil global fixé à ${v} pochettes.`);
  };

  return (
    <>
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🔔 Seuil d'alerte global</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
          S'applique à tous les modèles qui n'ont pas de seuil personnalisé. Quand le stock d'un modèle atteint ce nombre, une alerte s'affiche.
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <span style={label}>Nombre de pochettes</span>
            <input style={input} type="number" min="0" value={th} onChange={(e) => setTh(e.target.value)} />
          </div>
          <button style={btnPrimary} onClick={saveTh}>Enregistrer</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>💾 Sauvegarde & transfert</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
          Tes données sont enregistrées automatiquement en <strong>double copie</strong> (principale + secours) à chaque action.
          {lastSaved && <span> Dernière sauvegarde automatique : <strong style={{ color: C.green }}>{lastSaved} ✓</strong></span>}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
          Pour transférer vers un autre téléphone ou garder une copie chez toi : exporte ici, puis importe le fichier sur l'autre appareil.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button style={{ ...btnPrimary, background: C.cyan, flex: 1, minWidth: 160 }} onClick={downloadBackup}>
            ⬇ Exporter (fichier)
          </button>
          <button style={{ ...btnGhost, flex: 1, minWidth: 160 }} onClick={() => setShowExport(!showExport)}>
            {showExport ? "Masquer" : "📋 Afficher pour copier"}
          </button>
        </div>
        {showExport && (
          <div style={{ marginBottom: 14 }}>
            <span style={label}>Sélectionne tout le texte et copie-le (WhatsApp, e-mail, notes…)</span>
            <textarea readOnly value={buildExport()} onFocus={(e) => e.target.select()}
              style={{ ...input, height: 110, fontFamily: "monospace", fontSize: 11 }} />
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📥 Importer des données</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <span style={label}>Depuis un fichier de sauvegarde</span>
              <input type="file" accept=".json,application/json,text/plain" onChange={onFile}
                style={{ ...input, padding: "8px 10px" }} />
            </div>
            <div>
              <span style={label}>Ou colle ici le texte copié</span>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
                placeholder='Colle les données exportées ici…'
                style={{ ...input, height: 80, fontFamily: "monospace", fontSize: 11 }} />
            </div>
            {importPreview && (
              <div style={{ background: C.cyanSoft, border: `1.5px solid ${C.cyan}`, borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: C.cyan, marginBottom: 4 }}>Aperçu de la sauvegarde ({importPreview.date})</div>
                {importPreview.brands} marques · {importPreview.models} modèles · {importPreview.movements} mouvements
              </div>
            )}
            {importText.trim() && !importPreview && (
              <div style={{ background: C.redSoft, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.red, fontWeight: 700 }}>
                ⚠ Ce texte n'est pas une sauvegarde valide.
              </div>
            )}
            {importPreview && (
              <DangerButton
                label="⚠ Importer et REMPLACER toutes les données"
                confirmLabel="Clique encore pour confirmer le remplacement"
                onConfirm={() => { if (importData(importText)) setImportText(""); }}
                style={{ padding: "12px 16px", fontSize: 14, width: "100%" }}
              />
            )}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>💵 Monnaie</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Utilisée dans l'onglet Rentabilité (FC, $, €…).</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <span style={label}>Symbole ou code</span>
            <input style={input} value={cur} onChange={(e) => setCur(e.target.value)} placeholder="FC" />
          </div>
          <button style={btnPrimary} onClick={() => { setCurrency(cur.trim() || "FC"); showToast(`Monnaie : ${cur.trim() || "FC"}.`); }}>Enregistrer</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>🔑 Changer le mot de passe gérant</div>
        <div style={{ display: "grid", gap: 10 }}>
          <div><span style={label}>Ancien mot de passe</span><input style={input} type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} /></div>
          <div><span style={label}>Nouveau mot de passe</span><input style={input} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
          <div><span style={label}>Confirmer le nouveau mot de passe</span><input style={input} type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} /></div>
          <button style={btnPrimary} onClick={changePw}>Changer le mot de passe</button>
        </div>
      </div>

      <div style={{ ...card, borderColor: C.red }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: C.red }}>🧨 Zone dangereuse</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
          Ces actions sont irréversibles. <strong>Exporte une sauvegarde d'abord</strong> (section 💾 ci-dessus) si tu veux pouvoir revenir en arrière. Chaque bouton demande une double confirmation.
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", background: C.paper, borderRadius: 10 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🧹 Effacer l'historique</div>
              <div style={{ fontSize: 12.5, color: C.muted }}>Supprime tous les mouvements et statistiques. Garde le stock actuel, les modèles, les réglages et le mot de passe. Idéal pour repartir propre après des tests.</div>
            </div>
            <DangerButton label="Effacer l'historique" confirmLabel="Confirmer l'effacement ?" onConfirm={clearMovements} style={{ padding: "10px 14px", fontSize: 13.5 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", background: C.redSoft, borderRadius: 10 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.red }}>♻ Réinitialiser TOUT</div>
              <div style={{ fontSize: 12.5, color: C.muted }}>Remet l'application à zéro : stocks, mouvements, annexes, objectifs, coûts et scores. Les modèles iPhone/Samsung sont rechargés. Seul le mot de passe est conservé.</div>
            </div>
            <DangerButton label="Tout réinitialiser" confirmLabel="⚠ Vraiment TOUT effacer ?" onConfirm={resetAll} style={{ padding: "10px 14px", fontSize: 13.5 }} />
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════ Onglet PILOTAGE & BUDGET — le poumon de l'entreprise ══════════
// Suivi budgétaire stratégique du stock : dette de réapprovisionnement,
// objectifs de stock, décision d'achat, enveloppe budgétaire, historique.
function RentaTab({
  movements, allModels, currency, defaultCost, setDefaultCost, globalGoal, setGlobalGoal,
  budgetCap, setBudgetCap, budgetPeriod, setBudgetPeriod, scoreHistory, setScoreHistory, updateModel,
  effThreshold, showToast, ui,
}) {
  const { input, label, btnPrimary, btnGhost, card } = ui;
  const [period, setPeriod] = useState("week"); // day | week | month
  const [showSettings, setShowSettings] = useState(defaultCost <= 0);
  const [costIn, setCostIn] = useState(defaultCost ? String(defaultCost) : "");
  const [goalIn, setGoalIn] = useState(globalGoal ? String(globalGoal) : "");
  const [capIn, setCapIn] = useState(budgetCap ? String(budgetCap) : "");
  const [capPeriodIn, setCapPeriodIn] = useState(budgetPeriod);
  const [envelope, setEnvelope] = useState("");

  const money = (n) => (Math.round(n * 100) / 100).toLocaleString("fr-FR") + " " + currency;
  const costOf = (m) => (m && m.costPrice !== null && m.costPrice !== undefined ? m.costPrice : defaultCost);
  const goalOf = (m) => (m && m.goal !== null && m.goal !== undefined ? m.goal : (m && m.stocked ? globalGoal : 0));

  // ── Bornes de période ──
  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === "day") return todayISO();
    if (period === "week") { d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }
    return todayISO().slice(0, 7) + "-01"; // mois en cours
  }, [period]);
  const periodLabel = period === "day" ? "aujourd'hui" : period === "week" ? "ces 7 derniers jours" : "ce mois-ci";

  // ── Calculs stratégiques ──
  const calc = useMemo(() => {
    const modelMap = {};
    allModels.forEach((m) => { modelMap[m.id] = m; });

    // 1) Dette de stock par modèle (chronologique : consommé − ravitaillé, jamais négatif)
    const debt = {};
    [...movements].reverse().forEach((mv) => {
      if (mv.type === "out" || mv.type === "comp") debt[mv.modelId] = (debt[mv.modelId] || 0) + mv.qty;
      else if (mv.type === "in") debt[mv.modelId] = Math.max(0, (debt[mv.modelId] || 0) - mv.qty);
    });
    const debtRows = Object.entries(debt)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => {
        const md = modelMap[id];
        const c = costOf(md);
        return { id, name: md ? md.name : "Modèle supprimé", brand: md ? md.brandName : "", debt: q, amount: q * c, hasCost: c > 0 };
      })
      .sort((a, b) => b.amount - a.amount || b.debt - a.debt);
    const debtTotal = debtRows.reduce((s, r) => ({ pcs: s.pcs + r.debt, amount: s.amount + r.amount }), { pcs: 0, amount: 0 });

    // 2) Consommation de la période → budget à prévoir + pertes chiffrées
    const inPeriod = movements.filter((mv) => mv.date >= periodStart);
    const perModel = {};
    inPeriod.forEach((mv) => {
      if (mv.type !== "out" && mv.type !== "comp") return;
      if (!perModel[mv.modelId]) perModel[mv.modelId] = { out: 0, comp: 0 };
      if (mv.type === "out") perModel[mv.modelId].out += mv.qty; else perModel[mv.modelId].comp += mv.qty;
    });
    let usedPcs = 0, usedAmount = 0, lossPcs = 0, lossAmount = 0, missingCost = 0;
    const periodRows = Object.entries(perModel).map(([id, r]) => {
      const md = modelMap[id];
      const c = costOf(md);
      if (c <= 0) missingCost++;
      const total = r.out + r.comp;
      usedPcs += total; usedAmount += total * c;
      lossPcs += r.comp; lossAmount += r.comp * c;
      return { id, name: md ? md.name : "Modèle supprimé", out: r.out, comp: r.comp, total, amount: total * c };
    }).sort((a, b) => b.amount - a.amount);

    // Plafond budgétaire (E) : consommation sur la fenêtre du plafond
    const capD = new Date();
    if (budgetPeriod === "week") capD.setDate(capD.getDate() - 6);
    const capStart = budgetPeriod === "week" ? capD.toISOString().slice(0, 10) : todayISO().slice(0, 7) + "-01";
    let capUsed = 0;
    movements.forEach((mv) => {
      if ((mv.type === "out" || mv.type === "comp") && mv.date >= capStart) capUsed += mv.qty * costOf(modelMap[mv.modelId]);
    });

    // 3) Objectifs de stock
    const goalRows = allModels
      .map((m) => ({ m, goal: goalOf(m) }))
      .filter(({ goal }) => goal > 0)
      .map(({ m, goal }) => {
        const missing = Math.max(0, goal - m.qty);
        return { id: m.id, name: m.name, qty: m.qty, goal, missing, budget: missing * costOf(m) };
      })
      .sort((a, b) => b.budget - a.budget);
    const goalTot = goalRows.reduce((s, r) => ({
      reached: s.reached + Math.min(r.qty, r.goal), target: s.target + r.goal, budget: s.budget + r.budget,
    }), { reached: 0, target: 0, budget: 0 });
    const goalPct = goalTot.target > 0 ? Math.round((goalTot.reached / goalTot.target) * 100) : null;

    // 4) Décision d'achat : vitesse 14 jours
    const d14 = new Date(); d14.setDate(d14.getDate() - 13);
    const iso14 = d14.toISOString().slice(0, 10);
    const speed = {};
    movements.forEach((mv) => {
      if ((mv.type === "out" || mv.type === "comp") && mv.date >= iso14) speed[mv.modelId] = (speed[mv.modelId] || 0) + mv.qty;
    });
    const d30 = new Date(); d30.setDate(d30.getDate() - 29);
    const iso30 = d30.toISOString().slice(0, 10);
    const active30 = new Set(movements.filter((mv) => (mv.type === "out" || mv.type === "comp") && mv.date >= iso30).map((mv) => mv.modelId));

    const decisions = { urgent: [], wait: [], skip: [] };
    allModels.forEach((m) => {
      const v = (speed[m.id] || 0) / 14;
      const th = effThreshold(m);
      const need = Math.max(debt[m.id] || 0, Math.max(0, goalOf(m) - m.qty));
      if (v > 0) {
        const daysLeft = v > 0 ? Math.ceil(m.qty / v) : Infinity;
        const row = { id: m.id, name: m.name, qty: m.qty, perDay: Math.round(v * 10) / 10, daysLeft, need: need || Math.max(1, th * 2 - m.qty), cost: costOf(m) };
        if (m.qty <= th || daysLeft <= 7) decisions.urgent.push(row);
        else decisions.wait.push(row);
      } else if (m.stocked && m.qty > 0 && !active30.has(m.id)) {
        decisions.skip.push({ id: m.id, name: m.name, qty: m.qty, value: m.qty * costOf(m) });
      }
    });
    decisions.urgent.sort((a, b) => a.daysLeft - b.daysLeft);
    decisions.wait.sort((a, b) => a.daysLeft - b.daysLeft);
    decisions.skip.sort((a, b) => b.value - a.value);

    // C) Valeur du stock immobilisé
    const brandValue = {};
    let stockValue = 0;
    allModels.forEach((m) => {
      const v = m.qty * costOf(m);
      stockValue += v;
      if (v > 0) brandValue[m.brandName] = (brandValue[m.brandName] || 0) + v;
    });
    const dormantValue = decisions.skip.reduce((s, r) => s + r.value, 0);

    // D) Historique budgétaire : 6 derniers mois de consommation chiffrée
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const ym = d.toISOString().slice(0, 7);
      let amt = 0;
      movements.forEach((mv) => {
        if ((mv.type === "out" || mv.type === "comp") && mv.date.slice(0, 7) === ym) amt += mv.qty * costOf(modelMap[mv.modelId]);
      });
      monthly.push({ mois: d.toLocaleDateString("fr-FR", { month: "short" }), budget: Math.round(amt * 100) / 100 });
    }
    const monthlyAvg = monthly.reduce((s, x) => s + x.budget, 0) / 6;

    return { debtRows, debtTotal, periodRows, usedPcs, usedAmount, lossPcs, lossAmount, missingCost, capUsed, goalRows, goalTot, goalPct, decisions, brandValue: Object.entries(brandValue).sort((a, b) => b[1] - a[1]), stockValue, dormantValue, monthly, monthlyAvg };
  }, [movements, allModels, periodStart, defaultCost, globalGoal, budgetPeriod, effThreshold]);

  // A) Enveloppe budgétaire intelligente : répartir l'argent disponible
  const plan = useMemo(() => {
    const budget = parseFloat(envelope);
    if (isNaN(budget) || budget <= 0) return null;
    let rest = budget;
    const buys = [];
    const queue = [...calc.decisions.urgent, ...calc.decisions.wait];
    // priorité 1 : modèles urgents puis en attente, selon leur besoin réel
    for (const r of queue) {
      if (rest <= 0) break;
      const c = r.cost > 0 ? r.cost : defaultCost;
      if (c <= 0) continue;
      const affordable = Math.floor(rest / c);
      const take = Math.min(r.need, affordable);
      if (take > 0) { buys.push({ name: r.name, pcs: take, amount: take * c }); rest -= take * c; }
    }
    // priorité 2 : combler les objectifs restants
    for (const g of calc.goalRows) {
      if (rest <= 0) break;
      if (buys.find((b) => b.name === g.name)) continue;
      const c = g.missing > 0 ? g.budget / g.missing : 0;
      if (c <= 0) continue;
      const take = Math.min(g.missing, Math.floor(rest / c));
      if (take > 0) { buys.push({ name: g.name, pcs: take, amount: take * c }); rest -= take * c; }
    }
    return { budget, buys, used: budget - rest, rest };
  }, [envelope, calc, defaultCost]);


  // ══════════ MOTEUR DU CONSEILLER STRATÉGIQUE ══════════
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const [showReportText, setShowReportText] = useState(false);

  const advisor = useMemo(() => {
    const modelMap = {};
    allModels.forEach((m) => { modelMap[m.id] = m; });
    const isoAgo = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
    const iso30 = isoAgo(29), iso14 = isoAgo(13), iso7 = isoAgo(6), iso56 = isoAgo(55);

    // Ventes 30 jours par modèle + vitesse 14 jours
    const sales30 = {}; let sales30Total = 0;
    const speed14 = {};
    const use7 = { out: 0, comp: 0 }, usePrev7 = { out: 0, comp: 0 };
    const prev7Start = isoAgo(13), prev7End = isoAgo(7);
    movements.forEach((mv) => {
      if (mv.type !== "out" && mv.type !== "comp") return;
      if (mv.type === "out" && mv.date >= iso30) { sales30[mv.modelId] = (sales30[mv.modelId] || 0) + mv.qty; sales30Total += mv.qty; }
      if (mv.date >= iso14) speed14[mv.modelId] = (speed14[mv.modelId] || 0) + mv.qty;
      if (mv.date >= iso7) use7[mv.type === "comp" ? "comp" : "out"] += mv.qty;
      else if (mv.date >= prev7Start && mv.date <= prev7End) usePrev7[mv.type === "comp" ? "comp" : "out"] += mv.qty;
    });
    const vOf = (id) => (speed14[id] || 0) / 14;

    // Tendance de la période sélectionnée vs période précédente
    let curUse = 0, prevUse = 0;
    if (period === "month") {
      const ym = todayISO().slice(0, 7);
      const pm = new Date(); pm.setDate(1); pm.setMonth(pm.getMonth() - 1);
      const pym = pm.toISOString().slice(0, 7);
      movements.forEach((mv) => {
        if (mv.type !== "out" && mv.type !== "comp") return;
        if (mv.date.slice(0, 7) === ym) curUse += mv.qty;
        else if (mv.date.slice(0, 7) === pym) prevUse += mv.qty;
      });
    } else {
      const len = period === "day" ? 1 : 7;
      const curStart = isoAgo(len - 1), pStart = isoAgo(2 * len - 1), pEnd = isoAgo(len);
      movements.forEach((mv) => {
        if (mv.type !== "out" && mv.type !== "comp") return;
        if (mv.date >= curStart) curUse += mv.qty;
        else if (mv.date >= pStart && mv.date <= pEnd) prevUse += mv.qty;
      });
    }
    const trend = prevUse > 0 ? Math.round(((curUse - prevUse) / prevUse) * 100) : (curUse > 0 ? null : 0);

    // Pareto 80/20 (2)(3)
    const ranked = Object.entries(sales30).map(([id, q]) => ({ id, q, m: modelMap[id] })).filter((r) => r.m).sort((a, b) => b.q - a.q);
    let cum = 0, paretoCount = 0;
    for (const r of ranked) { cum += r.q; paretoCount++; if (cum >= sales30Total * 0.8) break; }
    const paretoShare = ranked.length > 0 ? Math.round((paretoCount / ranked.length) * 100) : null;

    // H) Jour de pointe (8 dernières semaines, ventes)
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; let dayGrand = 0;
    movements.forEach((mv) => {
      if (mv.type === "out" && mv.date >= iso56) {
        const w = new Date(mv.date + "T00:00:00").getDay();
        dayTotals[w] += mv.qty; dayGrand += mv.qty;
      }
    });
    let peakDay = null;
    if (dayGrand >= 10) {
      const maxI = dayTotals.indexOf(Math.max(...dayTotals));
      const share = Math.round((dayTotals[maxI] / dayGrand) * 100);
      if (share >= 22) peakDay = { name: JOURS[maxI], share, veille: JOURS[(maxI + 6) % 7] };
    }

    // Taux de perte 7j vs 7j précédents (5)
    const lossRate7 = use7.out + use7.comp > 0 ? Math.round((use7.comp / (use7.out + use7.comp)) * 100) : 0;
    const lossRatePrev7 = usePrev7.out + usePrev7.comp > 0 ? Math.round((usePrev7.comp / (usePrev7.out + usePrev7.comp)) * 100) : 0;

    // I) Recalibrage des objectifs : couverture cible = 14 jours de vente
    const recalib = [];
    allModels.forEach((m) => {
      const v = vOf(m.id);
      if (v <= 0) return;
      const suggested = Math.ceil(v * 14);
      const g = goalOf(m);
      if (suggested >= 2 && (g === 0 || g < suggested * 0.6 || g > suggested * 2)) {
        recalib.push({ brandId: m.brandId, modelId: m.id, name: m.name, current: g, suggested, perDay: Math.round(v * 10) / 10 });
      }
    });
    recalib.sort((a, b) => b.suggested - a.suggested);

    // 1) Score de santé — 5 piliers /20
    const stocked = allModels.filter((m) => m.stocked);
    const alertsN = stocked.filter((m) => m.qty <= effThreshold(m)).length;
    const use30 = movements.filter((mv) => (mv.type === "out" || mv.type === "comp") && mv.date >= iso30);
    const use30Tot = use30.reduce((s, mv) => s + mv.qty, 0);
    const loss30 = use30.filter((mv) => mv.type === "comp").reduce((s, mv) => s + mv.qty, 0);
    const lossRate30 = use30Tot > 0 ? loss30 / use30Tot : 0;
    const p1 = stocked.length > 0 ? Math.round(20 * (1 - alertsN / stocked.length)) : 10;
    const p2 = use30Tot > 0 ? Math.round(20 * (1 - Math.min(1, lossRate30 * 4))) : 15;
    const p3 = budgetCap > 0 ? (calc.capUsed <= budgetCap ? 20 : Math.max(0, Math.round(20 - ((calc.capUsed - budgetCap) / budgetCap) * 20))) : 14;
    const p4 = calc.goalPct !== null ? Math.round(20 * Math.min(1, calc.goalPct / 100)) : 12;
    const p5 = calc.stockValue > 0 ? Math.round(20 * (1 - Math.min(1, (calc.dormantValue / calc.stockValue) * 2))) : 10;
    const score = Math.max(0, Math.min(100, p1 + p2 + p3 + p4 + p5));
    const pillars = [
      { n: "Disponibilité", v: p1 }, { n: "Pertes", v: p2 }, { n: "Budget", v: p3 },
      { n: "Objectifs", v: p4 }, { n: "Rotation", v: p5 },
    ];

    // ── Génération des conseils ──
    const advices = [];
    const th2 = effThreshold;
    // 4) Protection des best-sellers
    ranked.slice(0, 5).forEach((r) => {
      const m = r.m, v = vOf(m.id);
      const daysLeft = v > 0 ? Math.ceil(m.qty / v) : Infinity;
      if (m.qty <= th2(m) || daysLeft <= 7) {
        const need = Math.max(Math.ceil(v * 14) - m.qty, 1);
        advices.push({ lvl: "urgent", t: `Protège ton best-seller ${m.name}`, x: `${r.q} vendues en 30 j mais seulement ${m.qty} en stock (~${v > 0 ? Math.round(v * 10) / 10 : 0}/j → rupture ${daysLeft === Infinity ? "?" : "≤ " + daysLeft + " j"}). Refuser des clients sur ce modèle serait ta pire perte.`, a: `Rachète ${need} pcs = ${money(need * costOf(m))} dès aujourd'hui.` });
      }
    });
    // Ruptures imminentes hors best-sellers
    const bestIds = new Set(ranked.slice(0, 5).map((r) => r.id));
    const otherUrgent = calc.decisions.urgent.filter((r) => !bestIds.has(r.id));
    if (otherUrgent.length > 0) {
      advices.push({ lvl: "urgent", t: `${otherUrgent.length} autre${otherUrgent.length > 1 ? "s" : ""} modèle${otherUrgent.length > 1 ? "s" : ""} proche${otherUrgent.length > 1 ? "s" : ""} de la rupture`, x: otherUrgent.slice(0, 3).map((r) => `${r.name} (${r.qty} rest.)`).join(", ") + (otherUrgent.length > 3 ? "…" : "") + ".", a: `Utilise l'Enveloppe intelligente ci-dessus pour répartir ton budget en priorité.` });
    }
    // 5) Dérive des pertes
    if (lossRate7 >= 10 && lossRate7 > lossRatePrev7 + 4) {
      advices.push({ lvl: "warn", t: "Tes pertes de production augmentent", x: `Taux de perte : ${lossRate7}% cette semaine contre ${lossRatePrev7}% la semaine d'avant — ces erreurs ont brûlé ${money(use7.comp * defaultCost)} en 7 jours.`, a: "Vérifie la qualité d'impression, le calibrage machine et la formation avant chaque commande." });
    } else if (use7.out + use7.comp >= 5 && lossRate7 <= 5) {
      advices.push({ lvl: "ok", t: "Discipline de production excellente", x: `Seulement ${lossRate7}% de pertes cette semaine — continue comme ça, chaque pochette sauvée est de l'argent gagné.` });
    }
    // E) Plafond
    if (budgetCap > 0 && calc.capUsed > budgetCap) {
      advices.push({ lvl: "warn", t: "Plafond budgétaire dépassé", x: `${money(calc.capUsed)} consommés pour un plafond de ${money(budgetCap)} (${budgetPeriod === "week" ? "semaine" : "mois"}).`, a: "Soit c'est une bonne semaine de ventes (alors relève le plafond), soit priorise uniquement les modèles 🔴." });
    }
    // Dette élevée
    if (calc.debtTotal.amount > 0 && calc.monthlyAvg > 0 && calc.debtTotal.amount > calc.monthlyAvg) {
      advices.push({ lvl: "warn", t: "Ta dette de stock s'accumule", x: `${money(calc.debtTotal.amount)} à rembourser — plus d'un mois de consommation moyenne (${money(calc.monthlyAvg)}/mois).`, a: "Planifie un remboursement progressif : commence par les modèles 🔴 de la liste de dette." });
    }
    // Tendance
    if (trend !== null && trend >= 15 && prevUse >= 3) {
      advices.push({ lvl: "ok", t: `Activité en hausse de ${trend}% 📈`, x: `${curUse} pochettes utilisées contre ${prevUse} la période précédente — la demande grandit.`, a: "Anticipe : augmente légèrement les objectifs des modèles qui tirent cette croissance." });
    } else if (trend !== null && trend <= -25 && prevUse >= 5) {
      advices.push({ lvl: "warn", t: `Activité en baisse de ${Math.abs(trend)}% 📉`, x: `${curUse} pochettes contre ${prevUse} la période précédente.`, a: "Analyse : jour férié ? concurrence ? Relance la clientèle (promo, publications) avant de racheter du stock." });
    }
    // 3) Pareto
    if (paretoShare !== null && ranked.length >= 5 && paretoShare <= 45) {
      advices.push({ lvl: "idea", t: `Règle du 80/20 : ${paretoCount} modèle${paretoCount > 1 ? "s" : ""} font l'essentiel`, x: `${paretoCount} modèle${paretoCount > 1 ? "s" : ""} (${paretoShare}% de ta gamme active) représentent 80% de tes ventes : ${ranked.slice(0, Math.min(paretoCount, 4)).map((r) => r.m.name).join(", ")}${paretoCount > 4 ? "…" : ""}.`, a: "Concentre ton budget et tes objectifs sur eux ; achète les autres en petite quantité seulement." });
    }
    // Capital dormant
    if (calc.stockValue > 0 && calc.dormantValue / calc.stockValue >= 0.15) {
      advices.push({ lvl: "idea", t: "De l'argent dort dans tes étagères", x: `${money(calc.dormantValue)} immobilisés dans ${calc.decisions.skip.length} modèle${calc.decisions.skip.length > 1 ? "s" : ""} sans vente depuis 30 jours (${Math.round((calc.dormantValue / calc.stockValue) * 100)}% de la valeur du stock).`, a: "Lance une promo de déstockage ou propose ces modèles en personnalisation offerte pour récupérer ce capital." });
    }
    // H) Jour de pointe
    if (peakDay) {
      advices.push({ lvl: "idea", t: `Le ${peakDay.name} est ton jour de pointe`, x: `${peakDay.share}% de tes ventes des 8 dernières semaines tombent le ${peakDay.name}.`, a: `Chaque ${peakDay.veille} soir : vérifie le stock des best-sellers et prépare les machines.` });
    }
    // Objectifs atteints
    if (calc.goalPct !== null && calc.goalPct >= 100) {
      advices.push({ lvl: "ok", t: "Tous les objectifs de stock sont atteints 🏆", x: "Ton stock est exactement là où tu l'as voulu — pilotage maîtrisé." });
    }
    if (defaultCost <= 0) {
      advices.push({ lvl: "warn", t: "Coût global non défini", x: "Sans coût d'achat, le conseiller ne peut pas chiffrer ses recommandations.", a: "Ouvre ⚙ Régler et entre ton coût (ex : 0.60)." });
    }
    const order = { urgent: 0, warn: 1, ok: 2, idea: 3 };
    advices.sort((a, b) => order[a.lvl] - order[b.lvl]);

    // 6) Les 3 actions de la semaine
    const actions = [];
    advices.filter((a) => a.a && (a.lvl === "urgent" || a.lvl === "warn")).slice(0, 3).forEach((a) => actions.push(a.a));
    if (actions.length < 3 && recalib.length > 0) actions.push(`Recalibre ${Math.min(recalib.length, 3)} objectif${recalib.length > 1 ? "s" : ""} de stock (voir 🎯 Recalibrage ci-dessous).`);
    if (actions.length < 3) advices.filter((a) => a.a && a.lvl === "idea").slice(0, 3 - actions.length).forEach((a) => actions.push(a.a));
    if (actions.length === 0) actions.push("Rien d'urgent : maintiens le rythme et vérifie le Pilotage en fin de semaine.");

    // G) Rapport texte à partager
    const lvlIcon = { urgent: "🔴", warn: "🟡", ok: "🟢", idea: "💡" };
    const reportText = [
      "📋 RAPPORT BK POCHETTE CONGO — " + new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      "Période : " + periodLabel,
      "",
      "🏥 SCORE DE SANTÉ : " + score + "/100 (" + pillars.map((p) => p.n + " " + p.v + "/20").join(" · ") + ")",
      trend !== null ? "📊 Tendance : " + (trend >= 0 ? "+" : "") + trend + "% vs période précédente" : "",
      "",
      "CHIFFRES CLÉS",
      "• Consommation : " + calc.usedPcs + " pcs → budget à prévoir " + money(calc.usedAmount),
      "• Pertes : " + calc.lossPcs + " pcs (" + money(calc.lossAmount) + ")",
      "• Dette de stock : " + calc.debtTotal.pcs + " pcs (" + money(calc.debtTotal.amount) + ")",
      calc.goalPct !== null ? "• Objectifs de stock : " + calc.goalPct + "% atteints" : "",
      "• Valeur du stock : " + money(calc.stockValue) + " (dont " + money(calc.dormantValue) + " dormants)",
      "",
      "CONSEILS DU JOUR",
      ...advices.slice(0, 6).map((a) => lvlIcon[a.lvl] + " " + a.t + " — " + a.x + (a.a ? " → " + a.a : "")),
      "",
      "✅ LES 3 ACTIONS DE LA SEMAINE",
      ...actions.map((a, i) => (i + 1) + ". " + a),
    ].filter((l) => l !== "").join("\n");

    return { score, pillars, trend, curUse, prevUse, advices, actions, recalib: recalib.slice(0, 6), reportText, lossRate7 };
  }, [movements, allModels, calc, period, periodLabel, defaultCost, globalGoal, budgetCap, budgetPeriod, currency, effThreshold]);

  // J) Enregistrement hebdomadaire du score de santé
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lundi de la semaine
    const weekKey = d.toISOString().slice(0, 10);
    setScoreHistory((prev) => {
      const list = prev || [];
      const last = list[list.length - 1];
      if (last && last.week === weekKey) {
        if (last.score === advisor.score) return list;
        return [...list.slice(0, -1), { ...last, score: advisor.score }];
      }
      return [...list, { week: weekKey, score: advisor.score }].slice(-26);
    });
  }, [advisor.score, setScoreHistory]);

  // G) Copie du rapport
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(advisor.reportText);
      showToast("✓ Rapport copié — colle-le dans WhatsApp, e-mail ou tes notes.");
    } catch (e) {
      setShowReportText(true);
      showToast("Copie automatique bloquée — sélectionne le texte affiché.");
    }
  };

  const scoreColor = advisor.score >= 75 ? C.green : advisor.score >= 50 ? C.amber : C.red;
  const scoreLabel = advisor.score >= 75 ? "En bonne santé" : advisor.score >= 50 ? "Sous surveillance" : "En difficulté — agis vite";

  const saveSettings = () => {
    const c = Math.max(0, parseFloat(costIn) || 0);
    const g = Math.max(0, parseInt(goalIn, 10) || 0);
    const cap = Math.max(0, parseFloat(capIn) || 0);
    setDefaultCost(c); setGlobalGoal(g); setBudgetCap(cap); setBudgetPeriod(capPeriodIn);
    setShowSettings(false);
    showToast(`✓ Réglages du pilotage enregistrés (coût global : ${money(c)}).`);
  };

  const capExceeded = budgetCap > 0 && calc.capUsed > budgetCap;
  const capPct = budgetCap > 0 ? Math.min(100, Math.round((calc.capUsed / budgetCap) * 100)) : 0;

  return (
    <>
      {/* ── Réglages du pilotage ── */}
      <div style={{ ...card, borderColor: C.magenta }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>🎯 Pilotage & Budget du stock</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              Coût global : <strong>{defaultCost > 0 ? money(defaultCost) + "/pochette" : "non défini ⚠"}</strong>
              {globalGoal > 0 && <> · Objectif global : <strong>{globalGoal} pcs/modèle</strong></>}
              {budgetCap > 0 && <> · Plafond : <strong>{money(budgetCap)}/{budgetPeriod === "week" ? "semaine" : "mois"}</strong></>}
            </div>
          </div>
          <button style={btnGhost} onClick={() => setShowSettings(!showSettings)}>{showSettings ? "Fermer" : "⚙ Régler"}</button>
        </div>
        {showSettings && (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={label}>💰 Coût d'achat global ({currency}/pochette)</span>
                <input style={input} type="number" min="0" step="0.01" value={costIn} onChange={(e) => setCostIn(e.target.value)} placeholder="Ex : 0.60" />
              </div>
              <div>
                <span style={label}>🎯 Objectif global (pcs par modèle stocké)</span>
                <input style={input} type="number" min="0" value={goalIn} onChange={(e) => setGoalIn(e.target.value)} placeholder="0 = aucun" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <span style={label}>🚨 Plafond budgétaire ({currency})</span>
                <input style={input} type="number" min="0" step="0.01" value={capIn} onChange={(e) => setCapIn(e.target.value)} placeholder="0 = désactivé" />
              </div>
              <div>
                <span style={label}>Période du plafond</span>
                <select style={input} value={capPeriodIn} onChange={(e) => setCapPeriodIn(e.target.value)}>
                  <option value="week">Par semaine</option>
                  <option value="month">Par mois</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Les modèles qui coûtent plus cher (ex : Z Fold) peuvent avoir leur propre coût et objectif dans l'onglet Stock — ils remplacent alors les valeurs globales.
            </div>
            <button style={btnPrimary} onClick={saveSettings}>Enregistrer les réglages</button>
          </div>
        )}
      </div>

      {defaultCost <= 0 && (
        <div style={{ background: C.amberSoft, border: `1.5px solid ${C.amber}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: C.amber, fontWeight: 700 }}>
          ⚠ Définis d'abord le coût d'achat global (ex : 0.60) pour que tous les calculs budgétaires soient exacts.
        </div>
      )}

      {/* ── E) Alerte plafond budgétaire ── */}
      {budgetCap > 0 && (
        <div style={{ ...card, borderColor: capExceeded ? C.red : capPct >= 80 ? C.amber : C.green }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {capExceeded ? "🚨 Plafond budgétaire DÉPASSÉ" : "🚦 Plafond budgétaire"}
            </div>
            <div style={{ fontWeight: 700, color: capExceeded ? C.red : C.ink, fontVariantNumeric: "tabular-nums" }}>
              {money(calc.capUsed)} / {money(budgetCap)}
            </div>
          </div>
          <div style={{ background: "#EDECE5", borderRadius: 99, height: 12, overflow: "hidden" }}>
            <div style={{ width: capPct + "%", height: "100%", background: capExceeded ? C.red : capPct >= 80 ? C.amber : C.green, transition: "width 400ms" }} />
          </div>
          <div style={{ fontSize: 12.5, color: capExceeded ? C.red : C.muted, marginTop: 6, fontWeight: capExceeded ? 700 : 400 }}>
            {capExceeded
              ? `Consommation ${budgetPeriod === "week" ? "de la semaine" : "du mois"} au-dessus du plafond de ${money(calc.capUsed - budgetCap)} — ralentis ou révise ton plafond.`
              : `${capPct}% du plafond ${budgetPeriod === "week" ? "hebdomadaire" : "mensuel"} consommé.`}
          </div>
        </div>
      )}

      {/* ── Période + KPIs budget ── */}
      <div style={{ display: "flex", gap: 6 }}>
        {[["day", "Aujourd'hui"], ["week", "7 jours"], ["month", "Ce mois"]].map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)}
            style={{ ...btnGhost, flex: 1, background: period === k ? C.magentaSoft : "transparent", borderColor: period === k ? C.magenta : C.border, color: period === k ? C.magenta : C.ink, fontWeight: 700, fontSize: 13.5 }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <KPI label={`Consommé ${periodLabel}`} value={calc.usedPcs} sub="pochettes utilisées" color={C.magenta} />
        <KPI label="💵 Budget à prévoir" value={money(calc.usedAmount)} sub={`pour racheter l'usage ${periodLabel}`} color={C.cyan} />
        <KPI label="Coût des pertes" value={money(calc.lossAmount)} sub={`${calc.lossPcs} compensation${calc.lossPcs > 1 ? "s" : ""} — argent brûlé`} color={C.violet} />
        <KPI label="Valeur du stock" value={money(calc.stockValue)} sub="argent en rayon" />
      </div>

      {calc.missingCost > 0 && (
        <div style={{ background: C.amberSoft, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, color: C.amber, fontWeight: 700 }}>
          ⚠ {calc.missingCost} modèle{calc.missingCost > 1 ? "s" : ""} consommé{calc.missingCost > 1 ? "s" : ""} sans coût défini — le budget affiché est sous-estimé.
        </div>
      )}

      {/* ── Détail budget de la période ── */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>💵 Budget de réapprovisionnement — {periodLabel}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Chaque usage converti en argent à rembourser au stock, modèle par modèle</div>
        {calc.periodRows.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muted }}>Aucune consommation sur la période.</div>
        ) : (
          <>
            {calc.periodRows.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.paper}`, fontSize: 14 }}>
                <div>
                  <strong>{r.name}</strong>
                  <div style={{ fontSize: 12, color: C.muted }}>{r.total} utilisée{r.total > 1 ? "s" : ""}{r.comp > 0 ? ` (dont ${r.comp} perte${r.comp > 1 ? "s" : ""})` : ""}</div>
                </div>
                <div style={{ fontWeight: 700, color: C.cyan, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(r.amount)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700, fontSize: 15 }}>
              <span>TOTAL à prévoir</span>
              <span style={{ color: C.cyan }}>{money(calc.usedAmount)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Dette de stock totale ── */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🧾 Dette de stock (tout ce qui reste à racheter)</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Unités consommées jamais remboursées au stock, toutes périodes confondues. Diminue automatiquement à chaque approvisionnement.</div>
        {calc.debtRows.length === 0 ? (
          <div style={{ background: C.greenSoft, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.green, fontWeight: 700 }}>✓ Aucune dette — tout l'usage a été remboursé au stock !</div>
        ) : (
          <>
            {calc.debtRows.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.paper}`, fontSize: 14 }}>
                <div><strong>{r.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>· {r.debt} pcs à racheter</span></div>
                <div style={{ fontWeight: 700, color: C.red, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(r.amount)}</div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700, fontSize: 15 }}>
              <span>DETTE TOTALE · {calc.debtTotal.pcs} pcs</span>
              <span style={{ color: C.red }}>{money(calc.debtTotal.amount)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Objectifs de stock ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 700 }}>🎯 Objectifs de stock</div>
          {calc.goalPct !== null && (
            <div style={{ fontWeight: 700, color: calc.goalPct >= 100 ? C.green : calc.goalPct >= 60 ? C.amber : C.red }}>{calc.goalPct}% atteints</div>
          )}
        </div>
        {calc.goalPct !== null && (
          <div style={{ background: "#EDECE5", borderRadius: 99, height: 12, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: Math.min(100, calc.goalPct) + "%", height: "100%", background: calc.goalPct >= 100 ? C.green : calc.goalPct >= 60 ? C.amber : C.red, transition: "width 400ms" }} />
          </div>
        )}
        {calc.goalRows.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muted }}>Aucun objectif défini. Fixe un objectif global dans « ⚙ Régler » ci-dessus, ou par modèle dans l'onglet Stock.</div>
        ) : (
          <>
            {calc.goalRows.filter((r) => r.missing > 0).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.paper}`, fontSize: 14 }}>
                <div><strong>{r.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>· {r.qty}/{r.goal} — il manque {r.missing}</span></div>
                <div style={{ fontWeight: 700, color: C.amber, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(r.budget)}</div>
              </div>
            ))}
            {calc.goalRows.every((r) => r.missing === 0) && (
              <div style={{ background: C.greenSoft, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.green, fontWeight: 700 }}>✓ Tous les objectifs de stock sont atteints !</div>
            )}
            {calc.goalTot.budget > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700, fontSize: 15 }}>
                <span>Budget pour atteindre tous les objectifs</span>
                <span style={{ color: C.amber }}>{money(calc.goalTot.budget)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── A) Enveloppe budgétaire intelligente ── */}
      <div style={{ ...card, borderColor: C.cyan }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>💼 Enveloppe budgétaire intelligente</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>Entre l'argent disponible : l'app répartit sur les modèles prioritaires (urgents d'abord, puis objectifs).</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <span style={label}>Argent disponible ({currency})</span>
            <input style={input} type="number" min="0" step="0.01" value={envelope} onChange={(e) => setEnvelope(e.target.value)} placeholder="Ex : 30" />
          </div>
        </div>
        {plan && (
          plan.buys.length === 0 ? (
            <div style={{ fontSize: 13.5, color: C.muted }}>Rien à acheter en priorité pour l'instant — ou coûts non définis.</div>
          ) : (
            <>
              {plan.buys.map((b, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.paper}`, fontSize: 14 }}>
                  <span><strong>{b.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>× {b.pcs} pcs</span></span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(b.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700, fontSize: 14 }}>
                <span>Utilisé : <span style={{ color: C.cyan }}>{money(plan.used)}</span></span>
                <span>Reste : <span style={{ color: C.green }}>{money(plan.rest)}</span></span>
              </div>
            </>
          )
        )}
      </div>

      {/* ── Décision d'achat ── */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>🧭 Racheter ou pas ?</div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.red, marginBottom: 6 }}>🔴 À racheter en priorité</div>
            {calc.decisions.urgent.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Rien d'urgent.</div> :
              calc.decisions.urgent.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0", borderBottom: `1px solid ${C.paper}` }}>
                  <span><strong>{r.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>· {r.qty} rest. · ~{r.perDay}/j</span></span>
                  <span style={{ color: C.red, fontWeight: 700 }}>rupture ≤ {r.daysLeft} j</span>
                </div>
              ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.amber, marginBottom: 6 }}>🟡 Peut attendre</div>
            {calc.decisions.wait.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Aucun.</div> :
              calc.decisions.wait.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0", borderBottom: `1px solid ${C.paper}` }}>
                  <span><strong>{r.name}</strong> <span style={{ color: C.muted, fontSize: 12 }}>· {r.qty} rest.</span></span>
                  <span style={{ color: C.amber, fontWeight: 700 }}>~{r.daysLeft} j de marge</span>
                </div>
              ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.muted, marginBottom: 6 }}>⚪ Ne pas racheter (dormants — {money(calc.dormantValue)} immobilisés)</div>
            {calc.decisions.skip.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Aucun modèle dormant.</div> :
              calc.decisions.skip.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0", borderBottom: `1px solid ${C.paper}` }}>
                  <span>{r.name} <span style={{ color: C.muted, fontSize: 12 }}>· {r.qty} en stock</span></span>
                  <span style={{ color: C.muted, fontWeight: 700 }}>{money(r.value)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── D) Historique budgétaire + C) valeur par marque ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>📉 Historique budgétaire — 6 mois</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Moyenne : <strong>{money(calc.monthlyAvg)}/mois</strong> à prévoir pour le réapprovisionnement</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={calc.monthly} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="budget" fill={C.cyan} radius={[6, 6, 0, 0]} name="Budget" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>🏦 Argent immobilisé par marque</div>
          {calc.brandValue.length === 0 ? <div style={{ fontSize: 13.5, color: C.muted }}>Stock vide.</div> :
            calc.brandValue.map(([name, v]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: `1px solid ${C.paper}` }}>
                <span>{name}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
              </div>
            ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700 }}>
            <span>Valeur totale du stock</span><span>{money(calc.stockValue)}</span>
          </div>
        </div>
      </div>

      {/* ══════════ 🧠 CONSEILLER STRATÉGIQUE BK ══════════ */}
      <div style={{ ...card, borderColor: C.ink, borderWidth: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>🧠 Conseiller stratégique BK</div>
        <div style={{ fontSize: 12.5, color: C.muted }}>Analyse automatique de toutes tes données — mise à jour en temps réel</div>
      </div>

      {/* 1) Score de santé */}
      <div style={{ ...card, borderColor: scoreColor }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center", minWidth: 110 }}>
            <div className="score-pop" style={{ fontSize: 44, fontWeight: 700, color: scoreColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{advisor.score}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>/ 100</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: scoreColor, marginTop: 4 }}>{scoreLabel}</div>
            {advisor.trend !== null && (
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: advisor.trend >= 0 ? C.green : C.red }}>
                {advisor.trend >= 0 ? "📈 +" : "📉 "}{advisor.trend}% vs période préc.
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200, display: "grid", gap: 7 }}>
            {advisor.pillars.map((p) => (
              <div key={p.n}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, marginBottom: 2 }}>
                  <span style={{ color: C.muted }}>{p.n}</span>
                  <span style={{ color: p.v >= 15 ? C.green : p.v >= 10 ? C.amber : C.red }}>{p.v}/20</span>
                </div>
                <div style={{ background: "#EDECE5", borderRadius: 99, height: 7, overflow: "hidden" }}>
                  <div style={{ width: (p.v / 20) * 100 + "%", height: "100%", background: p.v >= 15 ? C.green : p.v >= 10 ? C.amber : C.red, transition: "width 400ms" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2-5) Conseils */}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>💬 Conseils du jour</div>
        {advisor.advices.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muted }}>Pas encore assez de données — le conseiller s'active dès les premières ventes.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {advisor.advices.map((a, i) => {
              const conf = { urgent: [C.redSoft, C.red, "🔴 URGENT"], warn: [C.amberSoft, C.amber, "🟡 ATTENTION"], ok: [C.greenSoft, C.green, "🟢 BRAVO"], idea: [C.cyanSoft, C.cyan, "💡 STRATÉGIE"] }[a.lvl];
              return (
                <div key={i} style={{ background: conf[0], border: `1.5px solid ${conf[1]}`, borderRadius: 10, padding: "11px 13px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: conf[1], letterSpacing: 0.5, marginBottom: 3 }}>{conf[2]}</div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>{a.t}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: C.ink }}>{a.x}</div>
                  {a.a && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5, color: conf[1] }}>→ {a.a}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* I) Recalibrage des objectifs */}
      {advisor.recalib.length > 0 && (
        <div style={{ ...card, borderColor: C.violet }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🎯 Recalibrage des objectifs proposé</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
            Objectif conseillé = 14 jours de couverture selon la vitesse réelle de consommation. Clique « Appliquer » pour l'adopter.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {advisor.recalib.map((r) => (
              <div key={r.modelId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 12px", background: C.violetSoft, borderRadius: 10, fontSize: 14 }}>
                <div>
                  <strong>{r.name}</strong>
                  <div style={{ fontSize: 12, color: C.muted }}>~{r.perDay}/j · objectif actuel : {r.current > 0 ? r.current : "aucun"} → conseillé : <strong style={{ color: C.violet }}>{r.suggested} pcs</strong></div>
                </div>
                <button
                  style={{ ...btnPrimary, background: C.violet, padding: "8px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                  onClick={() => { updateModel(r.brandId, r.modelId, { goal: r.suggested }); showToast(`✓ Objectif de ${r.name} fixé à ${r.suggested} pcs.`); }}
                >
                  Appliquer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6) Les 3 actions de la semaine */}
      <div style={{ ...card, background: C.ink, borderColor: C.ink, color: "#FFF" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>✅ Les 3 actions de la semaine</div>
        <div style={{ display: "grid", gap: 9 }}>
          {advisor.actions.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5 }}>
              <div style={{ background: C.magenta, minWidth: 24, height: 24, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
              <div>{a}</div>
            </div>
          ))}
        </div>
        <button style={{ ...btnPrimary, width: "100%", marginTop: 14 }} onClick={copyReport}>
          📤 Copier le rapport complet (WhatsApp, e-mail…)
        </button>
        {showReportText && (
          <textarea readOnly value={advisor.reportText} onFocus={(e) => e.target.select()}
            style={{ ...input, height: 150, marginTop: 10, fontFamily: "monospace", fontSize: 11.5, background: "#26262C", color: "#FFF", borderColor: "#3F3F46" }} />
        )}
      </div>

      {/* J) Historique des scores */}
      {scoreHistory && scoreHistory.length >= 2 && (
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🏅 Évolution du score de santé</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Un point par semaine — l'entreprise progresse-t-elle ?</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={scoreHistory.map((s) => ({ sem: new Date(s.week + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), score: s.score }))} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="sem" tick={{ fontSize: 10.5 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke={C.magenta} strokeWidth={2.5} dot={{ r: 3 }} name="Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
