import Link from "next/link";
import { getEligibleSupportCoursesAction } from "@/server/actions/garnet";
import {
  ShieldAlert,
  GraduationCap,
  Headphones,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  PhoneCall,
} from "lucide-react";

export const metadata = {
  title: "ارتقا و فعال‌سازی پشتیبانی ۳۶۰ | مشاهیر دانش",
  description: "دوره‌های دارای بسته پشتیبانی آموزشی ۳۶۰ درجه آزمون وکالت",
};

export default async function NoSupportAccessPage() {
  const eligibleCourses = await getEligibleSupportCoursesAction();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004071] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-900/20">
              م
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">پشتیبانی آموزشی مشاهیر دانش</h1>
              <p className="text-xs text-slate-500">سامانه جامع هدایت داوطلبان آزمون وکالت</p>
            </div>
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-[#004071] hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
          >
            <span>ورود مجدد</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full">
        {/* Notice Card */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 md:p-8 mb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 start-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-3">
            داوطلب گرامی، بسته پشتیبانی ۳۶۰ درجه برای حساب شما فعال نیست
          </h2>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed mb-6">
            شما با موفقیت در حساب کاربری مشاهیر دانش احراز هویت شدید، اما دوره ثبت‌نامی شما فاقد بسته هدایت و
            پشتیبانی تحصیلی ۳۶۰ درجه است. برای ورود به داشبورد و ارتباط مستقیم با پشتیبان رتبه‌برتر،
            می‌توانید یکی از دوره‌های ویژه زیر را در سامانه مرکزی مشاهیر دانش انتخاب و ثبت‌نام نمایید.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-4 text-xs md:text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تماس تلفنی مستقیم با پشتیبان
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              برنامه‌ریزی مطالعاتی هفتگی شنبه تا جمعه
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <Headphones className="w-4 h-4 text-emerald-600" />
              پایش تحلیلی آزمون‌ها و تریاژ آموزشی
            </span>
          </div>
        </div>

        {/* Eligible Courses Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#004071]" />
                دوره‌های دارای بسته پشتیبانی ۳۶۰ درجه مشاهیر دانش
              </h3>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                با تهیه هر یک از دوره‌های زیر، دسترسی حساب شما به این داشبورد بلافاصله فعال می‌گردد.
              </p>
            </div>
            <span className="text-xs bg-blue-50 text-[#004071] border border-blue-200 px-3 py-1 rounded-full font-bold">
              {eligibleCourses.length} دوره مجاز
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eligibleCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                      کد دوره: {course.courseCode}
                    </span>
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      شامل پشتیبانی ۳۶۰
                    </span>
                  </div>

                  <h4 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-[#004071] transition-colors mb-2">
                    {course.courseName}
                  </h4>

                  <p className="text-xs md:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {course.description ||
                      "بسته جامع آمادگی آزمون وکالت کانون وکلای دادگستری و مرکز وکلای قوه قضائیه به همراه پشتیبان تحصیلی اختصاصی و تماس‌های هفتگی."}
                  </p>

                  <ul className="space-y-2 mb-4 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>پشتیبان اختصاصی رتبه‌برتر با تماس‌های صوتی امن دوطرفه</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>جدول تکالیف و بودجه‌بندی دروس حقوقی (مدنی، جزا، تجارت، آیین دادرسی)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>ارزیابی تراز و رتبه در آزمون‌های ادواری مشاهیر دانش</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">شهریه و سرمایه‌گذاری:</span>
                    <span className="text-base font-black text-slate-800">
                      {course.priceFormatted}
                    </span>
                  </div>

                  <a
                    href={course.garnetPurchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#004071] hover:bg-blue-900 text-white font-bold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all"
                  >
                    <span>ثبت‌نام در سامانه مرکزی مشاهیر دانش</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Contact Helpline */}
        <div className="bg-gradient-to-r from-blue-900 to-[#004071] rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-center gap-4 text-center md:text-start">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h4 className="font-bold text-base md:text-lg mb-1">
                نیاز به راهنمایی در خصوص ارتقای دوره دارید؟
              </h4>
              <p className="text-xs md:text-sm text-blue-100">
                کارشناسان آموزش مشاهیر دانش آماده راهنمایی شما برای انتخاب مناسب‌ترین بسته تحصیلی هستند.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="tel:02191000000"
              className="bg-white text-[#004071] hover:bg-slate-100 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <span>تماس با امور داوطلبان</span>
              <span className="font-mono text-xs">۰۲۱-۹۱۰۰۰۰۰۰</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>موسسه آموزش عالی آزاد مشاهیر دانش • کلیه حقوق محفوظ است © ۱۴۰۳</p>
      </footer>
    </div>
  );
}
