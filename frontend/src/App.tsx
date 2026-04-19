import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { store } from './store/store';
import { loginSuccess } from './store/slices/authSlice';
import { authAPI } from './services/api';
import { initializeSocket, disconnectSocket } from './services/socket';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Toast from './components/ui/Toast';
import AppPreloader from './components/ui/AppPreloader';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RideList from './pages/RideList';
import CreateRide from './pages/CreateRide';
import Profile from './pages/Profile';
import CarRental from './pages/CarRental';
import DriverServices from './pages/DriverServices';
import BecomeDriver from './pages/BecomeDriver';
import ListCar from './pages/ListCar';
import './App.css';

const AppContent: React.FC = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowPreloader(false);
    }, 1100);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const user = await authAPI.getMe();
        if (!cancelled && user) {
          dispatch(loginSuccess(user));
          // Initialize socket connection after successful auth
          initializeSocket();
        }
      } catch {
        localStorage.removeItem('token');
        disconnectSocket();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#03070f]">
      <Navbar />
      <Toast />

      <AnimatePresence>{showPreloader && <AppPreloader />}</AnimatePresence>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
            transition={{ duration: 0.34, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/rides" element={<RideList />} />
              <Route path="/create-ride" element={<CreateRide />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/car-rental" element={<CarRental />} />
              <Route path="/driver-services" element={<DriverServices />} />
              <Route path="/become-driver" element={<BecomeDriver />} />
              <Route path="/list-car" element={<ListCar />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App; 
