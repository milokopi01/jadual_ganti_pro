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
assert.strictEqual(r.filter(g=>g==='AHM').length,1,'year balance: far-ahead idle teacher still gets exactly 1: '+r);
assert.deepStrictEqual(E.historyCounts([{tarikh:'2025-12-01',pengganti:'A'},{tarikh:'2026-02-01',pengganti:'A'}],'2026-03-01'),{A:1});
console.log('zero-class ok');
