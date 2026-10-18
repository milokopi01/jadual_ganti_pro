// Semua ujian relief dalam satu fail. Jalankan: node --test relief.test.cjs

// co-teacher
{
  const test=require('node:test'),assert=require('node:assert');
  const E=require('./relief-engine.js');
  // Two teachers share class 5A at period 1; one absent -> present co-teacher first.
  const data={
   hari:['ISNIN'],
   guru:[{singkat:'ALI'},{singkat:'BALA'},{singkat:'CITRA'},{singkat:'DINA'}],
   waktu:{ISNIN:[1,2]},
   free:{'ISNIN|1':['CITRA','DINA'],'ISNIN|2':['ALI','BALA','CITRA','DINA']},
   kelas:[
    {hari:'ISNIN',waktu:1,kelas:'5A',subjek:'BM',guru:'ALI'},
    {hari:'ISNIN',waktu:1,kelas:'5A',subjek:'BM',guru:'BALA'},
    {hari:'ISNIN',waktu:2,kelas:'5B',subjek:'MT',guru:'CITRA'},
   ]
  };
  const ctx={data,day:'ISNIN',absent:['ALI'],frozen:[],emergency:false,status:{},weekly:{}};
  test('coTeachers finds present co-teacher of same class+period',()=>{
   assert.deepStrictEqual(E.coTeachers(ctx,{waktu:1,kelas:'5A',guruAsal:'ALI'}),['BALA']);
  });
  test('auto assign gives slot to present co-teacher, not a free teacher',()=>{
   const rows=[{hari:'ISNIN',waktu:1,kelas:'5A',subjek:'BM',guruAsal:'ALI',pengganti:''}];
   const out=E.assign(ctx,rows);
   assert.strictEqual(out[0].pengganti,'BALA');
  });
  test('absent co-teacher is skipped; free teacher used instead',()=>{
   const ctx2={...ctx,absent:['ALI','BALA']};
   const rows=[{hari:'ISNIN',waktu:1,kelas:'5A',subjek:'BM',guruAsal:'ALI',pengganti:''}];
   const out=E.assign(ctx2,rows);
   assert.strictEqual(out[0].pengganti,'DINA');
  });
  test('manual candidates list co-teacher first for reassignment',()=>{
   const list=E.manualCandidates(ctx,{waktu:1,kelas:'5A',guruAsal:'ALI'},[],-1);
   assert.strictEqual(list[0],'BALA');
   assert.ok(list.includes('DINA'));
  });
}

// consecutive
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const data={guru:[{singkat:'A'},{singkat:'B'}],waktu:{Isnin:[1,2,3,4,5,6,7,8]},free:{},
  kelas:[3,4,5,6].map(w=>({hari:'Isnin',waktu:w,guru:'A',kelas:'X'})).concat([{hari:'Isnin',waktu:7,guru:'B',kelas:'1D'},{hari:'Isnin',waktu:1,guru:'A',kelas:'Y'}])};
  for(let w=1;w<=8;w++)data.free['Isnin|'+w]=['A'];
  const ctx={data,day:'Isnin',absent:['B'],frozen:[]};
  const r=E.assign(ctx,[{waktu:7,kelas:'1D',guruAsal:'B'}]);
  assert.strictEqual(r[0].pengganti,'','slot 7 after 4 packed periods must stay unassigned');
  console.log('consecutive ok');
}

