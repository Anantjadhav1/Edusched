const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ─── Middleware ────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/infrastructure', require('./routes/infrastructure'));
app.use('/api/workconfig',     require('./routes/workconfig'));
app.use('/api/academic',       require('./routes/academic'));
app.use('/api/teachers',       require('./routes/teachers'));
app.use('/api/subjects',       require('./routes/subjects'));
app.use('/api/timetable',      require('./routes/timetable'));
app.use('/api/allocation',     require('./routes/allocation'));

// ─── Health check ─────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'EduSched API running' }));

// ─── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

// ─── Connect MongoDB & Start Server ───────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(' MongoDB Connected');
    app.listen(process.env.PORT, () =>
      console.log(` Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch(err => {
    console.error(' MongoDB connection error:', err.message);
    process.exit(1);
  });