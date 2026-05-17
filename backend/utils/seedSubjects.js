const mongoose = require('mongoose');
require('dotenv').config();

const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');

// ── Subject Master ─────────────────────────────────────────
const SUBJECT_MASTER = {
  // SY
  'DS2':     { name: 'Data Structures II',              code: 'CS2305', year: 'SY' },
  'TOC':     { name: 'Theory of Computation',            code: 'CS2306', year: 'SY' },
  'OS':      { name: 'Operating System',                 code: 'CS2307', year: 'SY' },
  'SE':      { name: 'Software Engineering',             code: 'CS2308', year: 'SY' },
  'MAD':     { name: 'Mobile App Development',           code: 'CS2309', year: 'SY' },
  'Micro':   { name: 'Microcontroller',                  code: 'CSM001', year: 'SY' },

  // TY
  'WT':      { name: 'Web Technology',                   code: 'CS3215', year: 'TY' },
  'CD':      { name: 'Compiler Design',                  code: 'CS3053', year: 'TY' },
  'DAA':     { name: 'Design & Analysis of Algorithm',   code: 'CS3205', year: 'TY' },
  'SMD':     { name: 'Software Modelling & Design',      code: 'CS3061', year: 'TY' },
  'SAD':     { name: 'Software Application Development', code: 'SAD001', year: 'TY' },
  'AI':      { name: 'Artificial Intelligence',          code: 'AI001',  year: 'TY' },
  'IOT':     { name: 'Internet of Things',               code: 'IOT001', year: 'TY' },
  // FY
  
};

