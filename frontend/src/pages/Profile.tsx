import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Shield, Crown, Star, MapPin, 
  Users, Award, Edit, Settings,
  Car, CheckCircle
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { RootState } from '../store/store';
import { userAPI, achievementAPI } from '../services/api';
import PageShell from '../components/layout/PageShell';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, prefix = '', suffix = '', duration = 900, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return <span className={className}>{`${prefix}${displayValue}${suffix}`}</span>;
};

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  totalRides: number;
  totalDistance: number;
  moneySaved: number;
  isVerified: boolean;
  isPremium: boolean;
  joinDate: string;
  achievements: Achievement[];
  recentRides: RecentRide[];
  preferences: UserPreferences;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface RecentRide {
  id: string;
  source: string;
  destination: string;
  date: string;
  type: 'driver' | 'passenger';
  status: 'completed' | 'upcoming' | 'cancelled';
  rating?: number;
  amount: number;
}

interface UserPreferences {
  smoking: boolean;
  music: boolean;
  pets: boolean;
  luggage: boolean;
  notifications: boolean;
  privacy: 'public' | 'friends' | 'private';
}

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsPrivacy, setSettingsPrivacy] = useState<UserPreferences['privacy']>('public');
  const [settingsNotifications, setSettingsNotifications] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!userProfile) {
      return;
    }
    setSettingsPrivacy(userProfile.preferences.privacy);
    setSettingsNotifications(userProfile.preferences.notifications);
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!userProfile) {
      return;
    }
    setSavingSettings(true);
    try {
      await userAPI.updateProfile({
        preferences: {
          ...userProfile.preferences,
          privacy: settingsPrivacy,
          notifications: settingsNotifications,
        },
      });
      setUserProfile({
        ...userProfile,
        preferences: {
          ...userProfile.preferences,
          privacy: settingsPrivacy,
          notifications: settingsNotifications,
        },
      });
      dispatch(
        addNotification({
          type: 'success',
          title: 'Profile Updated!',
          message: 'Your settings have been saved.',
          duration: 5000,
        })
      );
    } catch {
      dispatch(
        addNotification({
          type: 'error',
          title: 'Save failed',
          message: 'Could not update settings. Try again.',
          duration: 5000,
        })
      );
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      setUserProfile(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [profRes, achList, ridesRes] = await Promise.all([
          userAPI.getProfile(),
          achievementAPI.list(),
          userAPI.getUserRides(),
        ]);
        if (cancelled) {
          return;
        }
        const u = profRes.user || profRes.data?.user;
        if (!u) {
          setUserProfile(null);
          return;
        }
        const bookings = ridesRes.bookings || ridesRes.data?.bookings || [];
        const uid = String(u.id);
        const recentRides: RecentRide[] = bookings.slice(0, 12).map((b: Record<string, unknown>) => {
          const ride = b.ride as Record<string, unknown> | undefined;
          const driverId = b.driver && typeof b.driver === 'object' && b.driver !== null && '_id' in b.driver
            ? String((b.driver as { _id: string })._id)
            : String(b.driver || '');
          const isDriver = driverId === uid;
          const st = String(b.status || '');
          let status: RecentRide['status'] = 'upcoming';
          if (st === 'completed') {
            status = 'completed';
          } else if (st === 'cancelled') {
            status = 'cancelled';
          }
          const rideDate = ride?.date ? new Date(String(ride.date)).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          return {
            id: String(b._id),
            source: String(ride?.source || '—'),
            destination: String(ride?.destination || '—'),
            date: rideDate,
            type: isDriver ? 'driver' : 'passenger',
            status,
            amount: Number(b.amount || 0),
          };
        });

        const phoneDisplay =
          typeof u.phone === 'string'
            ? u.phone.length === 10
              ? `+91 ${u.phone.slice(0, 5)} ${u.phone.slice(5)}`
              : u.phone
            : '';

        setUserProfile({
          id: uid,
          name: u.name,
          email: u.email,
          phone: phoneDisplay,
          avatar: u.avatar || '',
          rating: u.rating ?? 0,
          totalRides: u.totalRides ?? 0,
          totalDistance: u.totalDistance ?? 0,
          moneySaved: u.moneySaved ?? 0,
          isVerified: u.isVerified ?? false,
          isPremium: u.isPremium ?? false,
          joinDate: u.joinDate ? new Date(u.joinDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          achievements: (achList as Record<string, unknown>[]).map((a) => ({
            id: String(a.id),
            title: String(a.title),
            description: String(a.description || ''),
            icon: String(a.icon || '⭐'),
            unlocked: Boolean(a.unlocked),
            progress: Number(a.progress ?? 0),
            maxProgress: Number(a.maxProgress ?? 1),
          })),
          recentRides,
          preferences: {
            smoking: u.preferences?.smoking ?? false,
            music: u.preferences?.music ?? true,
            pets: u.preferences?.pets ?? false,
            luggage: u.preferences?.luggage ?? true,
            notifications: u.preferences?.notifications ?? true,
            privacy: (u.preferences?.privacy as UserPreferences['privacy']) || 'public',
          },
        });
      } catch {
        if (!cancelled) {
          dispatch(
            addNotification({
              type: 'error',
              title: 'Profile',
              message: 'Could not load your profile. Check that the API is running.',
              duration: 5000,
            })
          );
          setUserProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, dispatch]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'rides', label: 'Ride History', icon: Car },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  if (!isAuthenticated) {
    return (
      <PageShell className="flex min-h-screen items-center justify-center pt-20">
        <div className="surface-panel mx-auto max-w-md p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Your profile</h1>
          <p className="mb-6 text-slate-300">Sign in to view your stats, rides, and settings.</p>
          <Link to="/login" className="btn-primary inline-block">
            Sign in
          </Link>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell className="flex min-h-screen items-center justify-center pt-20">
        <div className="surface-panel flex flex-col items-center space-y-4 px-10 py-9">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-cyan-200/35 border-t-cyan-300" />
          <p className="text-slate-200">Loading profile...</p>
        </div>
      </PageShell>
    );
  }

  if (!userProfile) {
    return (
      <PageShell className="flex min-h-screen items-center justify-center pt-20">
        <p className="text-slate-300">Could not load profile.</p>
      </PageShell>
    );
  }

  return (
    <PageShell className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div
          className="card mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring" }}
            >
              <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {userProfile.name.split(' ').map(n => n[0]).join('')}
              </div>
              {userProfile.isVerified && (
                <Shield className="absolute -bottom-1 -right-1 w-6 h-6 text-blue-500 bg-white rounded-full p-1" />
              )}
              {userProfile.isPremium && (
                <Crown className="absolute -top-1 -right-1 w-6 h-6 text-yellow-500 bg-white rounded-full p-1" />
              )}
            </motion.div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-800">{userProfile.name}</h1>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="font-semibold text-slate-700">{userProfile.rating}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-slate-600 mb-4">
                <span>{userProfile.email}</span>
                <span>•</span>
                <span>Member since {new Date(userProfile.joinDate).toLocaleDateString()}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div
                  className="text-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  <AnimatedCounter value={userProfile.totalRides} className="text-2xl font-bold gradient-text" />
                  <div className="text-sm text-slate-600">Total Rides</div>
                </motion.div>
                <motion.div
                  className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  <AnimatedCounter value={userProfile.totalDistance} suffix=" km" className="text-2xl font-bold text-green-600" />
                  <div className="text-sm text-slate-600">Distance</div>
                </motion.div>
                <motion.div
                  className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg"
                  whileHover={{ scale: 1.05 }}
                >
                  <AnimatedCounter value={userProfile.moneySaved} prefix="₹" className="text-2xl font-bold text-orange-600" />
                  <div className="text-sm text-slate-600">Money Saved</div>
                </motion.div>
              </div>
            </div>

            {/* Edit Button */}
            <motion.button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-outline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <div className="flex space-x-1 rounded-xl border border-white/15 bg-white/5 p-1 backdrop-blur-sm">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'text-cyan-100'
                    : 'text-slate-300 hover:text-cyan-200'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="profile-tab-indicator"
                    className="absolute inset-0 rounded-lg border border-cyan-100/35 bg-cyan-100/15 shadow-md"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <tab.icon className="relative z-10 w-4 h-4" />
                <span className="relative z-10 font-medium">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                >
                  <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h2>
                  <div className="space-y-4">
                    {userProfile.recentRides.slice(0, 3).map((ride, index) => (
                      <motion.div
                        key={ride.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            ride.type === 'driver' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {ride.type === 'driver' ? <Car className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">
                              {ride.source} → {ride.destination}
                            </div>
                            <div className="text-sm text-slate-600">
                              {new Date(ride.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ride.status)}`}>
                            {ride.status}
                          </div>
                          {ride.rating && (
                            <div className="flex items-center mt-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-sm text-slate-600 ml-1">{ride.rating}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Quick Stats & Preferences */}
              <div className="space-y-6">
                {/* Preferences */}
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Preferences</h3>
                  <div className="space-y-3">
                    {Object.entries(userProfile.preferences).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 capitalize">{key}</span>
                        <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <motion.button
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-indigo-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Car className="w-5 h-5 text-indigo-600" />
                      <span className="text-slate-700">Create New Ride</span>
                    </motion.button>
                    <motion.button
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-green-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MapPin className="w-5 h-5 text-green-600" />
                      <span className="text-slate-700">Find Rides</span>
                    </motion.button>
                    <motion.button
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-purple-50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Crown className="w-5 h-5 text-purple-600" />
                      <span className="text-slate-700">Upgrade to Premium</span>
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'rides' && (
            <motion.div
              key="rides"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                <h2 className="text-xl font-bold text-slate-800 mb-6">Ride History</h2>
                <div className="space-y-4">
                  {userProfile.recentRides.map((ride, index) => (
                    <motion.div
                      key={ride.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          ride.type === 'driver' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {ride.type === 'driver' ? <Car className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">
                            {ride.source} → {ride.destination}
                          </div>
                          <div className="text-sm text-slate-600">
                            {new Date(ride.date).toLocaleDateString()} • {ride.type}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ride.status)}`}>
                          {ride.status}
                        </div>
                        <div className="text-lg font-bold text-slate-800 mt-1">₹{ride.amount}</div>
                        {ride.rating && (
                          <div className="flex items-center justify-end mt-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm text-slate-600 ml-1">{ride.rating}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                <h2 className="text-xl font-bold text-slate-800 mb-6">Achievements</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userProfile.achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        achievement.unlocked
                          ? 'border-green-200 bg-green-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`text-3xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${
                            achievement.unlocked ? 'text-slate-800' : 'text-slate-500'
                          }`}>
                            {achievement.title}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">{achievement.description}</p>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Progress</span>
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <motion.div
                                className={`h-2 rounded-full ${
                                  achievement.unlocked ? 'bg-green-500' : 'bg-slate-400'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((achievement.progress / achievement.maxProgress) * 100, 100)}%` }}
                                transition={{ delay: index * 0.1 + 0.5, duration: 1 }}
                              />
                            </div>
                          </div>
                        </div>
                        {achievement.unlocked && (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                <h2 className="text-xl font-bold text-slate-800 mb-6">Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Account Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                        <input type="email" value={userProfile.email} className="input-field settings-input" readOnly />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                        <input type="tel" value={userProfile.phone} className="input-field settings-input" readOnly />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Privacy Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Profile Visibility</span>
                        <select
                          className="input-field settings-input max-w-xs"
                          value={settingsPrivacy}
                          onChange={(e) => setSettingsPrivacy(e.target.value as UserPreferences['privacy'])}
                        >
                          <option value="public">Public</option>
                          <option value="friends">Friends Only</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Notifications</span>
                        <input
                          type="checkbox"
                          checked={settingsNotifications}
                          onChange={(e) => setSettingsNotifications(e.target.checked)}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>

                  <motion.button
                    onClick={handleSaveChanges}
                    disabled={savingSettings}
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    whileHover={{ scale: savingSettings ? 1 : 1.05 }}
                    whileTap={{ scale: savingSettings ? 1 : 0.95 }}
                  >
                    {savingSettings ? 'Saving…' : 'Save Changes'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default Profile; 
