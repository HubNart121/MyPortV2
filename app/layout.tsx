import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { SidebarManager } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';

export const metadata: Metadata = {
  title: 'PORT_TRACK — Stock Portfolio Manager',
  description: 'บันทึกและติดตามการลงทุนในหุ้นหลายตัว คำนวณต้นทุนเฉลี่ย ปันผล และกำไรคาดการณ์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="font-outfit">
        <Providers>
          <AuthGuard>
            <div className="app-layout">
              <SidebarManager />
              <main className="main-content">
                {children}
              </main>
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
