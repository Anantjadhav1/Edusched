# 🎓 EduSched – Academic Timetable Scheduling System

A full-stack academic scheduling system built with **React + Node.js + Express + MongoDB**.

---

## 📁 Project Structure

```
edusched/
├── backend/                    ← Node.js + Express API
│   ├── models/
│   │   ├── Admin.js            ← JWT auth admin
│   │   ├── Room.js             ← Classrooms / Labs / Tutorial rooms
│   │   ├── WorkConfig.js       ← Working days, hours, slot config
│   │   ├── Year.js             ← Academic years + divisions
│   │   ├── Teacher.js          ← Teacher profiles
│   │   ├── Subject.js          ← Subjects per year
│   │   └── Timetable.js        ← Generated timetables
│   ├── routes/
│   │   ├── auth.js             ← Login / Register / Me
│   │   ├── infrastructure.js   ← Room CRUD
│   │   ├── workconfig.js       ← Work config + slot generation
│   │   ├── academic.js         ← Year + divisions
│   │   ├── teachers.js         ← Teacher CRUD
│   │   ├── subjects.js         ← Subject CRUD
│   │   └── timetable.js        ← Generate / View / Reschedule / Export
│   ├── middleware/
│   │   └── auth.js             ← JWT middleware
│   ├── utils/
│   │   ├── scheduler.js        ← 🧠 Core scheduling algorithm
│   │   └── seed.js             ← Create default admin
│   ├── server.js               ← Express app entry
│   └── .env                    ← Environment variables
│
└── frontend/                   ← React app
    └── src/
        ├── api/axios.js        ← Axios instance with JWT
        ├── context/AuthContext ← Auth state
        ├── components/layout/  ← Header + Sidebar layout
        └── pages/
            ├── Login.js
            ├── Dashboard.js
            ├── Infrastructure.js
            ├── WorkConfig.js
            ├── AcademicStructure.js
            ├── Teachers.js
            ├── Subjects.js
            ├── GenerateTimetable.js
            ├── ViewTimetable.js
            ├── Reschedule.js
            └── Download.js
```

---

## ⚙️ Prerequisites

- **Node.js** v18+
- **MongoDB** running locally (or MongoDB Atlas URI)
- **npm** or **yarn**

---

## 🚀 Setup & Run

### 1. Clone & Install

```bash
# Backend
cd edusched/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/edusched
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
```

### 3. Create Default Admin

```bash
cd backend
npm run seed
# Creates: admin@edusched.com / admin123
```

### 4. Run Backend

```bash
cd backend
npm run dev     # Development (with nodemon)
# OR
npm start       # Production
```

Backend runs at: `http://localhost:5000`

### 5. Run Frontend

```bash
cd frontend
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 🔐 Login

| Field    | Value               |
|----------|---------------------|
| Email    | admin@edusched.com  |
| Password | admin123            |

---

## 📋 Usage Workflow

Follow this order for first-time setup:

1. **Infrastructure** → Add classrooms, tutorial rooms, labs
2. **Work Config** → Set days, timings, slot duration → Save to generate slots
3. **Academic Structure** → Configure SY/TY/FY divisions count + mode
4. **Teachers** → Add teachers with subject expertise
5. **Subject Allocation** → Add subjects per year, assign teachers & type
6. **Generate Timetable** → Run the scheduling engine
7. **View Timetable** → See color-coded grid per division
8. **Reschedule** → Move lectures to free slots
9. **Download** → Export as CSV

---

## 🧠 Scheduling Algorithm

Located in `backend/utils/scheduler.js`

**Constraints enforced:**
- ✅ No teacher clashes (same teacher, same day, same slot across divisions)
- ✅ No room double-booking
- ✅ Room type matching (lab → lab room, tutorial → tutorial room)
- ✅ Max daily teaching hours per division
- ✅ Online divisions skip room allocation
- ✅ Buffer slots left free for rescheduling

---

## 🔌 API Endpoints

| Method | Endpoint                              | Description               |
|--------|---------------------------------------|---------------------------|
| POST   | /api/auth/login                       | Admin login               |
| GET    | /api/infrastructure                   | List rooms                |
| POST   | /api/infrastructure/generate          | Bulk generate rooms       |
| GET    | /api/workconfig                       | Get work config           |
| PUT    | /api/workconfig                       | Save + generate slots     |
| GET    | /api/academic                         | Get all years/divisions   |
| PUT    | /api/academic/:yearId                 | Set divisions + mode      |
| GET    | /api/teachers                         | List teachers             |
| POST   | /api/teachers                         | Add teacher               |
| GET    | /api/subjects?yearId=SY               | List subjects (by year)   |
| POST   | /api/subjects                         | Add subject               |
| POST   | /api/timetable/generate               | 🔥 Run scheduling engine  |
| GET    | /api/timetable/:divisionId            | Get timetable             |
| PUT    | /api/timetable/:divisionId/reschedule | Move a lecture            |
| GET    | /api/timetable/:divisionId/export     | Download CSV              |

---

## 🎨 UI Color Scheme

Inspired by Vishwakarma Institute of Technology portal:
- Header: `#6b1a1a` (dark maroon)
- Cards: `#c8cfe8` (lavender-blue)
- Accent: `#3a5bc7` (mid blue)
- Text: `#1e2a5e` (deep navy)
