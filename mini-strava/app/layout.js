// app/layout.js
import './globals.css'; // ดึงเอาสไตล์ Tailwind CSS มาใช้งาน

export const metadata = {
  title: 'Mini Strava App',
  description: 'Realtime GPS tracking application built with Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-neutral-50 antialiased">
        {children}
      </body>
    </html>
  );
}
