
const e = React.createElement;
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function nextMonthKey(ym){ if(!ym) return ''; const [y,m]=ym.split('-').map(n=>parseInt(n,10)); const d = new Date(y, m-1, 1); d.setMonth(d.getMonth()+1); const ny=d.getFullYear(), nm=(d.getMonth()+1).toString().padStart(2,'0'); return ny+"-"+nm; }
function km(n){ const v=Number(n); return isFinite(v)?v:0; }
function calcTripKm(entry){ return Math.max(0, km(entry.toKm)-km(entry.fromKm)); }

function buildMonthRows(month,tankningar,tvattar){
  const selectedTank=tankningar.filter(t=>t.datum && t.datum.startsWith(month));
  const selectedTvatt=tvattar.filter(t=>t.datum && t.datum.startsWith(month));
  const rows=[];
  selectedTank.forEach(t=>rows.push({Typ:'Tankning',Datum:t.datum||'',Tid:t.tid||'',Plats:t.plats||'',Liter:t.liter||'', 'Mätarställning':t.matning||'', 'Tvätt':''}));
  selectedTvatt.forEach(v=>rows.push({Typ:'Tvätt',Datum:v.datum||'',Tid:v.tid||'',Plats:'',Liter:'', 'Mätarställning':'', 'Tvätt':'Ja'}));
  return rows;
}
function exportMonthToExcel(month,tankningar,tvattar){
  if(!month){ alert('Välj månad först'); return; }
  const rows=buildMonthRows(month,tankningar,tvattar);
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Export'); XLSX.writeFile(wb,'export_'+month+'.xlsx');
}
async function mailMonthExcel(month,tankningar,tvattar){
  if(!month){ alert('Välj månad först'); return; }
  const rows=buildMonthRows(month,tankningar,tvattar);
  const ws=XLSX.utils.json_to_sheet(rows);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Export');
  const u8 = XLSX.write(wb,{bookType:'xlsx',type:'array'}); const blob = new Blob([u8],{type:MIME_XLSX}); const file = new File([blob],'export_'+month+'.xlsx',{type:MIME_XLSX});
  if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){ try{ await navigator.share({title:'Tankning & Tvätt', text:'Export '+month, files:[file]}); return; }catch(e){} }
  XLSX.writeFile(wb,'export_'+month+'.xlsx'); alert('Kopian sparades lokalt.');
}

function buildJournalSummaryForMonth(month, journal, monthMeta){
  const trips = journal.filter(j=>j.datum && j.datum.startsWith(month));
  const tjansteMil = trips.reduce((s,j)=> s + calcTripKm(j), 0);
  const meta = monthMeta[month] || {}; const kmIn = meta.kmIn; const kmOut = meta.kmOut;
  const totalOdo = (kmOut!=null && kmIn!=null) ? Math.max(0, km(kmOut)-km(kmIn)) : null;
  const privataMil = (totalOdo!=null) ? Math.max(0, totalOdo - tjansteMil) : null;
  return { trips, tjansteMil, kmIn, kmOut, totalOdo, privataMil };
}
function exportJournalMonthExcel(month, journal, monthMeta){
  if(!month){ alert('Välj månad för journalen'); return; }
  const { trips, tjansteMil, kmIn, kmOut, totalOdo, privataMil } = buildJournalSummaryForMonth(month, journal, monthMeta);
  const rows = trips.map(t=>({ Datum:t.datum||'', Tid:t.tid||'', 'Från km':t.fromKm||'', 'Till km':t.toKm||'', 'Körda km':calcTripKm(t), 'Ärende/Kund':t.arende||'' }));
  rows.push({}); rows.push({'Sammanfattning':'Km in',Värde:kmIn!=null?kmIn:''}); rows.push({'Sammanfattning':'Km ut',Värde:kmOut!=null?kmOut:''}); rows.push({'Sammanfattning':'Tjänstemil',Värde:tjansteMil}); rows.push({'Sammanfattning':'Totalt (km ut - km in)',Värde:totalOdo!=null?totalOdo:''}); rows.push({'Sammanfattning':'Privata mil',Värde:privataMil!=null?privataMil:''});
  const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Körjournal '+month); XLSX.writeFile(wb, 'korjournal_'+month+'.xlsx');
}
async function mailJournalMonthExcel(month, journal, monthMeta){
  if(!month){ alert('Välj månad för journalen'); return; }
  const { trips, tjansteMil, kmIn, kmOut, totalOdo, privataMil } = buildJournalSummaryForMonth(month, journal, monthMeta);
  const rows = trips.map(t=>({Datum:t.datum||'',Tid:t.tid||'','Från km':t.fromKm||'','Till km':t.toKm||'','Körda km':calcTripKm(t),'Ärende/Kund':t.arende||''}));
  rows.push({}); rows.push({'Sammanfattning':'Km in',Värde:kmIn!=null?kmIn:''}); rows.push({'Sammanfattning':'Km ut',Värde:kmOut!=null?kmOut:''}); rows.push({'Sammanfattning':'Tjänstemil',Värde:tjansteMil}); rows.push({'Sammanfattning':'Totalt (km ut - km in)',Värde:totalOdo!=null?totalOdo:''}); rows.push({'Sammanfattning':'Privata mil',Värde:privataMil!=null?privataMil:''});
  const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Körjournal '+month);
  const u8 = XLSX.write(wb,{bookType:'xlsx',type:'array'}); const blob = new Blob([u8],{type:MIME_XLSX}); const file = new File([blob], 'korjournal_'+month+'.xlsx',{type:MIME_XLSX});
  if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){ try{ await navigator.share({title:'Körjournal', text:'Körjournal '+month, files:[file]}); return; }catch(e){} }
  XLSX.writeFile(wb,'korjournal_'+month+'.xlsx'); alert('Journalen sparades lokalt.');
}

