const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');

const teachers = [
  { name: 'Prof. Dr. Sandip Shinde',     designation: 'Professor' },
  { name: 'Prof. Dr. Manik Dhore',       designation: 'Professor' },
  { name: 'Prof. Dr. Mandar Karyakarte', designation: 'Professor' },
  { name: 'Prof. Dr. Ganesh Bhutkar',    designation: 'Professor' },
  { name: 'Prof. Dr. Kirti Wanjale',     designation: 'Professor' },
  { name: 'Prof. Dr. Deepak Mane',       designation: 'Professor' },
  { name: 'Prof. Dr. Geeta Navale',      designation: 'Professor' },
  { name: 'Prof. Dr. Vinod Kimbahune',   designation: 'Professor' },
  { name: 'Prof. Karthick S',            designation: 'Professor' },
  { name: 'Dr. Pushkar Joglekar',        designation: 'Associate Professor' },
  { name: 'Dr. Radhika Kulkarni',        designation: 'Associate Professor' },
  { name: 'Dr. Aarti Agarkar',           designation: 'Associate Professor' },
  { name: 'Dr. Snehal Rathi',            designation: 'Associate Professor' },
  { name: 'Dr. Kaushalya Thopate',       designation: 'Associate Professor' },
  { name: 'Dr. Sachin Jadhav',           designation: 'Associate Professor' },
  { name: 'Dr. Sangita Lade',            designation: 'Associate Professor' },
  { name: 'Dr. Vidula Meshram',          designation: 'Associate Professor' },
  { name: 'Dr. Vishal Meshram',          designation: 'Associate Professor' },
  { name: 'Dr. Ranjitsingh Suryavanshi', designation: 'Associate Professor' },
  { name: 'Dr. Rakhi Bharadwaj',         designation: 'Associate Professor' },
  { name: 'Dr. Sonali Antad',            designation: 'Associate Professor' },
  { name: 'Dr. Shweta Tiwaskar',         designation: 'Associate Professor' },
  { name: 'Dr. Vidya Gaikwad',           designation: 'Associate Professor' },
  { name: 'Dr. Madhuri Karnik',          designation: 'Associate Professor' },
  { name: 'Dr. Disha Wankhede',          designation: 'Associate Professor' },
  { name: 'Dr. Shailaja Uke',            designation: 'Associate Professor' },
  { name: 'Dr. Smita Bhagwat',           designation: 'Associate Professor' },
  { name: 'Dr. Sheetal Phatangare',      designation: 'Associate Professor' },
  { name: 'Dr. Rashmi Kale',             designation: 'Associate Professor' },
  { name: 'Dr. Aarti Deshpande',         designation: 'Associate Professor' },
  { name: 'Dr. Dattatray Takale',        designation: 'Associate Professor' },
  { name: 'Dr. Supriya Telsang',         designation: 'Associate Professor' },
  { name: 'Dr. Amruta Vikas Patil',      designation: 'Associate Professor' },
  { name: 'Dr. Priyanka Kadam',          designation: 'Associate Professor' },
  { name: 'Saraswati Patil',             designation: 'Assistant Professor' },
  { name: 'Amol Bhilare',                designation: 'Assistant Professor' },
  { name: 'Dhiraj Jadhav',               designation: 'Assistant Professor' },
  { name: 'Anand Magar',                 designation: 'Assistant Professor' },
  { name: 'Pranali Chavan',              designation: 'Assistant Professor' },
  { name: 'Rahul Dagade',                designation: 'Assistant Professor' },
  { name: 'Vikas Maral',                 designation: 'Assistant Professor' },
  { name: 'Piyush Gawali',               designation: 'Assistant Professor' },
  { name: 'Gopal Deshmukh',              designation: 'Assistant Professor' },
  { name: 'Nagaraju Bogiri',             designation: 'Assistant Professor' },
  { name: 'Manisha More',                designation: 'Assistant Professor' },
  { name: 'Smita Mande',                 designation: 'Assistant Professor' },
  { name: 'Mayuri Shahir',               designation: 'Assistant Professor' },
  { name: 'Naina Kokate',                designation: 'Assistant Professor' },
  { name: 'Shilpa Katikar',              designation: 'Assistant Professor' },
  { name: 'Snehal Khajurgi',             designation: 'Assistant Professor' },
  { name: 'Jyoti Yadav',                 designation: 'Assistant Professor' },
  { name: 'Rohini Jadhav',               designation: 'Assistant Professor' },
  { name: 'Nilam Honmane',               designation: 'Assistant Professor' },
  { name: 'Shobha Patil',                designation: 'Assistant Professor' },
  { name: 'Sanyukta Deshmukh',           designation: 'Assistant Professor' },
  { name: 'Vikas Kolekar',               designation: 'Assistant Professor' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/edusched');
    console.log(' Connected to MongoDB');

    const exists = await Admin.findOne({ email: 'admin@edusched.com' });
    if (!exists) {
      await Admin.create({ email: 'admin@edusched.com', password: 'admin123', name: 'Admin' });
      console.log(' Admin created');
    } else {
      console.log('  Admin already exists');
    }

    await Teacher.deleteMany({});
    console.log('  Old teachers cleared');

    // Drop email index if exists
    try { await mongoose.connection.collection('teachers').dropIndex('email_1'); } catch(e) {}

    const inserted = await Teacher.insertMany(
      teachers.map((t, i) => ({
        name: t.name,
        designation: t.designation,
        phone: '',
        isActive: true,
      }))
    );

    console.log(` ${inserted.length} teachers added!`);
    inserted.forEach((t, i) => console.log(`   ${i+1}. ${t.name}`));
    mongoose.disconnect();
    console.log('\n Done!');
  } catch (err) {
    console.error(' Error:', err.message);
    mongoose.disconnect();
  }
};

seed();
