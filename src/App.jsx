import {useState, useRef, useEffect} from "react";

import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import {
  LayoutDashboard, Users, Car, Receipt, HeartPulse,
  Sun, Moon, ArrowUpRight, ArrowDownLeft, Clock, MapPin,
  Phone, Mail, Home, GraduationCap, Paperclip, Plus,
  Search, ChevronRight, Info, X, Check, Pencil, Trash2, Loader
} from "lucide-react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";

const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes"];
const HOURS = ["06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COLORS_LIGHT = ["#A8BFD8","#C3B1D8","#A8D1C8","#D8C4A8","#D8A8B8","#B8D8A8","#D8B8A8","#A8C8D8"];
const COLORS_DARK  = ["#7BA7C9","#A98FC9","#6FBFA9","#C9A87B","#C98FA9","#8FC97B","#C9A08F","#7BB5C9"];

const LIGHT = {
  bg:"#F2F3F6", surface:"#FFFFFF", surface2:"#F0F1F5", border:"#DDE0E8",
  accent:"#8BAAC2", accentBg:"#EAF0F6",
  green:"#8ABCAA", greenBg:"#E8F4EF",
  rose:"#C4A0B0", roseBg:"#F5EDF1",
  lavender:"#A89EC4", lavBg:"#EEEAF6",
  amber:"#C4AE88", amberBg:"#F5EFE4",
  text:"#2E3440", sub:"#4C566A", muted:"#7B8699", white:"#FFFFFF",
  navBg:"linear-gradient(135deg,#6B7FA8 0%,#7A8FB8 60%,#8A9FC8 100%)",
  navColor:"rgba(255,255,255,0.6)", colors: COLORS_LIGHT,
};
const DARK = {
  bg:"#0F1117", surface:"#1A1D27", surface2:"#22263A", border:"#2E3348",
  accent:"#7BA7C9", accentBg:"#1C2A38",
  green:"#6FBFA9", greenBg:"#0F2520",
  rose:"#C98FA9", roseBg:"#2A1820",
  lavender:"#A98FC9", lavBg:"#1E1830",
  amber:"#C9A87B", amberBg:"#2A200F",
  text:"#E8EAF0", sub:"#A0A8C0", muted:"#6B7390", white:"#FFFFFF",
  navBg:"linear-gradient(135deg,#13161F 0%,#1A1D27 100%)",
  navColor:"rgba(255,255,255,0.45)", colors: COLORS_DARK,
};

const addMins=(t,m)=>{const[h,mn]=t.split(":").map(Number),tot=h*60+mn+m;return`${String(Math.floor(tot/60)).padStart(2,"0")}:${String(tot%60).padStart(2,"0")}`;};
const toMins=t=>{const[h,m]=t.split(":").map(Number);return h*60+m;};
const estimateDur=(a,b)=>Math.abs([...a].reduce((s,c)=>s+c.charCodeAt(0),0)-[...(b||"x")].reduce((s,c)=>s+c.charCodeAt(0),0))%30+15;
const fmt=n=>n?`$${Number(n).toLocaleString("es-AR")}`:"—";
const BASE=17;

export default function App() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [dark,setDark]=useState(()=>localStorage.getItem("theme")==="dark");
  const T=dark?DARK:LIGHT;
  const applyColors=ds=>ds.map((d,i)=>({...d,color:T.colors[i%T.colors.length]}));

  // Firebase state
  const [drivers,setDrivers]=useState([]);
  const [clients,setClients]=useState([]);
  const [obrasSociales,setObrasSociales]=useState([]);
  const [loading,setLoading]=useState(true);

  // UI state
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [filterDriver,setFilterDriver]=useState("all");
  const [billingMonth,setBillingMonth]=useState(new Date().getMonth());
  const [selectedOS,setSelectedOS]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);

  const cd=applyColors(drivers);

  // Detecta si ya había una sesión activa al abrir la app
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthLoading(false);
  });
  return () => unsub();
}, []);

const handleLogin = async () => {
  setLoginError("");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    setLoginError("Email o contraseña incorrectos");
  }
};

const handleLogout = async () => {
  await signOut(auth);
  setUser(null);
};

