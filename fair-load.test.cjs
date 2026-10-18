const assert=require('assert');const E=require('./relief-engine.js');
const W=[1,2,3,4,5,6,7,8,9,10];
const kelas=[1,2,4,5,6,8,9].map(w=>({hari:'Isnin',waktu:w,guru:'BUSY',kelas:'Z'})).concat([{hari:'Isnin',waktu:10,guru:'LIGHT',kelas:'Q'}],
 [3,7].map(w=>({hari:'Isnin',waktu:w,guru:'X',kelas:'K'+w})));
const free={};W.forEach(w=>free['Isnin|'+w]=['BUSY','LIGHT']);
const data={guru:[{singkat:'BUSY'},{singkat:'LIGHT'},{singkat:'X'}],waktu:{Isnin:W},free,kelas};
const r=E.assign({data,day:'Isnin',absent:['X'],frozen:[]},[{waktu:3,kelas:'K3',guruAsal:'X'},{waktu:7,kelas:'K7',guruAsal:'X'}]);
assert.deepStrictEqual(r.map(x=>x.pengganti),['LIGHT','LIGHT'],'light teacher takes both reliefs');
console.log('fair-load ok');
