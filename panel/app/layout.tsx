import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Vivat | Panel de gestión', description: 'Métricas, gastos y resultados de Vivat', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
