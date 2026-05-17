import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Infrastructure from './pages/Infrastructure';
import WorkConfig from './pages/WorkConfig';
import AcademicStructure from './pages/AcademicStructure';
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import GenerateTimetable from './pages/GenerateTimetable';
import ViewTimetable from './pages/ViewTimetable';
import Reschedule from './pages/Reschedule';
import Download from './pages/Download';

function PrivateRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:18}}>Loading...</div>;
  return admin ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="infrastructure"  element={<Infrastructure />} />
          <Route path="workconfig"      element={<WorkConfig />} />
          <Route path="structure"       element={<AcademicStructure />} />
          <Route path="teachers"        element={<Teachers />} />
          <Route path="subjects"        element={<Subjects />} />
          <Route path="generate"        element={<GenerateTimetable />} />
          <Route path="view"            element={<ViewTimetable />} />
          <Route path="reschedule"      element={<Reschedule />} />
          <Route path="download"        element={<Download />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
