import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import FloatingChatbot from '../chat/FloatingChatbot';
import { cx } from '../../utils';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings, sidebarCollapsed } = useApp();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen bg-offwhite text-body font-body antialiased selection:bg-teal/20 selection:text-navy">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-teal focus:p-2 focus:text-white focus:rounded focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div
        className={cx(
          'transition-all duration-200 ease-in-out',
          sidebarCollapsed ? 'lg:pl-[70px]' : 'lg:pl-[210px]'
        )}
      >
        <TopNavbar onMenu={() => setOpen(true)} />

        {settings.showDemoBanner && (
          <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-1.5 text-xs text-muted sm:px-6">
            <FlaskConical className="h-3.5 w-3.5 text-teal shrink-0" aria-hidden />
            <span>
              Demo mode · simulated telemetry · demo astronaut · not clinically validated · not NASA-endorsed
            </span>
          </div>
        )}

        <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="animate-page">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Onboard Medical Intelligence Chatbot */}
      <FloatingChatbot />
    </div>
  );
}
