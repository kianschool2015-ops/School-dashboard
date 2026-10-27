import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
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
    : { unreadMessagesCount: 0, pendingTasksCount: 0, pendingReportsCount: 0, unassignedStudentsCount: 0, openTriageCasesCount: 0, pendingExamsCount: 0 };

  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var saved = localStorage.getItem('mashahir_theme');
                if (saved === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B101E] text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-150">
        <AppShell
          userRole={session?.role || "STUDENT"}
          userName={session?.fullName}
          phoneNumber={session?.phoneNumber}
          unreadMessagesCount={notificationCounts.unreadMessagesCount}
          pendingTasksCount={notificationCounts.pendingTasksCount}
          pendingReportsCount={notificationCounts.pendingReportsCount}
          unassignedStudentsCount={notificationCounts.unassignedStudentsCount}
          openTriageCasesCount={notificationCounts.openTriageCasesCount}
          pendingExamsCount={notificationCounts.pendingExamsCount}
        >
          {children}
        </AppShell>
        {/* Institutional copyright verification: تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است */}
      </body>
    </html>
  );
}
