(function(root){
'use strict';
const DAY_NAMES=[['AHAD','SUNDAY','SUN','SU','MINGGU'],['ISNIN','MONDAY','MON','MO','SENIN'],['SELASA','TUESDAY','TUES','TUE','TU'],['RABU','WEDNESDAY','WED','WE'],['KHAMIS','THURSDAY','THURS','THUR','THU','TH','KAMIS'],['JUMAAT','JUMAT','FRIDAY','FRI','FR'],['SABTU','SATURDAY','SAT','SA']];
function dayIndex(value){
 const name=String(value??'').replace(/\s+/g,' ').trim().replace(/\.$/,'').toUpperCase();
 const index=DAY_NAMES.findIndex(names=>names.includes(name));
 return index<0?null:index;
}
function timetableDay(days,index,fallback){
 return days.find(day=>dayIndex(day)===index)??fallback;
}
function normalizeTimetable(data){
 // Preserve Excel labels; aliases in other sheets share the same lookup key.
 const days=[], labels=new Map();
 const label=value=>{
  const raw=String(value??'').replace(/\s+/g,' ').trim(), index=dayIndex(raw);
  const key=index===null?raw.toUpperCase():index;
  if(!labels.has(key)){labels.set(key,raw);days.push(raw);}
  return labels.get(key);
 };
 (data.hari||[]).forEach(label);
 const waktu={},free={};
 Object.entries(data.waktu||{}).forEach(([day,periods])=>{
  const key=label(day);waktu[key]=[...new Set([...(waktu[key]||[]),...periods])].sort((a,b)=>a-b);
 });
 Object.entries(data.free||{}).forEach(([key,teachers])=>{
  const split=key.lastIndexOf('|'), day=label(key.slice(0,split)), period=key.slice(split+1);
  const target=day+'|'+period;free[target]=[...new Set([...(free[target]||[]),...teachers])];
 });
 const kelas=(data.kelas||[]).map(row=>({...row,hari:label(row.hari)}));
 return {...data,hari:days,waktu,free,kelas};
}
function schoolWeek(days=[],mode='auto'){
 if(mode==='sunday') return {startDay:0,label:'Ahad–Khamis'};
 if(mode==='monday') return {startDay:1,label:'Isnin–Jumaat'};
 const names=days.map(dayIndex);
 const sunday=names.includes(0), friday=names.includes(5);
 if(sunday&&!friday) return {startDay:0,label:'Ahad–Khamis'};
 if(friday&&!sunday) return {startDay:1,label:'Isnin–Jumaat'};
 return null;
}
function weekStart(date,startDay=1){
 const d=new Date(date+'T00:00:00Z');
 d.setUTCDate(d.getUTCDate()-((d.getUTCDay()-startDay+7)%7));
 return d.toISOString().slice(0,10);
}
// Lifetime relief history (all saved days before today), kept until the user resets it.
function historyCounts(records,date){
 const counts={};
 (records||[]).filter(r=>r.tarikh<date&&String(r.tarikh).slice(0,4)===String(date).slice(0,4)&&r.pengganti).forEach(r=>counts[r.pengganti]=(counts[r.pengganti]||0)+1);
 return counts;
}
function weeklyCounts(records,date,startDay=1){
 const start=weekStart(date,startDay), counts={};
 // Today's saved rows are replaced by the current allocation, never counted twice.
 records.filter(r=>r.tarikh>=start&&r.tarikh<date&&r.pengganti).forEach(r=>counts[r.pengganti]=(counts[r.pengganti]||0)+1);
 return counts;
}
// Precomputed lookups per context: avoids rescanning every lesson on each call (was freezing the browser).
const PREP=new WeakMap();
function prep(ctx){
 let p=PREP.get(ctx); if(p) return p;
 const {data,day}=ctx, teach=new Set(), per={};
 data.kelas.forEach(k=>{if(k.hari===day){teach.add(k.guru+'|'+k.waktu);(per[k.guru]||=new Set()).add(k.waktu);}});
 const loads=Object.fromEntries(data.guru.map(g=>[g.singkat,per[g.singkat]?.size||0]));
 const free={}; (data.waktu[day]||[]).forEach(w=>free[w]=new Set(data.free[day+'|'+w]||[]));
 p={teach,loads,max:Math.max(0,...Object.values(loads)),free,periods:new Set(data.waktu[day]||[])};
 PREP.set(ctx,p); return p;
}
// Co-teachers: other teachers timetabled in the SAME class at the SAME period.
// When one is absent, a present co-teacher is already in that classroom, so they
// are the natural first relief pick even though they are not "free".
function coTeachers(ctx,row){
 const {data,day,absent=[],status={}}=ctx;
 return data.kelas
  .filter(k=>k.hari===day&&k.waktu===row.waktu&&k.kelas===row.kelas&&k.guru!==row.guruAsal)
  .map(k=>k.guru)
  .filter((g,i,a)=>a.indexOf(g)===i)
  .filter(g=>!absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir'))
  .sort((a,b)=>a.localeCompare(b));
}
function candidates(ctx,row,rows,ignore=-1){
 const {data,day,absent,frozen,emergency,status={},weekly={},history={}}=ctx;
 // Priority: a present co-teacher of the same class/period takes the slot first.
 const co=coTeachers(ctx,row).filter(g=>!rows.some((r,i)=>i!==ignore&&r.waktu===row.waktu&&r.pengganti===g));
 if(co.length) return co;
 const P=prep(ctx), periods=[...P.periods], assigned=rows.filter((r,i)=>i!==ignore&&r.pengganti);
 const loads=P.loads, max=P.max;
 const counts={}; assigned.forEach(r=>counts[r.pengganti]=(counts[r.pengganti]||0)+1);
 const available=(g,w)=>P.periods.has(w)&&!!P.free[w]?.has(g)&&
  !P.teach.has(g+'|'+w)&&
  !(status[g]?.blocked||[]).includes(w)&&!absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir')&&
  !assigned.some(r=>r.waktu===w&&r.pengganti===g);
 const base=data.guru.map(g=>g.singkat).filter(g=>!absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir')&&loads[g]<max);
 // Never stack a relief onto an already packed stretch: the run of consecutive busy
 // periods (own lessons + reliefs) including this slot must stay within the limit.
 const maxRun=ctx.maxConsecutive||3;
 const busy=(g,w)=>P.teach.has(g+'|'+w)||assigned.some(r=>r.waktu===w&&r.pengganti===g);
 const runOk=g=>{let n=1;for(let w=row.waktu-1;busy(g,w);w--)n++;for(let w=row.waktu+1;busy(g,w);w++)n++;return n<=maxRun;};
 // A teacher with no own class today takes at most 3 reliefs (needs rest too).
 const capOk=g=>!(loads[g]===0&&(counts[g]||0)>=(ctx.maxIdleRelief||3));
 const qualified=base.filter(g=>capOk(g)&&available(g,row.waktu)&&runOk(g)&&!(ctx.clash&&ctx.clash(g,row,rows,ignore))&&(loads[g]===0||available(g,row.waktu-1)||available(g,row.waktu+1)));
 const rank=g=>available(g,row.waktu-1)&&available(g,row.waktu+1)?0:available(g,row.waktu+1)?1:2;
 // Fair share by total burden today: own lessons + reliefs already given. A light-timetable
 // teacher may take several reliefs before a packed teacher takes even one.
 // Balance across the whole year: reliefs already taken this year + today's reliefs,
 // plus half a point per own lesson today, so a teacher with no classes today takes
 // several reliefs before a busy teacher takes one, but nobody gets far ahead for the year.
 // Today first: own lessons + reliefs already given today. Year history only breaks ties.
 const today=g=>(counts[g]||0)+loads[g];
 const burden=g=>today(g)*1000+(history[g]||0);
 // Guarantee: a teacher with no own class today who has no relief yet today goes first (at least 1 relief card).
 const idle=g=>loads[g]===0&&!(counts[g]>0)?0:1;
 const sort=list=>list.sort((a,b)=>idle(a)-idle(b)||burden(a)-burden(b)||loads[a]-loads[b]||rank(a)-rank(b)||(weekly[a]||0)-(weekly[b]||0)||a.localeCompare(b));
 // A frozen teacher is never a normal candidate. Emergency still obeys every hard filter.
 const normal=qualified.filter(g=>!frozen.includes(g));
 if(normal.length) return sort(normal);
 return emergency?sort(qualified.filter(g=>frozen.includes(g))):[];
}
function manualCandidates(ctx,row,rows,ignore=-1){
 const {data,day,absent=[],status={}}=ctx;
 // Co-teachers teach this very period, so they fail the "not teaching" filter
 // below; list them first so the teacher can hand the slot back if declined.
 const co=coTeachers(ctx,row).filter(g=>!rows.some((r,i)=>i!==ignore&&r.waktu===row.waktu&&r.pengganti===g));
 const rest=data.guru.map(g=>g.singkat).filter(g=>
  !co.includes(g)&&
  (data.waktu[day]||[]).includes(row.waktu)&&
  // Manual only: teachers off the free list (tidak bertugas) may be placed by hand, never by the auto engine.
  !data.kelas.some(k=>k.hari===day&&k.waktu===row.waktu&&k.guru===g)&&
  !absent.includes(g)&&(!status[g]?.reason||status[g].reason==='Hadir')&&
  !(status[g]?.blocked||[]).includes(row.waktu)&&
  !rows.some((r,i)=>i!==ignore&&r.waktu===row.waktu&&r.pengganti===g)&&
  !(ctx.clash&&ctx.clash(g,row,rows,ignore))
 ).sort((a,b)=>a.localeCompare(b));
 return co.concat(rest);
}
function sessionForClass(sessions,kelas){
 const k=String(kelas||'').split(',')[0].trim().toUpperCase();
 let best, length=0;
 for(const session of sessions){
  for(const prefix of String(session.kelas||'').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean)){
   if(k.startsWith(prefix)&&prefix.length>length){best=session;length=prefix.length;}
  }
 }
 return best||sessions.find(s=>!String(s.kelas||'').trim())||sessions[0];
}
function needsRelief(lesson,day,absent,status={}){
 return lesson.hari===day&&absent.includes(lesson.guru)&&!(status[lesson.guru]?.ajarSendiri||[]).includes(lesson.waktu);
}
function assign(ctx,rows){
 ctx={...ctx};
 const result=rows.map(r=>({...r,pengganti:''}));
 // Repeat to reconsider an earlier unfilled slot after all teachers reach their first relief.
 for(let pass=0;pass<result.length;pass++){
  let changed=false;
  const pending=result.map((r,i)=>({r,i,n:r.pengganti?0:candidates(ctx,r,result).length})).filter(x=>!x.r.pengganti)
   .sort((a,b)=>a.n-b.n||a.r.waktu-b.r.waktu);
  for(const {r} of pending){const list=candidates(ctx,r,result);if(list.length){r.pengganti=list[0];changed=true;}}
  if(!changed) break;
 }
 return result;
}
const api={historyCounts,dayIndex,timetableDay,normalizeTimetable,schoolWeek,weekStart,weeklyCounts,coTeachers,candidates,manualCandidates,sessionForClass,needsRelief,assign};
if(typeof module!=='undefined'&&module.exports) module.exports=api;
else root.ReliefEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
