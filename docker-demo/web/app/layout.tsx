import type { ReactNode } from 'react';

export const metadata = {
  title: 'Docker Concepts Demo',
  description: 'Next.js + Express + Postgres demo containerized with Docker'
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
