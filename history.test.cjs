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
test('historyCounts counts saved days before today only',()=>{
 const r=[{tarikh:'2026-10-01',pengganti:'DINA'},{tarikh:'2026-10-18',pengganti:'DINA'},{tarikh:'2025-01-05',pengganti:'CITRA'}];
 assert.deepStrictEqual(E.historyCounts(r,'2026-10-18'),{DINA:1,CITRA:1});
});
