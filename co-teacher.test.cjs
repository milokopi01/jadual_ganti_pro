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
