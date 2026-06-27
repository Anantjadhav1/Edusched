const SubjectAllocation = require('../models/SubjectAllocation');
const Room = require('../models/Room');

const ONLINE_KEYWORDS = ['rad','fctc','design thinking','dt','coursera','swayam','audit','hss','linkedin'];

function isOnline(code) {
  return ONLINE_KEYWORDS.some(k => code.toLowerCase().includes(k));
}

function generateSlots(startTime, endTime, duration) {
  const slots = [];
  let [h, m] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const endMins = eh * 60 + em;
  while (true) {
    const startMins = h * 60 + m;
    const nextMins = startMins + Number(duration);
    if (nextMins > endMins) break;
    const nh = Math.floor(nextMins / 60), nm = nextMins % 60;
    const fmt = (hh, mm) => String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
    slots.push({ label: fmt(h,m) + '-' + fmt(nh,nm) });
    h = nh; m = nm;
  }
  return slots;
}

function buildDivSubjectMap(allocations, year, div) {
  const map = {};
  const rows = allocations.filter(a => a.year === year && a.div === div);
  for (const a of rows) {
    const sub = a.subject;
    if (!map[sub]) map[sub] = { theory: null, lab: {}, tutorial: {} };
    const type = a.type.toLowerCase();
    if (type === 'theory') {
      map[sub].theory = { teacher: a.teacherName, hours: a.weeklyHours };
    } else if (type === 'lab') {
      if (a.batch) map[sub].lab[a.batch] = { teacher: a.teacherName, hours: a.weeklyHours };
    } else if (type === 'tutorial') {
      map[sub].tutorial[a.batch || 'ALL'] = { teacher: a.teacherName, hours: a.weeklyHours };
    }
  }
  return map;
}

let gTeacherBusy;
let gRoomBusy;

function isTeacherFree(teacher, day, si) {
  if (!teacher || teacher === 'TBA') return true;
  return !gTeacherBusy.has(teacher + '__' + day + '__' + si);
}

function bookTeacher(teacher, day, si) {
  if (teacher && teacher !== 'TBA') gTeacherBusy.add(teacher + '__' + day + '__' + si);
}

function freeTeacher(teacher, day, si) {
  if (teacher && teacher !== 'TBA') gTeacherBusy.delete(teacher + '__' + day + '__' + si);
}

function isRoomFree(room, day, si) {
  return !gRoomBusy.has(room + '__' + day + '__' + si);
}

function bookRoom(room, day, si) {
  gRoomBusy.add(room + '__' + day + '__' + si);
}

function freeRoom(room, day, si) {
  gRoomBusy.delete(room + '__' + day + '__' + si);
}

function findRoom(roomPools, type, day, si) {
  const pool = roomPools[type] || roomPools.classroom;
  for (const r of pool) {
    if (isRoomFree(r, day, si)) return r;
  }
  if (type === 'tutorial') {
    for (const r of roomPools.classroom) {
      if (isRoomFree(r, day, si)) return r;
    }
  }
  return null;
}

