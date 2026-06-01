import React, { useState, useRef, useMemo } from "react";

// ─── DATOS INICIALES ──────────────────────────────────────────────
const USERS_DB = [
  { id: 1, name: "Juan Barbero", role: "barbero", email: "juan@shop.com", pin: "1234", photo: null,
    schedule: { // días habilitados y turnos bloqueados por fecha
      workDays: [1,2,3,4,5], // lunes=1 ... domingo=0
      blockedSlots: {}, // "2026-06-03": ["morning"] o ["afternoon"] o ["morning","afternoon"]
    }
  },
  { id: 2, name: "María Tatuadora", role: "tatuador", email: "maria@shop.com", pin: "5678", photo: null,
    schedule: { workDays: [2,3,4,5,6], blockedSlots: {} }
  },
  { id: 3, name: "Admin", role: "admin", email: "admin@shop.com", pin: "0000", photo: null,
    schedule: { workDays: [1,2,3,4,5,6], blockedSlots: {} }
  },
];

const ROLE_PERMISSIONS = {
  admin:    ["agenda","clientes","catalogo","caja","config"],
  barbero:  ["agenda","clientes","catalogo"],
  tatuador: ["agenda","clientes","catalogo"],
  recepcionista: ["agenda","clientes"],
};
const ROLE_LABELS = { admin:"Administrador", barbero:"Barbero", tatuador:"Tatuador/a", recepcionista:"Recepcionista" };

const MORNING_HOURS   = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30"];
const AFTERNOON_HOURS = ["14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30"];

const initServices = [
  { id:1, name:"Corte clásico",    category:"barberia", price:15,  duration:30 },
  { id:2, name:"Barba y perfilado",category:"barberia", price:12,  duration:25 },
  { id:3, name:"Tatuaje pequeño",  category:"tatuaje",  price:80,  duration:60 },
  { id:4, name:"Tatuaje mediano",  category:"tatuaje",  price:150, duration:120 },
];
const initProducts = [
  { id:1, name:"Pomada fijadora", stock:20, price:10 },
  { id:2, name:"Aceite para barba",stock:15, price:14 },
  { id:3, name:"Tinta negra",     stock:8,  price:25 },
];
const initClients = [
  { id:1, name:"Carlos Méndez", phone:"0981-234567", visits:5, lastVisit:"2026-05-20" },
  { id:2, name:"Lucía Torres",  phone:"0991-876543", visits:2, lastVisit:"2026-05-28" },
];
const initAppointments = [
  { id:1, clientName:"Carlos Méndez", service:"Corte clásico",   staffId:1, date:"2026-06-02", time:"09:00", status:"confirmado" },
  { id:2, clientName:"Lucía Torres",  service:"Tatuaje pequeño", staffId:2, date:"2026-06-03", time:"14:00", status:"pendiente" },
];
const initSales = [
  { id:1, client:"Carlos Méndez", items:["Corte clásico"], total:15, date:"2026-05-20", method:"efectivo" },
];

// ─── COLORES ──────────────────────────────────────────────────────
const C = {
  bg:"#080c10", card:"#111820", accent:"#c9a84c", accent2:"#4ecdc4", text:"#f0f0f0",
  muted:"#6a7a8a", border:"#1e2a35", success:"#2ecc71", danger:"#e74c3c",
};
const STATUS_C = { confirmado:"#2ecc71", pendiente:"#f39c12", cancelado:"#e74c3c" };
const CAT_C    = { barberia:"#3498db", tatuaje:"#8e44ad" };

