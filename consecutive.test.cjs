const assert=require('assert');const E=require('./relief-engine.js');
const data={guru:[{singkat:'A'},{singkat:'B'}],waktu:{Isnin:[1,2,3,4,5,6,7,8]},free:{},
kelas:[3,4,5,6].map(w=>({hari:'Isnin',waktu:w,guru:'A',kelas:'X'})).concat([{hari:'Isnin',waktu:7,guru:'B',kelas:'1D'},{hari:'Isnin',waktu:1,guru:'A',kelas:'Y'}])};
for(let w=1;w<=8;w++)data.free['Isnin|'+w]=['A'];
const ctx={data,day:'Isnin',absent:['B'],frozen:[]};
const r=E.assign(ctx,[{waktu:7,kelas:'1D',guruAsal:'B'}]);
assert.strictEqual(r[0].pengganti,'','slot 7 after 4 packed periods must stay unassigned');
console.log('consecutive ok');
