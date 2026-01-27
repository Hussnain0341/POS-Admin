import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Licenses from './pages/Licenses';
import LicenseDetail from './pages/LicenseDetail';
import Updates from './pages/Updates';
import UploadVersion from './pages/UploadVersion';
import VersionHistory from './pages/VersionHistory';
import VersionDetail from './pages/VersionDetail';
import UpdateLogs from './pages/UpdateLogs';
import ChangePassword from './pages/ChangePassword';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="licenses/:id" element={<LicenseDetail />} />
          <Route path="updates" element={<Updates />} />
          <Route path="updates/upload" element={<UploadVersion />} />
          <Route path="updates/history" element={<VersionHistory />} />
          <Route path="updates/:id" element={<VersionDetail />} />
          <Route path="updates/logs" element={<UpdateLogs />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