// day-compatibility
{
  const test=require('node:test');
  const assert=require('node:assert/strict');
  const engine=require('./relief-engine.js');
  test('Malay and English full names and abbreviations follow calendar days',()=>{
   const names=[['Ahad','Sunday','Sun.'],['Isnin','Monday','Mon'],['Selasa','Tuesday','Tue'],['Rabu','Wednesday','Wed'],['Khamis','Thursday','Thu'],['Jumaat','Friday','Fri'],['Sabtu','Saturday','Sat']];
   names.forEach((aliases,index)=>aliases.forEach(name=>assert.equal(engine.dayIndex(name),index)));
   assert.equal(engine.dayIndex('Hari A'),null);
  });
  test('Date selector retains the Excel label without assuming row order',()=>{
   assert.equal(engine.timetableDay(['Thursday','Sunday','Monday'],0,'AHAD'),'Sunday');
   assert.equal(engine.timetableDay(['Thursday','Sunday','Monday'],5,'JUMAAT'),'JUMAAT');
  });
  test('Mixed-sheet aliases reconcile periods, free teachers and teaching records',()=>{
   const data=engine.normalizeTimetable({hari:['Sunday'],waktu:{Sunday:[1],AHAD:[2]},free:{'AHAD|1':['B']},kelas:[{hari:'SUN',waktu:1,guru:'A'}]});
   assert.deepEqual(data.hari,['Sunday']);
   assert.deepEqual(data.waktu.Sunday,[1,2]);
   assert.deepEqual(data.free['Sunday|1'],['B']);
   assert.equal(data.kelas[0].hari,'Sunday');
   assert.equal(engine.needsRelief(data.kelas[0],'Sunday',['A']),true);
   assert.deepEqual(engine.normalizeTimetable(data),data);
  });
  test('School-week detection works for English as well as Malay timetables',()=>{
   assert.equal(engine.schoolWeek(['Sunday','Monday','Tuesday','Wednesday','Thursday']).startDay,0);
   assert.equal(engine.schoolWeek(['Isnin','Selasa','Rabu','Khamis','Jumaat']).startDay,1);
  });
}

// fair-load
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6,7,8,9,10];
  const kelas=[1,2,4,5,6,8,9].map(w=>({hari:'Isnin',waktu:w,guru:'BUSY',kelas:'Z'})).concat([{hari:'Isnin',waktu:10,guru:'LIGHT',kelas:'Q'}],
   [3,7].map(w=>({hari:'Isnin',waktu:w,guru:'X',kelas:'K'+w})));
  const free={};W.forEach(w=>free['Isnin|'+w]=['BUSY','LIGHT']);
  const data={guru:[{singkat:'BUSY'},{singkat:'LIGHT'},{singkat:'X'}],waktu:{Isnin:W},free,kelas};
  const r=E.assign({data,day:'Isnin',absent:['X'],frozen:[]},[{waktu:3,kelas:'K3',guruAsal:'X'},{waktu:7,kelas:'K7',guruAsal:'X'}]);
  assert.deepStrictEqual(r.map(x=>x.pengganti),['LIGHT','LIGHT'],'light teacher takes both reliefs');
  console.log('fair-load ok');
}

// history
{
  const test=require('node:test'),assert=require('node:assert');
  const E=require('./relief-engine.js');
  const data={hari:['ISNIN'],guru:[{singkat:'ALI'},{singkat:'CITRA'},{singkat:'DINA'}],waktu:{ISNIN:[1,2]},
   free:{'ISNIN|1':['CITRA','DINA'],'ISNIN|2':['CITRA','DINA']},kelas:[{hari:'ISNIN',waktu:1,kelas:'5A',subjek:'BM',guru:'ALI'}]};
  const rows=[{hari:'ISNIN',waktu:1,kelas:'5A',subjek:'BM',guruAsal:'ALI',pengganti:''}];
  const base={data,day:'ISNIN',absent:['ALI'],frozen:[],emergency:false,status:{},weekly:{}};
  test('teacher with fewer lifetime reliefs is picked first',()=>{
   assert.strictEqual(E.assign({...base,history:{CITRA:5,DINA:2}},rows)[0].pengganti,'DINA');
   assert.strictEqual(E.assign({...base,history:{CITRA:1,DINA:4}},rows)[0].pengganti,'CITRA');
  });
  test('historyCounts counts saved days this year before today only',()=>{
   const r=[{tarikh:'2026-10-01',pengganti:'DINA'},{tarikh:'2026-10-18',pengganti:'DINA'},{tarikh:'2025-01-05',pengganti:'CITRA'}];
   assert.deepStrictEqual(E.historyCounts(r,'2026-10-18'),{DINA:1});
  });
}

