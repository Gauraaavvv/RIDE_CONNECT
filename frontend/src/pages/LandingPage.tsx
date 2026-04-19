import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useScroll, useTransform } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowRight,
  Car,
  ChevronRight,
  Gauge,
  LocateFixed,
  Pause,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
  type LucideIcon
} from 'lucide-react';
import { addNotification } from '../store/slices/notificationSlice';
import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { disconnectSocket } from '../services/socket';
import { clear as clearInbox } from '../store/slices/inboxSlice';
import { closeCall } from '../store/slices/callSlice';

type QuickAction = 'find-ride' | 'offer-ride' | 'rent-car' | 'hire-driver';

interface Scene {
  title: string;
  subtitle: string;
  video: string;
}

interface ActionCardData {
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  accentClass: string;
  action: QuickAction;
}

const HERO_SCENES: Scene[] = [
  {
    title: 'City Pulse',
    subtitle: 'Fast transitions with smart route layers',
    video: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4'
  },
  {
    title: 'Night Flow',
    subtitle: 'Cinematic motion with low-light depth',
    video: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4'
  },
  {
    title: 'Open Road',
    subtitle: 'Immersive travel storytelling at scale',
    video: 'https://samplelib.com/lib/preview/mp4/sample-15s.mp4'
  }
];

const ACTION_CARDS: ActionCardData[] = [
  {
    title: 'Find Ride',
    description: 'Browse available rides, lock your seat, and get moving in minutes.',
    cta: 'Find Ride',
    icon: LocateFixed,
    accentClass: 'from-cyan-400/20 via-cyan-300/0 to-transparent',
    action: 'find-ride'
  },
  {
    title: 'Offer Ride',
    description: 'Already heading somewhere? Share your ride and fill empty seats.',
    cta: 'Offer Ride',
    icon: Car,
    accentClass: 'from-emerald-400/20 via-emerald-300/0 to-transparent',
    action: 'offer-ride'
  },
  {
    title: 'Rent Car',
    description: 'Need your own ride? Choose a car and book it in seconds.',
    cta: 'Rent Car',
    icon: Gauge,
    accentClass: 'from-amber-300/20 via-amber-200/0 to-transparent',
    action: 'rent-car'
  },
  {
    title: 'Hire Driver',
    description: 'Sit back and relax. Book verified drivers for a smooth trip.',
    cta: 'Hire Driver',
    icon: UserRound,
    accentClass: 'from-sky-400/20 via-sky-300/0 to-transparent',
    action: 'hire-driver'
  }
];

const TRUST_POINTS = [
  'Verified users and drivers',
  'Clear ride details and pricing',
  'Safe and reliable experience'
];

const WHY_RIDECONNECT = [
  'Less waiting, more moving',
  'More comfort, less chaos',
  'Affordable for everyday use',
  'Built for real people, not just cities'
];

const FLOW_STEPS = [
  {
    id: '1',
    title: 'Choose',
    description: 'Pick a ride, car, or driver.'
  },
  {
    id: '2',
    title: 'Match',
    description: 'Get the best option instantly.'
  },
  {
    id: '3',
    title: 'Go',
    description: 'Simple as that.'
  }
];

