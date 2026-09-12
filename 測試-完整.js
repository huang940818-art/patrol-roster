const fs=require('fs');
const code=fs.readFileSync('/Users/lily/專案/巡場排班/index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
function fakeEl(){const e={style:{},dataset:{},classList:{add(){},remove(){},contains(){return false}},children:[],appendChild(c){this.children.push(c);return c},removeChild(){},remove(){},setAttribute(){},addEventListener(){},click(){},querySelectorAll(){return[]},get innerHTML(){return''},set innerHTML(v){this.children=[]},textContent:'',value:'',title:'',hidden:false,type:'',placeholder:'',inputMode:'',href:'',download:'',className:''};return e;}
const store={};global.window={};global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v};
global.navigator={};global.confirm=()=>true;
global.document={getElementById:()=>fakeEl(),createElement:()=>fakeEl(),createTextNode:()=>fakeEl(),querySelectorAll:()=>[],body:fakeEl()};
global.setTimeout=()=>0;global.clearTimeout=()=>{};global.Blob=function(){};global.URL={createObjectURL:()=>'',revokeObjectURL:()=>{}};
new Function(code)();
const P=window.__patrol,DB=P.DB();
DB.people=[{id:'a',name:'阿美',shift:'morning'},{id:'b',name:'小春',shift:'morning'},{id:'c',name:'阿明',shift:'evening'},{id:'d',name:'阿華',shift:'evening'}];
let fails=[];
function chk(cond,msg){ if(!cond) fails.push(msg); }

// ---- A. 換一種排法會不會真的換 ----
P.setMonth('2026-10');
const seen=new Set();
for(let i=0;i<12;i++){
  const m=P.M(); m.off={a:[],b:[],c:[],d:[]}; m.assign={}; m.locks={}; m.seed=0;
  P.runSchedule(true);
  seen.add(P.monthDays('2026-10').map(d=>(m.assign[d.date].morning||'-')+(m.assign[d.date].evening||'-')).join(''));
}
console.log('A. 12 次重排 → '+seen.size+' 種不同班表');
chk(seen.size>=8,'重排出來的班表太少變化');

// ---- B. 鎖定會不會被自動排班蓋掉 ----
{
  const m=P.M(); m.off={a:[],b:[],c:[],d:[]}; m.assign={}; m.locks={}; m.seed=0;
  P.runSchedule(true);
  m.locks['2026-10-09|morning']='a'; m.assign['2026-10-09'].morning='a';
  m.locks['2026-10-14|evening']='d'; m.assign['2026-10-14'].evening='d';
  P.runSchedule(true);
  console.log('B. 鎖定後重排：10/9 早='+m.assign['2026-10-09'].morning+'（要 a）, 10/14 晚='+m.assign['2026-10-14'].evening+'（要 d）');
  chk(m.assign['2026-10-09'].morning==='a','鎖定的早班被蓋掉');
  chk(m.assign['2026-10-14'].evening==='d','鎖定的晚班被蓋掉');
}

// ---- C. 天窗：同班別兩人同一天都休 ----
{
  const m=P.M(); m.off={a:['2026-10-04','2026-10-11'],b:['2026-10-04','2026-10-11'],c:[],d:[]}; m.assign={}; m.locks={}; m.seed=0;
  P.runSchedule(true);
  const hole1=!m.assign['2026-10-04'].morning, hole2=!m.assign['2026-10-11'].morning;
  const eveOk=!!m.assign['2026-10-04'].evening;
  console.log('C. 撞班的 10/4、10/11 早班留空 = '+hole1+' / '+hole2+'；同日晚班照排 = '+eveOk);
  chk(hole1&&hole2,'天窗沒有留空，被硬塞人');
  chk(eveOk,'天窗波及到不相干的晚班');
}

// ---- D. 一個班別只剩一個人 ----
{
  DB.people=[{id:'a',name:'阿美',shift:'morning'},{id:'c',name:'阿明',shift:'evening'},{id:'d',name:'阿華',shift:'evening'}];
  const m=P.M(); m.off={a:['2026-10-08'],c:[],d:[]}; m.assign={}; m.locks={}; m.seed=0;
  P.runSchedule(true);
  const st=P.computeStats();
  console.log('D. 早班只剩阿美：上 '+st.a.d+' 天（該 30）、連上 '+st.a.maxRun+' 天、10/8 早班='+(m.assign['2026-10-08'].morning||'空'));
  chk(st.a.d===30,'單人班別天數不對');
  chk(!m.assign['2026-10-08'].morning,'單人班別的指休被踩');
  DB.people=[{id:'a',name:'阿美',shift:'morning'},{id:'b',name:'小春',shift:'morning'},{id:'c',name:'阿明',shift:'evening'},{id:'d',name:'阿華',shift:'evening'}];
}

