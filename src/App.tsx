import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { db } from './lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LocationProvider } from './components/LocationContext';
import { MasterDataProvider } from './components/MasterDataContext';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

const HomeLandingView = lazy(() => import('./components/HomeLandingView'));
const CityView = lazy(() => import('./components/CityView'));
const CuisineView = lazy(() => import('./components/CuisineView'));
const RestaurantDetailsView = lazy(() => import('./components/RestaurantDetailsView'));
const BookTableView = lazy(() => import('./components/BookTableView'));
const TakeawayView = lazy(() => import('./components/TakeawayView'));
const QrMenuView = lazy(() => import('./components/QrMenuView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const OwnerDashboardView = lazy(() => import('./components/OwnerDashboardView'));
const AdminDashboardView = lazy(() => import('./components/AdminDashboardView'));
const AdminOnboardingView = lazy(() => import('./components/AdminOnboardingView'));
const AdminMallOnboardingView = lazy(() => import('./components/AdminMallOnboardingView'));
const PartnerLoginView = lazy(() => import('./components/PartnerLoginView'));
const PartnerDashboardView = lazy(() => import('./components/PartnerDashboardView'));
const ContactView = lazy(() => import('./components/ContactView'));
const PrivacyView = lazy(() => import('./components/PrivacyView'));
const TermsView = lazy(() => import('./components/TermsView'));
const CookiePolicyView = lazy(() => import('./components/CookiePolicyView'));
const ErrorView = lazy(() => import('./components/ErrorView'));
const OnboardingRequestView = lazy(() => import('./components/OnboardingRequestView'));
const AboutView = lazy(() => import('./components/AboutView'));
const MallFoodCourtView = lazy(() => import('./components/MallFoodCourtView'));
const CollectionView = lazy(() => import('./components/CollectionView'));

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
  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Light });
          await SplashScreen.hide();
        } catch (e) {
          console.error('Capacitor init error:', e);
        }
      }
    };
    initCapacitor();
  }, []);

  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <MasterDataProvider>
            <ScrollToTop />
            <LocationProvider>
              <Layout>
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[70vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<HomeLandingView />} />
                    <Route path="/:cityId" element={<CityView />} />
                    <Route path="/:cityId/:locationSlug" element={<CityView />} />
                    <Route path="/cuisine/:cuisineId" element={<CuisineView />} />
                    <Route path="/:city/collections/:collectionSlug" element={<CollectionView />} />
                    <Route path="/collections/:collectionSlug" element={<CollectionView />} />
                    <Route path="/:city/restaurant/:slug" element={<RestaurantDetailsView />} />
                    <Route path="/:city/restaurant/:slug/book" element={<BookTableView />} />
                    <Route path="/restaurant/:slug/book" element={<BookTableView />} />
                    <Route path="/:city/restaurant/:slug/takeaway" element={<TakeawayView />} />
                    <Route path="/restaurant/:slug/takeaway" element={<TakeawayView />} />
                    <Route path="/takeaway/:slug" element={<TakeawayView />} />
                    <Route path="/qr-menu/:slug" element={<QrMenuView />} />
                    <Route path="/:city/mall/:mallSlug" element={<MallFoodCourtView />} />
                    <Route path="/mall/:mallSlug" element={<MallFoodCourtView />} />
                    <Route path="/:city/restaurant/:slug/:tab" element={<RestaurantDetailsView />} />
                    <Route path="/restaurant/:slug" element={<RestaurantDetailsView />} />
                    <Route path="/book/:slug" element={<BookTableView />} />
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
                    <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerDashboardView /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboardView /></ProtectedRoute>} />
                    <Route path="/admin/onboard" element={<ProtectedRoute role="admin"><AdminOnboardingView /></ProtectedRoute>} />
                    <Route path="/admin/onboard-mall" element={<ProtectedRoute role="admin"><AdminMallOnboardingView /></ProtectedRoute>} />
                    <Route path="/admin/malls/:id/edit" element={<ProtectedRoute role="admin"><AdminMallOnboardingView /></ProtectedRoute>} />
                    <Route path="/partners/login" element={<PartnerLoginView />} />
                    <Route path="/partners/dashboard" element={<PartnerDashboardView />} />
                    <Route path="/contact" element={<ContactView />} />
                    <Route path="/contact-us" element={<ContactView />} />
                    <Route path="/privacy" element={<PrivacyView />} />
                    <Route path="/terms" element={<TermsView />} />
                    <Route path="/cookie-policy" element={<CookiePolicyView />} />
                    <Route path="/onboarding-request" element={<OnboardingRequestView />} />
                    <Route path="/about" element={<AboutView />} />
                    <Route path="/error" element={<ErrorView />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </Suspense>
              </Layout>
            </LocationProvider>
          </MasterDataProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}
