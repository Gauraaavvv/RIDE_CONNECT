import React from 'react';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

const PageShell: React.FC<PageShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,#04070d,#071329_45%,#0a1630)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_85%_88%,rgba(251,191,36,0.16),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default PageShell;

