const SubjectAllocation = require('../models/SubjectAllocation');

const ROOM_POOLS = {
  lab:       ['1316A','1316D','1321A','1321D','1323A','1323D','1326','1327','1329'],
  classroom: ['1324','1325','1328','1410','1411','1412','1413'],
  tutorial:  ['1402','1314'],
};

const ONLINE_KEYWORDS = ['rad','fctc','design thinking','dt','coursera','swayam','audit','hss','linkedin'];

function isOnline(subjectCode) {
  return ONLINE_KEYWORDS.some(k => subjectCode.toLowerCase().includes(k));
}

// MAD + SAD are 1hr consecutive labs — each batch gets its own day
// Both subjects scheduled back-to-back (slotA then slotB) for same batch same day
const CONSECUTIVE_LAB_PAIR = ['MAD', 'SAD'];

const DIV_LAB_WINDOW = {
  'SY-A':{ start:0, end:1, labLast:false },
  'SY-B':{ start:0, end:1, labLast:false },
  'SY-C':{ start:0, end:1, labLast:false },
  'SY-D':{ start:2, end:3, labLast:false },
  'SY-E':{ start:2, end:3, labLast:false },
  'SY-F':{ start:2, end:3, labLast:false },
  'SY-G':{ start:4, end:5, labLast:false },
  'SY-H':{ start:4, end:5, labLast:false },
  'SY-I':{ start:4, end:5, labLast:false },
  'SY-J':{ start:6, end:7, labLast:false },
  'SY-K':{ start:6, end:7, labLast:false },
  'SY-L':{ start:6, end:7, labLast:false },
  'SY-M':{ start:8, end:9, labLast:true  },
  'SY-N':{ start:8, end:9, labLast:true  },
  'TY-A':{ start:0, end:1, labLast:false },
  'TY-B':{ start:0, end:1, labLast:false },
  'TY-C':{ start:0, end:1, labLast:false },
  'TY-D':{ start:2, end:3, labLast:false },
};