interface ActionCardProps {
  item: ActionCardData;
  onAction: (action: QuickAction) => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ item, onAction }) => {
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const rotateX = useTransform(offsetY, [-16, 16], [8, -8]);
  const rotateY = useTransform(offsetX, [-16, 16], [-8, 8]);

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 32;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 32;
    offsetX.set(x);
    offsetY.set(y);
  };

  const handleMouseLeave = () => {
    offsetX.set(0);
    offsetY.set(0);
  };

  return (
    <motion.button
      type="button"
      onClick={() => onAction(item.action)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -8, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className="group relative overflow-hidden rounded-3xl border border-white/15 bg-[#0a1323]/90 p-6 text-left shadow-[0_18px_50px_-25px_rgba(0,0,0,0.75)]"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accentClass} transition-opacity duration-300 group-hover:opacity-100`} />
      <div className="relative z-10">
        <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-200">
          <item.icon className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-white">{item.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
        <div className="mt-5 inline-flex items-center text-sm font-medium text-cyan-200">
          {item.cta}
          <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </motion.button>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const [activeScene, setActiveScene] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 40 });

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const { scrollYProgress } = useScroll();

  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch(logout());
    dispatch(clearInbox());
    dispatch(closeCall());
    disconnectSocket();
    navigate('/');
  };

  const handleHeroAction = (action: 'signup' | 'login' | 'profile') => {
    if (action === 'signup') navigate('/register');
    if (action === 'login') navigate('/login');
    if (action === 'profile') navigate('/profile');
  };

  const handleQuickAction = (action: QuickAction) => {
    if (!isAuthenticated) {
      dispatch(
        addNotification({
          type: 'info',
          title: 'Login Required',
          message: 'Please login to use this action.',
          duration: 3000
        })
      );
      navigate('/login');
      return;
    }

    switch (action) {
      case 'find-ride':
        navigate('/rides');
        break;
      case 'offer-ride':
        navigate('/create-ride');
        break;
      case 'rent-car':
        navigate('/car-rental');
        break;
      case 'hire-driver':
        navigate('/driver-services');
        break;
      default:
        break;
    }
  };

  const handleHeroPointerMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    setPointer({ x: xPercent, y: yPercent });
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveScene((prev) => (prev + 1) % HERO_SCENES.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) {
      return;
    }

    video.muted = isMuted;
    if (isPaused) {
      video.pause();
      return;
    }

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        setIsPaused(true);
      });
    }
  }, [activeScene, isMuted, isPaused]);

  const welcomeLabel = isAuthenticated ? `Welcome back, ${user?.name ?? 'traveler'}` : 'Trusted rides, cars, and drivers';

  return (
    <div className="relative overflow-x-clip bg-[#04070d] text-slate-100">
      <motion.div
        className="fixed left-0 top-0 z-[70] h-[3px] w-full origin-left bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200"
        style={{ scaleX: scrollYProgress }}
      />

      <section
        className="relative isolate min-h-screen overflow-hidden px-4 pb-14 pt-28 sm:px-6 lg:px-8"
        onMouseMove={handleHeroPointerMove}
      >
        <div className="absolute inset-0">
          <motion.video
            key={HERO_SCENES[activeScene].video}
            ref={heroVideoRef}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            initial={{ opacity: 0.4, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          >
            <source src={HERO_SCENES[activeScene].video} type="video/mp4" />
          </motion.video>
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(3,7,18,0.88),rgba(5,13,28,0.45),rgba(5,10,20,0.88))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_52%)]" />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background: `radial-gradient(460px circle at ${pointer.x}% ${pointer.y}%, rgba(236, 253, 245, 0.18), transparent 58%)`
            }}
          />
        </div>

        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-between gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center rounded-full border border-white/20 bg-[#0b1628]/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-md">
              <Sparkles className="mr-2 h-4 w-4" />
              {welcomeLabel}
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-7xl">
              RideConnect
              <span className="block bg-gradient-to-r from-cyan-200 via-emerald-200 to-amber-100 bg-clip-text text-transparent">
                Less hassle. More comfort. Every ride.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Book rides, share seats, rent cars, or hire drivers, fast, simple, and affordable.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              {isAuthenticated ? (
                <>
                  <motion.button
                    type="button"
                    onClick={() => handleHeroAction('profile')}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-[0_12px_30px_-16px_rgba(255,255,255,0.95)]"
                  >
                    Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleLogout}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur-sm"
                  >
                    Logout {user?.name ? `(${user.name})` : ''}
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    type="button"
                    onClick={() => handleHeroAction('signup')}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-[0_12px_30px_-16px_rgba(255,255,255,0.95)]"
                  >
                    Sign Up
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => handleHeroAction('login')}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur-sm"
                  >
                    Login
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            className="surface-panel max-w-3xl p-4 sm:p-5"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <div className="flex flex-wrap items-center gap-3">
              {HERO_SCENES.map((scene, index) => (
                <button
                  type="button"
                  key={scene.title}
                  onClick={() => setActiveScene(index)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition-all sm:text-sm ${
                    activeScene === index
                      ? 'border-cyan-200/70 bg-cyan-100/15 text-cyan-100'
                      : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span className="block font-medium">{scene.title}</span>
                  <span className="block text-[11px] text-slate-400 sm:text-xs">{scene.subtitle}</span>
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaused((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label={isPaused ? 'Play hero video' : 'Pause hero video'}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label={isMuted ? 'Unmute hero video' : 'Mute hero video'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {ACTION_CARDS.map((item) => (
            <ActionCard key={item.title} item={item} onAction={handleQuickAction} />
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#060d1a] py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Value Section</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-4xl">Getting around shouldn&apos;t be this hard</h2>
            <p className="mt-4 max-w-xl text-slate-300">
              Rides cancel. Prices surge. Plans get messy.
              <span className="block pt-2">RideConnect keeps it simple, just pick and go.</span>
            </p>
          </div>

          <div className="surface-panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Trust Section</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">No surprises. No stress.</h3>
            <div className="mt-6 space-y-3">
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm text-slate-200">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">How It Works</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">How it works</h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FLOW_STEPS.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.55, delay: index * 0.12 }}
                className="relative rounded-3xl border border-white/15 bg-[#081124] p-6"
              >
                <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-cyan-100">
                  {step.id}
                </div>
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{step.description}</p>
                <div className="mt-5 inline-flex items-center text-sm text-cyan-200">
                  Simple as that
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[1.8rem] border border-white/15 bg-[#081124] p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Why RideConnect</p>
            <h3 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Why RideConnect?</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {WHY_RIDECONNECT.map((point) => (
                <div key={point} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-slate-100">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(110deg,#0f2036,#152f4e,#3f3a22)] p-8 sm:p-10">
            <div className="absolute -right-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cyan-200/20 blur-3xl" />
            <div className="absolute -left-20 top-0 h-52 w-52 rounded-full bg-amber-200/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">CTA Section</p>
                <h3 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Ready to move?</h3>
                <p className="mt-4 max-w-2xl text-slate-100/90">Find a ride in minutes or start offering seats and earn from your route.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <motion.button
                  type="button"
                  onClick={() => handleQuickAction('find-ride')}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900"
                >
                  Find a Ride
                  <ArrowRight className="ml-2 h-4 w-4" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleQuickAction('offer-ride')}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/5 px-6 py-3 font-semibold text-white"
                >
                  Start Offering
                  <Route className="ml-2 h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-8 right-8 z-30 hidden rounded-full border border-white/20 bg-[#081124]/70 p-3 text-cyan-100 shadow-xl backdrop-blur-md lg:block">
        <Route className="h-5 w-5" />
      </div>
    </div>
  );
};

export default LandingPage;
