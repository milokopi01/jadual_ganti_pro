(function(root){
'use strict';
function schoolWeek(days=[],mode='auto'){
 if(mode==='sunday') return {startDay:0,label:'Ahad–Khamis'};
 if(mode==='monday') return {startDay:1,label:'Isnin–Jumaat'};
 const names=days.map(d=>String(d).trim().toUpperCase());
 const sunday=names.includes('AHAD'), friday=names.includes('JUMAAT');
 if(sunday&&!friday) return {startDay:0,label:'Ahad–Khamis'};
 if(friday&&!sunday) return {startDay:1,label:'Isnin–Jumaat'};
 return null;
}
function weekStart(date,startDay=1){
 const d=new Date(date+'T00:00:00Z');
 d.setUTCDate(d.getUTCDate()-((d.getUTCDay()-startDay+7)%7));
 return d.toISOString().slice(0,10);
}
function weeklyCounts(records,date,startDay=1){
 const start=weekStart(date,startDay), counts={};
 // Today's saved rows are replaced by the current allocation, never counted twice.
 records.filter(r=>r.tarikh>=start&&r.tarikh<date&&r.pengganti).forEach(r=>counts[r.pengganti]=(counts[r.pengganti]||0)+1);
 return counts;
}
function candidates(ctx,row,rows,ignore=-1){
 const {data,day,absent,frozen,emergency,status={},weekly={}}=ctx;
 const periods=data.waktu[day]||[], assigned=rows.filter((r,i)=>i!==ignore&&r.pengganti);
 const loads=Object.fromEntries(data.guru.map(g=>[g.singkat,new Set(data.kelas.filter(k=>k.hari===day&&k.guru===g.singkat).map(k=>k.waktu)).size]));
 const max=Math.max(0,...Object.values(loads));
 const counts={}; assigned.forEach(r=>counts[r.pengganti]=(counts[r.pengganti]||0)+1);
 const available=(g,w)=>periods.includes(w)&&(data.free[day+'|'+w]||[]).includes(g)&&
  !data.kelas.some(k=>k.hari===day&&k.waktu===w&&k.guru===g)&&
  !(status[g]?.blocked||[]).includes(w)&&!absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir')&&
  !assigned.some(r=>r.waktu===w&&r.pengganti===g);
 const base=data.guru.map(g=>g.singkat).filter(g=>!absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir')&&loads[g]<max);
 const qualified=base.filter(g=>available(g,row.waktu)&&(available(g,row.waktu-1)||available(g,row.waktu+1)));
 const rank=g=>available(g,row.waktu-1)&&available(g,row.waktu+1)?0:available(g,row.waktu+1)?1:2;
 const sort=list=>list.sort((a,b)=>rank(a)-rank(b)||(weekly[a]||0)+(counts[a]||0)-(weekly[b]||0)-(counts[b]||0)||loads[a]-loads[b]||a.localeCompare(b));
 // A frozen teacher is never a normal candidate. Emergency still obeys every hard filter.
 const normal=qualified.filter(g=>!frozen.includes(g));
 const zero=normal.filter(g=>!counts[g]);
 if(zero.length) return sort(zero);
 const reserve=emergency?qualified.filter(g=>frozen.includes(g)&&!counts[g]):[];
 if(reserve.length) return sort(reserve);
 // A second slot is forbidden while ANY other eligible, present teacher has zero relief.
 const capPool=base.filter(g=>(!frozen.includes(g)||emergency)&&periods.some(w=>available(g,w)&&(available(g,w-1)||available(g,w+1))));
 if(capPool.some(g=>!counts[g])) return [];
 if(normal.length) return sort(normal);
 return emergency?sort(qualified.filter(g=>frozen.includes(g))):[];
}
function manualCandidates(ctx,row,rows,ignore=-1){
 const {data,day,absent=[],status={}}=ctx;
 return data.guru.map(g=>g.singkat).filter(g=>
  (data.waktu[day]||[]).includes(row.waktu)&&
  (data.free[day+'|'+row.waktu]||[]).includes(g)&&
  !data.kelas.some(k=>k.hari===day&&k.waktu===row.waktu&&k.guru===g)&&
  !absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir')&&
  !(status[g]?.blocked||[]).includes(row.waktu)&&
  !rows.some((r,i)=>i!==ignore&&r.waktu===row.waktu&&r.pengganti===g)
 ).sort((a,b)=>a.localeCompare(b));
}
function assign(ctx,rows){
 const result=rows.map(r=>({...r,pengganti:''}));
 // Repeat to reconsider an earlier unfilled slot after all teachers reach their first relief.
 for(let pass=0;pass<result.length;pass++){
  let changed=false;
  const pending=result.map((r,i)=>({r,i})).filter(x=>!x.r.pengganti)
   .sort((a,b)=>candidates(ctx,a.r,result).length-candidates(ctx,b.r,result).length||a.r.waktu-b.r.waktu);
  for(const {r} of pending){const list=candidates(ctx,r,result);if(list.length){r.pengganti=list[0];changed=true;}}
  if(!changed) break;
 }
 return result;
}
const api={schoolWeek,weekStart,weeklyCounts,candidates,manualCandidates,assign};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
else root.ReliefEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
