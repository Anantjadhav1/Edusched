const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Teacher = require('../models/Teacher');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// GET all teachers
router.get('/', protect, async (req, res) => {
  try {
    const teachers = await Teacher.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: teachers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST single teacher
router.post('/', protect, async (req, res) => {
  try {
    const { name, designation, phone } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const teacher = await Teacher.create({ name, designation, phone });
    res.status(201).json({ success: true, data: teacher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST bulk upload teachers from Excel
router.post('/bulk-upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(n => n === 'Teachers') || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0)
      return res.status(400).json({ success: false, message: 'Excel file is empty' });

    const errors = [];
    const created = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // Accept any column name variation
      const name = String(
        row['TeacherName'] || row['Name'] || row['Teacher Name'] || row['name'] || ''
      ).trim();

      const rawDesig = String(
        row['Designation'] || row['designation'] || row['Post'] || row['Role'] || ''
      ).trim().toLowerCase();

      const phone = String(row['Phone'] || row['phone'] || row['Contact'] || '').trim();

      // Skip empty rows
      if (!name) continue;

      // Map designation (flexible)
      let designation = 'Assistant Professor';
      if (rawDesig.includes('associate')) designation = 'Associate Professor';
      else if (rawDesig.includes('professor') || rawDesig.includes('prof')) designation = 'Professor';
      else if (rawDesig.includes('assistant')) designation = 'Assistant Professor';

      // Auto-detect from name prefix if designation not given
      if (!rawDesig) {
        if (name.startsWith('Prof. Dr.') || name.startsWith('Prof.Dr.')) designation = 'Professor';
        else if (name.startsWith('Dr.') || name.startsWith('Dr ')) designation = 'Associate Professor';
        else designation = 'Assistant Professor';
      }

      try {
        const teacher = await Teacher.create({
          name,
          designation,
          phone,
          email: `${name.toLowerCase().replace(/[^a-z]/g, '.')}@edusched.com`,
          isActive: true,
        });
        created.push(teacher);
      } catch (e) {
        errors.push(`Row ${rowNum}: Could not save "${name}" — ${e.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: `✅ ${created.length} teachers uploaded!${errors.length > 0 ? ` ⚠️ ${errors.length} errors.` : ''}`,
      created: created.length,
      errors,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update teacher
router.put('/:id', protect, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, data: teacher });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE teacher
router.delete('/:id', protect, async (req, res) => {
  try {
    await Teacher.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Teacher removed' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