// idle-teacher
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6];
  const kelas=W.map(w=>({hari:'Isnin',waktu:w,guru:'ABS',kelas:'K'+w})).concat([1,3,5].map(w=>({hari:'Isnin',waktu:w,guru:'BUSY',kelas:'B'+w})));
  const free={};W.forEach(w=>free['Isnin|'+w]=['BUSY','IDLE']);
  const data={guru:[{singkat:'ABS'},{singkat:'BUSY'},{singkat:'IDLE'}],waktu:{Isnin:W},free,kelas};
  const rows=[2,4,6].map(w=>({waktu:w,kelas:'K'+w,guruAsal:'ABS'}));
  // IDLE has many past reliefs this year but no class today: must still get at least one card.
  const r=E.assign({data,day:'Isnin',absent:['ABS'],frozen:[],history:{IDLE:30}},rows);
  assert.ok(r.some(x=>x.pengganti==='IDLE'),'idle teacher got no relief');
  console.log('idle-teacher ok');
}

// zero-class
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6,7,8,9,10,11,12];
  const kelas=[{hari:'Isnin',waktu:4,guru:'SQR',kelas:'A'},{hari:'Isnin',waktu:6,guru:'SQR',kelas:'A'},{hari:'Isnin',waktu:7,guru:'HSM',kelas:'B'},{hari:'Isnin',waktu:8,guru:'HSM',kelas:'B'}]
   .concat([3,8,12].map(w=>({hari:'Isnin',waktu:w,guru:'X',kelas:'K'+w})));
  const free={};W.forEach(w=>free['Isnin|'+w]=['SQR','HSM','AHM']);
  const data={guru:['SQR','HSM','AHM','X'].map(s=>({singkat:s})),waktu:{Isnin:W},free,kelas};
  const rows=[3,8,12].map(w=>({waktu:w,kelas:'K'+w,guruAsal:'X'}));
  let r=E.assign({data,day:'Isnin',absent:['X'],frozen:[]},rows).map(x=>x.pengganti);
  assert.ok(r.filter(g=>g==='AHM').length>=2,'teacher with no classes takes at least 2: '+r);
  r=E.assign({data,day:'Isnin',absent:['X'],frozen:[],history:{AHM:6}},rows).map(x=>x.pengganti);
  // Today's load comes first: free-all-day AHM still takes more than SQR/HSM (2 classes each) even with high year history.
  assert.ok(r.filter(g=>g==='AHM').length>=2,'idle teacher must out-take busy teachers today: '+r);
  assert.deepStrictEqual(E.historyCounts([{tarikh:'2025-12-01',pengganti:'A'},{tarikh:'2026-02-01',pengganti:'A'}],'2026-03-01'),{A:1});
  console.log('zero-class ok');
}


// idle-cap: free-all-day teacher gets max 2 reliefs in AUTO mode only (manual has no cap)
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6,7,8,9,10];
  const kelas=W.map(w=>({hari:'Isnin',waktu:w,guru:'X',kelas:'K'+w})).concat([{hari:'Isnin',waktu:1,guru:'B',kelas:'Z'}]);
  const free={};W.forEach(w=>free['Isnin|'+w]=['IDLE','B']);
  const data={guru:['IDLE','B','X'].map(s=>({singkat:s})),waktu:{Isnin:W},free,kelas};
  const rows=W.map(w=>({waktu:w,kelas:'K'+w,guruAsal:'X'}));
  const r=E.assign({data,day:'Isnin',absent:['X'],frozen:[],maxConsecutive:99},rows).map(x=>x.pengganti);
  assert.strictEqual(r.filter(g=>g==='IDLE').length,2,'idle cap 2: '+r);
  const filled=rows.map((x,i)=>({...x,pengganti:r[i]}));
  const j=filled.findIndex(x=>x.pengganti!=='IDLE');
  // Manual mode has no cap: IDLE stays available even after reaching 2 reliefs.
  assert.ok(E.manualCandidates({data,day:'Isnin',absent:['X'],frozen:[]},filled[j],filled,j).includes('IDLE'),'manual no cap');
  console.log('idle-cap ok');
}