// ── Teacher → Subject Mapping ──────────────────────────────
// Format: [subjectShort, type (theory/lab/tutorial), weeklyHours]
const TEACHER_SUBJECTS = {
  'Prof. Dr. Sandip Shinde':     [['CIS','theory',4],['CIS','lab',2],['CIS','tutorial',2],['DT','tutorial',2]],
  'Prof. Dr. Ganesh Bhutkar':    [['HCI','theory',4],['SMD','theory',4],['SMD','lab',8],['SMD','tutorial',3],['DT','tutorial',1]],
  'Prof. Dr. Kirti Wanjale':     [['Micro','theory',4],['Micro','lab',8],['Micro','tutorial',3],['DT','tutorial',1]],
  'Prof. Dr. Geeta Navale':      [['OS','theory',4],['SE','theory',4],['OS','lab',4],['SE','lab',8],['RAD','tutorial',2]],
  'Prof. Dr. Vinod Kimbahune':   [['DAA','theory',3],['DAA','lab',14],['DT','tutorial',1]],
  'Dr. Pushkar Joglekar':        [['DAA','theory',4],['TOC','theory',4],['DAA','lab',6],['SAD','lab',2],['DAA','tutorial',3],['DT','tutorial',2],['RAD','tutorial',1]],
  'Dr. Radhika Kulkarni':        [['AI','theory',4],['DS2','theory',4],['AI','lab',4],['AI','tutorial',1],['DT','tutorial',1]],
  'Dr. Aarti Agarkar':           [['DAA','theory',4],['TOC','theory',4],['DAA','lab',6],['SAD','lab',4],['DAA','tutorial',3],['DT','tutorial',1]],
  'Dr. Snehal Rathi':            [['DS2','theory',4],['SMD','theory',4],['DS2','lab',6],['SMD','lab',4],['SMD','tutorial',3],['DT','tutorial',1]],
  'Dr. Kaushalya Thopate':       [['IOT','theory',6],['IOT','tutorial',10],['DT','tutorial',2],['FCTC','tutorial',1]],
  'Dr. Sachin Jadhav':           [['PC','theory',3],['PC','lab',14],['DT','tutorial',1]],
  'Dr. Sangita Lade':            [['OS','theory',4],['PC','theory',2],['OS','lab',12],['RAD','tutorial',2]],
  'Saraswati Patil':             [['OS','theory',4],['OS','lab',14],['RAD','tutorial',2]],
  'Dr. Vidula Meshram':          [['SE','theory',4],['SE','lab',14],['RAD','tutorial',2]],
  'Amol Bhilare':                [['DS2','theory',4],['DS2','lab',2]],
  'Dr. Ranjitsingh Suryavanshi': [['SE','theory',4],['MAD','lab',14],['RAD','tutorial',2]],
  'Dr. Rakhi Bharadwaj':         [['DS2','theory',4],['DS2','lab',12],['RAD','tutorial',2]],
  'Dr. Sonali Antad':            [['Micro','theory',4],['DS2','lab',8],['Micro','tutorial',6],['RAD','tutorial',2]],
  'Dr. Shweta Tiwaskar':         [['TOC','theory',4],['SAD','lab',8],['CD','lab',4],['CD','tutorial',2],['RAD','tutorial',2]],
  'Dr. Vidya Gaikwad':           [['OS','theory',4],['OS','lab',14],['RAD','tutorial',2]],
  'Dr. Madhuri Karnik':          [['SE','theory',4],['SE','lab',14],['RAD','tutorial',2]],
  'Dr. Disha Wankhede':          [['SE','theory',4],['SE','lab',14],['RAD','tutorial',2]],
  'Dr. Shailaja Uke':            [['OS','theory',4],['OS','lab',14],['RAD','tutorial',2]],
  'Dr. Smita Bhagwat':           [['OS','theory',2],['IOT','theory',4],['OS','lab',4],['IOT','lab',8],['RAD','tutorial',2]],
  'Dhiraj Jadhav':               [['DS2','theory',2],['MAD','lab',16],['DT','tutorial',1]],
  'Dr. Sheetal Phatangare':      [['CD','theory',4],['CD','lab',10],['CD','tutorial',5],['DT','tutorial',1]],
  'Anand Magar':                 [['WT','theory',4],['WT','lab',10],['WT','tutorial',5],['DT','tutorial',1]],
  'Dr. Rashmi Kale':             [['SE','theory',2],['PC','theory',2],['SE','lab',6],['PC','lab',8],['RAD','tutorial',2]],
  'Pranali Chavan':              [['TOC','theory',6],['SAD','lab',8],['CD','lab',2],['LINKEDIN','tutorial',2],['RAD','tutorial',2]],
  'Rahul Dagade':                [['TOC','theory',6],['SAD','lab',10],['LINKEDIN','tutorial',1],['RAD','tutorial',2],['FCTC','tutorial',1]],
  'Dr. Aarti Deshpande':         [['TOC','theory',6],['SAD','lab',8],['CD','lab',4],['RAD','tutorial',2]],
  'Vikas Maral':                 [['DS2','theory',4],['DS2','lab',14],['RAD','tutorial',2]],
  'Dr. Dattatray Takale':        [['DS2','theory',4],['DS2','lab',8],['WT','lab',4],['WT','tutorial',2],['RAD','tutorial',2]],
  'Piyush Gawali':               [['DS2','theory',4],['DS2','lab',14],['RAD','tutorial',2]],
  'Gopal Deshmukh':              [['SE','theory',4],['SE','lab',12],['FCTC','tutorial',1]],
  'Nagaraju Bogiri':             [['DS2','theory',4],['DS2','lab',14],['RAD','tutorial',2]],
  'Dr. Supriya Telsang':         [['IOT','theory',6],['IOT','tutorial',11],['RAD','tutorial',2]],
  'Manisha More':                [['OS','theory',4],['OS','lab',12],['DS2','lab',2],['RAD','tutorial',2]],
  'Smita Mande':                 [['PC','theory',2],['DL','theory',3],['PC','lab',14],['DT','tutorial',1]],
  'Mayuri Shahir':               [['ML','theory',3],['ML','lab',16],['DT','tutorial',2],['FCTC','tutorial',1]],
  'Naina Kokate':                [['ML','theory',3],['ML','lab',14],['RAD','tutorial',2],['FCTC','tutorial',1]],
  'Shilpa Katikar':              [['CD','theory',4],['TOC','theory',2],['CD','lab',4],['CD','tutorial',6],['SWAYAM','tutorial',1],['RAD','tutorial',2],['FCTC','tutorial',4]],
  'Snehal Khajurgi':             [['OS','theory',4],['PC','theory',1],['OS','lab',6],['PC','lab',6],['RAD','tutorial',2],['FCTC','tutorial',1]],
  'Dr. Amruta Vikas Patil':      [['IOT','theory',4],['MAD','lab',10],['IOT','tutorial',4],['FCTC','tutorial',1]],
  'Dr. Priyanka Kadam':          [['SE','theory',4],['SE','lab',12],['FCTC','tutorial',1]],
  'Jyoti Yadav':                 [['IOT','theory',2],['CIS','lab',10],['CIS','tutorial',4],['RAD','tutorial',2],['FCTC','tutorial',1]],
  'Rohini Jadhav':               [['ML','theory',2],['ML','lab',18],['DT','tutorial',1]],
  'Nilam Honmane':               [['AI','theory',2],['IP','theory',2],['AI','lab',8],['AI','tutorial',5],['RAD','tutorial',2],['FCTC','tutorial',1]],
  'Shobha Patil':                [['WT','theory',4],['WT','lab',10],['WT','tutorial',5],['DT','tutorial',1]],
  'Sanyukta Deshmukh':           [['PC','theory',2],['DL','theory',1],['PC','lab',16],['FCTC','tutorial',1]],
  'Vikas Kolekar':               [['SMD','theory',2],['SMD','lab',14],['FCTC','tutorial',2]],
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edusched');
    console.log(' Connected to MongoDB\n');

    // Clear existing subjects
    await Subject.deleteMany({});
    console.log('  Old subjects cleared\n');

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const [teacherName, subjects] of Object.entries(TEACHER_SUBJECTS)) {
      // Find teacher
      const teacher = await Teacher.findOne({ name: { $regex: new RegExp(`^${teacherName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
      
      if (!teacher) {
        console.log(`  Teacher not found: ${teacherName} — skipping`);
        totalSkipped++;
        continue;
      }

      for (const [short, type, weeklyHours] of subjects) {
        const master = SUBJECT_MASTER[short];
        if (!master) continue;

        try {
          await Subject.create({
            name: master.name,
            code: master.code,
            yearId: master.year,
            type,
            teacherId: teacher._id,
            weeklyHours,
          });
          totalCreated++;
        } catch (e) {
          // Skip duplicates silently
        }
      }
    }

    console.log(` ${totalCreated} subject entries created!`);
    if (totalSkipped > 0) console.log(`⚠️  ${totalSkipped} teachers not found — run seedTeachers.js first!`);

    // Summary
    const sy = await Subject.countDocuments({ yearId: 'SY' });
    const ty = await Subject.countDocuments({ yearId: 'TY' });
    const fy = await Subject.countDocuments({ yearId: 'FY' });
    console.log(`\n Summary:`);
    console.log(`   SY subjects: ${sy}`);
    console.log(`   TY subjects: ${ty}`);
    console.log(`   FY subjects: ${fy}`);
    console.log(`   Total: ${sy + ty + fy}`);
    console.log('\n Done! Go to Subject Allocation page to verify.');

    mongoose.disconnect();
  } catch (err) {
    console.error(' Error:', err.message);
    mongoose.disconnect();
  }
};

seed();
