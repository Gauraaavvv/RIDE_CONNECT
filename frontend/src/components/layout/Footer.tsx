import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Mail, Phone } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#03070f] text-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.16),transparent_40%)]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          <div className="inline-flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-100">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">RideConnect</div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Less hassle. More comfort.</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              href="mailto:supportrideconnect@gmail.com"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 transition hover:bg-white/10"
            >
              <Mail className="h-4 w-4 text-cyan-200" />
              supportrideconnect@gmail.com
            </a>
            <a
              href="tel:+91-XXXXX-XXXXX"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4 text-cyan-200" />
              +91 XXXXX XXXXX
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Links</h3>
          <div className="mt-4 grid gap-2 text-sm">
            <Link to="/" className="rounded-lg px-2 py-1.5 transition hover:bg-white/10 hover:text-white">
              Home
            </Link>
            <Link to="/rides" className="rounded-lg px-2 py-1.5 transition hover:bg-white/10 hover:text-white">
              Find Ride
            </Link>
            <Link to="/car-rental" className="rounded-lg px-2 py-1.5 transition hover:bg-white/10 hover:text-white">
              Rent Car
            </Link>
            <Link to="/driver-services" className="rounded-lg px-2 py-1.5 transition hover:bg-white/10 hover:text-white">
              Hire Driver
            </Link>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 px-4 py-5 text-center text-sm text-slate-400 sm:px-6 lg:px-8">
        © 2026 RideConnect. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
