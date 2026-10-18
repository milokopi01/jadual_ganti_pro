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