// ---- E. 三個人跑早班（人數不是 2 也要能跑） ----
{
  DB.people=[{id:'a',name:'A',shift:'morning'},{id:'b',name:'B',shift:'morning'},{id:'e',name:'E',shift:'morning'},{id:'c',name:'C',shift:'evening'},{id:'d',name:'D',shift:'evening'}];
  const m=P.M(); m.off={a:[],b:[],e:[],c:[],d:[]}; m.assign={}; m.locks={}; m.seed=0;
  P.runSchedule(true);
  const st=P.computeStats();
  const hs=[st.a.h,st.b.h,st.e.h];
  console.log('E. 三人跑早班：時數 '+hs.join(' / ')+'（差 '+(Math.max(...hs)-Math.min(...hs)).toFixed(1)+'h）');
  chk(st.a.d+st.b.d+st.e.d===31,'三人早班天數總和不是 31');
  DB.people=[{id:'a',name:'阿美',shift:'morning'},{id:'b',name:'小春',shift:'morning'},{id:'c',name:'阿明',shift:'evening'},{id:'d',name:'阿華',shift:'evening'}];
}

// ---- F. 全年 12 個月連跑，檢查硬性條件 ----
console.log('F. 全年 12 個月 × 每月 5 次：');
let worstRun=0, worstWeek=0, badMonths=[];
for(let mo=1;mo<=12;mo++){
  const key='2027-'+String(mo).padStart(2,'0');
  P.setMonth(key);
  for(let t=0;t<5;t++){
    const days=P.monthDays(key);
    const off={a:[],b:[],c:[],d:[]};
    ['a','b','c','d'].forEach(pid=>{ for(let i=0;i<3;i++){ const d=days[Math.floor(Math.random()*days.length)].date; if(off[pid].indexOf(d)<0) off[pid].push(d); } });
    const m=P.M(); m.off=off; m.assign={}; m.locks={}; m.seed=0;
    P.runSchedule(true);
    const st=P.computeStats();
    ['a','b','c','d'].forEach(pid=>{
      if(st[pid].offBroke.length) badMonths.push(key+' 踩指休');
      worstRun=Math.max(worstRun,st[pid].maxRun); worstWeek=Math.max(worstWeek,st[pid].maxWeek);
      if(st[pid].maxRun>6) badMonths.push(key+' 連上'+st[pid].maxRun+'天');
      if(st[pid].maxWeek>5) badMonths.push(key+' 單週'+st[pid].maxWeek+'天');
    });
    days.forEach(d=>{
      ['morning','evening'].forEach(sk=>{
        if(!m.assign[d.date][sk]){
          const can=P.poolOf(sk).filter(p=>(off[p.id]||[]).indexOf(d.date)<0);
          if(can.length) badMonths.push(key+' '+d.date+' 空班但有人能上');
        }
      });
    });
  }
}
console.log('   最長連上 '+worstRun+' 天（上限 6）、最長單週 '+worstWeek+' 天（上限 5）；問題 '+badMonths.length+' 件 '+(badMonths.length?badMonths.slice(0,5).join(', '):''));
chk(worstRun<=6,'有人連上超過 6 天');
chk(badMonths.length===0,'全年測試有問題');

// ---- G. 連續兩個月排，跨月那一週有沒有守住 ----
{
  DB.people=[{id:'a',name:'阿美',shift:'morning'},{id:'b',name:'小春',shift:'morning'},{id:'c',name:'阿明',shift:'evening'},{id:'d',name:'阿華',shift:'evening'}];
  let cross=[];
  for(let t=0;t<20;t++){
    ['2026-10','2026-11','2026-12'].forEach(k=>{ P.setMonth(k); const m=P.M(); m.off={a:[],b:[],c:[],d:[]}; m.assign={}; m.locks={}; m.seed=0; P.runSchedule(true); });
    // 自己從三個月合起來的資料重算跨月那幾週
    const all={};
    ['2026-10','2026-11','2026-12'].forEach(k=>{ const m=DB.months[k]; Object.keys(m.assign).forEach(d=>{ all[d]=m.assign[d]; }); });
    const wc={};
    Object.keys(all).sort().forEach(d=>{
      const q=d.split('-').map(Number); const dt=new Date(q[0],q[1]-1,q[2]);
      const mon=new Date(dt); mon.setDate(dt.getDate()-(dt.getDay()===0?6:dt.getDay()-1));
      const wk=mon.getFullYear()+'-'+String(mon.getMonth()+1).padStart(2,'0')+'-'+String(mon.getDate()).padStart(2,'0');
      ['morning','evening'].forEach(sk=>{ const pid=all[d][sk]; if(!pid) return; wc[wk]=wc[wk]||{}; wc[wk][pid]=(wc[wk][pid]||0)+1; });
    });
    // 只檢查七天都齊的整週
    Object.keys(wc).forEach(wk=>{
      let n=0; for(let i=0;i<7;i++){ const q=wk.split('-').map(Number); const d=new Date(q[0],q[1]-1,q[2]+i);
        const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); if(all[key]) n++; }
      if(n<7) return;
      Object.keys(wc[wk]).forEach(pid=>{ if(wc[wk][pid]>5) cross.push(wk+' '+pid+' '+wc[wk][pid]+'天'); });
    });
  }
  console.log('G. 連排 10/11/12 三個月 × 20 次，跨月整週超過 5 天的情形：'+(cross.length?cross.slice(0,6).join(', '):'0 件'));
  chk(cross.length===0,'跨月那一週超過 5 天');
}

console.log('\n'+(fails.length? '✕ 失敗：\n  '+fails.join('\n  ') : '✓ 全部通過'));