// rest-after-2: no auto relief right after 2 back-to-back periods (MNA case)
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6,7,8,9,10,11];
  const free={};W.forEach(w=>free['Isnin|'+w]=['MNA']);
  const data={guru:['MNA','X'].map(s=>({singkat:s})),waktu:{Isnin:W},free,
   kelas:[{hari:'Isnin',waktu:8,guru:'MNA',kelas:'5D'},{hari:'Isnin',waktu:9,guru:'MNA',kelas:'5D'},{hari:'Isnin',waktu:10,guru:'X',kelas:'5A'},{hari:'Isnin',waktu:5,guru:'X',kelas:'5B'}]};
  const ctx={data,day:'Isnin',absent:['X'],frozen:[]};
  assert.strictEqual(E.assign(ctx,[{waktu:10,kelas:'5A',guruAsal:'X'}])[0].pengganti,'','waktu 10 after 8-9 must stay empty');
  // One lesson then a relief is fine (2 in a row).
  data.kelas=data.kelas.filter(k=>k.waktu!==8);
  assert.strictEqual(E.assign(ctx,[{waktu:10,kelas:'5A',guruAsal:'X'}])[0].pengganti,'MNA');
  console.log('rest-after-2 ok');
}

// no-twin: auto avoids back-to-back reliefs when another teacher fits; allows them if unavoidable
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6];const free={};W.forEach(w=>free['Isnin|'+w]=['A','B']);
  const data={guru:['A','B','X'].map(s=>({singkat:s})),waktu:{Isnin:W},free,
   kelas:[{hari:'Isnin',waktu:2,guru:'X',kelas:'4O'},{hari:'Isnin',waktu:3,guru:'X',kelas:'1P'}]};
  const ctx={data,day:'Isnin',absent:['X'],frozen:[]};
  const rows=[{waktu:2,kelas:'4O',guruAsal:'X'},{waktu:3,kelas:'1P',guruAsal:'X'}];
  const r=E.assign(ctx,rows).map(x=>x.pengganti);
  assert.notStrictEqual(r[0],r[1],'twin avoided: '+r);
  data.free={};W.forEach(w=>data.free['Isnin|'+w]=['A']);data.guru=[{singkat:'A'},{singkat:'X'}];
  const r2=E.assign({...ctx},rows).map(x=>x.pengganti);
  assert.deepStrictEqual(r2,['A','A'],'unavoidable twin allowed');
  console.log('no-twin ok');
}

// rest-around: relief right after own lesson goes to a rested teacher when one is free (2 EMERALD case)
{
  const assert=require('assert');const E=require('./relief-engine.js');
  const W=[1,2,3,4,5,6,7,8];const free={};W.forEach(w=>free['Isnin|'+w]=['A','B']);
  const data={guru:['A','B','X'].map(s=>({singkat:s})),waktu:{Isnin:W},free,
   kelas:[{hari:'Isnin',waktu:3,guru:'A',kelas:'1O'},{hari:'Isnin',waktu:5,guru:'A',kelas:'1O'},{hari:'Isnin',waktu:2,guru:'B',kelas:'1P'},
   {hari:'Isnin',waktu:6,guru:'X',kelas:'2E'},{hari:'Isnin',waktu:7,guru:'X',kelas:'2F'},{hari:'Isnin',waktu:8,guru:'X',kelas:'2G'},{hari:'Isnin',waktu:1,guru:'X',kelas:'2H'},{hari:'Isnin',waktu:1,guru:'B',kelas:'1Q'},{hari:'Isnin',waktu:8,guru:'B',kelas:'1R'}]};
  data.free['Isnin|3']=['B'];data.free['Isnin|5']=['B'];data.free['Isnin|2']=['A'];data.free['Isnin|1']=['A'];data.free['Isnin|8']=['A'];
  const r=E.assign({data,day:'Isnin',absent:['X'],frozen:[]},[{waktu:6,kelas:'2E',guruAsal:'X'}]);
  assert.strictEqual(r[0].pengganti,'B','rested B must take slot 6, not A right after own lesson');
  console.log('rest-around ok');
}
