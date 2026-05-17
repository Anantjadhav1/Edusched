const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// GET all subjects
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.query.yearId ? { yearId: req.query.yearId } : {};
    const subjects = await Subject.find(filter).populate('teacherId', 'name email').sort({ yearId: 1, name: 1 });
    res.json({ success: true, data: subjects });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST create single subject
router.post('/', protect, async (req, res) => {
  try {
    const { name, code, yearId, div, type, batch, teacherId, weeklyHours } = req.body;
    if (!name || !code || !yearId || !type || !teacherId || !weeklyHours)
      return res.status(400).json({ success: false, message: 'All fields required' });
    const subject = await Subject.create({ name, code, yearId, div: div || '', type, batch: batch || '', teacherId, weeklyHours });
    const populated = await subject.populate('teacherId', 'name email');
    res.status(201).json({ success: true, data: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST bulk upload — Excel: Year | Div | Subject | Type | Batch | Name of Faculty | Weekly hours
router.post('/bulk-upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0)
      return res.status(400).json({ success: false, message: 'Excel file is empty' });

    const errors = [];
    const created = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const yearId      = String(row['Year']            || '').trim().toUpperCase();
      const div         = String(row['Div']             || '').trim().toUpperCase();
      const name        = String(row['Subject']         || '').trim();
      // normalize type to lowercase: Theory->theory, Lab->lab, Tutorial->tutorial
      const type        = String(row['Type']            || '').trim().toLowerCase();
      const batch       = String(row['Batch']           || '').trim().toUpperCase();
      const teacherName = String(row['Name of Faculty'] || '').trim();
      const weeklyHours = parseInt(row['Weekly hours']  || row['WeeklyHours'] || row['Weekly Hours']);

      // Skip empty rows
      if (!name && !teacherName && !yearId) continue;

      // Validate
      if (!['SY','TY','FY'].includes(yearId)) { errors.push(`Row ${rowNum}: Invalid Year "${yearId}"`); continue; }
      if (!name) { errors.push(`Row ${rowNum}: Subject empty`); continue; }
      if (!['theory','tutorial','lab'].includes(type)) { errors.push(`Row ${rowNum}: Invalid Type "${type}"`); continue; }
      if (!teacherName) { errors.push(`Row ${rowNum}: Faculty name empty`); continue; }
      if (isNaN(weeklyHours) || weeklyHours < 1) { errors.push(`Row ${rowNum}: Invalid Weekly hours`); continue; }

      // Find teacher — partial match (last name or full name)
      let teacher = await Teacher.findOne({
        name: { $regex: new RegExp(teacherName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        isActive: true
      });
      // fallback: match last word of teacher name
      if (!teacher) {
        const lastName = teacherName.split(' ').pop();
        teacher = await Teacher.findOne({ name: { $regex: new RegExp(lastName, 'i') }, isActive: true });
      }
      if (!teacher) { errors.push(`Row ${rowNum}: Teacher "${teacherName}" not found`); continue; }

      // Auto-generate code
      const codeParts = [yearId, div, name.replace(/\s+/g,'').substring(0,6).toUpperCase(), type.toUpperCase()];
      if (batch) codeParts.push(batch);
      const code = codeParts.join('-');

      try {
        const subject = await Subject.create({
          name, code, yearId,
          div: div || '',
          type,
          batch: batch || '',
          teacherId: teacher._id,
          weeklyHours,
        });
        created.push(subject);
      } catch (e) {
        errors.push(`Row ${rowNum}: Could not save "${name}" — ${e.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: `${created.length} subjects uploaded successfully${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      created: created.length,
      errors,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT update
router.put('/:id', protect, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('teacherId', 'name email');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, data: subject });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE single
router.delete('/:id', protect, async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE all
router.delete('/', protect, async (req, res) => {
  try {
    await Subject.deleteMany({});
    res.json({ success: true, message: 'All subjects deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;