import { useState, useMemo, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie,
  Legend, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ComposedChart
} from "recharts";

// ── helpers ───────────────────────────────────────────────────────────────────
const parseDateStr = d => { const [dd,mm,yyyy]=d.split("-"); return new Date(`${yyyy}-${mm}-${dd}`); };
const getDow = d => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][parseDateStr(d).getDay()];
const getWeek = d => { const dt=parseDateStr(d),j=new Date(dt.getFullYear(),0,1); return `${dt.getFullYear()}-W${String(Math.ceil(((dt-j)/86400000+j.getDay()+1)/7)).padStart(2,"0")}`; };
const getMonthKey = d => d.slice(3,10);
const getMonthLabelFull = d => { const[,mm,yyyy]=d.split("-"); return ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mm]+" "+yyyy.slice(2); };
const getSession = e => { const h=parseInt(e.split(":")[0]); return h>=6&&h<12?"Morning":h>=12&&h<16?"Midday":h>=16&&h<20?"Evening":"Night"; };
const getDuration = (en,ex) => { const[eh,em]=en.split(":").map(Number),[xh,xm]=ex.split(":").map(Number); let m=(xh*60+xm)-(eh*60+em); return m<0?m+1440:m; };
const fmt = n => (n>=0?"+":"")+n.toLocaleString();
const pct = n => (n*100).toFixed(1)+"%";

// ── tokens ────────────────────────────────────────────────────────────────────
const G="rgba(0,255,179,1)", R="#ff3d5a", GOLD="#ffd060", BL="#60b4ff", PU="#b57bff";
const GRID="rgba(255,255,255,0.04)", DIM="rgba(255,255,255,0.35)", TEXT="rgba(255,255,255,0.80)";
const glass={background:"rgba(255,255,255,0.04)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16};

const TABS = ["overview","equity","time","breakdown","montecarlo","tradebook","log"];
const TLABELS = {overview:"Overview",equity:"Equity",time:"Time & Session",breakdown:"Deep Dive",montecarlo:"Monte Carlo",tradebook:"Tradebook",log:"Trade Log"};
const TICONS  = {overview:"📊",equity:"📈",time:"⏱",breakdown:"🔍",montecarlo:"🎲",tradebook:"📅",log:"📋"};

const CSV_TEMPLATE = `DATE,ENTRY TIME,EXIT TIME,P&L,DIRECTION,MAX RR,TRADE IMAGE
01-08-2025,14;55,15;15,-100,Short,0,https://s3.tradingview.com/snapshots/b/Bslpo6Cj.png
04-08-2025,12;30,13;45,200,Long,2,https://s3.tradingview.com/snapshots/z/ZbATK37n.png`;

const CT = ({active,payload,label}) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{...glass,padding:"10px 14px",fontSize:12,fontFamily:"'DM Mono',monospace",minWidth:140}}>
      {label&&<div style={{color:DIM,marginBottom:5,fontSize:11}}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{color:typeof p.value==="number"?(p.value>0?G:p.value<0?R:TEXT):TEXT,display:"flex",justifyContent:"space-between",gap:16}}>
          <span style={{color:DIM}}>{p.name}</span>
          <b>{typeof p.value==="number"
            ?(p.name?.toLowerCase().includes("rate")||p.name?.toLowerCase().includes("wr")?pct(p.value):fmt(p.value))
            :p.value}</b>
        </div>
      ))}
    </div>
  );
};

function ModalCard({modal,onClose}){
  const pnlColor = modal.pnl>0?G:modal.pnl<0?R:GOLD;
  const tvPageUrl = modal.img ? modal.img.replace(
    /https:\/\/s3\.tradingview\.com\/snapshots\/[a-z]\/(\w+)\.png/,
    'https://www.tradingview.com/x/$1/'
  ) : null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{...glass,padding:22,maxWidth:960,width:"100%",boxShadow:"0 0 60px rgba(0,255,179,0.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",fontFamily:"'DM Mono',monospace",fontSize:12}}>
            <span style={{color:DIM}}>{modal.date} ({modal.dow}) · {modal.entry}→{modal.exit} · {modal.duration}m · {modal.session}</span>
            <span style={{padding:"3px 9px",borderRadius:6,fontSize:10,fontWeight:500,fontFamily:"'DM Mono',monospace",letterSpacing:".04em",background:modal.dir==="Long"?"rgba(96,180,255,0.15)":"rgba(181,123,255,0.15)",color:modal.dir==="Long"?BL:PU}}>{modal.dir}</span>
            <span style={{color:pnlColor,fontWeight:600,fontSize:15}}>{fmt(modal.pnl)}</span>
            <span style={{color:modal.rr>=2?G:modal.rr>=1?GOLD:R}}>{modal.rr}R</span>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:DIM,cursor:"pointer",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
        </div>
        {tvPageUrl ? (
          <>
            <iframe
              src={tvPageUrl}
              title="TradingView Chart"
              style={{width:"100%",height:500,borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",display:"block",background:"#131722"}}
              allowFullScreen
            />
            <a href={tvPageUrl} target="_blank" rel="noreferrer" style={{display:"block",marginTop:12,fontSize:11,color:DIM,textDecoration:"none",fontFamily:"'DM Mono',monospace"}}>↗ Open in TradingView</a>
          </>
        ) : (
          <div style={{height:200,borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:DIM,fontFamily:"'DM Mono',monospace",fontSize:12}}>No chart image provided</div>
        )}
      </div>
    </div>
  );
}

