import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LocationProvider } from './components/LocationContext';
import Layout from './components/Layout';
import LandingView from './components/LandingView';
import RestaurantDetailsView from './components/RestaurantDetailsView';
import DashboardView from './components/DashboardView';
import OwnerDashboardView from './components/OwnerDashboardView';
import AdminDashboardView from './components/AdminDashboardView';
import ContactView from './components/ContactView';
import PrivacyView from './components/PrivacyView';
import TermsView from './components/TermsView';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { profile, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
    </div>
  );

  if (!profile) return <Navigate to="/" />;
  
  if (role && profile.role !== role) {
    if (role === 'admin' && profile.role !== 'admin') return <Navigate to="/" />;
    if (role === 'owner' && profile.role !== 'owner' && profile.role !== 'admin') return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <LocationProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<LandingView />} />
              <Route path="/restaurant/:id" element={<RestaurantDetailsView />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
              <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerDashboardView /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboardView /></ProtectedRoute>} />
              <Route path="/contact" element={<ContactView />} />
              <Route path="/privacy" element={<PrivacyView />} />
              <Route path="/terms" element={<TermsView />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </LocationProvider>
      </AuthProvider>
    </Router>
  );
}
