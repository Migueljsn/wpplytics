import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WPPlytics',
  description: 'Dashboard interno para historico de conversas WhatsApp e analises quantitativas e qualitativas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