function scheduleLabsForDivision(subjectMap, days, generatedSlots, roomPools, divisionId) {
  const cells = [];
  const usedDays = new Set();
  const labSlotUsed = {};

  const labSubjects = Object.entries(subjectMap)
    .filter(([, data]) => Object.keys(data.lab).length > 0)
    .map(([code, data]) => ({ code, batches: Object.keys(data.lab).sort(), data }));

  for (const labSub of labSubjects) {
    const { code, batches } = labSub;
    let scheduled = false;

    for (const day of days) {
      if (usedDays.has(day)) continue;

      let foundSlotA = -1, foundSlotB = -1;

      for (let si = 0; si < generatedSlots.length - 1; si++) {
        const siB = si + 1;

        const teachersFree = batches.every(batch => {
          const t = labSub.data.lab[batch] && labSub.data.lab[batch].teacher;
          return isTeacherFree(t, day, si) && isTeacherFree(t, day, siB);
        });
        if (!teachersFree) continue;

        const availableRooms = roomPools.lab.filter(r =>
          isRoomFree(r, day, si) && isRoomFree(r, day, siB)
        );
        if (availableRooms.length < batches.length) continue;

        foundSlotA = si;
        foundSlotB = siB;
        break;
      }

      if (foundSlotA === -1) continue;

      const availableRooms = roomPools.lab.filter(r =>
        isRoomFree(r, day, foundSlotA) && isRoomFree(r, day, foundSlotB)
      );
      const assignedRooms = availableRooms.slice(0, batches.length);

      batches.forEach((batch, i) => {
        const t = labSub.data.lab[batch] && labSub.data.lab[batch].teacher;
        const room = assignedRooms[i];
        bookTeacher(t, day, foundSlotA);
        bookTeacher(t, day, foundSlotB);
        bookRoom(room, day, foundSlotA);
        bookRoom(room, day, foundSlotB);
      });

      usedDays.add(day);
      labSlotUsed[day] = [foundSlotA, foundSlotB];

      const batchLabels = batches.map((batch, i) => {
        const t = (labSub.data.lab[batch] && labSub.data.lab[batch].teacher) || 'TBA';
        return batch + ':' + code + '(' + t + ')';
      });
      const teacherLabels = batches.map(b => (labSub.data.lab[b] && labSub.data.lab[b].teacher) || 'TBA').join(' | ');
      const roomLabels = assignedRooms.join(', ');

      for (const si of [foundSlotA, foundSlotB]) {
        cells.push({
          day, slotIndex: si, slotLabel: generatedSlots[si].label,
          subjectName: batchLabels.join(' | '),
          subjectType: 'lab',
          teacherName: teacherLabels,
          roomLabel: roomLabels,
          roomId: assignedRooms[0] || '',
          isFree: false, isLabBlock: true,
        });
      }
      scheduled = true;
      break;
    }

    if (!scheduled) {
      console.warn('[LAB UNSCHEDULED] ' + code + ' for ' + divisionId);
    }
  }

  return { cells, labSlotUsed };
}

function buildScheduleItems(subjectMap, days, onlineDay) {
  const items = [];
  for (const [code, data] of Object.entries(subjectMap)) {
    const online = isOnline(code);
    if (data.theory) {
      for (let i = 0; i < data.theory.hours; i++) {
        items.push({
          id: 'theory__' + code + '__' + i,
          code, type: 'theory',
          teacher: data.theory.teacher,
          online,
          label: code,
          targetDays: online ? [onlineDay] : null,
          roomType: 'classroom',
        });
      }
    }
    for (const [batch, info] of Object.entries(data.tutorial)) {
      const label = batch === 'ALL' ? code : batch + ':' + code;
      items.push({
        id: 'tutorial__' + code + '__' + batch,
        code, type: 'tutorial',
        teacher: info.teacher,
        online, batch, label,
        targetDays: online ? [onlineDay] : null,
        roomType: 'tutorial',
      });
    }
  }
  return items;
}

function countValidSlots(item, days, generatedSlots, daySlots, labSlotUsed, maxPerDay) {
  const targetDays = item.targetDays || days;
  let count = 0;
  for (const day of targetDays) {
    const used = daySlots[day] || new Set();
    const labSlots = new Set(labSlotUsed[day] || []);
    if (used.size >= maxPerDay) continue;
    for (let si = 0; si < generatedSlots.length; si++) {
      if (used.has(si) || labSlots.has(si)) continue;
      if (!isTeacherFree(item.teacher, day, si)) continue;
      count++;
    }
  }
  return count;
}

