import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Car, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { disconnectSocket } from '../../services/socket';
import { clear as clearInbox } from '../../store/slices/inboxSlice';
import { closeCall } from '../../store/slices/callSlice';

interface NavItem {
  path: string;
  label: string;
  requiresAuth?: boolean;
  dropdown?: { label: string; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home' },
  { path: '/rides', label: 'Find Ride' },
  { path: '/create-ride', label: 'Offer Ride' },
  { 
    path: '/car-rental', 
    label: 'Rent Car',
    dropdown: [
      { label: 'Find Cars', path: '/car-rental' },
      { label: 'List Your Car', path: '/list-car' }
    ]
  },
  { 
    path: '/driver-services', 
    label: 'Hire Driver',
    dropdown: [
      { label: 'Find Drivers', path: '/driver-services' },
      { label: 'Become Driver', path: '/become-driver' }
    ]
  },
  { path: '/profile', label: 'Profile', requiresAuth: true }
];

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.requiresAuth || isAuthenticated),
    [isAuthenticated]
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch(logout());
    dispatch(clearInbox());
    dispatch(closeCall());
    disconnectSocket();
    navigate('/');
  };

  const shellClass =
    isHome && !isScrolled
      ? 'border-transparent bg-transparent'
      : 'border-white/10 bg-[#04070d]/85 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.85)] backdrop-blur-xl';

  return (
    <motion.nav
      initial={{ y: -90 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${shellClass}`}
    >
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group inline-flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-cyan-100 backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-white/20">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-white">RideConnect</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">Less hassle. More comfort.</div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            const hasDropdown = item.dropdown && item.dropdown.length > 0;
            const isDropdownOpen = openDropdown === item.path;

            if (hasDropdown) {
              return (
                <div key={item.path} className="relative">
                  <button
                    onClick={() => setOpenDropdown(isDropdownOpen ? null : item.path)}
                    className={`relative rounded-xl px-4 py-2 text-sm font-medium transition flex items-center gap-1 ${
                      active || isDropdownOpen
                        ? 'bg-white/15 text-white'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                    <motion.div
                      animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                      className="w-3 h-3"
                    >
                      <svg viewBox="0 0 12 12" className="w-full h-full">
                        <path
                          d="M2 4l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1"
                          fill="none"
                        />
                      </svg>
                    </motion.div>
                    {(active || isDropdownOpen) && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-xl border border-cyan-100/35"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#04070d]/95 backdrop-blur-xl shadow-lg overflow-hidden"
                      >
                        {item.dropdown?.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.path}
                            to={dropdownItem.path}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-4 py-3 text-sm transition ${
                              location.pathname === dropdownItem.path
                                ? 'bg-white/15 text-white'
                                : 'text-slate-200 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {dropdownItem.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative rounded-xl px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-xl border border-cyan-100/35"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <NotificationDropdown />
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                <User className="h-4 w-4 text-cyan-100" />
                <span className="max-w-[120px] truncate">{user?.name ?? 'Account'}</span>
                {user?.isVerified && <ShieldCheck className="h-4 w-4 text-emerald-300" />}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:translate-y-[-1px]"
              >
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white md:hidden"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="border-t border-white/10 bg-[#050b15]/95 px-4 pb-5 pt-2 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-2">
              {visibleItems.map((item) => {
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'border border-cyan-100/30 bg-cyan-100/10 text-white'
                        : 'border border-transparent text-slate-100 hover:border-white/15 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-medium text-slate-100"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="rounded-2xl border border-white/20 px-3 py-3 text-center text-sm font-medium text-slate-100"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-2xl bg-white px-3 py-3 text-center text-sm font-semibold text-slate-900"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
