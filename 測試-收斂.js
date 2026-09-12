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

function trial(monthKey, off, n){
  P.setMonth(monthKey);
  const res=[];
  let t0=Date.now();
  for(let i=0;i<n;i++){
    const m=P.M(); m.off=JSON.parse(JSON.stringify(off)); m.assign={}; m.locks={}; m.seed=0;
    const rep=P.runSchedule(true);
    const st=P.computeStats();
    res.push({mc:rep.morningCost, ec:rep.eveningCost,
      gm:Math.abs(st.a.h-st.b.h), ge:Math.abs(st.c.h-st.d.h),
      hm:Math.abs(st.a.holi-st.b.holi), he:Math.abs(st.c.holi-st.d.holi),
      run:Math.max(st.a.maxRun,st.b.maxRun,st.c.maxRun,st.d.maxRun),
      broke:['a','b','c','d'].reduce((s,k)=>s+st[k].offBroke.length,0)});
  }
  const ms=(Date.now()-t0)/n;
  const f=k=>res.map(r=>r[k]);
  const uniq=a=>[...new Set(a)].sort((x,y)=>x-y);
  console.log('\n【'+monthKey+'】'+n+' 次，平均 '+ms.toFixed(0)+' ms/次');
  console.log('  早班成本 '+uniq(f('mc')).join(' / ')+'   晚班成本 '+uniq(f('ec')).join(' / '));
  console.log('  早班時數差 '+uniq(f('gm')).join(' / ')+' h   晚班時數差 '+uniq(f('ge')).join(' / ')+' h');
  console.log('  六日差 早'+uniq(f('hm')).join('/')+' 晚'+uniq(f('he')).join('/')+'   最長連上 '+uniq(f('run')).join('/')+' 天   踩指休 '+uniq(f('broke')).join('/'));
}

const off1={a:['2026-10-05','2026-10-06','2026-10-07'],b:['2026-10-20','2026-10-21','2026-10-25'],c:['2026-10-10'],d:['2026-10-11','2026-10-12','2026-10-13']};
trial('2026-10',off1,40);
trial('2026-10',{a:[],b:[],c:[],d:[]},40);
trial('2026-11',{a:['2026-11-03'],b:['2026-11-15','2026-11-16'],c:[],d:['2026-11-01']},40);
trial('2027-02',{a:[],b:[],c:[],d:[]},40);
