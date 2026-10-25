import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { getSession } from "@/server/auth/guard";
import { getNavbarNotificationCounts } from "@/server/actions/notifications";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "پشتیبانی مشاهیر دانش",
    template: "%s | پشتیبانی مشاهیر دانش",
  },
  description:
    "پلتفرم پیشرفته پشتیبانی مشاهیر دانش - هدایت تحصیلی داوطلبان آزمون وکالت کانون وکلا و مرکز وکلای قوه قضائیه",
  openGraph: {
    title: "پشتیبانی مشاهیر دانش",
    description: "سامانه ۳۶۰ درجه پشتیبانی مشاهیر دانش ویژه داوطلبان آزمون وکالت",
    siteName: "پشتیبانی مشاهیر دانش",
    locale: "fa_IR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const notificationCounts = session
    ? await getNavbarNotificationCounts()
    : { unreadMessagesCount: 0, pendingTasksCount: 0, pendingReportsCount: 0 };

  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var saved = localStorage.getItem('mashahir_theme');
                if (saved === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-150">
        <Navbar
          userRole={session?.role || "STUDENT"}
          userName={session?.fullName}
          phoneNumber={session?.phoneNumber}
          unreadMessagesCount={notificationCounts.unreadMessagesCount}
          pendingTasksCount={notificationCounts.pendingTasksCount}
          pendingReportsCount={notificationCounts.pendingReportsCount}
        />
        <main className="container py-6 min-h-[calc(100vh-8rem)]">
          {children}
        </main>
        <footer className="w-full border-t border-border/40 py-4 text-center text-xs text-muted-foreground bg-background/80 backdrop-blur-xs">
          <div className="container mx-auto px-4">
            <p>تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