function backtrackSchedule(items, days, generatedSlots, daySlots, labSlotUsed, roomPools, maxPerDay, onlineDay) {
  if (items.length === 0) return [];

  const order = items.map((item, idx) => ({
    idx,
    mrv: countValidSlots(item, days, generatedSlots, daySlots, labSlotUsed, maxPerDay),
  })).sort((a, b) => a.mrv - b.mrv).map(x => x.idx);

  const assigned = new Array(items.length).fill(null);

  function solve(pos) {
    if (pos === order.length) return true;
    const idx = order[pos];
    const item = items[idx];
    const targetDays = item.targetDays || days;

    const sortedDays = [...targetDays].sort((a, b) =>
      ((daySlots[a] && daySlots[a].size) || 0) - ((daySlots[b] && daySlots[b].size) || 0)
    );

    for (const day of sortedDays) {
      const used = daySlots[day] || new Set();
      const labSlots = new Set(labSlotUsed[day] || []);
      if (used.size >= maxPerDay) continue;

      for (let si = 0; si < generatedSlots.length; si++) {
        if (used.has(si) || labSlots.has(si)) continue;
        if (!isTeacherFree(item.teacher, day, si)) continue;

        const room = item.online ? 'ONLINE' : findRoom(roomPools, item.roomType, day, si);
        if (!room) continue;

        bookTeacher(item.teacher, day, si);
        if (!item.online) bookRoom(room, day, si);
        used.add(si);
        assigned[idx] = { day, si, room };

        if (solve(pos + 1)) return true;

        freeTeacher(item.teacher, day, si);
        if (!item.online) freeRoom(room, day, si);
        used.delete(si);
        assigned[idx] = null;
      }
    }

    // Force skip — mark unscheduled, let others proceed
    assigned[idx] = 'UNSCHEDULED';
    const result = solve(pos + 1);
    if (!result) assigned[idx] = null;
    return result;
  }

  solve(0);

  const cells = [];
  for (let i = 0; i < items.length; i++) {
    const a = assigned[i];
    if (!a || a === 'UNSCHEDULED') {
      console.warn('[UNSCHEDULED] ' + items[i].id);
      continue;
    }
    const item = items[i];
    const { day, si, room } = a;
    cells.push({
      day, slotIndex: si, slotLabel: generatedSlots[si].label,
      subjectName: item.online ? item.label + ' (ONLINE)' : item.label,
      subjectType: item.type,
      teacherName: item.teacher || 'TBA',
      roomLabel: item.online ? 'ONLINE' : room,
      roomId: item.online ? 'ONLINE' : room,
      isFree: false,
    });
  }
  return cells;
}

async function generateTimetable(config, _dbRooms, _t, dbYears) {
  const { days, generatedSlots } = config;
  const MAX_PER_DAY = Math.min(config.maxDailyHours || 6, generatedSlots.length);

  gTeacherBusy = new Set();
  gRoomBusy = new Set();

  const allocations = await SubjectAllocation.find().lean();
  const dbRoomsFresh = await Room.find({ isActive: true }).lean();

  const roomPools = { lab: [], classroom: [], tutorial: [] };
  for (const r of dbRoomsFresh) {
    if (roomPools[r.type]) roomPools[r.type].push(r.roomId);
  }
  if (roomPools.lab.length === 0) roomPools.lab = ['1316A','1316D','1321A','1321D','1323A','1323D','1326','1327','1329'];
  if (roomPools.classroom.length === 0) roomPools.classroom = ['1324','1325','1328','1410','1411','1412','1413'];
  if (roomPools.tutorial.length === 0) roomPools.tutorial = ['1402','1314'];

  const divisions = [];
  for (const year of (Array.isArray(dbYears) ? dbYears : [])) {
    for (const div of (year.divisions || [])) {
      divisions.push({
        divisionId: div.divisionId,
        label: div.label || div.divisionId,
        yearId: year.yearId,
        batchCount: div.batchCount || 3,
      });
    }
  }

  const onlineDay = days[days.length - 1];
  const results = [];

  for (const division of divisions) {
    const { divisionId, label, yearId } = division;
    const divLetter = divisionId.split('-')[1];
    const subjectMap = buildDivSubjectMap(allocations, yearId, divLetter);

    console.log('[SCHEDULING] ' + divisionId);

    const daySlots = {};
    for (const d of days) daySlots[d] = new Set();

    const { cells: labCells, labSlotUsed } = scheduleLabsForDivision(
      subjectMap, days, generatedSlots, roomPools, divisionId
    );

    for (const [day, slots] of Object.entries(labSlotUsed)) {
      for (const si of slots) daySlots[day].add(si);
    }

    const items = buildScheduleItems(subjectMap, days, onlineDay);

    const theoryCells = backtrackSchedule(
      items, days, generatedSlots, daySlots, labSlotUsed, roomPools, MAX_PER_DAY, onlineDay
    );

    const allCells = [...labCells, ...theoryCells];
    const occupiedKeys = new Set(allCells.map(c => c.day + '__' + c.slotIndex));

    for (const day of days) {
      for (let si = 0; si < generatedSlots.length; si++) {
        if (!occupiedKeys.has(day + '__' + si)) {
          allCells.push({
            day, slotIndex: si, slotLabel: generatedSlots[si].label,
            subjectName: '', subjectType: 'free',
            teacherName: '', roomLabel: '', roomId: '',
            isFree: true,
          });
        }
      }
    }

    results.push({ divisionId, divisionLabel: label, yearId, cells: allCells });
    console.log('[DONE] ' + divisionId + ' total cells: ' + allCells.length);
  }

  return results;
}

module.exports = { generateTimetable, generateSlots };