// Los listeners de Firestore solo se activan cuando hay usuario logueado
useEffect(() => {
  if (!user) return; // ← ESTA ES LA CLAVE: no conecta si no hay login

  const unsubs = [
    onSnapshot(collection(db, "drivers"), snap => {
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }),
    onSnapshot(collection(db, "clients"), snap => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }),
    onSnapshot(collection(db, "obrasSociales"), snap => {
      setObrasSociales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }),
  ];

  return () => unsubs.forEach(u => u());
}, [user]); // ← depende de `user`, se reactiva cuando cambia

  // ---- helpers ----
  const getDriverTransfers=(driverId,day)=>
    clients.flatMap(c=>c.transfers?.filter(t=>t.driverId===driverId&&t.days?.includes(day)).map(t=>({client:c,transfer:t}))||[])
      .sort((a,b)=>toMins(a.transfer.time)-toMins(b.transfer.time));

  const driverCapacityAt=(driverId,day,time,dur,excludeId)=>{
    const ns=toMins(time),ne=ns+dur+5;
    return clients.flatMap(c=>c.id===excludeId?[]:c.transfers?.filter(t=>t.driverId===driverId&&t.days?.includes(day))||[])
      .filter(t=>{const s=toMins(t.time),e=s+t.duration+5;return!(ne<=s||ns>=e);}).length;
  };
  const isAvailable=(driverId,day,time,dur)=>driverCapacityAt(driverId,day,time,dur,null)<2;
  const availDrivers=(day,time,dur)=>cd.filter(d=>isAvailable(d.id,day,time,dur));

  const buildGrid=()=>{
    const g={};
    DAYS.forEach(day=>{
      g[day]={};
      cd.forEach(dr=>{g[day][dr.id]=[];});
      clients.forEach(c=>{
        c.transfers?.forEach(t=>{
          if(!t.days?.includes(day))return;
          if(!g[day][t.driverId])g[day][t.driverId]=[];
          g[day][t.driverId].push({client:c,transfer:t});
        });
      });
      cd.forEach(dr=>g[day][dr.id].sort((a,b)=>toMins(a.transfer.time)-toMins(b.transfer.time)));
    });
    return g;
  };
  const grid=buildGrid();

  // ---- client CRUD ----
  const emptyClient={name:"",phone:"",address:"",address2:"",destinations:[{name:"",address:""}],transfers:[],presupuestoReal:"",presupuestoFacturado:"",obraSocialId:""};
  const [nc,setNc]=useState(emptyClient);
  const [editClientId,setEditClientId]=useState(null);
  const [nt,setNt]=useState({destination:0,type:"ida",days:[],time:"07:30"});
  const [suggestions,setSuggestions]=useState(null);

  const openAddClient=()=>{setEditClientId(null);setNc(emptyClient);setSuggestions(null);setModal("client");};
  const openEditClient=c=>{setEditClientId(c.id);setNc({...c,presupuestoReal:String(c.presupuestoReal||""),presupuestoFacturado:String(c.presupuestoFacturado||""),obraSocialId:c.obraSocialId||""});setSuggestions(null);setModal("client");};
  const deleteClient=id=>setConfirm({msg:"¿Eliminar este cliente?",onConfirm:async()=>{await deleteDoc(doc(db,"clients",id));setConfirm(null);}});
  const checkAvail=()=>{const dest=nc.destinations[nt.destination];const dur=estimateDur(nc.address,dest?.address||"");setSuggestions(nt.days.map(day=>({day,avail:availDrivers(day,nt.time,dur),duration:dur})));};
  const assignDriver=driverId=>{const dur=estimateDur(nc.address,nc.destinations[nt.destination]?.address||"");setNc(c=>({...c,transfers:[...c.transfers,{id:Date.now(),driverId,destination:nt.destination,type:nt.type,days:nt.days,time:nt.time,duration:dur}]}));setSuggestions(null);setNt({destination:0,type:"ida",days:[],time:"07:30"});};
  const saveClient=async()=>{
    if(!nc.name||!nc.address)return alert("Completá nombre y domicilio.");
    const data={...nc,presupuestoReal:Number(nc.presupuestoReal)||0,presupuestoFacturado:Number(nc.presupuestoFacturado)||0,obraSocialId:nc.obraSocialId||null};
    if(editClientId){await updateDoc(doc(db,"clients",editClientId),data);}
    else{await addDoc(collection(db,"clients"),data);}
    setNc(emptyClient);setModal(null);setSuggestions(null);setEditClientId(null);
  };

  // ---- driver CRUD ----
  const emptyDriver={name:"",phone:""};
  const [nd,setNd]=useState(emptyDriver);
  const [editDriverId,setEditDriverId]=useState(null);
  const openAddDriver=()=>{setEditDriverId(null);setNd(emptyDriver);setModal("driver");};
  const openEditDriver=d=>{setEditDriverId(d.id);setNd({name:d.name,phone:d.phone});setModal("driver");};
  const deleteDriver=id=>setConfirm({msg:"¿Eliminar este chofer?",onConfirm:async()=>{await deleteDoc(doc(db,"drivers",id));setConfirm(null);}});
  const saveDriver=async()=>{
    if(!nd.name)return alert("Ingresá el nombre.");
    if(editDriverId){await updateDoc(doc(db,"drivers",editDriverId),nd);}
    else{await addDoc(collection(db,"drivers"),nd);}
    setNd(emptyDriver);setModal(null);setEditDriverId(null);
  };

  // ---- OS CRUD ----
  const emptyOS={name:"",contact:"",phone:"",email:"",address:"",notes:"",files:[]};
  const [nos,setNos]=useState(emptyOS);
  const [editOSId,setEditOSId]=useState(null);
  const fileRef=useRef();
  const openAddOS=()=>{setEditOSId(null);setNos(emptyOS);setModal("os");};
  const openEditOS=o=>{setEditOSId(o.id);setNos({...o});setModal("os");};
  const deleteOS=id=>setConfirm({msg:"¿Eliminar esta obra social?",onConfirm:async()=>{await deleteDoc(doc(db,"obrasSociales",id));setConfirm(null);}});
  const handleOSFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setNos(o=>({...o,files:[...o.files,{name:f.name,data:ev.target.result}]}));r.readAsDataURL(f);};
  const saveOS=async()=>{
    if(!nos.name)return alert("Ingresá el nombre.");
    if(editOSId){await updateDoc(doc(db,"obrasSociales",editOSId),nos);}
    else{await addDoc(collection(db,"obrasSociales"),nos);}
    setNos(emptyOS);setModal(null);setEditOSId(null);
  };

  // ---- billing edit ----
  const [editBilling,setEditBilling]=useState(null);
  const saveBilling=async()=>{
    await updateDoc(doc(db,"clients",editBilling.id),{presupuestoReal:Number(editBilling.presupuestoReal)||0,presupuestoFacturado:Number(editBilling.presupuestoFacturado)||0});
    setEditBilling(null);
  };

  const filteredDrivers=filterDriver==="all"?cd:cd.filter(d=>d.id===filterDriver);

  const nav=[
    {key:"dashboard",icon:<LayoutDashboard size={18}/>,label:"Dashboard"},
    {key:"clients",  icon:<Users size={18}/>,          label:"Clientes"},
    {key:"drivers",  icon:<Car size={18}/>,            label:"Choferes"},
    {key:"billing",  icon:<Receipt size={18}/>,        label:"Facturación"},
    {key:"os",       icon:<HeartPulse size={18}/>,     label:"Obras Sociales"},
  ];

  // ---- UI components ----
  const Badge=({color=T.muted,bg,children})=>(
    <span style={{background:bg||color+"28",color,border:`1px solid ${color}44`,borderRadius:20,padding:"3px 10px",fontSize:BASE*0.75,fontWeight:600,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4}}>{children}</span>
  );
  const Card=({children,style,accent})=>(
    <div style={{background:T.surface,borderRadius:16,padding:16,border:`1px solid ${T.border}`,borderLeft:accent?`4px solid ${accent}`:`1px solid ${T.border}`,boxShadow:dark?"0 2px 12px #0003":"0 1px 6px #2E344009",transition:"background .3s",...style}}>{children}</div>
  );
  const SecTitle=({children})=>(
    <div style={{fontWeight:700,fontSize:BASE*0.72,color:T.muted,letterSpacing:1.2,borderBottom:`1px solid ${T.border}`,paddingBottom:5,marginBottom:10,marginTop:14}}>{children}</div>
  );
  const Inp=({label,...p})=>(
    <div style={{marginBottom:12}}>
      {label&&<label style={{display:"block",fontSize:BASE*0.84,fontWeight:600,color:T.muted,marginBottom:4}}>{label}</label>}
      <input {...p} style={{width:"100%",padding:"9px 13px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:BASE*0.95,boxSizing:"border-box",background:T.surface2,color:T.text,outline:"none",...(p.style||{})}}/>
    </div>
  );
  const Sel=({label,children,...p})=>(
    <div style={{marginBottom:12}}>
      {label&&<label style={{display:"block",fontSize:BASE*0.84,fontWeight:600,color:T.muted,marginBottom:4}}>{label}</label>}
      <select {...p} style={{width:"100%",padding:"9px 13px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:BASE*0.95,background:T.surface2,color:T.text,boxSizing:"border-box"}}>{children}</select>
    </div>
  );
  const Btn=({children,onClick,variant="primary",small,style,disabled,icon})=>{
    const v={primary:{background:T.accent,color:"#fff"},secondary:{background:T.surface2,color:T.sub,border:`1px solid ${T.border}`},success:{background:T.green,color:"#fff"},danger:{background:T.rose,color:"#fff"},warning:{background:T.amber,color:"#fff"}};
    return <button disabled={disabled} onClick={onClick} style={{borderRadius:10,border:"none",cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:small?BASE*0.78:BASE*0.95,padding:small?"6px 12px":"10px 20px",opacity:disabled?.5:1,display:"inline-flex",alignItems:"center",gap:6,...v[variant],...style}}>{icon}{children}</button>;
  };
  const IconBtn=({onClick,color,children,title})=>(
    <button title={title} onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",color,display:"flex",alignItems:"center",padding:5,borderRadius:8}}>{children}</button>
  );
  const Modal=({title,onClose,children,wide})=>(
    <div style={{position:"fixed",inset:0,background:dark?"#00000099":"#2E344088",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px",width:`min(100vw,${wide?700:520}px)`,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px #0003",border:`1px solid ${T.border}`}}>
        <div style={{width:40,height:4,background:T.border,borderRadius:2,margin:"0 auto 18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{margin:0,fontSize:BASE*1.1,color:T.text,fontWeight:700}}>{title}</h2>
          <button onClick={onClose} style={{background:T.surface2,border:`1px solid ${T.border}`,width:34,height:34,borderRadius:"50%",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={17}/></button>
        </div>
        {children}
      </div>
    </div>
  );

  if (authLoading) return (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F2F3F6", gap:16 }}>
    <Loader size={36} color="#8BAAC2" style={{ animation:"spin 1s linear infinite" }}/>
    <div style={{ color:"#7B8699", fontSize:17 }}>Iniciando...</div>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
  </div>
);

// Pantalla de login si no hay usuario
if (!user) return (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F2F3F6" }}>
    <div style={{ background:"#fff", borderRadius:20, padding:36, width:"min(90vw,380px)", boxShadow:"0 4px 30px #0001", border:"1px solid #DDE0E8" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <Car size={36} color="#8BAAC2"/>
        <div style={{ fontWeight:800, fontSize:22, color:"#2E3440", marginTop:10 }}>TransporteApp</div>
        <div style={{ fontSize:14, color:"#7B8699", marginTop:4 }}>Ingresá para continuar</div>
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#7B8699", marginBottom:4 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="tu@email.com"
          style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #DDE0E8", fontSize:15, boxSizing:"border-box", background:"#F0F1F5", color:"#2E3440", outline:"none" }}
        />
      </div>
      <div style={{ marginBottom:20 }}>
        <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#7B8699", marginBottom:4 }}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="••••••••"
          style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #DDE0E8", fontSize:15, boxSizing:"border-box", background:"#F0F1F5", color:"#2E3440", outline:"none" }}
        />
      </div>
      {loginError && (
        <div style={{ background:"#F5EDF1", color:"#C4A0B0", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:14, textAlign:"center" }}>
          {loginError}
        </div>
      )}
      <button
        onClick={handleLogin}
        style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:"#8BAAC2", color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer" }}
      >
        Iniciar sesión
      </button>
    </div>
  </div>
);

// Si hay usuario pero los datos siguen cargando
if (loading) return (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F2F3F6", gap:16 }}>
    <Loader size={36} color="#8BAAC2" style={{ animation:"spin 1s linear infinite" }}/>
    <div style={{ color:"#7B8699", fontSize:17 }}>Cargando datos...</div>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
  </div>
);

  return (

      <div style={{fontFamily:"'Segoe UI',sans-serif",background:T.bg,minHeight:"100vh",display:"flex",flexDirection:"column",color:T.text,transition:"background .3s,color .3s",fontSize:BASE}}>
        <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .spin { animation: spin 1s linear infinite; }
        @media (max-width: 600px) {
          .dash-stats { grid-template-columns: 1fr 1fr !important; }
          .dash-table { font-size: 11px !important; }
          .billing-totals { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
          .card-row { flex-direction: column !important; }
          .budget-row { flex-direction: row !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{background:T.navBg,padding:"14px 16px 0",transition:"background .3s",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,position:"relative"}}>
          <Car size={26} color="rgba(255,255,255,0.85)"/>
          <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:BASE*1.1,color:"#fff",letterSpacing:.5}}>TransporteApp</div>
            <div style={{fontSize:BASE*0.68,color:"rgba(255,255,255,0.7)"}}>Gestión de traslados</div>
          </div>
          <button onClick={()=>setDark(d=>!d)} style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"6px 12px",cursor:"pointer",color:"#fff",fontSize:BASE*0.72,fontWeight:600}}>
            {dark?<Sun size={14}/>:<Moon size={14}/>}
            <span className="hide-mobile">{dark?"Claro":"Oscuro"}</span>
          </button>
        </div>
        {/* Nav — scrollable on mobile */}
        <div style={{display:"flex",width:"100%",overflowX:"auto",scrollbarWidth:"none"}}>
          {nav.map(n=>(
            <button key={n.key} onClick={()=>setTab(n.key)} style={{flex:"0 0 auto",minWidth:0,padding:"9px 12px",border:"none",background:tab===n.key?"rgba(255,255,255,0.2)":"transparent",cursor:"pointer",color:tab===n.key?"#fff":T.navColor,borderBottom:tab===n.key?"3px solid #fff":"3px solid transparent",fontSize:BASE*0.68,fontWeight:tab===n.key?700:500,transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:3,whiteSpace:"nowrap"}}>
              {n.icon}<span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,padding:"16px 12px",maxWidth:980,margin:"0 auto",width:"100%"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div>
            <div className="dash-stats" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {[
                {icon:<Car size={22}/>,   label:"Traslados/semana", val:clients.reduce((s,c)=>s+(c.transfers?.reduce((ss,t)=>ss+(t.days?.length||0),0)||0),0), color:T.accent, bg:T.accentBg},
                {icon:<Users size={22}/>, label:"Clientes",         val:clients.length,  color:T.green,    bg:T.greenBg},
                {icon:<Car size={22}/>,   label:"Choferes",         val:drivers.length,  color:T.lavender, bg:T.lavBg},
              ].map((s,i)=>(
                <div key={i} style={{background:T.surface,borderRadius:14,padding:"14px 12px",border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,boxShadow:dark?"0 2px 12px #0003":"0 1px 6px #2E344009"}}>
                  <div style={{width:42,height:42,borderRadius:12,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",color:s.color,flexShrink:0}}>{s.icon}</div>
                  <div><div style={{fontSize:BASE*1.5,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div><div style={{fontSize:BASE*0.72,color:T.muted,marginTop:3}}>{s.label}</div></div>
                </div>
              ))}
            </div>

            {/* Filter — horizontal scroll on mobile */}
            <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
              {[{id:"all",name:"Todos",color:T.muted},...cd].map(d=>(
                <button key={d.id} onClick={()=>setFilterDriver(d.id)} style={{flexShrink:0,padding:"4px 12px",borderRadius:20,border:`1.5px solid ${filterDriver===d.id?d.color:T.border}`,background:filterDriver===d.id?d.color+"30":T.surface,color:filterDriver===d.id?d.color:T.sub,fontSize:BASE*0.8,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{d.name}</button>
              ))}
            </div>

            {/* Table — horizontal scroll on mobile */}
            <div style={{background:T.surface,borderRadius:16,border:`1px solid ${T.border}`,overflow:"auto",boxShadow:dark?"0 2px 12px #0003":"0 2px 12px #2E344009"}}>
              <table className="dash-table" style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
                <thead>
                  <tr style={{background:T.surface2}}>
                    <th style={{padding:"10px 12px",textAlign:"left",fontSize:BASE*0.72,color:T.muted,fontWeight:700,borderBottom:`1px solid ${T.border}`,position:"sticky",left:0,background:T.surface2,minWidth:110,letterSpacing:.8}}>CHOFER</th>
                    {DAYS.map(d=><th key={d} style={{padding:"10px 6px",textAlign:"center",fontSize:BASE*0.72,color:T.muted,fontWeight:700,borderBottom:`1px solid ${T.border}`,minWidth:110,letterSpacing:.8}}>{d.toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((dr,ri)=>(
                    <tr key={dr.id} style={{background:ri%2===0?T.surface:T.surface2+"88"}}>
                      <td style={{padding:"10px 12px",verticalAlign:"top",borderBottom:`1px solid ${T.border}`,position:"sticky",left:0,background:ri%2===0?T.surface:T.surface2+"cc",borderRight:`1px solid ${T.border}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:9,height:9,borderRadius:"50%",background:dr.color,flexShrink:0}}/>
                          <span style={{fontSize:BASE*0.84,fontWeight:700,color:T.text}}>{dr.name}</span>
                        </div>
                      </td>
                      {DAYS.map(day=>{
                        const items=grid[day]?.[dr.id]||[];
                        return (
                          <td key={day} style={{padding:"6px 5px",verticalAlign:"top",borderBottom:`1px solid ${T.border}`,borderRight:`1px solid ${T.border}44`}}>
                            {items.length===0
                              ?<div style={{textAlign:"center",color:T.border}}>—</div>
                              :items.map(({client:c,transfer:t},i)=>(
                                <div key={i} style={{marginBottom:i<items.length-1?5:0}}>
                                  <div style={{background:dr.color+"28",borderLeft:`3px solid ${dr.color}`,borderRadius:"0 8px 8px 0",padding:"5px 7px"}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                                      <div style={{fontWeight:700,fontSize:BASE*0.78,color:T.text}}>{c.name}</div>
                                      <div style={{display:"flex",gap:1}}>
                                        <IconBtn title="Editar" onClick={()=>openEditClient(c)} color={T.accent}><Pencil size={10}/></IconBtn>
                                        <IconBtn title="Eliminar" onClick={()=>deleteClient(c.id)} color={T.rose}><Trash2 size={10}/></IconBtn>
                                      </div>
                                    </div>
                                    <div style={{fontSize:BASE*0.68,color:T.muted,marginBottom:2,display:"flex",alignItems:"center",gap:2}}><MapPin size={9}/>{c.destinations?.[t.destination]?.name}</div>
                                    <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
                                      <span style={{background:dr.color+"40",color:T.sub,borderRadius:5,padding:"1px 5px",fontSize:BASE*0.68,fontWeight:700,display:"inline-flex",alignItems:"center",gap:1}}>{t.type==="vuelta"?<ArrowDownLeft size={9}/>:<ArrowUpRight size={9}/>}{t.time}</span>
                                      <span style={{background:T.greenBg,color:T.green,borderRadius:5,padding:"1px 5px",fontSize:BASE*0.68,display:"inline-flex",alignItems:"center",gap:1}}><Clock size={9}/>{t.duration}m</span>
                                    </div>
                                    <div style={{fontSize:BASE*0.68,color:T.muted,marginTop:2}}>Llega: {addMins(t.time,t.duration)}</div>
                                  </div>
                                </div>
                              ))
                            }
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:10,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              {cd.map(d=><div key={d.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:BASE*0.78,color:T.muted}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/>{d.name}</div>)}
            </div>
          </div>
        )}

        {/* CLIENTS */}
        {tab==="clients"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:BASE*1.2,color:T.text}}>Clientes</h2>
              <Btn icon={<Plus size={15}/>} onClick={openAddClient}>Nuevo</Btn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {clients.map(c=>{
                const os=obrasSociales.find(o=>o.id===c.obraSocialId);
                return (
                  <Card key={c.id}>
                    <div className="card-row" style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontWeight:700,fontSize:BASE*1.0,color:T.text}}>{c.name}</div>
                          <div style={{display:"flex",gap:2}}>
                            <IconBtn title="Editar" onClick={()=>openEditClient(c)} color={T.accent}><Pencil size={14}/></IconBtn>
                            <IconBtn title="Eliminar" onClick={()=>deleteClient(c.id)} color={T.rose}><Trash2 size={14}/></IconBtn>
                          </div>
                        </div>
                        <div style={{fontSize:BASE*0.84,color:T.muted,marginTop:3,display:"flex",flexWrap:"wrap",gap:10}}>
                          <span style={{display:"flex",alignItems:"center",gap:3}}><Phone size={12}/>{c.phone}</span>
                          <span style={{display:"flex",alignItems:"center",gap:3}}><Home size={12}/>{c.address}</span>
                        </div>
                        {c.address2&&<div style={{fontSize:BASE*0.84,color:T.muted,display:"flex",alignItems:"center",gap:3,marginTop:2}}><Home size={12}/>2º {c.address2}</div>}
                        {c.destinations?.map((d,i)=><div key={i} style={{fontSize:BASE*0.84,color:T.muted,display:"flex",alignItems:"center",gap:3,marginTop:2}}><GraduationCap size={12}/>{d.name} — {d.address}</div>)}
                        {os&&<div style={{marginTop:5}}><Badge color={T.lavender}><HeartPulse size={10}/>{os.name}</Badge></div>}
                      </div>
                      <div className="budget-row" style={{display:"flex",gap:8}}>
                        <div style={{background:T.greenBg,borderRadius:10,padding:"8px 12px",textAlign:"center",border:`1px solid ${T.green}33`,minWidth:80}}>
                          <div style={{fontSize:BASE*0.68,color:T.green,fontWeight:700}}>REAL</div>
                          <div style={{fontWeight:800,color:T.green,fontSize:BASE*0.95}}>{fmt(c.presupuestoReal)}</div>
                        </div>
                        <div style={{background:T.accentBg,borderRadius:10,padding:"8px 12px",textAlign:"center",border:`1px solid ${T.accent}33`,minWidth:80}}>
                          <div style={{fontSize:BASE*0.68,color:T.accent,fontWeight:700}}>FACTURADO</div>
                          <div style={{fontWeight:800,color:T.accent,fontSize:BASE*0.95}}>{fmt(c.presupuestoFacturado)}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
                      {c.transfers?.map((t,i)=>{
                        const dr=cd.find(d=>d.id===t.driverId);
                        return (
                          <div key={i} style={{background:T.surface2,borderRadius:9,padding:"6px 10px",fontSize:BASE*0.84,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",border:`1px solid ${T.border}`}}>
                            <span style={{fontWeight:700,color:T.sub,display:"flex",alignItems:"center",gap:2}}>{t.type==="vuelta"?<ArrowDownLeft size={12}/>:<ArrowUpRight size={12}/>}{t.type}</span>
                            <span style={{color:T.accent,fontWeight:700}}>{t.time}</span>
                            <span style={{color:T.muted}}>→ {addMins(t.time,t.duration)}</span>
                            <span style={{color:T.muted,fontSize:BASE*0.75}}>{t.days?.join(", ")}</span>
                            {dr&&<Badge color={dr.color}><Car size={9}/>{dr.name}</Badge>}
                            <IconBtn onClick={async()=>{const updated=c.transfers.filter((_,ti)=>ti!==i);await updateDoc(doc(db,"clients",c.id),{transfers:updated});}} color={T.rose}><Trash2 size={12}/></IconBtn>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
              {clients.length===0&&<div style={{textAlign:"center",color:T.muted,padding:40}}>No hay clientes cargados</div>}
            </div>
          </div>
        )}

        {/* DRIVERS */}
        {tab==="drivers"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:BASE*1.2,color:T.text}}>Choferes</h2>
              <Btn icon={<Plus size={15}/>} onClick={openAddDriver}>Nuevo</Btn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {cd.map(dr=>{
                const total=clients.reduce((s,c)=>s+(c.transfers?.filter(t=>t.driverId===dr.id).length||0),0);
                return (
                  <Card key={dr.id} accent={dr.color}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:BASE*1.0,color:T.text}}>{dr.name}</div>
                        <div style={{fontSize:BASE*0.84,color:T.muted,marginTop:3,display:"flex",alignItems:"center",gap:4}}><Phone size={12}/>{dr.phone}</div>
                        <div style={{marginTop:7}}><Badge color={dr.color}><Car size={10}/>{total} traslado{total!==1?"s":""}</Badge></div>
                      </div>
                      <div style={{display:"flex",gap:2}}>
                        <IconBtn title="Editar" onClick={()=>openEditDriver(dr)} color={T.accent}><Pencil size={14}/></IconBtn>
                        <IconBtn title="Eliminar" onClick={()=>deleteDriver(dr.id)} color={T.rose}><Trash2 size={14}/></IconBtn>
                      </div>
                    </div>
                    <div style={{marginTop:8}}>
                      {DAYS.map(day=>{
                        const ts=getDriverTransfers(dr.id,day);
                        if(!ts.length)return null;
                        return <div key={day} style={{fontSize:BASE*0.78,color:T.muted,marginBottom:3}}><span style={{color:T.sub,fontWeight:600}}>{day}:</span> {ts.map(({client:c,transfer:t})=>`${t.time} ${c.name} (${t.type})`).join(" · ")}</div>;
                      })}
                    </div>
                  </Card>
                );
              })}
              {drivers.length===0&&<div style={{textAlign:"center",color:T.muted,padding:40}}>No hay choferes cargados</div>}
            </div>
          </div>
        )}

        {/* BILLING */}
        {tab==="billing"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <h2 style={{margin:0,fontSize:BASE*1.2,color:T.text}}>Facturación</h2>
              <select value={billingMonth} onChange={e=>setBillingMonth(Number(e.target.value))} style={{padding:"7px 12px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:BASE*0.88,background:T.surface2,color:T.text}}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="billing-totals" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{background:T.greenBg,borderRadius:14,padding:"16px 18px",border:`1px solid ${T.green}33`}}>
                <div style={{fontSize:BASE*0.72,color:T.green,fontWeight:700,letterSpacing:.8}}>TOTAL REAL — {MONTHS[billingMonth].toUpperCase()}</div>
                <div style={{fontSize:BASE*1.5,fontWeight:800,color:T.green,marginTop:4}}>{fmt(clients.reduce((s,c)=>s+(c.presupuestoReal||0),0))}</div>
              </div>
              <div style={{background:T.accentBg,borderRadius:14,padding:"16px 18px",border:`1px solid ${T.accent}33`}}>
                <div style={{fontSize:BASE*0.72,color:T.accent,fontWeight:700,letterSpacing:.8}}>TOTAL FACTURADO — {MONTHS[billingMonth].toUpperCase()}</div>
                <div style={{fontSize:BASE*1.5,fontWeight:800,color:T.accent,marginTop:4}}>{fmt(clients.reduce((s,c)=>s+(c.presupuestoFacturado||0),0))}</div>
              </div>
            </div>
            {/* Mobile: cards instead of table */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {clients.map(c=>{
                const os=obrasSociales.find(o=>o.id===c.obraSocialId);
                const isEditing=editBilling?.id===c.id;
                return (
                  <Card key={c.id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:BASE*0.95,color:T.text}}>{c.name}</div>
                        {os&&<div style={{marginTop:4}}><Badge color={T.lavender}><HeartPulse size={10}/>{os.name}</Badge></div>}
                        <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
                          <div style={{background:T.greenBg,borderRadius:9,padding:"6px 12px",border:`1px solid ${T.green}33`}}>
                            <div style={{fontSize:BASE*0.68,color:T.green,fontWeight:700}}>REAL</div>
                            {isEditing
                              ?<input type="number" value={editBilling.presupuestoReal} onChange={e=>setEditBilling(b=>({...b,presupuestoReal:e.target.value}))} style={{width:100,padding:"3px 6px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:BASE*0.84,background:T.surface,color:T.text}}/>
                              :<div style={{fontWeight:800,color:T.green,fontSize:BASE*0.95}}>{fmt(c.presupuestoReal)}</div>
                            }
                          </div>
                          <div style={{background:T.accentBg,borderRadius:9,padding:"6px 12px",border:`1px solid ${T.accent}33`}}>
                            <div style={{fontSize:BASE*0.68,color:T.accent,fontWeight:700}}>FACTURADO</div>
                            {isEditing
                              ?<input type="number" value={editBilling.presupuestoFacturado} onChange={e=>setEditBilling(b=>({...b,presupuestoFacturado:e.target.value}))} style={{width:100,padding:"3px 6px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:BASE*0.84,background:T.surface,color:T.text}}/>
                              :<div style={{fontWeight:800,color:T.accent,fontSize:BASE*0.95}}>{fmt(c.presupuestoFacturado)}</div>
                            }
                          </div>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4,flexShrink:0}}>
                        {isEditing
                          ?<><IconBtn onClick={saveBilling} color={T.green}><Check size={16}/></IconBtn><IconBtn onClick={()=>setEditBilling(null)} color={T.muted}><X size={16}/></IconBtn></>
                          :<IconBtn onClick={()=>setEditBilling({id:c.id,presupuestoReal:String(c.presupuestoReal||""),presupuestoFacturado:String(c.presupuestoFacturado||"")})} color={T.accent}><Pencil size={15}/></IconBtn>
                        }
                      </div>
                    </div>
                    <div style={{marginTop:8}}>
                      <Badge color={T.amber} bg={T.amberBg}>{MONTHS[billingMonth]}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* OBRAS SOCIALES */}
        {tab==="os"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:BASE*1.2,color:T.text}}>Obras Sociales</h2>
              <Btn icon={<Plus size={15}/>} onClick={openAddOS}>Nueva</Btn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {obrasSociales.map(os=>{
                const osClients=clients.filter(c=>c.obraSocialId===os.id);
                return (
                  <Card key={os.id} accent={T.lavender}>
                    <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontWeight:700,fontSize:BASE*1.0,color:T.text}}>{os.name}</div>
                          <div style={{display:"flex",gap:2}}>
                            <IconBtn onClick={()=>openEditOS(os)} color={T.accent}><Pencil size={14}/></IconBtn>
                            <IconBtn onClick={()=>deleteOS(os.id)} color={T.rose}><Trash2 size={14}/></IconBtn>
                          </div>
                        </div>
                        <div style={{fontSize:BASE*0.84,color:T.muted,marginTop:3,display:"flex",flexWrap:"wrap",gap:10}}>
                          <span style={{display:"flex",alignItems:"center",gap:3}}><Users size={12}/>{os.contact}</span>
                          <span style={{display:"flex",alignItems:"center",gap:3}}><Phone size={12}/>{os.phone}</span>
                        </div>
                        <div style={{fontSize:BASE*0.84,color:T.muted,display:"flex",alignItems:"center",gap:3,marginTop:2}}><Mail size={12}/>{os.email}</div>
                        {os.address&&<div style={{fontSize:BASE*0.84,color:T.muted,display:"flex",alignItems:"center",gap:3,marginTop:2}}><MapPin size={12}/>{os.address}</div>}
                        {os.notes&&<div style={{fontSize:BASE*0.84,color:T.muted,fontStyle:"italic",marginTop:4,display:"flex",alignItems:"center",gap:3}}><Info size={12}/>{os.notes}</div>}
                      </div>
                    </div>
                    {osClients.length>0&&(
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:BASE*0.72,fontWeight:700,color:T.muted,marginBottom:5,letterSpacing:.8}}>PACIENTES</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{osClients.map(c=><Badge key={c.id} color={T.lavender}><Users size={9}/>{c.name}</Badge>)}</div>
                      </div>
                    )}
                    {os.files?.length>0&&(
                      <div style={{marginTop:8}}>
                        <div style={{fontSize:BASE*0.72,fontWeight:700,color:T.muted,marginBottom:5,letterSpacing:.8}}>ARCHIVOS</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{os.files.map((f,i)=><a key={i} href={f.data} download={f.name} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 10px",fontSize:BASE*0.78,color:T.sub,textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Paperclip size={10}/>{f.name}</a>)}</div>
                      </div>
                    )}
                  </Card>
                );
              })}
              {obrasSociales.length===0&&<div style={{textAlign:"center",color:T.muted,padding:40}}>No hay obras sociales cargadas</div>}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CLIENT */}
      {modal==="client"&&(
        <Modal title={editClientId?"Editar cliente":"Nuevo cliente"} onClose={()=>{setModal(null);setSuggestions(null);setNc(emptyClient);setEditClientId(null);}} wide>
          <SecTitle>DATOS PERSONALES</SecTitle>
          <Inp label="Nombre *" value={nc.name} onChange={e=>setNc(c=>({...c,name:e.target.value}))} placeholder="Ana García"/>
          <Inp label="Teléfono" value={nc.phone} onChange={e=>setNc(c=>({...c,phone:e.target.value}))} placeholder="261-555-0000"/>
          <Inp label="Domicilio principal *" value={nc.address} onChange={e=>setNc(c=>({...c,address:e.target.value}))} placeholder="Av. San Martín 450, Mendoza"/>
          <Inp label="Domicilio secundario" value={nc.address2} onChange={e=>setNc(c=>({...c,address2:e.target.value}))} placeholder="Opcional"/>
          <Sel label="Obra Social" value={nc.obraSocialId} onChange={e=>setNc(c=>({...c,obraSocialId:e.target.value}))}>
            <option value="">Sin obra social</option>
            {obrasSociales.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </Sel>
          <SecTitle>PRESUPUESTOS</SecTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Real ($)" type="number" value={nc.presupuestoReal} onChange={e=>setNc(c=>({...c,presupuestoReal:e.target.value}))} placeholder="0"/>
            <Inp label="Facturado ($)" type="number" value={nc.presupuestoFacturado} onChange={e=>setNc(c=>({...c,presupuestoFacturado:e.target.value}))} placeholder="0"/>
          </div>
          <SecTitle>DESTINOS</SecTitle>
          {nc.destinations.map((d,i)=>(
            <div key={i} style={{background:T.surface2,borderRadius:12,padding:12,marginBottom:10,border:`1px solid ${T.border}`}}>
              <Inp label={`Nombre destino ${i+1}`} value={d.name} onChange={e=>{const ds=[...nc.destinations];ds[i]={...ds[i],name:e.target.value};setNc(c=>({...c,destinations:ds}));}} placeholder="Colegio San José"/>
              <Inp label="Dirección" value={d.address} onChange={e=>{const ds=[...nc.destinations];ds[i]={...ds[i],address:e.target.value};setNc(c=>({...c,destinations:ds}));}} placeholder="Belgrano 230" style={{marginBottom:0}}/>
            </div>
          ))}
          <Btn variant="secondary" small icon={<Plus size={12}/>} onClick={()=>setNc(c=>({...c,destinations:[...c.destinations,{name:"",address:""}]}))} style={{marginBottom:4}}>Agregar destino</Btn>
          {nc.destinations[0]?.address&&(
            <>
              <SecTitle>AGREGAR TRASLADO</SecTitle>
              <div style={{background:T.surface2,borderRadius:12,padding:12,border:`1px solid ${T.border}`}}>
                <Sel label="Destino" value={nt.destination} onChange={e=>setNt(t=>({...t,destination:Number(e.target.value)}))}>
                  {nc.destinations.map((d,i)=><option key={i} value={i}>{d.name||`Destino ${i+1}`}</option>)}
                </Sel>
                <Sel label="Tipo" value={nt.type} onChange={e=>setNt(t=>({...t,type:e.target.value}))}>
                  <option value="ida">↗ Ida</option>
                  <option value="vuelta">↩ Vuelta</option>
                </Sel>
                <Sel label="Horario" value={nt.time} onChange={e=>setNt(t=>({...t,time:e.target.value}))}>
                  {HOURS.map(h=><option key={h}>{h}</option>)}
                </Sel>
                <div style={{marginBottom:12}}>
                  <label style={{display:"block",fontSize:BASE*0.84,fontWeight:600,color:T.muted,marginBottom:6}}>Días</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {DAYS.map(d=>(
                      <button key={d} onClick={()=>setNt(t=>({...t,days:t.days.includes(d)?t.days.filter(x=>x!==d):[...t.days,d]}))}
                        style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${nt.days.includes(d)?T.accent:T.border}`,background:nt.days.includes(d)?T.accentBg:T.surface,color:nt.days.includes(d)?T.accent:T.sub,fontSize:BASE*0.84,fontWeight:600,cursor:"pointer"}}>{d}</button>
                    ))}
                  </div>
                </div>
                {nt.days.length>0&&<Btn variant="success" icon={<Search size={14}/>} onClick={checkAvail} style={{width:"100%"}}>Ver choferes disponibles</Btn>}
              </div>
              {suggestions&&(
                <div style={{background:T.greenBg,borderRadius:12,padding:14,marginTop:10,border:`1px solid ${T.green}33`}}>
                  <div style={{fontWeight:700,fontSize:BASE*0.84,color:T.green,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><Check size={13}/>Disponibilidad</div>
                  {suggestions.map(({day,avail,duration})=>(
                    <div key={day} style={{marginBottom:10}}>
                      <div style={{fontSize:BASE*0.84,fontWeight:700,color:T.sub,marginBottom:4}}>{day} · ~{duration} min</div>
                      {avail.length===0
                        ?<div style={{fontSize:BASE*0.84,color:T.rose}}>Sin disponibilidad</div>
                        :avail.map(dr=>{
                          const dur=estimateDur(nc.address,nc.destinations[nt.destination]?.address||"");
                          const cap=driverCapacityAt(dr.id,day,nt.time,dur,null);
                          return (
                            <div key={dr.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surface,borderRadius:10,padding:"7px 12px",marginBottom:4,border:`1px solid ${T.border}`}}>
                              <div style={{display:"flex",alignItems:"center",gap:7}}>
                                <div style={{width:9,height:9,borderRadius:"50%",background:dr.color}}/>
                                <span style={{fontSize:BASE*0.9,fontWeight:600,color:T.text}}>{dr.name}</span>
                                <Badge color={cap===0?T.green:T.amber} bg={cap===0?T.greenBg:T.amberBg}>{cap===0?"Libre":"1 pasajero"}</Badge>
                              </div>
                              <Btn small icon={<Check size={11}/>} onClick={()=>assignDriver(dr.id)}>Asignar</Btn>
                            </div>
                          );
                        })
                      }
                    </div>
                  ))}
                </div>
              )}
              {nc.transfers.length>0&&(
                <div style={{marginTop:8}}>
                  <div style={{fontSize:BASE*0.84,fontWeight:700,color:T.muted,marginBottom:5}}>Traslados cargados:</div>
                  {nc.transfers.map((t,i)=>{
                    const dr=cd.find(d=>d.id===t.driverId);
                    return (
                      <div key={i} style={{fontSize:BASE*0.8,background:T.surface2,borderRadius:8,padding:"5px 10px",marginBottom:4,color:T.sub,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{display:"flex",alignItems:"center",gap:5}}><Check size={11} color={T.green}/>{t.type==="vuelta"?"↩":"↗"} {t.time} · {t.days?.join(", ")} · {dr?.name}</span>
                        <IconBtn onClick={()=>setNc(c=>({...c,transfers:c.transfers.filter((_,ti)=>ti!==i)}))} color={T.rose}><Trash2 size={11}/></IconBtn>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
            <Btn variant="secondary" onClick={()=>{setModal(null);setSuggestions(null);setNc(emptyClient);setEditClientId(null);}}>Cancelar</Btn>
            <Btn onClick={saveClient}>{editClientId?"Guardar cambios":"Guardar"}</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL DRIVER */}
      {modal==="driver"&&(
        <Modal title={editDriverId?"Editar chofer":"Nuevo chofer"} onClose={()=>{setModal(null);setNd(emptyDriver);setEditDriverId(null);}}>
          <Inp label="Nombre *" value={nd.name} onChange={e=>setNd(d=>({...d,name:e.target.value}))} placeholder="Juan Pérez"/>
          <Inp label="Teléfono" value={nd.phone} onChange={e=>setNd(d=>({...d,phone:e.target.value}))} placeholder="261-555-0000"/>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:14}}>
            <Btn variant="secondary" onClick={()=>{setModal(null);setNd(emptyDriver);setEditDriverId(null);}}>Cancelar</Btn>
            <Btn onClick={saveDriver}>{editDriverId?"Guardar cambios":"Guardar"}</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL OS */}
      {modal==="os"&&(
        <Modal title={editOSId?"Editar obra social":"Nueva Obra Social"} onClose={()=>{setModal(null);setNos(emptyOS);setEditOSId(null);}} wide>
          <SecTitle>DATOS</SecTitle>
          <Inp label="Nombre *" value={nos.name} onChange={e=>setNos(o=>({...o,name:e.target.value}))} placeholder="OSEP"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Contacto" value={nos.contact} onChange={e=>setNos(o=>({...o,contact:e.target.value}))} placeholder="Nombre"/>
            <Inp label="Teléfono" value={nos.phone} onChange={e=>setNos(o=>({...o,phone:e.target.value}))} placeholder="261-000-0000"/>
          </div>
          <Inp label="Email" type="email" value={nos.email} onChange={e=>setNos(o=>({...o,email:e.target.value}))} placeholder="contacto@ossocial.com"/>
          <Inp label="Dirección" value={nos.address} onChange={e=>setNos(o=>({...o,address:e.target.value}))} placeholder="Dirección"/>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:BASE*0.84,fontWeight:600,color:T.muted,marginBottom:4}}>Notas</label>
            <textarea value={nos.notes} onChange={e=>setNos(o=>({...o,notes:e.target.value}))} placeholder="Condiciones de pago..." style={{width:"100%",padding:"9px 13px",borderRadius:10,border:`1.5px solid ${T.border}`,fontSize:BASE*0.95,minHeight:60,boxSizing:"border-box",resize:"vertical",background:T.surface2,color:T.text}}/>
          </div>
          <SecTitle>ARCHIVOS</SecTitle>
          <input ref={fileRef} type="file" style={{display:"none"}} onChange={handleOSFile}/>
          <Btn variant="secondary" small icon={<Paperclip size={11}/>} onClick={()=>fileRef.current.click()} style={{marginBottom:8}}>Adjuntar</Btn>
          {nos.files?.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              {nos.files.map((f,i)=>(
                <div key={i} style={{background:T.surface2,border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 9px",fontSize:BASE*0.78,color:T.sub,display:"flex",alignItems:"center",gap:5}}>
                  <Paperclip size={10}/>{f.name}
                  <button onClick={()=>setNos(o=>({...o,files:o.files.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",color:T.rose,cursor:"pointer",display:"flex",alignItems:"center",padding:0}}><X size={12}/></button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:12}}>
            <Btn variant="secondary" onClick={()=>{setModal(null);setNos(emptyOS);setEditOSId(null);}}>Cancelar</Btn>
            <Btn onClick={saveOS}>{editOSId?"Guardar cambios":"Guardar"}</Btn>
          </div>
        </Modal>
      )}

      {/* CONFIRM */}
      {confirm&&(
        <div style={{position:"fixed",inset:0,background:"#00000077",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.surface,borderRadius:16,padding:24,width:"min(90vw,360px)",boxShadow:"0 10px 40px #0004",border:`1px solid ${T.border}`}}>
            <div style={{fontSize:BASE,fontWeight:600,color:T.text,marginBottom:20}}>{confirm.msg}</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>setConfirm(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={<Trash2 size={14}/>} onClick={confirm.onConfirm}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
</div>
  );
}