// ─── TASECA LOGO SVG ──────────────────────────────────────────────
const TasecaLogo = ({ size=60 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="tg" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#c9a84c"/><stop offset="100%" stopColor="#4ecdc4"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="45" r="36" stroke="#4ecdc4" strokeWidth="0.8" strokeDasharray="3 3" fill="none" opacity="0.5"/>
    <polygon points="50,8 88,78 12,78" stroke="url(#tg)" strokeWidth="2.5" fill="none"/>
    <ellipse cx="50" cy="50" rx="13" ry="8" stroke="url(#tg)" strokeWidth="1.8" fill="#080c10"/>
    <circle cx="50" cy="50" r="4.5" fill="url(#tg)"/>
    <circle cx="50" cy="50" r="2" fill="#000"/>
    <rect x="40" y="64" width="3" height="7" fill="url(#tg)" rx="1"/>
    <rect x="45" y="61" width="3" height="10" fill="url(#tg)" rx="1"/>
    <rect x="50" y="58" width="3" height="13" fill="url(#tg)" rx="1"/>
    <rect x="55" y="61" width="3" height="10" fill="url(#tg)" rx="1"/>
    <rect x="60" y="64" width="3" height="7" fill="url(#tg)" rx="1"/>
    <circle cx="50" cy="8" r="2" fill="#4ecdc4"/>
    <circle cx="88" cy="78" r="2" fill="#4ecdc4"/>
    <circle cx="12" cy="78" r="2" fill="#4ecdc4"/>
  </svg>
);

// ─── HELPERS DE FECHA ─────────────────────────────────────────────
const today = () => new Date();
const fmt = (d) => d.toISOString().slice(0,10);
const addDays = (d, n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];

function getDaysInMonth(year, month) {
  const days = [];
  const first = new Date(year, month, 1);
  const last  = new Date(year, month+1, 0);
  // padding
  for (let i=0; i<first.getDay(); i++) days.push(null);
  for (let d=1; d<=last.getDate(); d++) days.push(new Date(year,month,d));
  return days;
}

// ─── BASE STYLES ──────────────────────────────────────────────────
const base = {
  app: { background:"linear-gradient(160deg,#080c10 0%,#0d1520 100%)", minHeight:"100vh", maxWidth:430, margin:"0 auto", fontFamily:"'Segoe UI',sans-serif", color:C.text },
  card: { background:C.card, borderRadius:14, padding:"13px 15px", marginBottom:11, border:`1px solid ${C.border}` },
  input: { width:"100%", background:"#1a2230", border:`1px solid ${C.border}`, borderRadius:11, padding:"11px 13px", color:C.text, fontSize:14, boxSizing:"border-box", outline:"none" },
  btn: (v="primary") => ({
    background: v==="primary"?C.accent : v==="cyan"?"#4ecdc4" : v==="danger"?C.danger : v==="ghost"?"transparent":C.border,
    color: v==="ghost"?C.muted : v==="secondary"?C.muted : "#000",
    border: v==="ghost"?`1px solid ${C.border}`:"none",
    borderRadius:11, padding:"10px 18px", cursor:"pointer", fontWeight:700, fontSize:14, width:"100%",
  }),
  row: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  badge: (color) => ({ background:color+"22", color, fontSize:11, padding:"2px 9px", borderRadius:20, fontWeight:600 }),
  label: { fontSize:12, color:C.muted, marginBottom:5, display:"block" },
  overlay: { position:"fixed", inset:0, background:"#000d", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" },
  modalBox: { background:C.card, borderRadius:"20px 20px 0 0", padding:"22px 18px 36px", width:"100%", maxWidth:430, maxHeight:"88vh", overflowY:"auto" },
};

// ═══════════════════════════════════════════════════════════════════
// CALENDARIO PÚBLICO — CLIENTES AGENDAN
// ═══════════════════════════════════════════════════════════════════
function PublicBooking({ services, appointments, users, onAppointmentBooked, onGoAdmin }) {
  const [step, setStep]       = useState(1);
  const [selService, setSelService] = useState(null);
  const [selStaff, setSelStaff]   = useState(null);
  const [selDate, setSelDate]     = useState(null);
  const [selTime, setSelTime]     = useState(null);
  const [form, setForm]       = useState({ name:"", phone:"" });
  const [error, setError]     = useState("");
  const [calYear, setCalYear] = useState(today().getFullYear());
  const [calMonth, setCalMonth] = useState(today().getMonth());

  const staff = users.filter(u => u.role === "barbero" || u.role === "tatuador");

  // Calcular disponibilidad de un día para el staff seleccionado
  const dayStatus = (date) => {
    if (!selStaff) return "unavailable";
    const dow = date.getDay();
    const dateStr = fmt(date);
    const todayStr = fmt(today());
    if (dateStr < todayStr) return "past";
    const sched = selStaff.schedule;
    if (!sched.workDays.includes(dow)) return "off";
    const blocked = sched.blockedSlots[dateStr] || [];
    const apptTimes = appointments.filter(a => a.staffId===selStaff.id && a.date===dateStr).map(a=>a.time);
    const morningFull  = blocked.includes("morning")  || MORNING_HOURS.every(h=>apptTimes.includes(h));
    const afternoonFull= blocked.includes("afternoon")|| AFTERNOON_HOURS.every(h=>apptTimes.includes(h));
    if (morningFull && afternoonFull) return "full";
    return "available";
  };

  const availableTimes = useMemo(() => {
    if (!selStaff || !selDate) return { morning:[], afternoon:[] };
    const dateStr = fmt(selDate);
    const blocked = selStaff.schedule.blockedSlots[dateStr] || [];
    const apptTimes = appointments.filter(a=>a.staffId===selStaff.id && a.date===dateStr).map(a=>a.time);
    return {
      morning:   blocked.includes("morning")   ? [] : MORNING_HOURS.filter(h=>!apptTimes.includes(h)),
      afternoon: blocked.includes("afternoon") ? [] : AFTERNOON_HOURS.filter(h=>!apptTimes.includes(h)),
    };
  }, [selStaff, selDate, appointments]);

  const confirm = () => {
    if (!form.name || !form.phone) { setError("Completa tu nombre y teléfono"); return; }
    const newAppt = {
      id: Date.now(),
      clientName: form.name,
      service: selService.name,
      staffId: selStaff.id,
      date: fmt(selDate),
      time: selTime,
      status: "pendiente",
    };
    onAppointmentBooked(newAppt);
    setStep(5);
  };

  const days = getDaysInMonth(calYear, calMonth);

  const s = {
    hero: { background:"linear-gradient(160deg,#080c10 0%,#0d1a28 60%,#0a1a15 100%)", padding:"36px 24px 24px", textAlign:"center", borderBottom:`1px solid ${C.border}` },
    heroTitle: { fontSize:28, fontWeight:900, background:"linear-gradient(90deg,#c9a84c,#4ecdc4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:4, marginBottom:2 },
    content: { padding:"18px 15px 100px" },
    stepBar: { display:"flex", gap:5, marginBottom:20 },
    stepDot: (a,d) => ({ flex:1, height:4, borderRadius:4, background:d?C.accent:a?C.accent+"66":C.border }),
    svcCard: (active) => ({ background:active?C.accent+"18":C.card, border:`1.5px solid ${active?C.accent:C.border}`, borderRadius:14, padding:"13px 14px", marginBottom:9, cursor:"pointer" }),
    staffCard: (active) => ({ background:active?C.accent2+"18":C.card, border:`1.5px solid ${active?C.accent2:C.border}`, borderRadius:14, padding:"12px 14px", marginBottom:9, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }),
    avatar: { width:42, height:42, borderRadius:"50%", background:C.accent+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, overflow:"hidden", flexShrink:0 },
    calHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
    calGrid: { display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 },
    calDay: (status, selected) => {
      const colors = { available:"#111820", off:"#080c10", full:"#1a0a0a", past:"#080c10", unavailable:"#080c10" };
      const borders = { available:C.border, off:"transparent", full:"#e74c3c33", past:"transparent", unavailable:"transparent" };
      const textColors = { available:C.text, off:C.border, full:C.danger+"66", past:C.border, unavailable:C.border };
      return {
        background: selected?"linear-gradient(135deg,#c9a84c,#4ecdc4)":colors[status],
        border:`1px solid ${selected?"transparent":borders[status]}`,
        borderRadius:10, padding:"8px 0", textAlign:"center", cursor:status==="available"?"pointer":"default",
        color: selected?"#000":textColors[status], fontWeight: selected?700:400, fontSize:13,
      };
    },
    shiftBtn: (active, disabled) => ({
      flex:1, padding:"14px 10px", borderRadius:12, border:`1.5px solid ${active?"#4ecdc4":disabled?C.border+"44":C.border}`,
      background: active?"#4ecdc422":disabled?"#0a0a0a":"#111820",
      color: active?"#4ecdc4":disabled?C.border:C.text,
      cursor: disabled?"not-allowed":"pointer", textAlign:"center",
    }),
    timeGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:10 },
    timeBtn: (active, disabled) => ({
      padding:"10px 6px", borderRadius:10, border:`1px solid ${active?C.accent:disabled?C.border+"33":C.border}`,
      background: active?C.accent+"22":"transparent",
      color: active?C.accent:disabled?C.border:C.muted,
      cursor:disabled?"not-allowed":"pointer", fontSize:13, fontWeight:active?700:400, textAlign:"center",
    }),
    successBox: { textAlign:"center", padding:"32px 16px" },
    adminBtn: { position:"fixed", bottom:18, right:16, background:C.card, border:`1px solid ${C.border}`, borderRadius:24, padding:"7px 14px", color:C.muted, fontSize:12, cursor:"pointer" },
  };

  const totalSteps = 4;

  return (
    <div style={base.app}>
      <div style={s.hero}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}><TasecaLogo size={68}/></div>
        <div style={s.heroTitle}>TASECA</div>
        <div style={{ fontSize:11, color:"#4ecdc4", letterSpacing:3, marginBottom:4 }}>BARBER & TATTOO STUDIO</div>
        <div style={{ fontSize:13, color:C.muted }}>Agenda tu cita fácil y rápido</div>
      </div>

      <div style={s.content}>
        {step < 5 && (
          <div style={s.stepBar}>
            {Array.from({length:totalSteps},(_,i)=>(
              <div key={i} style={s.stepDot(step===i+1, step>i+1)}/>
            ))}
          </div>
        )}

        {/* PASO 1: SERVICIO */}
        {step===1 && (
          <>
            <div style={{ fontWeight:700, fontSize:17, color:C.accent, marginBottom:14 }}>¿Qué servicio necesitas?</div>
            {services.map(sv => (
              <div key={sv.id} style={s.svcCard(selService?.id===sv.id)} onClick={()=>setSelService(sv)}>
                <div style={base.row}>
                  <div>
                    <div style={{ fontWeight:700 }}>{sv.name}</div>
                    <div style={{ color:C.muted, fontSize:13, marginTop:2 }}>⏱ {sv.duration} min · <span style={base.badge(CAT_C[sv.category]||C.muted)}>{sv.category}</span></div>
                  </div>
                  <div style={{ color:C.accent, fontWeight:900, fontSize:17 }}>${sv.price}</div>
                </div>
              </div>
            ))}
            <button type="button" style={{ ...base.btn(), marginTop:8, opacity:selService?1:0.4 }} disabled={!selService} onClick={()=>setStep(2)}>Continuar →</button>
          </>
        )}

        {/* PASO 2: PROFESIONAL */}
        {step===2 && (
          <>
            <div style={{ fontWeight:700, fontSize:17, color:C.accent, marginBottom:4 }}>Elige tu profesional</div>
            <div style={{ color:C.muted, fontSize:13, marginBottom:14 }}>Servicio: <b style={{color:C.text}}>{selService?.name}</b></div>
            {staff.map(u => (
              <div key={u.id} style={s.staffCard(selStaff?.id===u.id)} onClick={()=>{ setSelStaff(u); setSelDate(null); setSelTime(null); }}>
                <div style={s.avatar}>{u.photo?<img src={u.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:u.name[0]}</div>
                <div>
                  <div style={{ fontWeight:700 }}>{u.name}</div>
                  <div style={{ color:C.muted, fontSize:13 }}>{ROLE_LABELS[u.role]}</div>
                </div>
                {selStaff?.id===u.id && <div style={{ marginLeft:"auto", color:"#4ecdc4", fontSize:20 }}>✓</div>}
              </div>
            ))}
            <div style={{ display:"flex", gap:10 }}>
              <button type="button" style={{ ...base.btn("ghost"), flex:1, padding:"10px" }} onClick={()=>setStep(1)}>← Volver</button>
              <button type="button" style={{ ...base.btn(), flex:2, opacity:selStaff?1:0.4 }} disabled={!selStaff} onClick={()=>setStep(3)}>Continuar →</button>
            </div>
          </>
        )}

        {/* PASO 3: CALENDARIO */}
        {step===3 && (
          <>
            <div style={{ fontWeight:700, fontSize:17, color:C.accent, marginBottom:4 }}>Elige una fecha</div>
            <div style={{ color:C.muted, fontSize:13, marginBottom:14 }}>Profesional: <b style={{color:C.text}}>{selStaff?.name}</b></div>

            {/* Navegación mes */}
            <div style={s.calHeader}>
              <button type="button" onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1) }}
                style={{ background:"none", border:"none", color:C.accent, fontSize:20, cursor:"pointer" }}>‹</button>
              <div style={{ fontWeight:700, fontSize:15 }}>{MONTHS[calMonth]} {calYear}</div>
              <button type="button" onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1) }}
                style={{ background:"none", border:"none", color:C.accent, fontSize:20, cursor:"pointer" }}>›</button>
            </div>

            {/* Días de semana */}
            <div style={s.calGrid}>
              {DAYS_SHORT.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, color:C.muted, paddingBottom:6 }}>{d}</div>)}
            </div>

            {/* Días del mes */}
            <div style={s.calGrid}>
              {days.map((d,i) => {
                if (!d) return <div key={i}/>;
                const status = dayStatus(d);
                const selected = selDate && fmt(d)===fmt(selDate);
                return (
                  <div key={i} style={s.calDay(status, selected)}
                    onClick={()=>{ if(status==="available"){ setSelDate(d); setSelTime(null); }}}>
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div style={{ display:"flex", gap:14, marginTop:12, marginBottom:16, flexWrap:"wrap" }}>
              {[["#2ecc71","Disponible"],["#e74c3c","Ocupado"],["#252525","No labora"]].map(([c,l])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:c }}/>
                  <span style={{ fontSize:11, color:C.muted }}>{l}</span>
                </div>
              ))}
            </div>

            {selDate && (
              <>
                <div style={{ fontWeight:700, color:C.accent2, marginBottom:10 }}>
                  Horarios — {selDate.getDate()} de {MONTHS[selDate.getMonth()]}
                </div>
                <div style={{ display:"flex", gap:10, marginBottom:12 }}>
                  <div style={s.shiftBtn(false, availableTimes.morning.length===0)}>
                    <div style={{ fontSize:18 }}>🌅</div>
                    <div style={{ fontWeight:700, fontSize:13 }}>Mañana</div>
                    <div style={{ fontSize:11, marginTop:2 }}>{availableTimes.morning.length>0?`${availableTimes.morning.length} horas`:"Sin horarios"}</div>
                  </div>
                  <div style={s.shiftBtn(false, availableTimes.afternoon.length===0)}>
                    <div style={{ fontSize:18 }}>🌆</div>
                    <div style={{ fontWeight:700, fontSize:13 }}>Tarde</div>
                    <div style={{ fontSize:11, marginTop:2 }}>{availableTimes.afternoon.length>0?`${availableTimes.afternoon.length} horas`:"Sin horarios"}</div>
                  </div>
                </div>

                {/* Horas disponibles */}
                {availableTimes.morning.length > 0 && (
                  <>
                    <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>🌅 Mañana</div>
                    <div style={s.timeGrid}>
                      {availableTimes.morning.map(h=>(
                        <div key={h} style={s.timeBtn(selTime===h, false)} onClick={()=>setSelTime(h)}>{h}</div>
                      ))}
                    </div>
                  </>
                )}
                {availableTimes.afternoon.length > 0 && (
                  <>
                    <div style={{ fontSize:12, color:C.muted, margin:"12px 0 6px" }}>🌆 Tarde</div>
                    <div style={s.timeGrid}>
                      {availableTimes.afternoon.map(h=>(
                        <div key={h} style={s.timeBtn(selTime===h, false)} onClick={()=>setSelTime(h)}>{h}</div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button type="button" style={{ ...base.btn("ghost"), flex:1, padding:"10px" }} onClick={()=>setStep(2)}>← Volver</button>
              <button type="button" style={{ ...base.btn(), flex:2, opacity:(selDate&&selTime)?1:0.4 }} disabled={!(selDate&&selTime)} onClick={()=>setStep(4)}>Continuar →</button>
            </div>
          </>
        )}

        {/* PASO 4: DATOS PERSONALES */}
        {step===4 && (
          <>
            <div style={{ fontWeight:700, fontSize:17, color:C.accent, marginBottom:14 }}>Tus datos</div>

            {/* Resumen */}
            <div style={{ ...base.card, border:`1px solid ${C.accent}44`, marginBottom:16 }}>
              <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Resumen de tu cita</div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                <span style={{ color:C.muted }}>Servicio</span>
                <span style={{ fontWeight:700 }}>{selService?.name}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginTop:4 }}>
                <span style={{ color:C.muted }}>Profesional</span>
                <span style={{ fontWeight:700 }}>{selStaff?.name}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginTop:4 }}>
                <span style={{ color:C.muted }}>Fecha y hora</span>
                <span style={{ fontWeight:700, color:C.accent }}>{selDate && `${selDate.getDate()} ${MONTHS[selDate.getMonth()]} · ${selTime}`}</span>
              </div>
            </div>

            {[["Nombre completo","name","text","Carlos Pérez"],["Teléfono","phone","tel","0981-000000"]].map(([label,field,type,ph])=>(
              <div key={field} style={{ marginBottom:12 }}>
                <label style={base.label}>{label}</label>
                <input style={base.input} type={type} placeholder={ph} value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})}/>
              </div>
            ))}

            {error && <div style={{ color:C.danger, fontSize:13, marginBottom:10 }}>{error}</div>}

            <div style={{ display:"flex", gap:10 }}>
              <button type="button" style={{ ...base.btn("ghost"), flex:1, padding:"10px" }} onClick={()=>setStep(3)}>← Volver</button>
              <button type="button" style={{ ...base.btn(), flex:2 }} onClick={confirm}>Confirmar cita ✓</button>
            </div>
          </>
        )}

        {/* PASO 5: ÉXITO */}
        {step===5 && (
          <div style={s.successBox}>
            <div style={{ fontSize:60, marginBottom:14 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:900, background:"linear-gradient(90deg,#c9a84c,#4ecdc4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:10 }}>¡Cita agendada!</div>
            <div style={{ color:C.muted, fontSize:14, lineHeight:1.8 }}>
              <b style={{color:C.text}}>{form.name}</b>, tu cita de <b style={{color:C.text}}>{selService?.name}</b><br/>
              con <b style={{color:C.text}}>{selStaff?.name}</b><br/>
              el <b style={{color:C.accent}}>{selDate?.getDate()} de {MONTHS[selDate?.getMonth()]} a las {selTime}</b>
            </div>
            <div style={{ color:C.muted, fontSize:13, marginTop:10, marginBottom:24 }}>Te contactaremos al <b style={{color:C.text}}>{form.phone}</b></div>
            <button type="button" style={base.btn()} onClick={()=>{ setStep(1); setSelService(null); setSelStaff(null); setSelDate(null); setSelTime(null); setForm({name:"",phone:""}); }}>
              Agendar otra cita
            </button>
          </div>
        )}
      </div>

      <button type="button" style={s.adminBtn} onClick={onGoAdmin}>🔒 Acceso staff</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LOGIN CON PIN
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ users, onLogin, onBack }) {
  const [step, setStep] = useState("select");
  const [selUser, setSelUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handlePin = (digit) => {
    if (pin.length>=4) return;
    const np = pin+digit;
    setPin(np);
    if (np.length===4) {
      setTimeout(()=>{
        if (np===selUser.pin) { onLogin(selUser); }
        else { setError("PIN incorrecto"); setPin(""); }
      }, 200);
    }
  };

  const s = {
    wrap: { background:"linear-gradient(160deg,#080c10 0%,#0d1520 100%)", minHeight:"100vh", maxWidth:430, margin:"0 auto", display:"flex", flexDirection:"column", fontFamily:"'Segoe UI',sans-serif", color:C.text },
    header: { padding:"44px 24px 24px", textAlign:"center" },
    title: { fontSize:22, fontWeight:900, color:C.accent, marginBottom:4 },
    sub: { fontSize:13, color:C.muted },
    userCard: { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"13px 15px", marginBottom:10, cursor:"pointer", display:"flex", alignItems:"center", gap:12 },
    avatar: { width:44, height:44, borderRadius:"50%", background:C.accent+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, overflow:"hidden", flexShrink:0 },
    dot: (f) => ({ width:15, height:15, borderRadius:"50%", background:f?C.accent:C.border, transition:"background .15s" }),
    key: { background:C.card, border:`1px solid ${C.border}`, borderRadius:13, padding:"16px", fontSize:22, fontWeight:700, color:C.text, cursor:"pointer", textAlign:"center" },
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><TasecaLogo size={52}/></div>
        <div style={s.title}>Acceso Staff</div>
        <div style={s.sub}>Taseca · Barber & Tattoo</div>
      </div>
      <div style={{ padding:"0 18px 40px", flex:1 }}>
        {step==="select" && (
          <>
            <div style={{ fontSize:14, color:C.muted, marginBottom:14, textAlign:"center" }}>Selecciona tu perfil</div>
            {users.map(u=>(
              <div key={u.id} style={s.userCard} onClick={()=>{ setSelUser(u); setPin(""); setError(""); setStep("pin"); }}>
                <div style={s.avatar}>{u.photo?<img src={u.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:u.name[0]}</div>
                <div>
                  <div style={{ fontWeight:700 }}>{u.name}</div>
                  <div style={{ color:C.muted, fontSize:13 }}>{ROLE_LABELS[u.role]||u.role}</div>
                </div>
                <div style={{ marginLeft:"auto", color:C.muted, fontSize:18 }}>›</div>
              </div>
            ))}
            <button type="button" style={{ ...base.btn("ghost"), marginTop:8 }} onClick={onBack}>← Volver al inicio</button>
          </>
        )}
        {step==="pin" && (
          <>
            <div style={{ textAlign:"center", marginBottom:22 }}>
              <div style={{ width:54, height:54, borderRadius:"50%", background:C.accent+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 10px", overflow:"hidden" }}>
                {selUser.photo?<img src={selUser.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:selUser.name[0]}
              </div>
              <div style={{ fontWeight:700, fontSize:16 }}>{selUser.name}</div>
              <div style={{ color:C.muted, fontSize:13 }}>{ROLE_LABELS[selUser.role]}</div>
              <div style={{ color:C.muted, fontSize:13, marginTop:14 }}>Ingresa tu PIN</div>
            </div>
            <div style={{ display:"flex", gap:14, justifyContent:"center", marginBottom:26 }}>
              {[0,1,2,3].map(i=><div key={i} style={s.dot(i<pin.length)}/>)}
            </div>
            {error && <div style={{ color:C.danger, fontSize:13, textAlign:"center", marginBottom:12 }}>{error}</div>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, maxWidth:260, margin:"0 auto" }}>
              {[1,2,3,4,5,6,7,8,9].map(n=>(
                <button type="button" key={n} style={s.key} onClick={()=>handlePin(String(n))}>{n}</button>
              ))}
              <button type="button" style={{ ...s.key, background:"transparent", border:"none", color:C.muted, fontSize:13 }} onClick={()=>{ setStep("select"); setPin(""); setError(""); }}>←</button>
              <button type="button" style={s.key} onClick={()=>handlePin("0")}>0</button>
              <button type="button" style={{ background:"transparent", border:"none", fontSize:20, color:C.muted, cursor:"pointer", padding:"16px", textAlign:"center" }} onClick={()=>setPin(p=>p.slice(0,-1))}>⌫</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PANEL ADMIN — incluye gestión de horarios
// ═══════════════════════════════════════════════════════════════════
// ─── COMPONENTES REUTILIZABLES (fuera de AdminPanel para evitar re-mount) ──
function InputField({ label, field, placeholder, type="text", options, form, setForm }) {
  return (
    <div style={{ marginBottom:11 }}>
      <label style={base.label}>{label}</label>
      {options ? (
        <select style={base.input} value={form[field]||""} onChange={e=>setForm({...form,[field]:e.target.value})}>
          <option value="">Seleccionar...</option>
          {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          style={base.input}
          type={type}
          placeholder={placeholder}
          value={form[field]||""}
          onChange={e=>setForm({...form,[field]:e.target.value})}
          onKeyDown={e=>{ if(e.key==="Enter") e.preventDefault(); }}
        />
      )}
    </div>
  );
}

function AppModal({ title, children, onSave, onClose }) {
  return (
    <div style={base.overlay} onClick={onClose}>
      <div style={base.modalBox}
        onClick={e=>e.stopPropagation()}
        onKeyDown={e=>{ if(e.key==="Enter") e.stopPropagation(); }}>
        <div style={{ ...base.row, marginBottom:18 }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.accent }}>{title}</div>
          <button type="button" onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer" }}>✕</button>
        </div>
        {children}
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button type="button" style={{ ...base.btn("ghost"), flex:1, padding:"10px" }} onClick={onClose}>Cancelar</button>
          <button type="button" style={{ ...base.btn(), flex:2, padding:"10px" }} onClick={onSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ currentUser, services, setServices, products, setProducts, clients, setClients, appointments, setAppointments, sales, setSales, users, setUsers, onLogout }) {
  const perms = ROLE_PERMISSIONS[currentUser.role]||[];
  const [tab, setTab] = useState(perms[0]||"agenda");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [subTab, setSubTab] = useState("servicios");
  // Google Sheets
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem("sheetsUrl")||"");
  const [urlInput, setUrlInput] = useState(localStorage.getItem("sheetsUrl")||"");
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const saveUrl = () => { localStorage.setItem("sheetsUrl",urlInput); setScriptUrl(urlInput); setShowUrlModal(false); };
  const syncAll = async () => {
    if (!scriptUrl) return;
    setSyncing(true);
    try { await fetch(scriptUrl,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({type:"sync",action:"all",payload:{appointments,clients,sales,services,products}}),mode:"no-cors"}); setLastSync(new Date().toLocaleTimeString()); } catch(e) {}
    setSyncing(false);
  };
  // Horario admin
  const [schedModal, setSchedModal] = useState(null); // userId
  const [schedYear, setSchedYear] = useState(today().getFullYear());
  const [schedMonth, setSchedMonth] = useState(today().getMonth());

  const allTabs = [
    { id:"agenda",   icon:"📅", label:"Agenda" },
    { id:"clientes", icon:"👥", label:"Clientes" },
    { id:"catalogo", icon:"🛒", label:"Catálogo" },
    { id:"caja",     icon:"💰", label:"Caja" },
    { id:"config",   icon:"⚙️", label:"Config" },
  ].filter(t=>perms.includes(t.id));

  const openModal = (type, data={}) => { setModal(type); setForm(data); };
  const closeModal = () => { setModal(null); setForm({}); };

  // InputField, Modal, ActionBtns moved outside — see top-level definitions below
  const ActionBtns = ({ onEdit, onDelete }) => (
    <div style={{ marginTop:9, display:"flex", gap:8 }}>
      <button type="button" style={{ ...base.btn("ghost"), width:"auto", padding:"5px 12px", fontSize:12 }} onClick={onEdit}>Editar</button>
      <button type="button" style={{ ...base.btn("danger"), width:"auto", padding:"5px 12px", fontSize:12 }} onClick={onDelete}>Eliminar</button>
    </div>
  );

  const fab = { position:"fixed", bottom:88, right:18, background:C.accent, color:"#000", border:"none", borderRadius:"50%", width:50, height:50, fontSize:24, cursor:"pointer", fontWeight:900, boxShadow:"0 4px 18px #c9a84c55", zIndex:99 };

  const saveService = () => {
    if (!form.name||!form.price) return;
    const item={...form, price:Number(form.price), duration:Number(form.duration)||30};
    form.id ? setServices(services.map(s=>s.id===form.id?item:s)) : setServices([...services,{...item,id:Date.now()}]);
    closeModal();
  };
  const saveProduct = () => {
    if (!form.name||!form.price) return;
    const item={...form,price:Number(form.price),stock:Number(form.stock)||0};
    form.id ? setProducts(products.map(p=>p.id===form.id?item:p)) : setProducts([...products,{...item,id:Date.now()}]);
    closeModal();
  };
  const saveClient = () => {
    if (!form.name) return;
    form.id ? setClients(clients.map(c=>c.id===form.id?{...c,...form}:c)) : setClients([...clients,{...form,id:Date.now(),visits:0,lastVisit:"-"}]);
    closeModal();
  };
  const saveAppt = () => {
    if (!form.clientName||!form.service||!form.date) return;
    form.id ? setAppointments(appointments.map(a=>a.id===form.id?{...a,...form}:a)) : setAppointments([...appointments,{...form,id:Date.now(),status:form.status||"pendiente"}]);
    closeModal();
  };
  const saveSale = () => {
    if (!form.client||!form.total) return;
    setSales([...sales,{...form,id:Date.now(),items:form.items?form.items.split(",").map(i=>i.trim()):[],total:Number(form.total),date:new Date().toISOString().slice(0,10)}]);
    closeModal();
  };
  const saveUser = () => {
    if (!form.name) return;
    if (form.id) {
      setUsers(users.map(u=>u.id===form.id?{...u,...form}:u));
    } else {
      setUsers([...users,{...form,id:Date.now(),photo:null,schedule:{workDays:[1,2,3,4,5],blockedSlots:{}}}]);
    }
    closeModal();
  };

  const totalVentas = sales.reduce((a,s)=>a+s.total,0);

  const FileInput = ({ userId }) => {
    const ref = useRef();
    return (
      <>
        <input type="file" accept="image/*" ref={ref} style={{display:"none"}} onChange={e=>{
          if (!e.target.files[0]) return;
          const reader=new FileReader();
          reader.onload=ev=>setUsers(users.map(u=>u.id===userId?{...u,photo:ev.target.result}:u));
          reader.readAsDataURL(e.target.files[0]);
        }}/>
        <button type="button" style={{...base.btn("ghost"),width:"auto",padding:"5px 12px",fontSize:12}} onClick={()=>ref.current.click()}>📷 Foto</button>
      </>
    );
  };

  // ── MODAL GESTIÓN DE HORARIO ──────────────────────────────────
  const schedUser = users.find(u=>u.id===schedModal);
  const toggleWorkDay = (userId, dow) => {
    setUsers(users.map(u=>{
      if (u.id!==userId) return u;
      const wds = u.schedule.workDays.includes(dow) ? u.schedule.workDays.filter(d=>d!==dow) : [...u.schedule.workDays,dow];
      return { ...u, schedule:{...u.schedule, workDays:wds} };
    }));
  };
  const toggleSlot = (userId, dateStr, slot) => {
    setUsers(users.map(u=>{
      if (u.id!==userId) return u;
      const current = u.schedule.blockedSlots[dateStr]||[];
      const updated = current.includes(slot) ? current.filter(s=>s!==slot) : [...current,slot];
      return { ...u, schedule:{ ...u.schedule, blockedSlots:{ ...u.schedule.blockedSlots, [dateStr]:updated } } };
    }));
  };

  const ScheduleModal = () => {
    if (!schedUser) return null;
    const days = getDaysInMonth(schedYear, schedMonth);
    return (
      <div style={base.overlay} onClick={()=>setSchedModal(null)}>
        <div style={{...base.modalBox, maxHeight:"92vh"}} onClick={e=>e.stopPropagation()}>
          <div style={{...base.row, marginBottom:16}}>
            <div style={{fontSize:17, fontWeight:800, color:C.accent}}>🗓 Horario — {schedUser.name}</div>
            <button type="button" onClick={()=>setSchedModal(null)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>✕</button>
          </div>

          {/* Días de trabajo */}
          <div style={{fontSize:13, color:C.muted, marginBottom:8}}>Días laborales</div>
          <div style={{display:"flex", gap:6, marginBottom:18, flexWrap:"wrap"}}>
            {[["Do",0],["Lu",1],["Ma",2],["Mi",3],["Ju",4],["Vi",5],["Sa",6]].map(([label,dow])=>{
              const active = schedUser.schedule.workDays.includes(dow);
              return (
                <button type="button" key={dow} onClick={()=>toggleWorkDay(schedUser.id,dow)} style={{
                  padding:"6px 12px", borderRadius:20, border:"none", fontSize:13, fontWeight:700, cursor:"pointer",
                  background: active?"#4ecdc4":"#1a2230", color: active?"#000":C.muted,
                }}>{label}</button>
              );
            })}
          </div>

          {/* Calendario para bloquear turnos */}
          <div style={{fontSize:13, color:C.muted, marginBottom:8}}>Bloquear turnos por fecha</div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
            <button type="button" onClick={()=>{if(schedMonth===0){setSchedMonth(11);setSchedYear(y=>y-1)}else setSchedMonth(m=>m-1)}} style={{background:"none",border:"none",color:C.accent,fontSize:20,cursor:"pointer"}}>‹</button>
            <div style={{fontWeight:700,fontSize:14}}>{MONTHS[schedMonth]} {schedYear}</div>
            <button type="button" onClick={()=>{if(schedMonth===11){setSchedMonth(0);setSchedYear(y=>y+1)}else setSchedMonth(m=>m+1)}} style={{background:"none",border:"none",color:C.accent,fontSize:20,cursor:"pointer"}}>›</button>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6}}>
            {DAYS_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.muted,paddingBottom:4}}>{d}</div>)}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:14}}>
            {days.map((d,i)=>{
              if (!d) return <div key={i}/>;
              const dateStr = fmt(d);
              const blocked = schedUser.schedule.blockedSlots[dateStr]||[];
              const isWorkDay = schedUser.schedule.workDays.includes(d.getDay());
              const bothBlocked = blocked.includes("morning")&&blocked.includes("afternoon");
              const partBlocked = blocked.length>0 && !bothBlocked;
              return (
                <div key={i} onClick={()=>{ if(!isWorkDay) return; setForm({...form, schedDate:dateStr}); }}
                  style={{
                    background: !isWorkDay?"#0a0a0a": bothBlocked?C.danger+"33": partBlocked?C.accent+"33":C.card,
                    border:`1px solid ${!isWorkDay?"transparent":bothBlocked?C.danger+"55":partBlocked?C.accent+"55":C.border}`,
                    borderRadius:8, padding:"7px 0", textAlign:"center", fontSize:12,
                    color: !isWorkDay?C.border: bothBlocked?C.danger: partBlocked?C.accent:C.text,
                    cursor: isWorkDay?"pointer":"default",
                  }}>
                  {d.getDate()}
                  {bothBlocked && <div style={{fontSize:8}}>🔒</div>}
                  {partBlocked && <div style={{fontSize:8}}>⚠️</div>}
                </div>
              );
            })}
          </div>

          {/* Control de turnos del día seleccionado */}
          {form.schedDate && (
            <div style={{background:"#0d1520", borderRadius:12, padding:"12px 14px", marginBottom:10}}>
              <div style={{fontSize:13, fontWeight:700, color:C.accent2, marginBottom:10}}>
                Turnos — {form.schedDate}
              </div>
              {[["morning","🌅 Mañana (9:00 - 13:00)"],["afternoon","🌆 Tarde (14:00 - 19:00)"]].map(([slot,label])=>{
                const blocked = (schedUser.schedule.blockedSlots[form.schedDate]||[]).includes(slot);
                return (
                  <div key={slot} style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                    <span style={{fontSize:13, color:blocked?C.danger:C.text}}>{label}</span>
                    <button type="button" onClick={()=>toggleSlot(schedUser.id, form.schedDate, slot)} style={{
                      padding:"5px 14px", borderRadius:20, border:"none", fontSize:12, fontWeight:700, cursor:"pointer",
                      background: blocked?C.danger+"33":"#4ecdc422",
                      color: blocked?C.danger:"#4ecdc4",
                    }}>{blocked?"🔒 Bloqueado":"✓ Disponible"}</button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{fontSize:11, color:C.muted}}>
            🔴 Bloqueado completo &nbsp; 🟡 Parcialmente bloqueado &nbsp; Sin color = disponible
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{...base.app, paddingBottom:80}}>
      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0d1520 0%,#080c10 100%)", padding:"14px 16px 12px", borderBottom:`1px solid ${C.border}`}}>
        <div style={base.row}>
          <div style={{display:"flex", alignItems:"center", gap:9}}>
            <TasecaLogo size={28}/>
            <div>
              <div style={{fontSize:17, fontWeight:900, background:"linear-gradient(90deg,#c9a84c,#4ecdc4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>TASECA</div>
              <div style={{fontSize:11, color:C.muted}}>Hola, <b style={{color:C.accent}}>{currentUser.name}</b> · {ROLE_LABELS[currentUser.role]}</div>
            </div>
          </div>
          <button type="button" onClick={onLogout} style={{background:C.border,border:"none",borderRadius:10,padding:"6px 12px",color:C.muted,fontSize:12,cursor:"pointer"}}>Salir 🚪</button>
        </div>
      </div>

      <div style={{padding:"14px 14px"}}>
        {/* AGENDA */}
        {tab==="agenda" && (
          <>
            <div style={{fontSize:17,fontWeight:700,color:C.accent,marginBottom:13}}>📅 Agenda</div>
            {appointments.length===0 && <div style={{color:C.muted,textAlign:"center",padding:30}}>Sin citas</div>}
            {appointments.map(a=>{
              const staff = users.find(u=>u.id===a.staffId);
              return (
                <div key={a.id} style={base.card}>
                  <div style={base.row}>
                    <div>
                      <div style={{fontWeight:700}}>{a.clientName}</div>
                      <div style={{color:C.muted,fontSize:13}}>{a.service} · {staff?.name||a.staff||"—"}</div>
                    </div>
                    <span style={base.badge(STATUS_C[a.status]||"#888")}>{a.status}</span>
                  </div>
                  <div style={{marginTop:6,display:"flex",gap:12}}>
                    <span style={{color:C.accent,fontSize:13}}>📆 {a.date}</span>
                    <span style={{color:C.muted,fontSize:13}}>🕐 {a.time}</span>
                  </div>
                  <ActionBtns onEdit={()=>openModal("editAppt",{...a})} onDelete={()=>setAppointments(appointments.filter(x=>x.id!==a.id))}/>
                </div>
              );
            })}
            <button type="button" style={fab} onClick={()=>openModal("addAppt",{status:"pendiente"})}>+</button>
          </>
        )}

        {/* CLIENTES */}
        {tab==="clientes" && (
          <>
            <div style={{fontSize:17,fontWeight:700,color:C.accent,marginBottom:13}}>👥 Clientes</div>
            {clients.map(c=>(
              <div key={c.id} style={base.card}>
                <div style={base.row}>
                  <div style={{display:"flex",alignItems:"center",gap:11}}>
                    <div style={{width:42,height:42,borderRadius:"50%",background:C.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{c.name[0]}</div>
                    <div>
                      <div style={{fontWeight:700}}>{c.name}</div>
                      <div style={{color:C.muted,fontSize:13}}>📞 {c.phone}</div>
                    </div>
                  </div>
                  <span style={base.badge(C.accent)}>{c.visits} visitas</span>
                </div>
                <div style={{marginTop:6,color:C.muted,fontSize:12}}>Última: {c.lastVisit}</div>
                <ActionBtns onEdit={()=>openModal("editClient",{...c})} onDelete={()=>setClients(clients.filter(x=>x.id!==c.id))}/>
              </div>
            ))}
            <button type="button" style={fab} onClick={()=>openModal("addClient")}>+</button>
          </>
        )}

        {/* CATÁLOGO */}
        {tab==="catalogo" && (
          <>
            <div style={{fontSize:17,fontWeight:700,color:C.accent,marginBottom:13}}>🛒 Catálogo</div>
            <div style={{display:"flex",gap:8,marginBottom:13}}>
              {["servicios","productos"].map(t=>(
                <button type="button" key={t} style={{padding:"6px 16px",borderRadius:20,border:"none",background:subTab===t?C.accent:C.border,color:subTab===t?"#000":C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={()=>setSubTab(t)}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            {subTab==="servicios" && services.map(sv=>(
              <div key={sv.id} style={base.card}>
                <div style={base.row}>
                  <div><div style={{fontWeight:700}}>{sv.name}</div><div style={{color:C.muted,fontSize:13}}>⏱ {sv.duration} min</div></div>
                  <div style={{textAlign:"right"}}><div style={{color:C.accent,fontWeight:900,fontSize:16}}>${sv.price}</div><span style={base.badge(CAT_C[sv.category]||"#888")}>{sv.category}</span></div>
                </div>
                <ActionBtns onEdit={()=>openModal("editService",{...sv})} onDelete={()=>setServices(services.filter(x=>x.id!==sv.id))}/>
              </div>
            ))}
            {subTab==="productos" && products.map(p=>(
              <div key={p.id} style={base.card}>
                <div style={base.row}>
                  <div><div style={{fontWeight:700}}>{p.name}</div><div style={{color:p.stock<5?C.danger:C.muted,fontSize:13}}>📦 {p.stock}</div></div>
                  <div style={{color:C.accent,fontWeight:900,fontSize:16}}>${p.price}</div>
                </div>
                <ActionBtns onEdit={()=>openModal("editProduct",{...p})} onDelete={()=>setProducts(products.filter(x=>x.id!==p.id))}/>
              </div>
            ))}
            <button type="button" style={fab} onClick={()=>subTab==="servicios"?openModal("addService",{category:"barberia"}):openModal("addProduct")}>+</button>
          </>
        )}

        {/* CAJA */}
        {tab==="caja" && (
          <>
            <div style={{fontSize:17,fontWeight:700,color:C.accent,marginBottom:13}}>💰 Caja & Ventas</div>
            <div style={{background:C.accent+"18",border:`1px solid ${C.accent}44`,borderRadius:14,padding:"14px 15px",marginBottom:12}}>
              <div style={{color:C.muted,fontSize:12}}>Total recaudado</div>
              <div style={{color:C.accent,fontSize:28,fontWeight:900}}>${totalVentas}</div>
              <div style={{color:C.muted,fontSize:12}}>{sales.length} ventas</div>
            </div>
            {sales.map(sale=>(
              <div key={sale.id} style={base.card}>
                <div style={base.row}>
                  <div><div style={{fontWeight:700}}>{sale.client}</div><div style={{color:C.muted,fontSize:12}}>{sale.items.join(", ")}</div></div>
                  <div style={{textAlign:"right"}}><div style={{color:C.accent,fontWeight:900}}>${sale.total}</div><span style={base.badge(C.success)}>{sale.method}</span></div>
                </div>
                <div style={{marginTop:5,color:C.muted,fontSize:12}}>📆 {sale.date}</div>
              </div>
            ))}
            <button type="button" style={fab} onClick={()=>openModal("addSale")}>+</button>
          </>
        )}

        {/* CONFIG */}
        {tab==="config" && currentUser.role==="admin" && (
          <>
            <div style={{fontSize:17,fontWeight:700,color:C.accent,marginBottom:13}}>⚙️ Configuración</div>

            {/* GOOGLE SHEETS */}
            <div style={{background:C.card,border:`1.5px solid ${scriptUrl?"#4ecdc4":C.border}`,borderRadius:14,padding:"14px 15px",marginBottom:16}}>
              <div style={{fontWeight:700,color:"#4ecdc4",marginBottom:8,fontSize:15}}>🔗 Google Sheets</div>
              {scriptUrl ? (
                <>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:C.success}}/>
                    <span style={{color:C.success,fontSize:13,fontWeight:700}}>Conectado</span>
                  </div>
                  <div style={{color:C.muted,fontSize:11,marginBottom:10,wordBreak:"break-all"}}>{scriptUrl.slice(0,55)}...</div>
                  <div style={{display:"flex",gap:8}}>
                    <button type="button" style={{...base.btn(),width:"auto",padding:"8px 14px",fontSize:13}} onClick={syncAll} disabled={syncing}>
                      {syncing?"⏳ Sincronizando...":"🔄 Sincronizar todo"}
                    </button>
                    <button type="button" style={{...base.btn("ghost"),width:"auto",padding:"8px 14px",fontSize:13}} onClick={()=>setShowUrlModal(true)}>Cambiar</button>
                  </div>
                  {lastSync && <div style={{color:C.muted,fontSize:11,marginTop:6}}>Última sync: {lastSync}</div>}
                </>
              ) : (
                <>
                  <div style={{color:C.muted,fontSize:13,marginBottom:10}}>Sin conexión · Pega tu URL para sincronizar con Google Sheets</div>
                  <button type="button" style={{...base.btn("cyan"),padding:"10px",fontSize:14,color:"#000",fontWeight:800}} onClick={()=>setShowUrlModal(true)}>⚙️ Configurar URL</button>
                </>
              )}
            </div>

            <div style={{fontWeight:700,color:C.accent2,marginBottom:10}}>👤 Personal & Horarios</div>
            {users.map(u=>(
              <div key={u.id} style={base.card}>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:C.accent+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,overflow:"hidden",flexShrink:0}}>
                    {u.photo?<img src={u.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:u.name[0]}
                  </div>
                  <div>
                    <div style={{fontWeight:700}}>{u.name}</div>
                    <div style={{color:C.muted,fontSize:13}}>{ROLE_LABELS[u.role]||u.role}</div>
                    <div style={{color:C.muted,fontSize:11}}>
                      Trabaja: {u.schedule?.workDays.map(d=>DAYS_SHORT[d]).join(" · ")||"—"}
                    </div>
                  </div>
                </div>
                <div style={{marginTop:9,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <FileInput userId={u.id}/>
                  <button type="button" style={{...base.btn("ghost"),width:"auto",padding:"5px 12px",fontSize:12}} onClick={()=>openModal("editUser",{...u})}>Editar</button>
                  <button type="button" style={{...base.btn("cyan"),width:"auto",padding:"5px 12px",fontSize:12,color:"#000"}} onClick={()=>{ setSchedModal(u.id); setForm({}); }}>🗓 Horario</button>
                  <button type="button" style={{...base.btn("danger"),width:"auto",padding:"5px 12px",fontSize:12}} onClick={()=>setUsers(users.filter(x=>x.id!==u.id))}>Eliminar</button>
                </div>
              </div>
            ))}
            <button type="button" style={{...base.btn(),padding:"11px"}} onClick={()=>openModal("addUser")}>+ Agregar usuario</button>
          </>
        )}
      </div>

      {/* TAB BAR */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#0d1520",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
        {allTabs.map(t=>(
          <button type="button" key={t.id} style={{flex:1,padding:"10px 0 8px",background:"none",border:"none",color:tab===t.id?C.accent:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}} onClick={()=>setTab(t.id)}>
            <span style={{fontSize:19}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?700:400}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MODALES CRUD */}
      {(modal==="addService"||modal==="editService") && (
        <AppModal title={modal==="addService"?"Nuevo Servicio":"Editar Servicio"} onSave={saveService} onClose={closeModal}>
          <InputField label="Nombre" field="name" placeholder="Corte clásico" form={form} setForm={setForm}/>
          <InputField label="Precio ($)" field="price" type="number" placeholder="15" form={form} setForm={setForm}/>
          <InputField label="Duración (min)" field="duration" type="number" placeholder="30" form={form} setForm={setForm}/>
          <InputField label="Categoría" field="category" options={[{value:"barberia",label:"Barbería"},{value:"tatuaje",label:"Tatuaje"}]} form={form} setForm={setForm}/>
        </AppModal>
      )}
      {(modal==="addProduct"||modal==="editProduct") && (
        <AppModal title={modal==="addProduct"?"Nuevo Producto":"Editar Producto"} onSave={saveProduct} onClose={closeModal}>
          <InputField label="Nombre" field="name" placeholder="Pomada fijadora" form={form} setForm={setForm}/>
          <InputField label="Precio ($)" field="price" type="number" placeholder="10" form={form} setForm={setForm}/>
          <InputField label="Stock" field="stock" type="number" placeholder="20" form={form} setForm={setForm}/>
        </AppModal>
      )}
      {(modal==="addClient"||modal==="editClient") && (
        <AppModal title={modal==="addClient"?"Nuevo Cliente":"Editar Cliente"} onSave={saveClient} onClose={closeModal}>
          <InputField label="Nombre" field="name" placeholder="Carlos Méndez" form={form} setForm={setForm}/>
          <InputField label="Teléfono" field="phone" placeholder="0981-000000" form={form} setForm={setForm}/>
        </AppModal>
      )}
      {(modal==="addAppt"||modal==="editAppt") && (
        <AppModal title={modal==="addAppt"?"Nueva Cita":"Editar Cita"} onSave={saveAppt} onClose={closeModal}>
          <InputField label="Cliente" field="clientName" placeholder="Nombre" form={form} setForm={setForm}/>
          <InputField label="Servicio" field="service" placeholder="Corte clásico" form={form} setForm={setForm}/>
          <InputField label="Fecha" field="date" type="date" form={form} setForm={setForm}/>
          <InputField label="Hora" field="time" type="time" form={form} setForm={setForm}/>
          <InputField label="Estado" field="status" options={[{value:"pendiente",label:"Pendiente"},{value:"confirmado",label:"Confirmado"},{value:"cancelado",label:"Cancelado"}]} form={form} setForm={setForm}/>
        </AppModal>
      )}
      {modal==="addSale" && (
        <AppModal title="Nueva Venta" onSave={saveSale} onClose={closeModal}>
          <InputField label="Cliente" field="client" placeholder="Nombre" form={form} setForm={setForm}/>
          <InputField label="Items (separados por coma)" field="items" placeholder="Corte, Pomada" form={form} setForm={setForm}/>
          <InputField label="Total ($)" field="total" type="number" placeholder="25" form={form} setForm={setForm}/>
          <InputField label="Método" field="method" options={[{value:"efectivo",label:"Efectivo"},{value:"tarjeta",label:"Tarjeta"},{value:"transferencia",label:"Transferencia"}]} form={form} setForm={setForm}/>
        </AppModal>
      )}
      {(modal==="addUser"||modal==="editUser") && (
        <AppModal title={modal==="addUser"?"Nuevo Usuario":"Editar Usuario"} onSave={saveUser} onClose={closeModal}>
          <InputField label="Nombre" field="name" placeholder="Juan Barbero" form={form} setForm={setForm}/>
          <InputField label="Rol" field="role" options={[{value:"admin",label:"Administrador"},{value:"barbero",label:"Barbero"},{value:"tatuador",label:"Tatuador/a"},{value:"recepcionista",label:"Recepcionista"}]}/>
          <InputField label="Email" field="email" placeholder="usuario@shop.com" form={form} setForm={setForm}/>
          <InputField label="PIN (4 dígitos)" field="pin" type="number" placeholder="1234" form={form} setForm={setForm}/>
        </AppModal>
      )}

      {/* MODAL URL SHEETS */}
      {showUrlModal && (
        <div style={base.overlay} onClick={()=>setShowUrlModal(false)}>
          <div style={base.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={{...base.row,marginBottom:16}}>
              <div style={{fontSize:17,fontWeight:800,color:C.accent}}>🔗 Conectar Google Sheets</div>
              <button type="button" onClick={()=>setShowUrlModal(false)} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{background:"#0d1520",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:12,color:C.muted,lineHeight:1.7}}>
              <b style={{color:C.accent}}>Pasos:</b><br/>
              1. Abre tu Google Sheet<br/>
              2. Extensiones → Apps Script<br/>
              3. Pega el código del archivo .gs<br/>
              4. Implementar → Nueva implementación<br/>
              5. Tipo: App web · Acceso: Cualquiera<br/>
              6. Copia la URL y pégala abajo ↓
            </div>
            <label style={base.label}>URL del Web App</label>
            <input style={{...base.input,marginBottom:14}} placeholder="https://script.google.com/macros/s/..." value={urlInput} onChange={e=>setUrlInput(e.target.value)}/>
            <div style={{display:"flex",gap:10}}>
              <button type="button" style={{...base.btn("ghost"),flex:1,padding:"10px"}} onClick={()=>setShowUrlModal(false)}>Cancelar</button>
              <button type="button" style={{...base.btn(),flex:2,padding:"10px"}} onClick={saveUrl}>Guardar y conectar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HORARIO */}
      {schedModal && <ScheduleModal/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("public");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(USERS_DB);
  const [services, setServices] = useState(initServices);
  const [products, setProducts] = useState(initProducts);
  const [clients, setClients] = useState(initClients);
  const [appointments, setAppointments] = useState(initAppointments);
  const [sales, setSales] = useState(initSales);

  if (screen==="public") return (
    <PublicBooking
      services={services} appointments={appointments} users={users}
      onAppointmentBooked={appt=>setAppointments(p=>[...p,appt])}
      onGoAdmin={()=>setScreen("login")}
    />
  );
  if (screen==="login") return (
    <LoginScreen users={users} onLogin={u=>{ setCurrentUser(u); setScreen("admin"); }} onBack={()=>setScreen("public")}/>
  );
  return (
    <AdminPanel
      currentUser={currentUser}
      services={services} setServices={setServices}
      products={products} setProducts={setProducts}
      clients={clients} setClients={setClients}
      appointments={appointments} setAppointments={setAppointments}
      sales={sales} setSales={setSales}
      users={users} setUsers={setUsers}
      onLogout={()=>{ setCurrentUser(null); setScreen("public"); }}
    />
  );
}
