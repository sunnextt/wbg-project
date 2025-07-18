import '@/global.css';
import { AuthProvider } from 'lib/AuthContext'; 
import Navbar from '@/src/components/Navbar';
import { Layout } from '@/components/dom/Layout';

export const metadata = {
  title: 'Arcade Nexus',
  description: 'A web-based gaming platform with Next.js, Three.js, and Firebase authentication.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <AuthProvider>
          <Navbar />
          <Layout>{children}</Layout>
          <footer className="text-center text-sm py-4 border-t">
            © 2025 Arcade Nexus. All rights reserved.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}