function generateSlots(startTime, endTime, duration) {
  const slots = [];
  let [h, m] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const endMins = eh * 60 + em;
  while (true) {
    const startMins = h * 60 + m;
    const nextMins  = startMins + Number(duration);
    if (nextMins > endMins) break;
    const nh = Math.floor(nextMins / 60), nm = nextMins % 60;
    const fmt = (hh, mm) => `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    slots.push({ label: `${fmt(h,m)}-${fmt(nh,nm)}` });
    h = nh; m = nm;
  }
  return slots;
}

function withinTeacherHours(teacher, day, slotIndex, teacherFirstSlot) {
  const key = `${teacher}__${day}`;
  const first = teacherFirstSlot[key];
  if (first === undefined) return true;
  return (slotIndex - first) < 8;
}

function updateTeacherFirstSlot(teacher, day, slotIndex, teacherFirstSlot) {
  const key = `${teacher}__${day}`;
  if (teacherFirstSlot[key] === undefined || slotIndex < teacherFirstSlot[key]) {
    teacherFirstSlot[key] = slotIndex;
  }
}

function buildDivSubjectMap(allocations, year, div) {
  const map = {};
  const rows = allocations.filter(a => a.year === year && a.div === div);
  for (const a of rows) {
    const sub  = a.subject;
    const type = a.type.toLowerCase();
    if (!map[sub]) map[sub] = { theory: null, lab: {}, tutorial: {} };
    if (type === 'theory') {
      map[sub].theory = { teacher: a.teacherName, hours: a.weeklyHours };
    } else if (type === 'lab') {
      if (a.batch) map[sub].lab[a.batch] = { teacher: a.teacherName, hours: a.weeklyHours };
    } else if (type === 'tutorial') {
      const key = a.batch || 'ALL';
      map[sub].tutorial[key] = { teacher: a.teacherName, hours: a.weeklyHours };
    }
  }
  return map;
}

// Find a free lab room for both slots on a given day
function findFreeLabRoom(day, slotA, slotB, roomBusy) {
  for (const r of ROOM_POOLS.lab) {
    if (!roomBusy.has(`${r}__${day}__${slotA}`) && !roomBusy.has(`${r}__${day}__${slotB}`)) {
      return r;
    }
  }
  return null;
}

// Check if teacher is free for both lab slots on a day
function teacherFreeForLabSlots(teacher, day, slotA, slotB, teacherBusy) {
  if (!teacher || teacher === 'TBA') return true;
  return !teacherBusy.has(`${teacher}__${day}__${slotA}`) &&
         !teacherBusy.has(`${teacher}__${day}__${slotB}`);
}

async function generateTimetable(config, dbRooms, _t, dbYears) {
  const { days, generatedSlots } = config;
  const MAX_PER_DAY  = 5;
  const totalSlots   = generatedSlots.length;

  const allocations      = await SubjectAllocation.find().lean();
  const teacherBusy      = new Set();
  const roomBusy         = new Set();
  const teacherFirstSlot = {};

  // Build divisions list
  const divisions = [];
  for (const year of (Array.isArray(dbYears) ? dbYears : [])) {
    for (const div of (year.divisions || [])) {
      divisions.push({
        divisionId: div.divisionId,
        label:      div.label || div.divisionId,
        yearId:     year.yearId,
        batchCount: div.batchCount || 3,
      });
    }
  }
  if (divisions.length === 0) {
    'ABCDEFGHIJKLMN'.split('').forEach(d =>
      divisions.push({ divisionId:`SY-${d}`, label:`Div ${d}`, yearId:'SY', batchCount:3 })
    );
    'ABCD'.split('').forEach(d =>
      divisions.push({ divisionId:`TY-${d}`, label:`Div ${d}`, yearId:'TY', batchCount:3 })
    );
  }

  const workingDays = days.slice(0, 4);
  const onlineDay   = days[4] || days[days.length - 1];
  const results     = [];

  for (const division of divisions) {
    const { divisionId, label, yearId, batchCount } = division;
    const divLetter  = divisionId.split('-')[1];
    const subjectMap = buildDivSubjectMap(allocations, yearId, divLetter);

    const labWin   = DIV_LAB_WINDOW[divisionId] || { start:0, end:1, labLast:false };
    const labSlotA = labWin.start;
    const labSlotB = labWin.end;
    const labLast  = labWin.labLast;

    const daySlots = {};
    for (const d of days) daySlots[d] = new Set();
    const cells = [];

    // Track which day each batch has a lab, to spread batches across days
    // batchLabDay[batch] = dayIndex used
    const batchLabDay = {};
    let labDayIdx = 0; // rolling day pointer

    // ─────────────────────────────────────────────────────────────────
    // STEP 1a: MAD + SAD consecutive 1hr labs — each batch on its own day
    // Slot layout per day: labSlotA = MAD(batch), labSlotB = SAD(batch)
    // ─────────────────────────────────────────────────────────────────
    const hasMad = subjectMap['MAD'] && Object.keys(subjectMap['MAD'].lab).length > 0;
    const hasSad = subjectMap['SAD'] && Object.keys(subjectMap['SAD'].lab).length > 0;

    if (hasMad || hasSad) {
      // Collect all batches that have either MAD or SAD
      const madBatches = hasMad ? Object.keys(subjectMap['MAD'].lab).sort() : [];
      const sadBatches = hasSad ? Object.keys(subjectMap['SAD'].lab).sort() : [];
      const allBatches = [...new Set([...madBatches, ...sadBatches])].sort();

      for (const batch of allBatches) {
        // Find a day where:
        // 1. labSlotA and labSlotB are free for this division
        // 2. Teachers for this batch are free on both slots
        // 3. Rooms available
        let assigned = false;
        for (let attempt = 0; attempt < workingDays.length; attempt++) {
          const day = workingDays[(labDayIdx + attempt) % workingDays.length];

          // Division lab slots already taken on this day?
          if (daySlots[day].has(labSlotA) || daySlots[day].has(labSlotB)) continue;

          const tMad = hasMad && subjectMap['MAD'].lab[batch]
            ? subjectMap['MAD'].lab[batch].teacher : 'TBA';
          const tSad = hasSad && subjectMap['SAD'].lab[batch]
            ? subjectMap['SAD'].lab[batch].teacher : 'TBA';

          // Teacher clash check for both slots
          if (!teacherFreeForLabSlots(tMad, day, labSlotA, labSlotA, teacherBusy)) continue;
          if (!teacherFreeForLabSlots(tSad, day, labSlotB, labSlotB, teacherBusy)) continue;

          // Find 1 room free for both slots (MAD uses labSlotA, SAD uses labSlotB)
          const roomMad = findFreeLabRoom(day, labSlotA, labSlotA, roomBusy);
          if (!roomMad) continue;

          // Rooms can be same for back-to-back same batch
          const roomSad = findFreeLabRoom(day, labSlotB, labSlotB, roomBusy);
          if (!roomSad) continue;

          // Assign MAD → labSlotA
          if (hasMad && subjectMap['MAD'].lab[batch]) {
            roomBusy.add(`${roomMad}__${day}__${labSlotA}`);
            if (tMad !== 'TBA') {
              teacherBusy.add(`${tMad}__${day}__${labSlotA}`);
              updateTeacherFirstSlot(tMad, day, labSlotA, teacherFirstSlot);
            }
            if (labLast) daySlots[day].add(labSlotA);
            else         daySlots[day].add(labSlotA);
            cells.push({
              day, slotIndex: labSlotA, slotLabel: generatedSlots[labSlotA].label,
              subjectName: `${batch}:MAD(${tMad})`,
              subjectType: 'lab',
              teacherName: tMad,
              roomLabel: roomMad, roomId: roomMad,
              isFree: false, isLabBlock: true, labLast,
            });
          }

          // Assign SAD → labSlotB
          if (hasSad && subjectMap['SAD'].lab[batch]) {
            roomBusy.add(`${roomSad}__${day}__${labSlotB}`);
            if (tSad !== 'TBA') {
              teacherBusy.add(`${tSad}__${day}__${labSlotB}`);
              updateTeacherFirstSlot(tSad, day, labSlotB, teacherFirstSlot);
            }
            daySlots[day].add(labSlotB);
            cells.push({
              day, slotIndex: labSlotB, slotLabel: generatedSlots[labSlotB].label,
              subjectName: `${batch}:SAD(${tSad})`,
              subjectType: 'lab',
              teacherName: tSad,
              roomLabel: roomSad, roomId: roomSad,
              isFree: false, isLabBlock: true, labLast,
            });
          }

          batchLabDay[batch] = day;
          labDayIdx = (labDayIdx + attempt + 1) % workingDays.length;
          assigned = true;
          break;
        }
        if (!assigned) {
          // fallback: force assign on next day ignoring division slot conflict
          labDayIdx = (labDayIdx + 1) % workingDays.length;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 1b: Regular 2hr lab blocks (DS2, OS, SE, etc.)
    // KEY FIX: Each BATCH gets its OWN day
    // On a given lab day: B1→SubA, B2→SubB, B3→SubC (parallel, different subjects)
    // ─────────────────────────────────────────────────────────────────
    const regularLabSubs = Object.entries(subjectMap)
      .filter(([code, data]) =>
        Object.keys(data.lab).length > 0 &&
        !CONSECUTIVE_LAB_PAIR.includes(code)
      );

    // Build a per-batch rotation list: batch → [subjects in order]
    // We want: each day, each batch gets a DIFFERENT subject
    // Collect all batches and subjects
    const allLabBatches = new Set();
    for (const [, data] of regularLabSubs) {
      Object.keys(data.lab).forEach(b => allLabBatches.add(b));
    }
    const labBatchList = [...allLabBatches].sort(); // e.g. ['B1','B2','B3']
    const numBatches   = labBatchList.length;

    // For each subject, assign one batch per day, rotating
    // subjectBatchOffset: track which batch index each subject starts from
    // so subjects don't always give B1 to day1
    let globalBatchOffset = 0;

    for (const [code, data] of regularLabSubs) {
      const batches = Object.keys(data.lab).sort();
      const nBatches = batches.length;

      for (let bi = 0; bi < nBatches; bi++) {
        const batch   = batches[bi];
        const teacher = data.lab[batch]?.teacher || 'TBA';

        // Find a suitable day for this batch of this subject
        let assigned = false;
        for (let attempt = 0; attempt < workingDays.length * 2; attempt++) {
          const dayIdx = (labDayIdx + attempt) % workingDays.length;
          const day    = workingDays[dayIdx];

          // Division lab slots free on this day?
          if (daySlots[day].has(labSlotA) || daySlots[day].has(labSlotB)) continue;

          // Teacher free for both lab slots?
          if (!teacherFreeForLabSlots(teacher, day, labSlotA, labSlotB, teacherBusy)) continue;

          // Find a free lab room for both slots
          const room = findFreeLabRoom(day, labSlotA, labSlotB, roomBusy);
          if (!room) continue;

          // Assign
          roomBusy.add(`${room}__${day}__${labSlotA}`);
          roomBusy.add(`${room}__${day}__${labSlotB}`);
          if (teacher !== 'TBA') {
            teacherBusy.add(`${teacher}__${day}__${labSlotA}`);
            teacherBusy.add(`${teacher}__${day}__${labSlotB}`);
            updateTeacherFirstSlot(teacher, day, labSlotA, teacherFirstSlot);
          }
          daySlots[day].add(labSlotA);
          daySlots[day].add(labSlotB);

          for (const si of [labSlotA, labSlotB]) {
            cells.push({
              day, slotIndex: si, slotLabel: generatedSlots[si].label,
              subjectName: `${batch}:${code}(${teacher})`,
              subjectType: 'lab',
              teacherName: teacher,
              roomLabel: room, roomId: room,
              isFree: false, isLabBlock: true, labLast,
            });
          }

          labDayIdx = (dayIdx + 1) % workingDays.length;
          assigned  = true;
          break;
        }
        if (!assigned) {
          labDayIdx = (labDayIdx + 1) % workingDays.length;
        }
      }
      globalBatchOffset++;
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: Theory lectures
    // Special rule: IOT + MC theory → same day, same slot, different rooms
    // ─────────────────────────────────────────────────────────────────
    const hasIOT = subjectMap['IOT']?.theory;
    const hasMC  = subjectMap['MC']?.theory;

    // Schedule IOT + MC together first if both exist
    if (hasIOT && hasMC) {
      const tIOT = subjectMap['IOT'].theory.teacher;
      const tMC  = subjectMap['MC'].theory.teacher;
      const hrsIOT = subjectMap['IOT'].theory.hours; // 2
      const hrsMC  = subjectMap['MC'].theory.hours;  // 2
      const pairsToSchedule = Math.min(hrsIOT, hrsMC);
      let iotScheduled = 0;
      let mcScheduled  = 0;

      // Try to schedule them on the SAME slot same day
      for (let pair = 0; pair < pairsToSchedule; pair++) {
        let paired = false;
        const sortedDays = [...workingDays].sort((a, b) => daySlots[a].size - daySlots[b].size);

        for (const day of sortedDays) {
          if (paired) break;
          if (daySlots[day].size >= MAX_PER_DAY) continue;

          for (let si = 0; si < totalSlots; si++) {
            if (daySlots[day].has(si)) continue;
            if (si === labSlotA || si === labSlotB) continue;

            // Both teachers must be free
            if (tIOT && tIOT !== 'TBA' && teacherBusy.has(`${tIOT}__${day}__${si}`)) continue;
            if (tMC  && tMC  !== 'TBA' && teacherBusy.has(`${tMC}__${day}__${si}`))  continue;

            // Need 2 different classrooms
            const freeRooms = ROOM_POOLS.classroom.filter(r => !roomBusy.has(`${r}__${day}__${si}`));
            if (freeRooms.length < 2) continue;

            const roomIOT = freeRooms[0];
            const roomMC  = freeRooms[1];

            // Assign IOT
            roomBusy.add(`${roomIOT}__${day}__${si}`);
            if (tIOT && tIOT !== 'TBA') {
              teacherBusy.add(`${tIOT}__${day}__${si}`);
              updateTeacherFirstSlot(tIOT, day, si, teacherFirstSlot);
            }

            // Assign MC
            roomBusy.add(`${roomMC}__${day}__${si}`);
            if (tMC && tMC !== 'TBA') {
              teacherBusy.add(`${tMC}__${day}__${si}`);
              updateTeacherFirstSlot(tMC, day, si, teacherFirstSlot);
            }

            daySlots[day].add(si);

            // Single cell with both subjects + both rooms
            cells.push({
              day, slotIndex: si, slotLabel: generatedSlots[si].label,
              subjectName: `IOT(${tIOT}) | MC(${tMC})`,
              subjectType: 'theory',
              teacherName: `${tIOT} | ${tMC}`,
              roomLabel:   `${roomIOT} | ${roomMC}`,
              roomId:       roomIOT,
              isFree: false,
            });

            iotScheduled++;
            mcScheduled++;
            paired = true;
            break;
          }
        }
      }

      // If IOT has extra hours beyond paired, schedule separately
      for (let i = iotScheduled; i < hrsIOT; i++) {
        let assigned = false;
        const sortedDays = [...workingDays].sort((a,b) => daySlots[a].size - daySlots[b].size);
        for (const day of sortedDays) {
          if (assigned) break;
          if (daySlots[day].size >= MAX_PER_DAY) continue;
          for (let si = 0; si < totalSlots; si++) {
            if (daySlots[day].has(si)) continue;
            if (si === labSlotA || si === labSlotB) continue;
            if (tIOT && tIOT !== 'TBA' && teacherBusy.has(`${tIOT}__${day}__${si}`)) continue;
            const room = ROOM_POOLS.classroom.find(r => !roomBusy.has(`${r}__${day}__${si}`));
            if (!room) continue;
            roomBusy.add(`${room}__${day}__${si}`);
            if (tIOT && tIOT !== 'TBA') { teacherBusy.add(`${tIOT}__${day}__${si}`); updateTeacherFirstSlot(tIOT, day, si, teacherFirstSlot); }
            daySlots[day].add(si);
            cells.push({ day, slotIndex: si, slotLabel: generatedSlots[si].label, subjectName: 'IOT', subjectType: 'theory', teacherName: tIOT || 'TBA', roomLabel: room, roomId: room, isFree: false });
            assigned = true; break;
          }
        }
      }

      // If MC has extra hours, schedule separately
      for (let i = mcScheduled; i < hrsMC; i++) {
        let assigned = false;
        const sortedDays = [...workingDays].sort((a,b) => daySlots[a].size - daySlots[b].size);
        for (const day of sortedDays) {
          if (assigned) break;
          if (daySlots[day].size >= MAX_PER_DAY) continue;
          for (let si = 0; si < totalSlots; si++) {
            if (daySlots[day].has(si)) continue;
            if (si === labSlotA || si === labSlotB) continue;
            if (tMC && tMC !== 'TBA' && teacherBusy.has(`${tMC}__${day}__${si}`)) continue;
            const room = ROOM_POOLS.classroom.find(r => !roomBusy.has(`${r}__${day}__${si}`));
            if (!room) continue;
            roomBusy.add(`${room}__${day}__${si}`);
            if (tMC && tMC !== 'TBA') { teacherBusy.add(`${tMC}__${day}__${si}`); updateTeacherFirstSlot(tMC, day, si, teacherFirstSlot); }
            daySlots[day].add(si);
            cells.push({ day, slotIndex: si, slotLabel: generatedSlots[si].label, subjectName: 'MC', subjectType: 'theory', teacherName: tMC || 'TBA', roomLabel: room, roomId: room, isFree: false });
            assigned = true; break;
          }
        }
      }

      // Remove IOT and MC from general theory queue
      delete subjectMap['IOT'].theory;
      delete subjectMap['MC'].theory;
    }

    // General theory queue (excluding IOT+MC already handled)
    const theoryQueue = [];
    for (const [code, data] of Object.entries(subjectMap)) {
      if (!data.theory) continue;
      const online = isOnline(code);
      for (let i = 0; i < data.theory.hours; i++) {
        theoryQueue.push({ code, teacher: data.theory.teacher, online });
      }
    }
    theoryQueue.sort(() => Math.random() - 0.5);

    for (const lecture of theoryQueue) {
      const targetDays = lecture.online ? [onlineDay] : workingDays;
      let assigned     = false;
      const sortedDays = [...targetDays].sort((a, b) => daySlots[a].size - daySlots[b].size);

      for (const day of sortedDays) {
        if (assigned) break;
        if (daySlots[day].size >= MAX_PER_DAY) continue;
        for (let si = 0; si < totalSlots; si++) {
          if (daySlots[day].has(si)) continue;
          if (si === labSlotA || si === labSlotB) continue;
          const t = lecture.teacher;
          if (t && t !== 'TBA') {
            if (teacherBusy.has(`${t}__${day}__${si}`)) continue;
            if (!withinTeacherHours(t, day, si, teacherFirstSlot)) continue;
          }
          const room = ROOM_POOLS.classroom.find(r => !roomBusy.has(`${r}__${day}__${si}`));
          if (!room) continue;

          roomBusy.add(`${room}__${day}__${si}`);
          if (t && t !== 'TBA') { teacherBusy.add(`${t}__${day}__${si}`); updateTeacherFirstSlot(t, day, si, teacherFirstSlot); }
          daySlots[day].add(si);
          cells.push({
            day, slotIndex: si, slotLabel: generatedSlots[si].label,
            subjectName: lecture.code, subjectType: 'theory',
            teacherName: t || 'TBA', roomLabel: room, roomId: room,
            isFree: false,
          });
          assigned = true;
          break;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: Tutorials
    // IOT: batch-wise → each batch on different day (same teacher = different day)
    // MC:  no batch → single tutorial slot
    // Others: as before
    // ─────────────────────────────────────────────────────────────────
    for (const [code, data] of Object.entries(subjectMap)) {
      if (Object.keys(data.tutorial).length === 0) continue;
      const online     = isOnline(code);
      const targetDays = online ? [onlineDay] : workingDays;

      for (const [batch, info] of Object.entries(data.tutorial)) {
        const t      = info?.teacher || 'TBA';
        let assigned = false;

        for (const day of targetDays) {
          if (assigned) break;
          if (daySlots[day].size >= MAX_PER_DAY) continue;
          for (let si = 0; si < totalSlots; si++) {
            if (daySlots[day].has(si)) continue;
            if (si === labSlotA || si === labSlotB) continue;
            if (t !== 'TBA') {
              if (teacherBusy.has(`${t}__${day}__${si}`)) continue;
              if (!withinTeacherHours(t, day, si, teacherFirstSlot)) continue;
            }
            const pool = [...ROOM_POOLS.tutorial, ...ROOM_POOLS.classroom];
            const room = pool.find(r => !roomBusy.has(`${r}__${day}__${si}`));
            if (!room) continue;

            roomBusy.add(`${room}__${day}__${si}`);
            if (t !== 'TBA') { teacherBusy.add(`${t}__${day}__${si}`); updateTeacherFirstSlot(t, day, si, teacherFirstSlot); }
            daySlots[day].add(si);

            const subLabel = batch === 'ALL' ? code : `${batch}:${code}`;
            cells.push({
              day, slotIndex: si, slotLabel: generatedSlots[si].label,
              subjectName: online ? `${subLabel} (ONLINE)` : subLabel,
              subjectType: 'tutorial',
              teacherName: t,
              roomLabel: online ? 'ONLINE' : room,
              roomId:    online ? 'ONLINE' : room,
              isFree: false,
            });
            assigned = true;
            break;
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // STEP 4: Fill free slots
    // ─────────────────────────────────────────────────────────────────
    for (const day of days) {
      for (let si = 0; si < totalSlots; si++) {
        if (!daySlots[day].has(si)) {
          cells.push({
            day, slotIndex: si, slotLabel: generatedSlots[si].label,
            subjectName: '', subjectType: 'free',
            teacherName: '', roomLabel: '', roomId: '',
            isFree: true,
          });
        }
      }
    }

    results.push({ divisionId, divisionLabel: label, yearId, cells });
  }

  return results;
}

module.exports = { generateTimetable, generateSlots };