function Label(text){ return e('label',{style:{fontSize:'16px',fontWeight:'bold',marginTop:'12px',display:'block'}},text); }

function App(){
  const [tankningar,setTank]=React.useState(JSON.parse(localStorage.getItem('tankningar')||'[]'));
  const [tvattar,setTvatt]=React.useState(JSON.parse(localStorage.getItem('tvattar')||'[]'));
  const [tf,setTF]=React.useState({datum:'',tid:'',plats:'',liter:'',matning:''});
  const [vf,setVF]=React.useState({datum:'',tid:''});

  const [journal,setJournal]=React.useState(JSON.parse(localStorage.getItem('journal')||'[]'));
  const [monthMeta,setMonthMeta]=React.useState(JSON.parse(localStorage.getItem('monthMeta')||'{}'));

  const [month,setMonth]=React.useState('');
  const [jMonth,setJMonth]=React.useState('');
  const [jForm,setJForm]=React.useState({datum:'',tid:'',fromKm:'',toKm:'',arende:''});
  const [kmInInput,setKmInInput]=React.useState('');
  const [kmOutInput,setKmOutInput]=React.useState('');

  React.useEffect(()=>localStorage.setItem('tankningar',JSON.stringify(tankningar)),[tankningar]);
  React.useEffect(()=>localStorage.setItem('tvattar',JSON.stringify(tvattar)),[tvattar]);
  React.useEffect(()=>localStorage.setItem('journal',JSON.stringify(journal)),[journal]);
  React.useEffect(()=>localStorage.setItem('monthMeta',JSON.stringify(monthMeta)),[monthMeta]);

  React.useEffect(()=>{ if('serviceWorker' in navigator){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('./service-worker.js').catch(console.warn); }); } },[]);

  function addT(){ if(!tf.datum||!tf.liter||!tf.matning) return; setTank([...tankningar,tf]); setTF({datum:'',tid:'',plats:'',liter:'',matning:''}); }
  function addV(){ if(!vf.datum) return; setTvatt([...tvattar,vf]); setVF({datum:'',tid:''}); }
  function addTrip(){ if(!jForm.datum || jForm.fromKm==='' || jForm.toKm===''){ alert('Fyll datum, från km och till km'); return; } if(km(jForm.toKm) < km(jForm.fromKm)){ alert('Till km måste vara >= Från km'); return; } setJournal([...journal, {...jForm, fromKm: km(jForm.fromKm), toKm: km(jForm.toKm)}]); setJForm({datum:'',tid:'',fromKm:'',toKm:'',arende:''}); }
  function saveMonthOdo(){ if(!jMonth){ alert('Välj månad'); return; } const meta = {...monthMeta}; const cur = meta[jMonth] || {}; const newKmIn = kmInInput!==''? km(kmInInput) : cur.kmIn; const newKmOut = kmOutInput!==''? km(kmOutInput) : cur.kmOut; meta[jMonth] = { kmIn: newKmIn, kmOut: newKmOut }; if(newKmOut!=null){ const nx = nextMonthKey(jMonth); if(nx){ const nxMeta = meta[nx]||{}; nxMeta.kmIn = newKmOut; meta[nx]=nxMeta; } } setMonthMeta(meta); setKmInInput(''); setKmOutInput(''); }

  const jSummary = jMonth ? buildJournalSummaryForMonth(jMonth, journal, monthMeta) : null;

  return e('div',{style:{padding:'20px',maxWidth:'720px',margin:'auto'}},[
    e('h1',{style:{fontSize:'26px',marginBottom:'20px'}},'Tankning & Tvätt'),

    /* Körjournal – flyttad överst */
    e('h2',{style:{marginTop:'4px'}},'Körjournal'),
    Label('Välj månad (för summering & export)'), e('select',{value:jMonth,onChange:e=>setJMonth(e.target.value)},[
      e('option',{value:''},'Välj månad...'), ...['01','02','03','04','05','06','07','08','09','10','11','12'].map(m=>e('option',{value:'2026-'+m},'2026-'+m))
    ]),
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'10px'}},[
      e('div',null,[ Label('Km in (månadens start)'), e('input',{type:'number',value:kmInInput,onChange:e=>setKmInInput(e.target.value)}) ]),
      e('div',null,[ Label('Km ut (månadens slut)'), e('input',{type:'number',value:kmOutInput,onChange:e=>setKmOutInput(e.target.value)}) ])
    ]),
    e('button',{onClick:saveMonthOdo,style:{marginTop:'10px',padding:'12px',background:'#22c55e',borderRadius:'8px'}},'Spara månadens mätarställning (för över Km ut → nästa månads Km in)'),
    e('h3',{style:{marginTop:'16px'}},'Lägg till resa'),
    Label('Datum'), e('input',{type:'date',value:jForm.datum,onChange:e=>setJForm({...jForm,datum:e.target.value})}),
    Label('Tid (valfritt)'), e('input',{type:'time',value:jForm.tid,onChange:e=>setJForm({...jForm,tid:e.target.value})}),
    Label('Från km'), e('input',{type:'number',value:jForm.fromKm,onChange:e=>setJForm({...jForm,fromKm:e.target.value})}),
    Label('Till km'), e('input',{type:'number',value:jForm.toKm,onChange:e=>setJForm({...jForm,toKm:e.target.value})}),
    Label('Ärende/Kund'), e('input',{value:jForm.arende,onChange:e=>setJForm({...jForm,arende:e.target.value})}),
    e('button',{onClick:addTrip,style:{marginTop:'10px',padding:'12px',background:'#2563eb',borderRadius:'8px'}},'Spara resa'),
    jSummary ? e('div',{style:{marginTop:'16px',padding:'12px',background:'#111827',borderRadius:'8px'}},[
      e('div',null,[ e('strong',null,'Km in: '), e('span',null, jSummary.kmIn!=null? jSummary.kmIn+'' : '—') ]),
      e('div',null,[ e('strong',null,'Km ut: '), e('span',null, jSummary.kmOut!=null? jSummary.kmOut+'' : '—') ]),
      e('div',null,[ e('strong',null,'Tjänstemil: '), e('span',null, jSummary.tjansteMil+'' ) ]),
      e('div',null,[ e('strong',null,'Totalt (km ut - km in): '), e('span',null, jSummary.totalOdo!=null? jSummary.totalOdo+'' : '—') ]),
      e('div',null,[ e('strong',null,'Privata mil: '), e('span',null, jSummary.privataMil!=null? jSummary.privataMil+'' : '—') ]),
      e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'10px'}},[
        e('button',{onClick:()=>exportJournalMonthExcel(jMonth, journal, monthMeta),style:{padding:'12px',background:'#3b82f6',borderRadius:'8px'}},'Exportera körjournal (Excel)'),
        e('button',{onClick:()=>mailJournalMonthExcel(jMonth, journal, monthMeta),style:{padding:'12px',background:'#0ea5e9',borderRadius:'8px'}},'Maila körjournal')
      ])
    ]) : null,

    /* Tankning */
    e('h2',{style:{marginTop:'28px'}},'Tankning'),
    Label('Datum'), e('input',{type:'date',value:tf.datum,onChange:e=>setTF({...tf,datum:e.target.value})}),
    Label('Tid'), e('input',{type:'time',value:tf.tid,onChange:e=>setTF({...tf,tid:e.target.value})}),
    Label('Plats'), e('input',{value:tf.plats,onChange:e=>setTF({...tf,plats:e.target.value})}),
    Label('Antal liter'), e('input',{type:'number',value:tf.liter,onChange:e=>setTF({...tf,liter:e.target.value})}),
    Label('Mätarställning'), e('input',{type:'number',value:tf.matning,onChange:e=>setTF({...tf,matning:e.target.value})}),
    e('button',{onClick:addT,style:{marginTop:'10px',padding:'12px',background:'#2563eb',borderRadius:'8px'}},'Spara tankning'),

    /* Tvätt */
    e('h2',{style:{marginTop:'24px'}},'Tvätt'),
    Label('Datum'), e('input',{type:'date',value:vf.datum,onChange:e=>setVF({...vf,datum:e.target.value})}),
    Label('Tid'), e('input',{type:'time',value:vf.tid,onChange:e=>setVF({...vf,tid:e.target.value})}),
    e('button',{onClick:addV,style:{marginTop:'10px',padding:'12px',background:'#16a34a',borderRadius:'8px'}},'Spara tvätt'),

    /* Export Tankning/Tvätt */
    e('h2',{style:{marginTop:'24px'}},'Exportera / Maila kopia (Tankning & Tvätt)'),
    Label('Välj månad'), e('select',{value:month,onChange:e=>setMonth(e.target.value)},[
      e('option',{value:''},'Välj månad...'), ...['01','02','03','04','05','06','07','08','09','10','11','12'].map(m=>e('option',{value:'2026-'+m},'2026-'+m))
    ]),
    e('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'10px'}},[
      e('button',{onClick:()=>exportMonthToExcel(month,tankningar,tvattar),style:{padding:'12px',background:'#3b82f6',borderRadius:'8px'}},'Exportera Excel'),
      e('button',{onClick:()=>mailMonthExcel(month,tankningar,tvattar),style:{padding:'12px',background:'#0ea5e9',borderRadius:'8px'}},'Maila kopia')
    ])
  ]);
}

ReactDOM.render(e(App), document.getElementById('root'));