function UploadScreen({onData}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { setError('CSV must have a header row and at least one trade.'); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g,''));
    const colMap = {
      'date': headers.find(h => h === 'date'),
      'entry': headers.find(h => h === 'entry time' || h === 'entry'),
      'exit': headers.find(h => h === 'exit time' || h === 'exit'),
      'pnl': headers.find(h => h === 'p&l' || h === 'pnl'),
      'dir': headers.find(h => h === 'direction' || h === 'dir'),
      'rr': headers.find(h => h === 'max rr' || h === 'rr'),
      'img': headers.find(h => h === 'trade image' || h === 'img'),
    };
    const missing = Object.entries(colMap).filter(([k, v]) => !['img'].includes(k) && !v).map(([k]) => k);
    if (missing.length) { setError(`Missing required columns: ${missing.join(', ')}`); return; }
    const parsed = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g,''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      const entry = obj[colMap.entry] || '';
      const exit = obj[colMap.exit] || '';
      const normalizeTime = t => t.replace(/;/g, ':');
      return {
        date: obj[colMap.date],
        entry: normalizeTime(entry),
        exit: normalizeTime(exit),
        pnl: parseFloat(obj[colMap.pnl]) || 0,
        dir: obj[colMap.dir],
        rr: parseFloat(obj[colMap.rr]) || 0,
        img: obj[colMap.img] || '',
      };
    }).filter(t => t.date && t.entry && t.exit && (t.dir === 'Long' || t.dir === 'Short'));
    if (!parsed.length) { setError('No valid trades found. Check that dir column contains "Long" or "Short".'); return; }
    setError('');
    onData(parsed);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => parseCSV(e.target.result);
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trades_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{background:"#000",minHeight:"100vh",color:TEXT,fontFamily:"'DM Mono','Courier New',monospace",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@400;600;700&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{position:"fixed",top:-200,left:-200,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,179,0.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:-200,right:-200,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(96,180,255,0.04) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:580}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:10,color:DIM,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
            <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:G,marginRight:7,boxShadow:`0 0 8px ${G}`,verticalAlign:"middle"}}/>
            Trade Analytics Dashboard
          </div>
          <h1 style={{margin:"0 0 10px",fontSize:32,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",letterSpacing:"-0.04em"}}>
            Upload your <span style={{color:G,fontWeight:300}}>trades</span>
          </h1>
          <p style={{margin:0,fontSize:13,color:DIM,lineHeight:1.6}}>Import a CSV file to analyse your trade history with full analytics, equity curves, Monte Carlo simulations and more.</p>
        </div>

        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}
          onClick={()=>fileRef.current?.click()}
          style={{
            ...glass,
            padding:"44px 32px",
            textAlign:"center",
            cursor:"pointer",
            border:`2px dashed ${dragOver?"rgba(0,255,179,0.6)":"rgba(255,255,255,0.12)"}`,
            borderRadius:20,
            transition:"all .2s",
            background:dragOver?"rgba(0,255,179,0.04)":"rgba(255,255,255,0.02)",
            boxShadow:dragOver?`0 0 40px rgba(0,255,179,0.1)`:"none",
            marginBottom:14,
          }}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          <div style={{fontSize:40,marginBottom:14}}>📂</div>
          <div style={{fontSize:15,color:dragOver?G:TEXT,fontWeight:600,marginBottom:8,fontFamily:"'Inter',sans-serif"}}>
            {dragOver ? "Drop your CSV here" : "Click to browse or drag & drop"}
          </div>
          <div style={{fontSize:12,color:DIM}}>Supports .csv files</div>
        </div>

        {error && (
          <div style={{...glass,padding:"12px 16px",border:"1px solid rgba(255,61,90,0.3)",borderRadius:10,color:R,fontSize:12,fontFamily:"'DM Mono',monospace",marginBottom:14,background:"rgba(255,61,90,0.06)"}}>
            ⚠ {error}
          </div>
        )}

        <div style={{...glass,padding:20,borderRadius:14,marginBottom:14}}>
          <div style={{fontSize:10,color:DIM,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:12,fontFamily:"'DM Mono',monospace"}}>Required CSV columns</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              ["DATE","DD-MM-YYYY format (e.g. 01-08-2025)"],
              ["ENTRY TIME","Time HH;MM with semicolon (e.g. 14;55)"],
              ["EXIT TIME","Time HH;MM with semicolon (e.g. 15;15)"],
              ["P&L","Profit/loss as a number (e.g. 200 or -100)"],
              ["DIRECTION","Long or Short"],
              ["MAX RR","Risk/reward ratio (e.g. 2)"],
              ["TRADE IMAGE","(optional) Chart image URL"],
            ].map(([col,desc])=>(
              <div key={col} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 12px",border:"1px solid rgba(255,255,255,0.06)"}}>
                <div style={{color:G,fontFamily:"'DM Mono',monospace",fontSize:11,marginBottom:3}}>{col}</div>
                <div style={{color:DIM,fontSize:10,lineHeight:1.4}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={downloadTemplate} style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid rgba(0,255,179,0.25)",background:"rgba(0,255,179,0.06)",color:G,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:"0.06em",transition:"all .2s"}}>
          ↓ Download CSV Template
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [rawTrades, setRawTrades] = useState([]);
  const [tab,setTab] = useState("overview");
  const [modal,setModal] = useState(null);
  const [mcNSims,setMcNSims] = useState(1000);
  const [mcNTrades,setMcNTrades] = useState(100);
  const [mcSeed,setMcSeed] = useState(0);
  const [tbYear,setTbYear] = useState(null);
  const [tbDay,setTbDay] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g,''));
      const colMap = {
        'date': headers.find(h => h === 'date'),
        'entry': headers.find(h => h === 'entry time' || h === 'entry'),
        'exit': headers.find(h => h === 'exit time' || h === 'exit'),
        'pnl': headers.find(h => h === 'p&l' || h === 'pnl'),
        'dir': headers.find(h => h === 'direction' || h === 'dir'),
        'rr': headers.find(h => h === 'max rr' || h === 'rr'),
        'img': headers.find(h => h === 'trade image' || h === 'img'),
      };
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g,''));
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        const entry = obj[colMap.entry] || '';
        const exit = obj[colMap.exit] || '';
        const normalizeTime = t => t.replace(/;/g, ':');
        return {
          date: obj[colMap.date] || '',
          entry: normalizeTime(entry),
          exit: normalizeTime(exit),
          pnl: parseFloat(obj[colMap.pnl]) || 0,
          dir: obj[colMap.dir] || 'Long',
          rr: parseFloat(obj[colMap.rr]) || 0,
          img: obj[colMap.img] || '',
        };
      }).filter(t => t.date && t.entry && t.exit && (t.dir === 'Long' || t.dir === 'Short'));
      if (parsed.length) {
        setRawTrades(parsed);
        setTbDay(null);
        const firstYear = parseInt(parsed[0].date.split('-')[2]);
        setTbYear(firstYear || new Date().getFullYear());
      }
    };
    reader.readAsText(file);
  };

  if (!rawTrades.length) {
    return <UploadScreen onData={data => {
      setRawTrades(data);
      const firstYear = parseInt(data[0].date.split('-')[2]);
      setTbYear(firstYear || new Date().getFullYear());
    }}/>;
  }

  const trades = rawTrades.map((t,i) => ({
    ...t, id:i+1,
    dow: getDow(t.date),
    week: getWeek(t.date),
    monthKey: getMonthKey(t.date),
    monthLabel: getMonthLabelFull(t.date),
    session: getSession(t.entry),
    duration: getDuration(t.entry,t.exit),
    win: t.pnl > 0,
    loss: t.pnl < 0,
    be: t.pnl === 0,
  }));

  const MONTH_ORDER = [...new Set(trades.map(t => t.monthKey))].sort((a,b) => {
    const [ma,ya] = a.split('-'); const [mb,yb] = b.split('-');
    return (+ya*100 + +ma) - (+yb*100 + +mb);
  });

  const dateRange = (() => {
    const dates = trades.map(t => t.date);
    return `${dates[0]} – ${dates[dates.length-1]}`;
  })();

  const S = (() => {
    const wins=trades.filter(t=>t.win), losses=trades.filter(t=>t.loss), be=trades.filter(t=>t.be);
    const longs=trades.filter(t=>t.dir==="Long"), shorts=trades.filter(t=>t.dir==="Short");
    const totalPnl=trades.reduce((s,t)=>s+t.pnl,0);
    const winRate=wins.length/trades.length;
    const avgRRwins=wins.length?wins.reduce((s,t)=>s+t.rr,0)/wins.length:0;
    const grossProfit=wins.reduce((s,t)=>s+t.pnl,0);
    const grossLoss=Math.abs(losses.reduce((s,t)=>s+t.pnl,0));
    const profitFactor=grossLoss>0?grossProfit/grossLoss:grossProfit;
    const avgDuration=trades.reduce((s,t)=>s+t.duration,0)/trades.length;
    const winDuration=wins.length?wins.reduce((s,t)=>s+t.duration,0)/wins.length:0;
    const lossDuration=losses.length?losses.reduce((s,t)=>s+t.duration,0)/losses.length:0;
    const expectancy=totalPnl/trades.length;
    let maxWS=0,maxLS=0,ws=0,ls=0;
    for(const t of trades){if(t.win){ws++;ls=0;maxWS=Math.max(maxWS,ws);}else if(t.loss){ls++;ws=0;maxLS=Math.max(maxLS,ls);}else{ws=0;ls=0;}}
    const maxDD=(()=>{let peak=0,dd=0,cum=0;for(const t of trades){cum+=t.pnl;if(cum>peak)peak=cum;dd=Math.min(dd,cum-peak);}return dd;})();
    return {wins,losses,be,longs,shorts,totalPnl,winRate,avgRRwins,profitFactor,grossProfit,grossLoss,
      avgDuration,winDuration,lossDuration,expectancy,maxWS,maxLS,maxDD,
      longWR:longs.length?longs.filter(t=>t.win).length/longs.length:0,
      shortWR:shorts.length?shorts.filter(t=>t.win).length/shorts.length:0};
  })();

  const equityCurve = (() => { let c=0; return trades.map((_,i)=>({n:i+1,equity:(c+=trades[i].pnl)})); })();
  const rollingWR   = trades.map((_,i)=>({n:i+1,wr:i<9?null:trades.slice(i-9,i+1).filter(t=>t.win).length/10}));
  const dirOverTime = (() => { let ls=0,ss=0; return trades.map((t,i)=>{if(t.dir==="Long")ls+=t.pnl;else ss+=t.pnl;return{n:i+1,long:ls,short:ss};}); })();

  const grp = keyFn => {
    const m={};
    for(const t of trades){
      const k=typeof keyFn==="function"?keyFn(t):t[keyFn];
      if(!m[k])m[k]={pnl:0,wins:0,losses:0,total:0,longs:0,shorts:0};
      m[k].pnl+=t.pnl; if(t.win)m[k].wins++;else if(t.loss)m[k].losses++; m[k].total++;
      t.dir==="Long"?m[k].longs++:m[k].shorts++;
    }
    return m;
  };

  const dailyPnl    = (() => { const m=grp("date"); return Object.entries(m).map(([d,v])=>({label:d.slice(0,5),pnl:v.pnl})); })();
  const weeklyPnl   = (() => { const m=grp("week"); return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([w,v])=>({week:w.slice(5),pnl:v.pnl,wr:v.wins/v.total,trades:v.total})); })();
  const monthlyPnl  = (() => { const m=grp("monthKey"); return MONTH_ORDER.filter(k=>m[k]).map(k=>({month:getMonthLabelFull("01-"+k),pnl:m[k].pnl,wr:m[k].wins/m[k].total,wins:m[k].wins,losses:m[k].losses,trades:m[k].total})); })();
  const dowStats    = (() => { const ORDER=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],m=grp("dow"); return ORDER.filter(d=>m[d]).map(d=>({day:d,pnl:m[d].pnl,wr:m[d].wins/m[d].total,trades:m[d].total})); })();
  const sessionStats= (() => { const SESS=["Morning","Midday","Evening","Night"],m=grp("session"); return SESS.filter(s=>m[s]).map(s=>({session:s,...m[s],wr:m[s].wins/m[s].total})); })();
  const hourStats   = (() => { const m={}; for(const t of trades){const h=parseInt(t.entry.split(":")[0]);if(!m[h])m[h]={pnl:0,wins:0,total:0};m[h].pnl+=t.pnl;if(t.win)m[h].wins++;m[h].total++;} return Object.entries(m).sort((a,b)=>+a[0]-+b[0]).map(([h,v])=>({hour:h.padStart(2,"0")+":00",pnl:v.pnl,wr:v.wins/v.total,trades:v.total})); })();
  const durationBuckets=(() => { const b={"<15m":[],"15-30m":[],"30-60m":[],"1-2h":[],"2h+":[]};for(const t of trades){const d=t.duration;b[d<15?"<15m":d<30?"15-30m":d<60?"30-60m":d<120?"1-2h":"2h+"].push(t);}return Object.entries(b).map(([l,a])=>({label:l,count:a.length,pnl:a.reduce((s,t)=>s+t.pnl,0),wr:a.length?a.filter(t=>t.win).length/a.length:0})); })();
  const rrScatter   = trades.map(t=>({rr:t.rr,pnl:t.pnl,dir:t.dir}));

  const mcResults = (() => {
    const pnls = trades.map(t=>t.pnl);
    const N = mcNSims, T = mcNTrades;
    let s32 = (mcSeed * 1664525 + 1013904223) >>> 0 || 1;
    const rand = () => { s32 ^= s32<<13; s32 ^= s32>>>17; s32 ^= s32<<5; return (s32>>>0)/4294967296; };
    const simCurves = [], finalEquities = [], maxDDs = [];
    for (let i=0; i<N; i++) {
      let eq=0, peak=0, dd=0;
      const curve = new Array(T+1);
      curve[0] = 0;
      for (let t=1; t<=T; t++) {
        eq += pnls[Math.floor(rand()*pnls.length)];
        if (eq>peak) peak=eq;
        const cur = eq-peak;
        if (cur<dd) dd=cur;
        curve[t] = eq;
      }
      simCurves.push(curve);
      finalEquities.push(eq);
      maxDDs.push(dd);
    }
    const perc = (arr, p) => { const sorted=[...arr].sort((a,b)=>a-b); const idx=Math.max(0,Math.min(sorted.length-1,Math.floor(p/100*(sorted.length-1)))); return sorted[idx]; };
    const fanData = [];
    for (let t=0; t<=T; t++) {
      const col = simCurves.map(c=>c[t]);
      fanData.push({n:t,p5:perc(col,5),p25:perc(col,25),p50:perc(col,50),p75:perc(col,75),p95:perc(col,95)});
    }
    const minE=perc(finalEquities,2), maxE=perc(finalEquities,98);
    const bucketW=(maxE-minE)/30||1;
    const eHist=Array.from({length:30},(_,i)=>({label:fmt(Math.round(minE+i*bucketW)),count:0,mid:minE+(i+0.5)*bucketW}));
    for(const v of finalEquities){const idx=Math.max(0,Math.min(29,Math.floor((v-minE)/bucketW)));eHist[idx].count++;}
    const minDD=perc(maxDDs,2),maxDD=perc(maxDDs,98);
    const ddW=(maxDD-minDD)/20||1;
    const ddHist=Array.from({length:20},(_,i)=>({label:fmt(Math.round(minDD+i*ddW)),count:0,mid:minDD+(i+0.5)*ddW}));
    for(const v of maxDDs){const idx=Math.max(0,Math.min(19,Math.floor((v-minDD)/ddW)));ddHist[idx].count++;}
    return {fanData,eHist,ddHist,
      probProfit:finalEquities.filter(e=>e>0).length/N,
      probLoss:finalEquities.filter(e=>e<0).length/N,
      medianFinal:perc(finalEquities,50),
      p5Final:perc(finalEquities,5),
      p95Final:perc(finalEquities,95),
      medianDD:perc(maxDDs,50),
      p95DD:perc(maxDDs,95),
      worstDD:perc(maxDDs,99),
      bestCase:perc(finalEquities,95),
      worstCase:perc(finalEquities,5),
      N,T};
  })();

  const radarData = (() => {
    const sc=(v,lo,hi)=>Math.max(0,Math.min(100,((v-lo)/(hi-lo))*100));
    return[
      {metric:"Win Rate",    value:sc(S.winRate,0.4,0.75)},
      {metric:"Prof. Factor",value:sc(S.profitFactor,1,4)},
      {metric:"Avg RR",      value:sc(S.avgRRwins,1,4)},
      {metric:"Consistency", value:sc(1-S.maxLS/trades.length,0.5,1)},
      {metric:"Expectancy",  value:sc(S.expectancy,-50,150)},
      {metric:"Short WR",    value:sc(S.shortWR,0.4,0.8)},
    ];
  })();

  const dayPnlMap = (() => {
    const m={};
    for(const t of trades){
      if(!m[t.date]) m[t.date]={pnl:0,trades:[]};
      m[t.date].pnl+=t.pnl;
      m[t.date].trades.push(t);
    }
    return m;
  })();

  const currentTbYear = tbYear || new Date().getFullYear();

  const GCard = ({title,value,sub,color=G,icon,glow=false,sm=false}) => (
    <div style={{...glass,padding:sm?"14px 18px":"20px 24px",flex:1,minWidth:130,position:"relative",overflow:"hidden",...(glow?{boxShadow:`0 0 40px ${color}18, inset 0 0 40px ${color}06`}:{})}}>
      {glow&&<div style={{position:"absolute",top:-30,right:-30,width:90,height:90,borderRadius:"50%",background:color,opacity:0.06,filter:"blur(22px)"}}/>}
      <div style={{fontSize:10,color:DIM,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{icon&&<span style={{marginRight:5}}>{icon}</span>}{title}</div>
      <div style={{fontSize:sm?20:28,fontWeight:700,color,fontFamily:"'DM Mono',monospace",lineHeight:1,letterSpacing:"-0.02em"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:DIM,marginTop:6,fontFamily:"'DM Mono',monospace"}}>{sub}</div>}
    </div>
  );
  const Glass = ({children,style={}}) => <div style={{...glass,padding:22,...style}}>{children}</div>;
  const ST = ({children}) => (
    <div style={{fontSize:10,color:DIM,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:16,fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:8}}>
      <div style={{height:1,width:16,background:`linear-gradient(90deg,${G},transparent)`}}/>
      {children}
    </div>
  );
  const WRBar = ({v,color}) => (
    <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden",flex:1}}>
      <div style={{height:"100%",width:pct(v),background:color,borderRadius:2,boxShadow:`0 0 6px ${color}88`}}/>
    </div>
  );
  const cProps = {
    cg: <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false}/>,
    xa: (key,ex={}) => <XAxis dataKey={key} stroke="transparent" tick={{fontSize:10,fill:DIM,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false} {...ex}/>,
    ya: (ex={}) => <YAxis stroke="transparent" tick={{fontSize:10,fill:DIM,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false} {...ex}/>,
  };

  return (
    <div style={{background:"#000",minHeight:"100vh",color:TEXT,fontFamily:"'DM Mono','Courier New',monospace",padding:"24px 20px",boxSizing:"border-box",position:"relative",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@400;600;700&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .tab-btn{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:rgba(255,255,255,0.4);cursor:pointer;padding:8px 18px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.06em;transition:all .2s;display:flex;align-items:center;gap:6px}
        .tab-btn:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.75);border-color:rgba(255,255,255,0.15)}
        .tab-btn.on{background:rgba(0,255,179,0.1);border-color:rgba(0,255,179,0.35);color:#00ffb3;box-shadow:0 0 20px rgba(0,255,179,0.12)}
        .tr-row:hover td{background:rgba(255,255,255,0.03)!important}
        .pill{padding:3px 9px;border-radius:6px;font-size:10px;font-weight:500;font-family:'DM Mono',monospace;letter-spacing:.04em}
        .mbox{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 14px;transition:background .2s}
        .mbox:hover{background:rgba(255,255,255,0.055)}
        .day-cell:hover{transform:scale(1.25);z-index:2;position:relative}
        .upload-btn:hover{background:rgba(0,255,179,0.15)!important;border-color:rgba(0,255,179,0.5)!important}
      `}</style>

      <div style={{position:"fixed",top:-200,left:-200,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,179,0.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-200,right:-200,width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(96,180,255,0.04) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>

      <div style={{position:"relative",zIndex:1}}>

        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:10,color:DIM,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>
              <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:G,marginRight:7,boxShadow:`0 0 8px ${G}`,verticalAlign:"middle"}}/>
              Trade Analytics
            </div>
            <h1 style={{margin:0,fontSize:26,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif",letterSpacing:"-0.04em",lineHeight:1}}>
              Dashboard <span style={{color:G,fontWeight:300}}>Analytics</span>
            </h1>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",flexDirection:"column",gap:8}}>
            <div style={{textAlign:"right",fontFamily:"'DM Mono',monospace"}}>
              <div style={{fontSize:10,color:DIM,marginBottom:4}}>{dateRange}</div>
              <div style={{fontSize:12,color:TEXT}}>
                <span style={{color:G}}>{S.wins.length}W</span>
                <span style={{color:DIM,margin:"0 5px"}}>/</span>
                <span style={{color:R}}>{S.losses.length}L</span>
                {S.be.length>0&&<><span style={{color:DIM,margin:"0 5px"}}>/</span><span style={{color:GOLD}}>{S.be.length}BE</span></>}
                <span style={{color:DIM,margin:"0 5px"}}>/</span>
                <span>{trades.length} trades</span>
              </div>
              <div style={{fontSize:20,fontWeight:700,color:S.totalPnl>=0?G:R,marginTop:4,letterSpacing:"-0.02em"}}>{fmt(S.totalPnl)}</div>
            </div>
            <button className="upload-btn" onClick={()=>fileRef.current?.click()} style={{padding:"7px 16px",borderRadius:10,border:"1px solid rgba(0,255,179,0.3)",background:"rgba(0,255,179,0.07)",color:G,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:"0.06em",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>
              ↑ Upload new CSV
            </button>
          </div>
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:22}}>
          {TABS.map(t=><button key={t} className={`tab-btn${tab===t?" on":""}`} onClick={()=>setTab(t)}><span>{TICONS[t]}</span>{TLABELS[t]}</button>)}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <GCard title="Net P&L"       value={fmt(S.totalPnl)}               sub={`${S.wins.length}W / ${S.losses.length}L${S.be.length?" / "+S.be.length+"BE":""}`} color={S.totalPnl>=0?G:R} icon="💰" glow/>
            <GCard title="Win Rate"      value={pct(S.winRate)}                sub={`${S.wins.length} of ${trades.length} trades`}  color={GOLD} icon="🎯"/>
            <GCard title="Profit Factor" value={S.profitFactor.toFixed(2)+"×"} sub="Gross profit / gross loss"                      color={G} icon="⚖️"/>
            <GCard title="Expectancy"    value={fmt(Math.round(S.expectancy))} sub="Avg P&L per trade"                               color={S.expectancy>=0?G:R} icon="📐"/>
            <GCard title="Max Drawdown"  value={fmt(S.maxDD)}                  sub="Peak-to-trough"                                  color={R} icon="📉"/>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <GCard title="Avg RR (wins)" value={S.avgRRwins.toFixed(2)+"R"}    sub="Winning trades"         color={BL}   icon="📈" sm/>
            <GCard title="Best Streak"   value={S.maxWS+" wins"}               sub="Consecutive"            color={G}    icon="🔥" sm/>
            <GCard title="Worst Streak"  value={S.maxLS+" losses"}             sub="Consecutive"            color={R}    icon="❄️" sm/>
            <GCard title="Avg Duration"  value={Math.round(S.avgDuration)+"m"} sub={`W:${Math.round(S.winDuration)}m L:${Math.round(S.lossDuration)}m`} color={PU} icon="⏱" sm/>
            <GCard title="Long WR"       value={pct(S.longWR)}                 sub={`${S.longs.length} trades`}  color={BL} icon="↑" sm/>
            <GCard title="Short WR"      value={pct(S.shortWR)}                sub={`${S.shorts.length} trades`} color={PU} icon="↓" sm/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Glass>
              <ST>Strategy Scorecard</ST>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={82}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)"/>
                  <PolarAngleAxis dataKey="metric" tick={{fill:DIM,fontSize:10,fontFamily:"'DM Mono',monospace"}}/>
                  <Radar dataKey="value" stroke={G} fill={G} fillOpacity={0.12} strokeWidth={1.5}/>
                </RadarChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <ST>Win/Loss & Direction Split</ST>
              <div style={{display:"flex",gap:8}}>
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={[{name:"Wins",value:S.wins.length},{name:"Losses",value:S.losses.length},...(S.be.length?[{name:"BE",value:S.be.length}]:[])]
                      } cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={4} dataKey="value">
                      <Cell fill={G}/><Cell fill={R}/>{S.be.length>0&&<Cell fill={GOLD}/>}
                    </Pie>
                    <Legend formatter={v=><span style={{color:TEXT,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{v}</span>}/>
                    <Tooltip content={<CT/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={[{name:"Long",value:S.longs.length},{name:"Short",value:S.shorts.length}]} cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={4} dataKey="value">
                      <Cell fill={BL}/><Cell fill={PU}/>
                    </Pie>
                    <Legend formatter={v=><span style={{color:TEXT,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{v}</span>}/>
                    <Tooltip content={<CT/>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Glass>
          </div>

          <Glass>
            <ST>Monthly Summary</ST>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
              <thead><tr>{["Month","Trades","Wins","Losses","Win Rate","Net P&L"].map(h=><th key={h} style={{padding:"6px 12px",textAlign:"left",color:DIM,fontWeight:400,fontSize:10,letterSpacing:"0.1em",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>)}</tr></thead>
              <tbody>
                {monthlyPnl.map((m,i)=><tr key={i}>
                  <td style={{padding:"12px 12px",color:GOLD,fontWeight:500}}>{m.month}</td>
                  <td style={{padding:"12px 12px",color:TEXT}}>{m.trades}</td>
                  <td style={{padding:"12px 12px",color:G}}>{m.wins}</td>
                  <td style={{padding:"12px 12px",color:R}}>{m.losses}</td>
                  <td style={{padding:"12px 12px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:m.wr>=0.6?G:m.wr>=0.4?GOLD:R,minWidth:42}}>{pct(m.wr)}</span><WRBar v={m.wr} color={m.wr>=0.6?G:m.wr>=0.4?GOLD:R}/></div></td>
                  <td style={{padding:"12px 12px",fontWeight:600,color:m.pnl>=0?G:R}}>{fmt(m.pnl)}</td>
                </tr>)}
              </tbody>
            </table>
          </Glass>
        </div>}

        {/* ══ EQUITY ══ */}
        {tab==="equity"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Glass>
            <ST>Cumulative Equity + 10-Trade Rolling Win Rate</ST>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={equityCurve.map((e,i)=>({...e,wr:rollingWR[i].wr}))} margin={{top:5,right:45,left:0,bottom:5}}>
                {cProps.cg}{cProps.xa("n",{label:{value:"Trade #",position:"insideBottom",fill:DIM,fontSize:10,dy:12}})}
                {cProps.ya({yAxisId:"eq",tickFormatter:v=>fmt(v)})}
                {cProps.ya({yAxisId:"wr",orientation:"right",tickFormatter:v=>pct(v),domain:[0,1]})}
                <Tooltip content={<CT/>}/>
                <ReferenceLine yAxisId="eq" y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4"/>
                <Area yAxisId="eq" type="monotone" dataKey="equity" stroke={G} fill={G} fillOpacity={0.07} strokeWidth={2} name="Equity" dot={false}/>
                <Line yAxisId="wr" type="monotone" dataKey="wr" stroke={GOLD} strokeWidth={1.5} dot={false} name="Win Rate (10T)" strokeDasharray="5 3"/>
              </ComposedChart>
            </ResponsiveContainer>
          </Glass>

          <Glass>
            <ST>Long vs Short Cumulative P&L</ST>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dirOverTime} margin={{top:5,right:10,left:0,bottom:5}}>
                {cProps.cg}{cProps.xa("n")}{cProps.ya({tickFormatter:v=>fmt(v)})}
                <Tooltip content={<CT/>}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4"/>
                <Line type="monotone" dataKey="long" stroke={BL} strokeWidth={2} dot={false} name="Long P&L"/>
                <Line type="monotone" dataKey="short" stroke={PU} strokeWidth={2} dot={false} name="Short P&L"/>
                <Legend formatter={v=><span style={{color:TEXT,fontSize:10,fontFamily:"'DM Mono',monospace"}}>{v}</span>}/>
              </LineChart>
            </ResponsiveContainer>
          </Glass>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Glass>
              <ST>Daily P&L</ST>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={dailyPnl} margin={{top:5,right:5,left:0,bottom:42}}>
                  {cProps.cg}{cProps.xa("label",{angle:-50,textAnchor:"end",interval:2,tick:{fontSize:7,fill:DIM,fontFamily:"'DM Mono',monospace"}})}
                  {cProps.ya()}
                  <Tooltip content={<CT/>}/><ReferenceLine y={0} stroke="rgba(255,255,255,0.08)"/>
                  <Bar dataKey="pnl" name="P&L" radius={[3,3,0,0]}>{dailyPnl.map((_,i)=><Cell key={i} fill={dailyPnl[i].pnl>=0?G:R} fillOpacity={0.85}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <ST>Monthly P&L</ST>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyPnl} margin={{top:5,right:5,left:0,bottom:5}}>
                  {cProps.cg}{cProps.xa("month",{tick:{fontSize:9,fill:DIM,fontFamily:"'DM Mono',monospace"}})}{cProps.ya()}
                  <Tooltip content={<CT/>}/><ReferenceLine y={0} stroke="rgba(255,255,255,0.08)"/>
                  <Bar dataKey="pnl" name="P&L" radius={[5,5,0,0]}>{monthlyPnl.map((_,i)=><Cell key={i} fill={monthlyPnl[i].pnl>=0?G:R} fillOpacity={0.85}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
          </div>
        </div>}

        {/* ══ TIME & SESSION ══ */}
        {tab==="time"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {sessionStats.map(s=>{
              const c=s.wr>=0.6?G:s.wr>=0.4?GOLD:R;
              const icon=s.session==="Morning"?"🌅":s.session==="Midday"?"☀️":s.session==="Evening"?"🌆":"🌙";
              return (<div key={s.session} style={{...glass,flex:1,minWidth:150,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-20,right:-20,width:60,height:60,borderRadius:"50%",background:c,opacity:0.07,filter:"blur(16px)"}}/>
                <div style={{fontSize:10,color:DIM,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{icon} {s.session}</div>
                <div style={{fontSize:26,fontWeight:700,color:c,fontFamily:"'DM Mono',monospace",letterSpacing:"-0.02em"}}>{pct(s.wr)}</div>
                <div style={{fontSize:11,color:DIM,marginTop:4,fontFamily:"'DM Mono',monospace"}}>{s.total} trades · {fmt(s.pnl)}</div>
                <div style={{fontSize:11,color:DIM,marginTop:2,fontFamily:"'DM Mono',monospace"}}>↑{s.longs} Long · ↓{s.shorts} Short</div>
                <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",marginTop:10,overflow:"hidden"}}><div style={{height:"100%",width:pct(s.wr),background:c,borderRadius:2,boxShadow:`0 0 6px ${c}88`}}/></div>
              </div>);
            })}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Glass>
              <ST>P&L by Session</ST>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sessionStats} margin={{top:5,right:5,left:0,bottom:5}}>
                  {cProps.cg}{cProps.xa("session")}{cProps.ya()}
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="pnl" name="P&L" radius={[6,6,0,0]}>{sessionStats.map((_,i)=><Cell key={i} fill={sessionStats[i].pnl>=0?G:R} fillOpacity={0.85}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <ST>Win Rate by Entry Hour</ST>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourStats} margin={{top:5,right:5,left:0,bottom:16}}>
                  {cProps.cg}{cProps.xa("hour",{angle:-30,textAnchor:"end",tick:{fontSize:8,fill:DIM,fontFamily:"'DM Mono',monospace"}})}
                  {cProps.ya({tickFormatter:v=>pct(v),domain:[0,1]})}
                  <Tooltip formatter={v=>[pct(v),"Win Rate"]} contentStyle={{...glass,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
                  <Bar dataKey="wr" name="Win Rate" radius={[4,4,0,0]}>{hourStats.map((_,i)=><Cell key={i} fill={hourStats[i].wr>=0.7?G:hourStats[i].wr>=0.5?GOLD:R} fillOpacity={0.85}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
          </div>

          <Glass>
            <ST>Day of Week — Win Rate & Net P&L</ST>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={dowStats} margin={{top:5,right:45,left:0,bottom:5}}>
                {cProps.cg}{cProps.xa("day")}{cProps.ya({yAxisId:"pnl",tickFormatter:v=>fmt(v)})}
                {cProps.ya({yAxisId:"wr",orientation:"right",tickFormatter:v=>pct(v),domain:[0,1]})}
                <Tooltip content={<CT/>}/><ReferenceLine yAxisId="pnl" y={0} stroke="rgba(255,255,255,0.08)"/>
                <Bar yAxisId="pnl" dataKey="pnl" name="P&L" radius={[6,6,0,0]}>{dowStats.map((_,i)=><Cell key={i} fill={dowStats[i].pnl>=0?G:R} fillOpacity={0.55}/>)}</Bar>
                <Line yAxisId="wr" type="monotone" dataKey="wr" stroke={GOLD} strokeWidth={2} dot={{fill:GOLD,r:4,strokeWidth:0}} name="Win Rate"/>
              </ComposedChart>
            </ResponsiveContainer>
          </Glass>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Glass>
              <ST>Trade Count by Duration</ST>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={durationBuckets} margin={{top:5,right:5,left:0,bottom:5}}>
                  {cProps.cg}{cProps.xa("label")}{cProps.ya()}
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="count" name="Trades" fill={BL} fillOpacity={0.65} radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <ST>Win Rate by Duration</ST>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={durationBuckets} margin={{top:5,right:5,left:0,bottom:5}}>
                  {cProps.cg}{cProps.xa("label")}{cProps.ya({tickFormatter:v=>pct(v),domain:[0,1]})}
                  <Tooltip formatter={v=>[pct(v),"Win Rate"]} contentStyle={{...glass,fontSize:12}}/>
                  <Bar dataKey="wr" name="Win Rate" radius={[5,5,0,0]}>{durationBuckets.map((_,i)=><Cell key={i} fill={durationBuckets[i].wr>=0.6?G:durationBuckets[i].wr>=0.4?GOLD:R} fillOpacity={0.85}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
          </div>
        </div>}

        {/* ══ DEEP DIVE ══ */}
        {tab==="breakdown"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Glass>
            <ST>Extended Metrics</ST>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {label:"Gross Profit",   value:fmt(S.grossProfit),  color:G},
                {label:"Gross Loss",     value:fmt(-S.grossLoss),   color:R},
                {label:"Profit Factor",  value:S.profitFactor.toFixed(2)+"×", color:G},
                {label:"Expectancy",     value:fmt(Math.round(S.expectancy)), color:S.expectancy>=0?G:R},
                {label:"Avg Win",        value:fmt(Math.round(S.grossProfit/Math.max(S.wins.length,1))), color:G},
                {label:"Avg Loss",       value:fmt(Math.round(-S.grossLoss/Math.max(S.losses.length,1))), color:R},
                {label:"Best 10T WR",    value:pct(Math.max(...rollingWR.filter(r=>r.wr!==null).map(r=>r.wr),0)), color:G},
                {label:"Worst 10T WR",   value:pct(Math.min(...rollingWR.filter(r=>r.wr!==null).map(r=>r.wr),1)), color:R},
                {label:"Best Streak",    value:S.maxWS+" wins",   color:G},
                {label:"Worst Streak",   value:S.maxLS+" losses", color:R},
                {label:"Win Duration",   value:Math.round(S.winDuration)+"m",  color:G},
                {label:"Loss Duration",  value:Math.round(S.lossDuration)+"m", color:R},
                {label:"Long P&L",       value:fmt(S.longs.reduce((s,t)=>s+t.pnl,0)), color:BL},
                {label:"Short P&L",      value:fmt(S.shorts.reduce((s,t)=>s+t.pnl,0)), color:PU},
                {label:"RR ≥ 2 Trades",  value:`${trades.filter(t=>t.rr>=2).length} (${pct(trades.filter(t=>t.rr>=2).length/trades.length)})`, color:GOLD},
                {label:"Breakeven Trades",value:S.be.length+" ("+pct(S.be.length/trades.length)+")", color:GOLD},
              ].map(m=><div key={m.label} className="mbox">
                <div style={{fontSize:9,color:DIM,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4,fontFamily:"'DM Mono',monospace"}}>{m.label}</div>
                <div style={{fontSize:16,fontWeight:600,color:m.color,fontFamily:"'DM Mono',monospace"}}>{m.value}</div>
              </div>)}
            </div>
          </Glass>

          <Glass>
            <ST>RR Achieved vs P&L (Scatter)</ST>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{top:5,right:10,left:0,bottom:20}}>
                {cProps.cg}
                <XAxis dataKey="rr" name="RR" stroke="transparent" tick={{fontSize:10,fill:DIM,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false} label={{value:"RR Achieved",position:"insideBottom",fill:DIM,fontSize:10,dy:14}}/>
                <YAxis dataKey="pnl" name="P&L" stroke="transparent" tick={{fontSize:10,fill:DIM,fontFamily:"'DM Mono',monospace"}} axisLine={false} tickLine={false}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4"/>
                <Tooltip cursor={{stroke:"rgba(255,255,255,0.08)"}} contentStyle={{...glass,fontSize:12,fontFamily:"'DM Mono',monospace"}} formatter={(v,n)=>[fmt(v),n]}/>
                <Scatter data={rrScatter} name="Trades">
                  {rrScatter.map((_,i)=><Cell key={i} fill={rrScatter[i].pnl>0?G:rrScatter[i].pnl<0?R:GOLD} fillOpacity={0.75}/>)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Glass>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Glass>
              <ST>RR Distribution</ST>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  {range:"0R (SL)",count:trades.filter(t=>t.rr===0).length},
                  {range:"0–1R",  count:trades.filter(t=>t.rr>0&&t.rr<1).length},
                  {range:"1–2R",  count:trades.filter(t=>t.rr>=1&&t.rr<2).length},
                  {range:"2R",    count:trades.filter(t=>t.rr===2).length},
                  {range:">2R",   count:trades.filter(t=>t.rr>2).length},
                ]} margin={{top:5,right:5,left:0,bottom:5}}>
                  {cProps.cg}{cProps.xa("range",{tick:{fontSize:9,fill:DIM,fontFamily:"'DM Mono',monospace"}})}{cProps.ya()}
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="count" name="Trades" radius={[5,5,0,0]}>
                    {[R,R+"99",GOLD,G,G+"cc"].map((c,i)=><Cell key={i} fill={c} fillOpacity={0.85}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
            <Glass>
              <ST>Weekly Win Rate Trend</ST>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={weeklyPnl} margin={{top:5,right:45,left:0,bottom:14}}>
                  {cProps.cg}
                  {cProps.xa("week",{angle:-20,textAnchor:"end",tick:{fontSize:8,fill:DIM,fontFamily:"'DM Mono',monospace"}})}
                  {cProps.ya({yAxisId:"t"})}
                  {cProps.ya({yAxisId:"wr",orientation:"right",tickFormatter:v=>pct(v),domain:[0,1]})}
                  <Tooltip content={<CT/>}/>
                  <Bar yAxisId="t" dataKey="trades" name="Trades" fill={BL} fillOpacity={0.35} radius={[4,4,0,0]}/>
                  <Line yAxisId="wr" type="monotone" dataKey="wr" stroke={GOLD} strokeWidth={2} dot={{fill:GOLD,r:2,strokeWidth:0}} name="Win Rate"/>
                </ComposedChart>
              </ResponsiveContainer>
            </Glass>
          </div>
        </div>}

        {/* ══ TRADE LOG ══ */}
        {tab==="log"&&<Glass style={{padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
              <thead>
                <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                  {["#","Date","DOW","Entry","Exit","Dur","Dir","Session","P&L","RR","Chart"].map(h=>(
                    <th key={h} style={{padding:"12px 14px",textAlign:"left",color:DIM,fontWeight:400,letterSpacing:"0.1em",fontSize:10,whiteSpace:"nowrap",background:"rgba(0,0,0,0.4)"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((t,i)=>(
                  <tr key={i} className="tr-row" style={{borderBottom:"1px solid rgba(255,255,255,0.035)"}}>
                    <td style={{padding:"9px 14px",color:DIM}}>{i+1}</td>
                    <td style={{padding:"9px 14px",color:TEXT,whiteSpace:"nowrap"}}>{t.date}</td>
                    <td style={{padding:"9px 14px",color:DIM}}>{t.dow}</td>
                    <td style={{padding:"9px 14px",color:TEXT}}>{t.entry}</td>
                    <td style={{padding:"9px 14px",color:DIM}}>{t.exit}</td>
                    <td style={{padding:"9px 14px",color:DIM}}>{t.duration}m</td>
                    <td style={{padding:"9px 14px"}}><span className="pill" style={{background:t.dir==="Long"?"rgba(96,180,255,0.15)":"rgba(181,123,255,0.15)",color:t.dir==="Long"?BL:PU}}>{t.dir}</span></td>
                    <td style={{padding:"9px 14px",color:DIM,fontSize:10}}>{t.session}</td>
                    <td style={{padding:"9px 14px",fontWeight:600,color:t.pnl>0?G:t.pnl<0?R:GOLD}}>{fmt(t.pnl)}</td>
                    <td style={{padding:"9px 14px",color:t.rr>=2?G:t.rr>=1?GOLD:R}}>{t.rr}R</td>
                    <td style={{padding:"9px 14px"}}>
                      {t.img ? (
                        <button onClick={()=>setModal(t)} style={{background:"rgba(0,255,179,0.07)",border:"1px solid rgba(0,255,179,0.2)",borderRadius:6,color:G,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,padding:"4px 10px",letterSpacing:"0.06em"}}>📊 View</button>
                      ) : (
                        <span style={{color:DIM,fontSize:10}}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Glass>}

        {/* ══ TRADEBOOK ══ */}
        {tab==="tradebook"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{...glass,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:10,color:DIM,letterSpacing:"0.16em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{height:1,width:14,background:`linear-gradient(90deg,${G},transparent)`}}/>
                Yearly Overview
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setTbYear(y=>y-1)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:DIM,cursor:"pointer",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontFamily:"'DM Mono',monospace",transition:"all .15s"}}>‹</button>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:700,color:TEXT,minWidth:54,textAlign:"center"}}>{currentTbYear}</span>
                <button onClick={()=>setTbYear(y=>y+1)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:DIM,cursor:"pointer",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontFamily:"'DM Mono',monospace",transition:"all .15s"}}>›</button>
              </div>
            </div>
            <div style={{marginLeft:"auto"}}>
              <div style={{fontSize:10,color:DIM,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>Year Stats</div>
              <div style={{display:"flex",gap:20,fontFamily:"'DM Mono',monospace",fontSize:11}}>
                <div>
                  <span style={{color:DIM}}>Win Days: </span>
                  <span style={{color:G,fontWeight:700}}>{Object.entries(dayPnlMap).filter(([d,v])=>{const p=d.split("-");return +p[2]===currentTbYear&&v.pnl>0;}).length}</span>
                </div>
                <div>
                  <span style={{color:DIM}}>Loss Days: </span>
                  <span style={{color:R,fontWeight:700}}>{Object.entries(dayPnlMap).filter(([d,v])=>{const p=d.split("-");return +p[2]===currentTbYear&&v.pnl<0;}).length}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{...glass,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"flex-start",gap:16,alignItems:"center",fontFamily:"'DM Mono',monospace",fontSize:9,color:DIM,marginBottom:14,flexWrap:"wrap",paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:"rgba(0,255,179,1)",display:"inline-block"}}/>
                <span>Excellent Profit</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:"rgba(0,200,140,0.8)",display:"inline-block"}}/>
                <span>Good Profit</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:"rgba(255,208,96,0.8)",display:"inline-block"}}/>
                <span>Break Even</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:"rgba(255,100,100,0.7)",display:"inline-block"}}/>
                <span>Minor Loss</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:"rgba(255,20,20,1)",display:"inline-block"}}/>
                <span>Significant Loss</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:"rgba(255,255,255,0.12)",display:"inline-block"}}/>
                <span>No Trades</span>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Array.from({length:2},(_,ri)=>(
              <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(100px,1fr))",gap:8}}>
                {Array.from({length:6},(_,ci)=>{
                  const mi = ri*6 + ci;
                  const firstDay = new Date(currentTbYear,mi,1).getDay();
                  const daysInMonth = new Date(currentTbYear,mi+1,0).getDate();
                  const MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  const mTrades = Object.entries(dayPnlMap).filter(([d])=>{
                    const parts=d.split("-"); return +parts[2]===currentTbYear&&+parts[1]-1===mi;
                  });
                  const mPnl = mTrades.reduce((s,[,v])=>s+v.pnl,0);
                  const mWins = mTrades.filter(([,v])=>v.pnl>0).length;
                  const mLosses = mTrades.filter(([,v])=>v.pnl<0).length;
                  const mBE = mTrades.filter(([,v])=>v.pnl===0).length;
                  const hasTrades = mTrades.length>0;

                  const getPnlColor = (pnl,isLight=false) => {
                    if(!pnl) return isLight?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.09)";
                    const abs = Math.abs(pnl);
                    if(pnl>0){
                      if(abs>500) return isLight?"rgba(0,255,179,0.9)":"rgba(0,255,179,0.75)";
                      if(abs>200) return isLight?"rgba(0,220,160,0.8)":"rgba(0,200,140,0.65)";
                      return isLight?"rgba(0,200,140,0.7)":"rgba(0,180,120,0.55)";
                    }
                    if(abs>500) return isLight?"rgba(255,20,20,1)":"rgba(255,20,20,0.8)";
                    if(abs>200) return isLight?"rgba(255,100,100,0.8)":"rgba(255,80,80,0.7)";
                    return isLight?"rgba(255,150,150,0.7)":"rgba(255,120,120,0.6)";
                  };

                  return (
                    <div key={mi} style={{borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",padding:10,background:"rgba(255,255,255,0.02)"}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:8}}>
                        <span style={{fontSize:11,fontWeight:700,color:TEXT,fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>{MONTH_NAMES[mi]}</span>
                        {hasTrades&&<span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:mPnl>0?G:mPnl<0?R:GOLD,fontWeight:700}}>{fmt(mPnl)}</span>}
                      </div>
                      {hasTrades&&<div style={{display:"flex",gap:4,marginBottom:8,fontSize:8,fontFamily:"'DM Mono',monospace",color:DIM}}>
                        <span style={{color:G}}>W:{mWins}</span>
                        <span style={{color:R}}>L:{mLosses}</span>
                        <span style={{color:GOLD}}>BE:{mBE}</span>
                      </div>}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                        {["S","M","T","W","T","F","S"].map((d,i)=>(
                          <div key={i} style={{fontSize:7,color:"rgba(255,255,255,0.15)",textAlign:"center",fontFamily:"'DM Mono',monospace",paddingBottom:3,fontWeight:600}}>{d}</div>
                        ))}
                        {Array.from({length:firstDay},(_,i)=><div key={`e${i}`}/>)}
                        {Array.from({length:daysInMonth},(_,di)=>{
                          const d=di+1;
                          const dateStr=`${String(d).padStart(2,"0")}-${String(mi+1).padStart(2,"0")}-${currentTbYear}`;
                          const data=dayPnlMap[dateStr];
                          const isSelected=tbDay?.dateStr===dateStr;
                          const bg = getPnlColor(data?.pnl,false);
                          const glow=isSelected?`0 0 8px ${getPnlColor(data?.pnl,true)}99`:"none";
                          return (
                            <div
                              key={d}
                              className="day-cell"
                              title={data?`${dateStr}: ${fmt(data.pnl)} · ${data.trades.length} trade${data.trades.length>1?"s":""}`:dateStr}
                              onClick={()=>{ if(data) setTbDay(isSelected?null:{dateStr,data}); }}
                              style={{width:"100%",aspectRatio:"1",borderRadius:4,background:bg,cursor:data?"pointer":"default",border:isSelected?`2px solid rgba(0,255,179,0.6)`:data?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.04)",boxShadow:glow,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontFamily:"'DM Mono',monospace",color:data?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.3)",fontWeight:600}}>{d}</div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              ))}
            </div>
          </div>

          {tbDay&&<div style={{...glass,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontFamily:"'DM Mono',monospace"}}>
                <span style={{fontSize:10,color:DIM,letterSpacing:"0.14em",textTransform:"uppercase"}}>
                  <div style={{display:"inline-block",height:1,width:14,background:`linear-gradient(90deg,${G},transparent)`,marginRight:6,verticalAlign:"middle"}}/>
                  {tbDay.dateStr} • {getDow(tbDay.dateStr)}
                </span>
                <div style={{marginTop:10,display:"flex",gap:20,alignItems:"baseline"}}>
                  <div>
                    <span style={{fontSize:24,fontWeight:700,color:tbDay.data.pnl>0?G:tbDay.data.pnl<0?R:GOLD,fontFamily:"'DM Mono',monospace"}}>{fmt(tbDay.data.pnl)}</span>
                  </div>
                  <div style={{fontSize:12,color:DIM,display:"flex",gap:14}}>
                    <span>{tbDay.data.trades.length} trade{tbDay.data.trades.length>1?"s":""}</span>
                    <span>Win Rate: <span style={{color:G,fontWeight:600}}>{tbDay.data.trades.filter(t=>t.pnl>0).length}/{tbDay.data.trades.length}</span></span>
                  </div>
                </div>
              </div>
              <button onClick={()=>setTbDay(null)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:DIM,cursor:"pointer",fontSize:14,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {tbDay.data.trades.map((t,i)=>(
                <div key={i} onClick={()=>t.img&&setModal(t)} className="mbox" style={{flex:"1 1 240px",minWidth:220,cursor:t.img?"pointer":"default",borderColor:t.pnl>0?"rgba(0,255,179,0.2)":t.pnl<0?"rgba(255,61,90,0.2)":"rgba(255,208,96,0.2)",background:t.pnl>0?"rgba(0,255,179,0.04)":t.pnl<0?"rgba(255,61,90,0.04)":"rgba(255,208,96,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:DIM}}>{t.entry} → {t.exit} · {t.duration}m</span>
                    <span className="pill" style={{background:t.dir==="Long"?"rgba(96,180,255,0.15)":"rgba(181,123,255,0.15)",color:t.dir==="Long"?BL:PU}}>{t.dir}</span>
                  </div>
                  <div style={{display:"flex",gap:12,alignItems:"baseline",marginBottom:12}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:22,fontWeight:700,color:t.pnl>0?G:t.pnl<0?R:GOLD}}>{fmt(t.pnl)}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:t.rr>=2?G:t.rr>=1?GOLD:R,fontWeight:600}}>{t.rr}R</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:DIM,marginLeft:"auto"}}>{t.session}</span>
                  </div>
                  {t.img&&<div style={{marginTop:10,display:"flex",justifyContent:"center"}}>
                    <button onClick={()=>setModal(t)} style={{background:"rgba(0,255,179,0.08)",border:"1px solid rgba(0,255,179,0.25)",borderRadius:6,color:G,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10,padding:"6px 14px",letterSpacing:"0.06em",width:"100%",transition:"all .15s"}}>📊 View Chart</button>
                  </div>}
                </div>
              ))}
            </div>
          </div>}
        </div>}

        {/* ══ MONTE CARLO ══ */}
        {tab==="montecarlo"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Glass>
            <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10,color:DIM,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Simulations</div>
                <div style={{display:"flex",gap:6}}>
                  {[500,1000,2000].map(n=>(
                    <button key={n} onClick={()=>setMcNSims(n)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${mcNSims===n?"rgba(0,255,179,0.4)":"rgba(255,255,255,0.08)"}`,background:mcNSims===n?"rgba(0,255,179,0.1)":"rgba(255,255,255,0.03)",color:mcNSims===n?G:DIM,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,transition:"all .2s"}}>{n.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:DIM,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Forward Trades</div>
                <div style={{display:"flex",gap:6}}>
                  {[50,100,200,500].map(n=>(
                    <button key={n} onClick={()=>setMcNTrades(n)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${mcNTrades===n?"rgba(0,255,179,0.4)":"rgba(255,255,255,0.08)"}`,background:mcNTrades===n?"rgba(0,255,179,0.1)":"rgba(255,255,255,0.03)",color:mcNTrades===n?G:DIM,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,transition:"all .2s"}}>{n}</button>
                  ))}
                </div>
              </div>
              <div style={{marginLeft:"auto"}}>
                <button onClick={()=>setMcSeed(s=>s+1)} style={{padding:"8px 20px",borderRadius:10,border:`1px solid rgba(0,255,179,0.3)`,background:"rgba(0,255,179,0.08)",color:G,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:8,transition:"all .2s"}}>
                  🎲 Re-run Simulation
                </button>
              </div>
            </div>
          </Glass>

          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {label:"Prob. of Profit",  value:pct(mcResults.probProfit),  color:mcResults.probProfit>=0.6?G:mcResults.probProfit>=0.4?GOLD:R, sub:`after ${mcResults.T} trades`},
              {label:"Median Outcome",   value:fmt(Math.round(mcResults.medianFinal)), color:mcResults.medianFinal>=0?G:R, sub:"50th percentile"},
              {label:"Best Case (95th)", value:fmt(Math.round(mcResults.bestCase)),    color:G, sub:"top 5% of runs"},
              {label:"Worst Case (5th)", value:fmt(Math.round(mcResults.worstCase)),   color:R, sub:"bottom 5% of runs"},
              {label:"Median Max DD",    value:fmt(Math.round(mcResults.medianDD)),    color:R, sub:"typical drawdown"},
              {label:"Worst DD (99th)",  value:fmt(Math.round(mcResults.worstDD)),     color:R, sub:"tail risk drawdown"},
            ].map((c,i)=>(
              <div key={i} style={{...glass,flex:1,minWidth:130,padding:"18px 22px"}}>
                <div style={{fontSize:10,color:DIM,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{c.label}</div>
                <div style={{fontSize:28,fontWeight:700,color:c.color,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{c.value}</div>
                <div style={{fontSize:11,color:DIM,marginTop:6,fontFamily:"'DM Mono',monospace"}}>{c.sub}</div>
              </div>
            ))}
          </div>

          <Glass>
            <ST>Equity Curve Fan — {mcResults.N.toLocaleString()} Simulations over {mcResults.T} Trades</ST>
            <div style={{fontSize:11,color:DIM,marginBottom:12,fontFamily:"'DM Mono',monospace",display:"flex",gap:16,flexWrap:"wrap"}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:24,height:3,background:G,display:"inline-block",borderRadius:2}}/> Median (50th)</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:24,height:8,background:`${G}30`,display:"inline-block",borderRadius:2}}/> 25th–75th %ile</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:24,height:8,background:`${G}12`,display:"inline-block",borderRadius:2}}/> 5th–95th %ile</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mcResults.fanData} margin={{top:5,right:10,left:0,bottom:5}}>
                {cProps.cg}
                {cProps.xa("n",{label:{value:"Trade #",position:"insideBottom",fill:DIM,fontSize:10,dy:12}})}
                {cProps.ya({tickFormatter:v=>fmt(v)})}
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0]?.payload;
                  return <div style={{...glass,padding:"10px 14px",fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                    <div style={{color:DIM,marginBottom:6}}>Trade #{label}</div>
                    {[["95th",d?.p95,G],["75th",d?.p75,`${G}cc`],["50th (median)",d?.p50,G],["25th",d?.p25,GOLD],["5th",d?.p5,R]].map(([l,v,c])=>
                      <div key={l} style={{display:"flex",justifyContent:"space-between",gap:16,color:c,marginBottom:2}}>
                        <span style={{color:DIM}}>{l}</span><b>{v!=null?fmt(Math.round(v)):"-"}</b>
                      </div>
                    )}
                  </div>;
                }}/>
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4"/>
                <Line type="monotone" dataKey="p75" stroke={`${G}50`} strokeWidth={1} dot={false} strokeDasharray="3 2" name="75th %ile"/>
                <Line type="monotone" dataKey="p25" stroke={`${GOLD}60`} strokeWidth={1} dot={false} strokeDasharray="3 2" name="25th %ile"/>
                <Line type="monotone" dataKey="p50" stroke={G} strokeWidth={2.5} dot={false} name="Median"/>
              </LineChart>
            </ResponsiveContainer>
          </Glass>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Glass>
              <ST>Final Equity Distribution (after {mcResults.T} trades)</ST>
              <div style={{fontSize:11,color:DIM,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
                5th: <span style={{color:R}}>{fmt(Math.round(mcResults.p5Final))}</span>
                <span style={{margin:"0 8px",opacity:.4}}>·</span>
                Median: <span style={{color:G}}>{fmt(Math.round(mcResults.medianFinal))}</span>
                <span style={{margin:"0 8px",opacity:.4}}>·</span>
                95th: <span style={{color:G}}>{fmt(Math.round(mcResults.p95Final))}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mcResults.eHist} margin={{top:5,right:5,left:0,bottom:30}}>
                  {cProps.cg}
                  {cProps.xa("label",{angle:-40,textAnchor:"end",interval:4,tick:{fontSize:8,fill:DIM,fontFamily:"'DM Mono',monospace"}})}
                  {cProps.ya()}
                  <Tooltip formatter={(v,_,p)=>[v+" runs",fmt(Math.round(p.payload.mid))+" P&L"]} contentStyle={{...glass,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
                  <Bar dataKey="count" name="Runs" radius={[3,3,0,0]}>
                    {mcResults.eHist.map((d,i)=><Cell key={i} fill={d.mid>=0?G:R} fillOpacity={0.7+0.25*(d.count/Math.max(...mcResults.eHist.map(x=>x.count),1))}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>

            <Glass>
              <ST>Max Drawdown Distribution</ST>
              <div style={{fontSize:11,color:DIM,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
                Median: <span style={{color:GOLD}}>{fmt(Math.round(mcResults.medianDD))}</span>
                <span style={{margin:"0 8px",opacity:.4}}>·</span>
                95th: <span style={{color:R}}>{fmt(Math.round(mcResults.p95DD))}</span>
                <span style={{margin:"0 8px",opacity:.4}}>·</span>
                99th: <span style={{color:R}}>{fmt(Math.round(mcResults.worstDD))}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mcResults.ddHist} margin={{top:5,right:5,left:0,bottom:30}}>
                  {cProps.cg}
                  {cProps.xa("label",{angle:-40,textAnchor:"end",interval:2,tick:{fontSize:8,fill:DIM,fontFamily:"'DM Mono',monospace"}})}
                  {cProps.ya()}
                  <Tooltip formatter={(v,_,p)=>[v+" runs","Max DD: "+fmt(Math.round(p.payload.mid))]} contentStyle={{...glass,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
                  <Bar dataKey="count" name="Runs" radius={[3,3,0,0]}>
                    {mcResults.ddHist.map((d,i)=><Cell key={i} fill={R} fillOpacity={0.4+0.55*(d.count/Math.max(...mcResults.ddHist.map(x=>x.count),1))}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Glass>
          </div>

          <Glass>
            <ST>Scenario Analysis — Probability of Outcomes</ST>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
              <thead><tr>{["Scenario","Threshold","Probability","Assessment"].map(h=><th key={h} style={{padding:"6px 14px",textAlign:"left",color:DIM,fontWeight:400,fontSize:10,letterSpacing:"0.1em",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>)}</tr></thead>
              <tbody>
                {[
                  {scenario:"Profitable run",  thresh:`PnL > 0`,        prob:mcResults.probProfit, good:true},
                  {scenario:"Losing run",      thresh:`PnL < 0`,        prob:mcResults.probLoss,   good:false},
                  {scenario:"Doubles capital", thresh:`PnL > +${S.totalPnl.toLocaleString()}`, prob:mcResults.eHist.filter(b=>b.mid>S.totalPnl).reduce((s,b)=>s+b.count,0)/mcResults.N, good:true},
                  {scenario:"DD under 500",    thresh:`Max DD > -500`,  prob:mcResults.ddHist.filter(b=>b.mid<-500).reduce((s,b)=>s+b.count,0)/mcResults.N, good:false},
                  {scenario:"DD under 1000",   thresh:`Max DD > -1000`, prob:mcResults.ddHist.filter(b=>b.mid<-1000).reduce((s,b)=>s+b.count,0)/mcResults.N, good:false},
                  {scenario:"DD under 2000",   thresh:`Max DD > -2000`, prob:mcResults.ddHist.filter(b=>b.mid<-2000).reduce((s,b)=>s+b.count,0)/mcResults.N, good:false},
                ].map((row,i)=>{
                  const pv=isNaN(row.prob)?0:row.prob;
                  const c=row.good?(pv>=0.7?G:pv>=0.4?GOLD:R):(pv<=0.15?G:pv<=0.35?GOLD:R);
                  const label=pv>=0.8?"Very Likely":pv>=0.6?"Likely":pv>=0.4?"Moderate":pv>=0.2?"Unlikely":"Very Unlikely";
                  return (<tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <td style={{padding:"11px 14px",color:TEXT}}>{row.scenario}</td>
                    <td style={{padding:"11px 14px",color:DIM,fontSize:11}}>{row.thresh}</td>
                    <td style={{padding:"11px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{color:c,fontWeight:600,minWidth:42}}>{pct(pv)}</span>
                      <div style={{height:4,flex:1,borderRadius:2,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}><div style={{height:"100%",width:pct(pv),background:c,borderRadius:2,boxShadow:`0 0 6px ${c}88`}}/></div>
                    </div></td>
                    <td style={{padding:"11px 14px",color:c,fontSize:11}}>{label}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </Glass>
        </div>}

        {modal&&<ModalCard modal={modal} onClose={()=>setModal(null)}/>}

        <div style={{marginTop:28,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",fontSize:10,color:DIM,flexWrap:"wrap",gap:6,fontFamily:"'DM Mono',monospace"}}>
          <span>{trades.length} trades · {dateRange}</span>
          <span>
            Net <span style={{color:G,fontWeight:600}}>{fmt(S.totalPnl)}</span>
            <span style={{margin:"0 8px",opacity:.4}}>·</span>
            WR <span style={{color:GOLD}}>{pct(S.winRate)}</span>
            <span style={{margin:"0 8px",opacity:.4}}>·</span>
            PF <span style={{color:G}}>{S.profitFactor.toFixed(2)}×</span>
            <span style={{margin:"0 8px",opacity:.4}}>·</span>
            Exp <span style={{color:S.expectancy>=0?G:R}}>{fmt(Math.round(S.expectancy))}</span>/trade
          </span>
        </div>
      </div>
    </div>
  );
}
