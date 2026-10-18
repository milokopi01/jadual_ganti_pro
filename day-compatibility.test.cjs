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