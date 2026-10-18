import Link from "next/link";

export default function NotFound() {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-[#004071] px-6 text-center text-white selection:bg-amber-500 selection:text-black font-vazirmatn"
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl max-w-md w-full">
        <span className="text-6xl font-black tracking-widest text-amber-400">۴۰۴</span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">صفحه مورد نظر یافت نشد</h1>
        <p className="mt-2 text-sm text-sky-100/80 leading-relaxed">
          آدرس وارد شده معتبر نیست یا صفحه به نشانی دیگری منتقل شده است.
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-6 text-sm font-semibold text-neutral-950 transition-all hover:bg-amber-400 active:scale-95 shadow-lg shadow-amber-500/20"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}
