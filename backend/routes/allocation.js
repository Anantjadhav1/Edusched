const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const SubjectAllocation = require('../models/SubjectAllocation');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/allocation/upload - upload Excel, replace all data
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return res.status(400).json({ success: false, message: 'Excel is empty' });

    // Validate required columns
    const required = ['Year', 'Div', 'Subject', 'Type', 'Name of Faculty', 'Weekly hours'];
    const headers = Object.keys(rows[0]);
    for (const col of required) {
      if (!headers.includes(col)) return res.status(400).json({ success: false, message: `Missing column: ${col}` });
    }

    // Delete old data
    await SubjectAllocation.deleteMany({});

    // Parse and insert
    const docs = rows
      .filter(r => r['Year'] && r['Div'] && r['Subject'] && r['Type'] && r['Name of Faculty'] && r['Weekly hours'])
      .map(r => ({
        year:        String(r['Year']).trim().toUpperCase(),
        div:         String(r['Div']).trim().toUpperCase(),
        subject:     String(r['Subject']).trim().toUpperCase(),
        type:        String(r['Type']).trim(),
        batch:       r['Batch'] ? String(r['Batch']).trim().toUpperCase() : '',
        teacherName: String(r['Name of Faculty']).trim(),
        weeklyHours: Number(r['Weekly hours']),
      }));

    await SubjectAllocation.insertMany(docs);

    res.json({ success: true, message: `${docs.length} records imported`, count: docs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/allocation - delete all allocation data
router.delete('/', protect, async (req, res) => {
  try {
    await SubjectAllocation.deleteMany({});
    res.json({ success: true, message: 'All allocation data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/allocation - get all records
router.get('/', protect, async (req, res) => {
  try {
    const data = await SubjectAllocation.find().sort({ year: 1, div: 1, subject: 1 });
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;