# دانشنامه و راهنمای جامع مهندسی و کاربری سامانه پشتیبانی مشاهیر دانش
# MASHAHIR DANESH 360° ACADEMIC COACHING & SUPPORT PLATFORM — VERSION 1.0 (OFFICIAL RELEASE)
## Master Engineering Specification, System Architecture & Operational Manual

---

> **سند مرجع شماره:** `MD-ENG-DOC-2026-V1.0`  
> **نگارش سامانه:** نسخه ۱.۰ رسمی (Official Release v1.0 - Production Ready)  
> **دامنه اجرایی:** سامانه جامع پشتیبانی ۳۶۰ درجه آموزشی و آمادگی آزمون وکالت (کانون وکلای دادگستری و مرکز وکلای قوه قضاییه)  
> **آدرس پروداکشن:** `https://support.mashahiredanesh.com` (سرور عملیاتی: `185.181.183.239`)  
> **وضعیت انطباق امنیتی و همزمانی:** ۱۰۰٪ منطبق بر الزامات ممیزی آنتی‌گرویتی (Antigravity Security & Scale Audit)  
> **نوع مستند:** دانشنامه فنی کامل (Technical Blueprint) + راهنمای جامع گام‌به‌گام برای ۴ لایه کاربری سازمانی

---

## فهرست سرفصل‌های مستند

1. [بخش اول: معرفی اجرایی و هویت سامانه (Executive Overview & System Identity)](#بخش-اول-معرفی-اجرایی-و-هویت-سامانه-executive-overview--system-identity)
   - ۱.۱ چشم‌انداز، رسالت و چالش‌های حل‌شده
   - ۱.۲ دیاگرام معماری کلان سامانه (High-Level Architecture Diagram)
   - ۱.۳ فهرست فناوری‌ها و کتابخانه‌های نرم‌افزاری (Full Tech Stack & Dependencies Inventory)
2. [بخش دوم: معماری فنی، ساختار سورس‌کد و پایگاه داده (Technical Architecture & Codebase Map)](#بخش-دوم-معماری-فنی-ساختار-سورس‌کد-و-پایگاه-داده-technical-architecture--codebase-map)
   - ۲.۱ نقشه کامل و تفصیلی کلیه پوشه‌ها و فایل‌های پروژه (Directory & File Blueprint)
   - ۲.۲ مرجع جامع و ستون‌به‌ستون ۳۴ جدول پایگاه داده PostgreSQL 16 (Full Database Schema & DDL Reference)
   - ۲.۳ موتور خودترمیم بوت‌استرپ و سیدینگ خودکار داده‌ها (Self-Healing Bootstrap & Initial Seeding)
   - ۲.۴ معماری امنیت صفر-اعتماد، رمزنگاری و احراز هویت (Zero-Trust Security, Cryptography & Auth)
   - ۲.۵ آبشار احراز هویت مرکزی و اعتبارسنجی دوره‌های LMS گارنت (Central SSO & Course Entitlement Waterfall)
   - ۲.۶ مدیریت چرخه حیات سشن و توکن‌های JWT (JWT & Session Token Lifecycle)
   - ۲.۷ ماتریس جامع دسترسی و سطوح کنترل دسترسی مبتنی بر نقش (Zero-Trust RBAC Permission Matrix)
   - ۲.۸ ماسک‌سازی هویت و پالایش داده‌های خصوصی (Zero-Knowledge PII Protection & Sanitization)
   - ۲.۹ موتور واترمارک قانونی استگانوگرافی نامرئی و ماژول رمزگشا (Forensic DRM Watermark & Decoder)
   - ۲.۱۰ موتور آزمون‌های زمان‌دار استاندارد آنلاین (High-Scale CBT Examination Engine)
   - ۲.۱۱ موتور ارتباطات صوتی امن دوطرفه با پروتکل استریسک AMI (Issabel PBX VoIP Bridge)
   - ۲.۱۲ صف پردازش ناهمگام Redis و کارگران پس‌زمینه BullMQ (Background Queue Architecture)
   - ۲.۱۳ گذرگاه رویدادها و اعلانات بلادرنگ (Real-Time Notification & Event Bus)
   - ۲.۱۴ کاتالوگ جامع کلیه اکشن‌های سرور و اندپوینت‌های API (Server Actions & API Routes Inventory)
3. [بخش سوم: راهنمای تفصیلی و گام‌به‌گام کاربری برای تمام نقش‌ها (User Manual for All 4 Roles)](#بخش-سوم-راهنمای-تفصیلی-و-گام‌به‌گام-کاربری-برای-تمام-نقش‌ها-user-manual-for-all-4-roles)
   - ۳.۱ راهنمای جامع لایه اول: داوطلب آزمون وکالت (`STUDENT`)
   - ۳.۲ راهنمای جامع لایه دوم: پشتیبان و منتور علمی اختصاصی (`MENTOR`)
   - ۳.۳ راهنمای جامع لایه سوم: سرپرست آموزشی و نظارت کلان (`SUPERVISOR`)
   - ۳.۴ راهنمای جامع لایه چهارم: مدیریت ارشد و مدیر سیستم (`CEO` / `ADMIN`)
4. [بخش چهارم: کتابچه عملیات دوآپس، استقرار سرور و رفع عیوب (DevOps, Production Deployment & Troubleshooting Runbook)](#بخش-چهارم-کتابچه-عملیات-دوآپس-استقرار-سرور-و-رفع-عیوب-devops-production-deployment--troubleshooting-runbook)
   - ۴.۱ کاتالوگ متغیرهای محیطی پروداکشن (`.env`)
   - ۴.۲ معماری داکر کانتینرها و بیلد چندمرحله‌ای (Multi-Stage Dockerfile & Docker Compose)
   - ۴.۳ گردش کار استقرار رسمی، بروزرسانی و پیکربندی Nginx Reverse Proxy و SSL
   - ۴.۴ برنامه زمان‌بندی پشتیبان‌گیری، بازیابی اضطراری و پایداری داده‌ها (Backup & Disaster Recovery)
   - ۴.۵ راهنمای جامع حل مشکلات متداول اجرایی و خطاهای سیستم (Production Troubleshooting Runbook)

---

# بخش اول: معرفی اجرایی و هویت سامانه (Executive Overview & System Identity)

## ۱.۱ چشم‌انداز، رسالت و چالش‌های حل‌شده

موسسه آموزش عالی «مشاهیر دانش»، به عنوان قطب تخصصی آماده‌سازی داوطلبان آزمون‌های حقوقی سراسر کشور (کانون وکلای دادگستری - اسکودا، و مرکز وکلای قوه قضاییه)، سالانه میزبان بیش از ۲۰۰٬۰۰۰ داوطلب است. با توجه به رقابت فوق‌العاده نفس‌گیر، ضریب شکست بالای داوطلبان فاقد برنامه‌ریزی شخصی‌سازی‌شده و حجم عظیم منابع قانونی، روش‌های سنتی مشاوره تحصیلی (تماس‌های پراکنده، ارسال برنامه با پیام‌رسان‌های غیربومی و آزمون‌های غیرسیستماتیک) با چالش‌های بنیادین زیر مواجه بودند:

1. **انباشت مطالعاتی جبران‌نشده و افت ناگهانی داوطلب:** در شیوه‌های سنتی، پشتیبان آموزشی تنها زمانی از افت داوطلب مطلع می‌شد که انباشت مباحث حقوقی (مدنی، تجارت، آیین دادرسی، جزا، کیفری و اساسی) به نقطه بحرانی می‌رسید. پلتفرم نسخه ۱.۰ مشاهیر دانش با استقرار **موتور تریاژ خودکار (Automatic Triage Alert Engine)** با ۹ کانون محرک (A01 تا A09) افت ساعات، غیبت در آزمون یا عدم ثبت گزارش را در لحظه تشخیص داده و با مهلت اقدام (SLA) مشخص به کارتابل پشتیبان ارسال می‌کند.
2. **افشای شماره تلفن شخصی و نقض حریم خصوصی پشتیبانان و داوطلبان:** پیش از این، برقراری تماس نیازمند تبادل شماره‌های تلفن همراه بود که آسیب‌های حقوقی و اخلاقی متعددی به همراه داشت. سامانه حاضر با اتصال مستقیم سوکت شبکه به سیستم تلفنی ویپ استریسک/ایزابل (**Asterisk Manager Interface - AMI**)، تماس امن دوطرفه معکوس برقرار می‌کند؛ شماره شخصی هر دو طرف ۱۰۰٪ محفوظ مانده و کالرآیدی سرشماره رسمی سازمانی مشاهیر دانش بر روی گوشی داوطلب نمایش داده می‌شود.
3. **سرقت محتوای حقوقی و ورود داوطلبان متقلب یا جاسوس رقبای تجاری:** با هدف جلوگیری از خرید دوره، کپی‌برداری غیرمجاز برنامه هفتگی و سوالات اختصاصی آزمون‌ها و سپس درخواست عودت وجه، سیستم از **سپر امنیتی ۵ لایه‌ای DRM و واترمارک قانونی استگانوگرافی نامرئی** بهره می‌برد. هویت نامحسوس داوطلب در مقیاس پیکسل‌های بوم وب (Canvas) با ضریب آلفای نامرئی تزریق شده و ممیزی حقوقی سریع اسکرین‌شات‌ها را در پنل رمزگشا امکان‌پذیر می‌سازد.
4. **تجمع پرفشار پایان آزمون (Thundering Herd Problem):** در آزمون‌های شبیه‌ساز کشوری با ده‌ها هزار شرکت‌کننده، ارسال همزمان پاسخنامه‌ها در دقیقه پایانی سرورهای دیتابیس عادی را قفل می‌کرد. معماری نسخه ۱.۰ مشاهیر دانش با ترکیب **صف پس‌زمینه Redis 7 و BullMQ Workers** پاسخنامه‌ها را با توان بیش از ۲۰٬۰۰۰ ارسال در ثانیه دریافت کرده، نمره‌دهی تراز و درصدهای قانونی را در صفوف ناهمگام انجام داده و پایداری ۱۰۰٪ را تضمین می‌کند.
5. **یکپارچگی بلادرنگ با پلتفرم آموزشی گارنت (Garnet LMS SSO):** داوطلب بدون نیاز به تعریف مجدد نام کاربری، به واسطه وب‌سرویس ورود یکپارچه امن، اعتبارسنجی شده و صرفاً داوطلبانی که دارای دوره فعال دارای بسته پشتیبانی ۳۶۰ درجه هستند، به داشبورد دسترسی پیدا می‌کنند.

---

## ۱.۲ دیاگرام معماری کلان سامانه (High-Level Architecture Diagram)

معماری پلتفرم نسخه ۱.۰ مشاهیر دانش بر پایه الگوی مدرن لایه‌ای با جداسازی دامنه‌های وب، پردازش پس‌زمینه، پایگاه‌داده و سرویس‌های خارجی طراحی شده است:

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER (RTL Persian)                                    |
|   Tailwind CSS (CSS Logical Props) | Vazirmatn Font | Forensic DRM Invisible Watermark Canvas      |
|   App Router Server Components (RSC) + React 19 Client Interactive Widgets (CBT, Plans, Messages) |
+--------------------------------------------------+-------------------------------------------------+
                                                   | HTTPS (Port 443 / TLS 1.3)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                    NGINX REVERSE PROXY & WAF                                       |
|   Server: support.mashahiredanesh.com (185.181.183.239)                                            |
|   SSL Termination (Let's Encrypt) | Security Headers | Rate Limiting | Max Body Size: 50MB          |
+--------------------------------------------------+-------------------------------------------------+
                                                   | Reverse Proxy (http://127.0.0.1:3000)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                        NEXT.JS 15 RUNTIME CONTAINER (mashahir_support_web)                         |
|                                                                                                    |
|  [Edge Middleware (src/middleware.ts)]                                                             |
|   * CSRF Origin Check * Sliding-Window JWT Renewal (<2h) * Zero-Trust Route RBAC Guards            |
|                                                                                                    |
|  [Presentation Layer (src/app/**)]                                                                 |
|   * Student Portal (/student/**)     * Mentor Workspace (/mentor/**)                               |
|   * Supervisor Command (/supervisor) * Executive / CEO Panel (/executive/**, /settings)           |
|                                                                                                    |
|  [Application Services & Server Actions (src/server/actions/**)]                                   |
|   * Zero-Trust Guards (requireAuth, requireRole, requireStudentOwnership, requireMentorOwnership)  |
|   * Transactional Cascading User Lifecycle Operations                                              |
|   * Central LMS Verification & Whitelist Automation                                                |
|                                                                                                    |
|  [Core Engines & Bridges (src/server/services/**)]                                                 |
|   * CBT Exam Grader & Timer Guard    * Alert/Triage Engine (A01-A09 Trigger Codes)                 |
|   * Issabel PBX AMI TCP Client (5038)* Kavenegar SMS Gateway REST Client                           |
+------------------------+---------------------------------+-----------------------------------------+
                         |                                 |
                         | Drizzle ORM (Pooled SQL)        | Redis TCP (ioredis / BullMQ)
                         v                                 v
+------------------------------------+    +----------------------------------------------------------+
|  POSTGRESQL 16 (mashahir_support_db)|    |             REDIS 7 (mashahir_staging_redis)             |
|                                    |    |                                                          |
|  * 34+ Relational Tables           |    |  * Sliding-Window Distributed Rate Limiters (OTP/Pass)   |
|  * Parameterized Prepared Queries  |    |  * Distributed Lock Engine for Concurrent VoIP Calls     |
|  * Self-Healing Schema Bootstrap   |    |  * BullMQ Exam Ingestion Queue ("exam-submissions-queue")|
|  * JSONB Indexes & Composite Keys  |    |  * In-Memory BullMQ Worker (Node.js Instrumentation)     |
+------------------------------------+    +----------------------------------------------------------+
                         |                                 |
                         +----------------+----------------+
                                          | Outbound TCP / REST
                                          v
+----------------------------------------------------------------------------------------------------+
|                                    EXTERNAL INFRASTRUCTURE & APIS                                  |
|                                                                                                    |
|   [Issabel / Asterisk PBX]     [Kavenegar SMS Gateway]        [Garnet LMS SSO Central API]         |
|   Port 5038 (AMI Socket)        REST API (Verify/Lookup)       HTTPS REST API                      |
|   Two-Leg Originate Calls      Ultra-Fast Auth OTP Dispatch   JWT Enrolled Courses & Products      |
+----------------------------------------------------------------------------------------------------+
```

---

## ۱.۳ فهرست فناوری‌ها و کتابخانه‌های نرم‌افزاری (Full Tech Stack & Dependencies Inventory)

کلیه وابستگی‌های نرم‌افزاری نسخه ۱.۰ به دقت اعتبارسنجی شده و با الزامات مدرن سازگار هستند:

| نام پکیج / کتابخانه | نسخه (Version) | نوع | شرح کاربرد و ضرورت مهندسی در سامانه مشاهیر دانش |
| :--- | :--- | :--- | :--- |
| `next` | `^15.1.0` | Core Framework | فریمورک اصلی وب، مبتنی بر Next.js 15 App Router، کامپوننت‌های سمت سرور (RSC)، و Server Actions ایمن. |
| `react` & `react-dom` | `^19.0.0` | Runtime | هسته رابط کاربری React 19 با پشتیبانی بومی از هوک‌های `useActionState` و بهینه‌سازی بارگذاری رندر. |
| `typescript` | `^5.7.2` | Dev / Compiler | زبان برنامه‌نویسی با تایپ‌چک استریکت (`strict: true`) و اصل «Zero Any Type Policy» در سراسر بک‌اند و فرانت‌اند. |
| `drizzle-orm` | `^0.38.3` | Database ORM | نگاشت شیء-رابطه‌ای تایپ‌سیف، سریع و سبک، بدون سربار سنگین، با کنترل کامل روی تراکنش‌ها و کوئری‌های SQL. |
| `drizzle-kit` | `^0.30.1` | Dev / DB Tooling | ابزار خط فرمان پوش و مایگریشن اسکیما به دیتابیس پستگرس محلی و پروداکشن. |
| `postgres` (postgres.js) | `^3.4.5` | DB Driver | درایور بومی و فوق‌سریع اتصال به دیتابیس PostgreSQL 16 با قابلیت Connection Pooling و پشتیبانی از PgBouncer. |
| `ioredis` | `^6.0.0` | Cache / Redis Driver | درایور ارتباط سریع با سرور ردیس، پیاده‌سازی قفل‌های توزیع‌شده، مدیریت ریت‌لیمیت پیامک و اتصال صفوف BullMQ. |
| `bullmq` | `^6.3.16` | Background Queue | موتور صفوف پردازش سنگین در پس‌زمینه برای ثبت آزمون‌ها، حل مشکل ازدحام ارسال نهایی و نمره‌دهی ناهمگام. |
| `jose` | `^5.9.6` | Security / Cryptography | پیاده‌سازی استاندارد، سبک و سازگار با رانتایم اج (Edge) برای امضا و اعتبارسنجی توکن‌های JWT (HS256). |
| `tailwindcss` | `^3.4.16` | Styling Engine | فریمورک استایل‌دهی مدرن با تمرکز ۱۰۰٪ روی CSS Logical Properties جهت تطابق دقیق با جهت‌گیری فارسی راست‌به‌چپ (RTL). |
| `tailwindcss-animate` | `^1.0.7` | UI / Animation | پلاگین انیمیشن‌های نرم و ترنزیشن‌های استاندارد المان‌های صفحه و مودال‌ها. |
| `clsx` & `tailwind-merge`| `^2.1.1` / `^2.5.5` | UI Utility | ادغام هوشمندانه کلاس‌های شرطی تیل‌ویند بدون تداخل در کلاس‌های فرعی کامپوننت‌ها (`cn()`). |
| `class-variance-authority`| `^0.7.1` | UI Architecture | تعریف ساختار متغیرهای تمپلیت و استایل کامپوننت‌های اتمیک UI (دکمه‌ها، نشان‌ها و کارت‌ها). |
| `@radix-ui/react-*` | `^1.1.x` | UI Primitives | کامپوننت‌های بدون استایل دسترسی‌پذیر (Accessible) شامل Dialog, Dropdown, Tabs, Progress, Select, Tooltip. |
| `lucide-react` | `^0.468.0` | UI Icons | مجموعه آیکون‌های برداری سبک و یکپارچه در تمام صفحات پلتفرم مشاهیر. |
| `gsap` & `@gsap/react` | `^3.12.5` / `^2.1.1`| Animation Engine | انیمیشن‌های حرفه‌ای و اسکرول تعاملی صفحه فرود اصلی (Scrollytelling). |
| `lenis` | `^1.1.14` | UX / Scroll | اسکرول بسیار نرم و سینمایی صفحه لندینگ بر روی مرورگرهای مدرن. |
| `howler` | `^2.2.4` | Audio Engine | پخش صوت‌های معرفی و فایل‌های صوتی دپارتمان‌های وکالت در صفحه اصلی. |
| `xlsx` | `^0.18.5` | Data Processing | موتور خواندن و استخراج داده‌های فایل اکسل در ماژول ورود دسته‌جمعی داوطلبان توسط سرپرست. |
| `zod` | `^3.24.1` | Validation | اعتبارسنجی ورودی فرم‌ها و پی‌لودهای ارسالی به اکشن‌های سرور در زمان اجرا. |
| `vitest` | `^2.1.8` | Test Runner | فریمورک تست واحد و ادغام سریع برای اجرای ۱۲ سوئیت تست امنیتی، ویپ، دیتابیس و آزمون‌های CBT. |
| `tsx` | `^4.19.2` | Dev Tooling | اجرای مستقیم اسکریپت‌های تایپ‌اسکریپت برای سیدینگ اولیه پایگاه‌داده بدون نیاز به کامپایل دستی. |

---

# بخش دوم: معماری فنی، ساختار سورس‌کد و پایگاه داده (Technical Architecture & Codebase Map)

## ۲.۱ نقشه کامل و تفصیلی کلیه پوشه‌ها و فایل‌های پروژه (Directory & File Blueprint)

ساختار پوشه‌ها بر مبنای استانداردهای Next.js 15 App Router با جداسازی دقیق لایه دیتابیس، اکشن‌های سرور، سرویس‌های زیرساخت و کامپوننت‌های کلاینت سازماندهی شده است:

```
C:\Support.mashahir\
├── .env                              # متغیرهای محیطی پروداکشن (کلیدهای رمزنگاری، اتصال دیتابیس، پورت‌ها)
├── .env.local                        # متغیرهای محیطی توسعه محلی (Local Overrides)
├── docker-compose.yml                # ارکستراسیون ۳ سرویس mashahir_support_web، postgres، redis
├── Dockerfile                        # بیلد چندمرحله‌ای بهینه‌سازی‌شده نود ۲۰ آلپاین (Multi-Stage Production)
├── drizzle.config.ts                 # پیکربندی اتصال و خروجی Drizzle Kit
├── package.json                      # فهرست کتابخانه‌ها، نسخه‌ها و اسکریپت‌های اجرایی سامانه
├── tsconfig.json                     # تنظیمات کامپایلر تایپ‌اسکریپت در بالاترین سطح استریکت
├── vitest.config.ts                  # تنظیمات محیط اجرای تست‌های Vitest
│
├── src/                              # ریشه کلیه کدهای فرانت‌اند و بک‌اند
│   ├── middleware.ts                 # اج میدلور: کنترل نشست، سشن اسلایدینگ، جلوگیری از CSRF و گیت RBAC
│   ├── instrumentation.ts            # رجیستر خودکار کارگران صف BullMQ در چرخه حیات رانتایم نود جی‌اس
│   │
│   ├── app/                          # لایه روت‌ها و صفحات سامانه (Next.js App Router)
│   │   ├── layout.tsx                # لایوت ریشه سامانه (Vazirmatn، جهت RTL، پرووایدر تم، پوسته اصلی)
│   │   ├── page.tsx                  # صفحه فرود عمومی (Landing Page) با انیمیشن و معرفی دپارتمان‌ها
│   │   ├── error.tsx                 # مرز عمومی مهار خطای ریشه (Global Error Boundary)
│   │   ├── not-found.tsx             # صفحه خطای ۴۰۴ بومی‌سازی‌شده به زبان فارسی
│   │   │
│   │   ├── api/                      # مسیرهای وب‌سرویس و اندپوینت‌های عمومی/سیستمی
│   │   │   ├── health/route.ts       # پروب سلامت سیستم برای داکر و لود بالانسر (Healthcheck Probe)
│   │   │   ├── exams/submit/route.ts # دریافت پرسرعت پاسخنامه‌های تستی آزمون در صف Redis
│   │   │   └── auth/sso/garnet/route.ts # دریافت توکن ورود یکپارچه گارنت و انتقال سشن
│   │   │
│   │   ├── auth/                     # صفحات ورود و احراز هویت
│   │   │   ├── login/page.tsx        # صفحه رسمی ورود با رمز عبور یا کد یکبار مصرف پیامکی OTP
│   │   │   └── no-support-access/page.tsx # راهنمای ارتقا برای کاربران فاقد بسته پشتیبانی فعال
│   │   │
│   │   ├── student/                  # محدوده کاربری داوطلب آزمون وکالت (Role: STUDENT)
│   │   │   ├── layout.tsx            # لایوت اختصاصی داوطلب
│   │   │   ├── dashboard/page.tsx    # داشبورد فرماندهی، شمارنده معکوس آزمون، کارت‌های KPI و گانت‌چارت
│   │   │   ├── study-plan/page.tsx   # برنامه مطالعاتی هفتگی شنبه تا جمعه و ثبت ساعات مطالعه واقعی
│   │   │   ├── exams/page.tsx        # کارتابل آزمون‌های داوطلب (فعال، منتظر تایید، کارنامه‌های تحلیلی)
│   │   │   ├── exams/[examId]/page.tsx # محیط آنلاین برگزاری آزمون استاندارد CBT با تایمر سروری
│   │   │   ├── friday-report/page.tsx# فرم ثبت خودارزیابی و گزارش هفتگی جمعه داوطلب
│   │   │   ├── call/page.tsx         # ویجت درخواست تماس تلفنی امن دوطرفه با پشتیبان اختصاصی
│   │   │   ├── coaching-missions/page.tsx # ماموریت‌های اصلاحی سبک زندگی و مهارت‌های تست‌زنی
│   │   │   ├── mock-exams/page.tsx   # سوابق و نمودار روند درصدهای آزمون‌های آزمایشی
│   │   │   ├── weekly-review/page.tsx# مرور تحلیلی پایان هفته و بازخورد منتور
│   │   │   └── onboarding/page.tsx   # پرسشنامه اولیه وضعیت داوطلب و تعیین نقاط قوت/ضعف
│   │   │
│   │   ├── mentor/                   # کارتابل پشتیبان و کوچ علمی (Role: MENTOR)
│   │   │   ├── page.tsx              # میز کار پشتیبان و آمار داوطلبان تحت هدایت
│   │   │   ├── triage/page.tsx       # میز تریاژ و هشدارهای فوری علمی و افت ساعات داوطلبان
│   │   │   ├── students/page.tsx     # فهرست کامل داوطلبان اختصاصی و فیلترهای عملکردی
│   │   │   ├── student/[id]/page.tsx # پرونده ۳۶۰ درجه داوطلب (سوابق، آزمون‌ها، تماس‌ها، یادداشت محرمانه)
│   │   │   ├── friday-reports/page.tsx # بررسی، تحلیل و ثبت نسخه راهبردی برای گزارش‌های جمعه
│   │   │   ├── calling-schedule/page.tsx # تنظیم ساعات پاسخگویی روزانه و اتصال به داخلی زویپر
│   │   │   └── exams/review/[submissionId]/page.tsx # دروازه تایید نهایی کارنامه آزمون داوطلب
│   │   │
│   │   ├── supervisor/               # پنل سرپرست آموزشی و نظارت (Role: SUPERVISOR)
│   │   │   ├── page.tsx              # داشبورد مانیتورینگ جامع سرپرست، SLA تریاژ و شاخص‌های کادر
│   │   │   ├── mentors/page.tsx      # ارزیابی تک‌تک پشتیبان‌ها (تماس‌ها، دقایق مشاوره، تاخیر کارنامه‌ها)
│   │   │   └── unassigned-students/page.tsx # تخصیص داوطلبان جدیدالورود به پشتیبانان مناسب
│   │   │
│   │   ├── executive/                # پنل مدیریت ارشد و تصمیم‌گیری کلان (Role: CEO / ADMIN)
│   │   │   ├── page.tsx              # داشبورد جامع مدیریت ارشد مشاهیر، نمودارهای مقایسه‌ای و سلامت شبکه
│   │   │   ├── users/page.tsx        # مدیریت کاربران، تعریف نقش‌ها، تخصیص داخلی و لیست سفید
│   │   │   ├── staff-audit/page.tsx  # ممیزی عملکرد و بهره‌وری کلیه سرپرستان و پشتیبانان آموزشی
│   │   │   ├── audit-logs/page.tsx   # لاگ‌های دست‌نخورده امنیتی و ردگیری کلیه رخدادهای سامانه
│   │   │   └── watermark-decoder/page.tsx # موتور رمزگشای قانونی استگانوگرافی از اسکرین‌شات‌های لو رفته
│   │   │
│   │   ├── exams/                    # سیستم مرکزی مدیریت و بانک آزمون‌ها
│   │   │   ├── page.tsx              # فهرست آزمون‌های تعریف‌شده موسسه
│   │   │   ├── builder/page.tsx      # داشبورد طراح آزمون و تعریف آزمون‌های جامع/مبحثی جدید
│   │   │   └── builder/[examId]/page.tsx # ویرایشگر سوالات حقوقی ۴ گزینه‌ای و کلید تشریحی
│   │   │
│   │   ├── plans/                    # سیستم برنامه‌ریزی آموزشی و مدیریت الگوهای هفتگی
│   │   │   └── page.tsx              # طراحی، ویرایش و اعمال الگوهای برنامه مطالعاتی برای داوطلبان
│   │   │
│   │   ├── messages/                 # مرکز پیام، گفتگوهای مستقیم، کانال‌های اطلاعیه و گروه‌ها
│   │   │   └── page.tsx              # محیط چت امن، ویس مسیج، ارسال مدارک و تب نظارت فراگیر سرپرست
│   │   │
│   │   ├── tasks/                    # سیستم کارتابل دستورات و ارجاعات وظایف سازمانی
│   │   │   └── page.tsx              # ثبت تسک، اولویت‌بندی، ردگیری دیده‌شدن (Seen) و ثبت گزارش اجرا
│   │   │
│   │   ├── assignments/              # مرکز پوشه‌بندی و تخصیص سلسله‌مراتبی
│   │   │   └── page.tsx              # سازماندهی پشتیبانان در پوشه‌های سرپرستی و انتقال گروهی داوطلبان
│   │   │
│   │   └── settings/                 # تنظیمات زیرساخت، وب‌سرویس گارنت، پیامک، ویپ و محتوا
│   │       └── page.tsx              # کنترل پنل فنی مدیریت کلان سیستم
│   │
│   ├── components/                   # کامپوننت‌های رابط کاربری
│   │   ├── app-shell.tsx             # پوسته اصلی سامانه، بارگذاری سایدبار، ناوبار و واترمارک نامرئی
│   │   ├── sidebar.tsx               # منوی ناوبری اصلی متناسب با نقش کاربر به همراه بج‌های فعال
│   │   ├── top-utility-bar.tsx       # نوار ابزار بالا، وضعیت شبکه، انتخاب تم و اطلاعات حساب
│   │   ├── theme-toggle.tsx          # سوییچ تعویض پوسته روشن / تاریک
│   │   ├── security/
│   │   │   ├── forensic-watermark.tsx # بوم نامرئی واترمارک استگانوگرافی و محافظ رویدادها
│   │   │   └── legal-consent-modal.tsx # مودال پذیرش قوانین و تعهدات حقوقی داوطلب
│   │   ├── analytics/
│   │   │   ├── gantt-chart.tsx       # گانت‌چارت تحلیلی روند مطالعه هفتگی و تراز داوطلب
│   │   │   └── longitudinal-score-chart.tsx # نمودار روند مقایسه‌ای نمرات و درصدهای دروس آزمون
│   │   ├── student/
│   │   │   ├── daily-checkin-drawer.tsx # دراور ثبت سریع ساعات مطالعه روزانه و علت عدم اجرای برنامه
│   │   │   └── student-call-coach-widget.tsx # ویجت نشان‌دهنده بازه آنلاین بودن پشتیبان و دکمه تماس
│   │   ├── mentor/
│   │   │   ├── candidate-profile-card.tsx # کارت اجمالی وضعیت درسی داوطلب
│   │   │   └── resolve-dialog.tsx    # مودال ثبت اقدامات اصلاحی و رفع هشدار تریاژ
│   │   ├── supervisor/
│   │   │   └── bulk-excel-import.tsx # کامپوننت آپلود اکسل و ایمپورت اعضای جدید به لیست سفید
│   │   └── ui/                       # کامپوننت‌های پایه طراحی (اتمیک رادیکس + تیل‌ویند)
│   │
│   ├── lib/                          # توابع کمکی، محاسباتی و امنیتی
│   │   ├── utils.ts                  # تابع `cn` جهت ترکیب کلاس‌های تیل‌ویند
│   │   ├── password.ts               # الگوریتم امن هش پسورد با اسکریپت (scrypt) و تطبیق هش
│   │   ├── jwt.ts                    # تولید و اعتبارسنجی توکن‌های استاندارد HS256 با عمر محدود
│   │   ├── jalali.ts                 # مبدل جامع تاریخ و زمان جلالی (شمسی) و ساعت رسمی ایران
│   │   ├── jalali-week.ts            # محاسبات تقویم آموزشی شنبه تا جمعه آزمون وکالت
│   │   └── sanitize.ts               # ماسک‌سازی شماره موبایل و کدملی، پالایش XSS و اعتبارسنجی اتچمنت‌ها
│   │
│   ├── types/                        # تعاریف تایپ‌های تایپ‌اسکریپت
│   │   ├── models.ts                 # اینترفیس‌های کامل کاربران، جداول، آزمون‌ها، تماس‌ها و وضعیت‌ها
│   │   └── capacitor.d.ts            # تعاریف ماژول‌های کلاینت تلفن همراه
│   │
│   └── server/                       # لایه اختصاصی منطق سرور (کاملاً محافظت‌شده از دید کلاینت)
│       ├── redis.ts                  # کلاینت ایزوله و پرسرعت ردیس با استراتژی بازاتصال امن
│       ├── db/
│       │   ├── schema.ts             # تعریف اسکیما و ارتباطات کلیه جداول دیتابیس در Drizzle ORM
│       │   ├── index.ts              # اتصال ارتباطی دیتابیس، استخر کانکشن و مدیریت بوت‌استرپ
│       │   ├── bootstrap.ts          # اسکریپت DDL خودترمیم جهت ایجاد جداول، ستون‌ها و ایندکس‌ها
│       │   └── seed.ts               # اسکریپت ایجاد رکوردهای اولیه، ادمین‌ها و حساب‌های تست
│       ├── auth/
│       │   ├── guard.ts              # گاردهای امنیتی نقش، احراز هویت و مالکیت پرونده داوطلب
│       │   ├── otp.ts                # تولید توکن ۵ رقمی، ذخیره‌سازی، ریت‌لیمیت پیامک و تایید
│       │   └── jwt.ts                # توابع پیشرفته سشن سرور و ابطال نشست‌های توزیع‌شده
│       ├── queue/
│       │   ├── exam-queue.ts         # صف پیام ردیس و BullMQ جهت دریافت حجم انبوه آزمون‌ها
│       │   └── exam-worker.ts        # کارگر پس‌زمینه پردازش نمرات و محاسبه تراز آزمون‌ها
│       ├── services/
│       │   ├── alert-engine.ts       # پردازشگر قوانین تریاژ آموزشی (A01 الی A09)
│       │   ├── voip.ts               # ارتباط سوکت TCP با استریسک AMI و مدیریت تماس‌های دوطرفه
│       │   ├── garnet.ts             # وب‌سرویس ورود یکپارچه گارنت و اعتبارسنجی پکیج‌های دوره‌ها
│       │   └── sms.ts                # سرویس اعتبارسنجی و ارسال پیامک کاوه‌نگار (Lookup و متنی)
│       └── actions/                  # کلیه اکشن‌های سرور (Server Actions) تفکیک‌شده بر اساس دامنه
│           ├── admin-courses.ts      # مدیریت دوره‌های دارای بسته پشتیبانی توسط مدیر ارشد
│           ├── admin-staff-audit.ts  # ممیزی بهره‌وری پرسنل، سرپرستان و پشتیبانان
│           ├── admin-users.ts        # ایجاد، ویرایش، تغییر نقش و حذف زنجیره‌ای (Cascade) کاربران
│           ├── assignments.ts        # پوشه‌بندی و تخصیص داوطلبان به پشتیبانان
│           ├── audit-logs.ts         # جستجو و واکشی لاگ‌های امنیتی سیستم
│           ├── auth.ts               # ورود با رمز عبور، درخواست OTP و لاگین یکپارچه
│           ├── chat.ts               # ارسال پیام متنی/صوتی، ایجاد گروه/کانال و حذف پیام
│           ├── exams.ts              # ساخت آزمون، سوالات، شروع، تصحیح نهایی و تایید کارنامه
│           ├── friday-report.ts      # ثبت خودارزیابی جمعه و تحلیل و فیدبک منتور
│           ├── garnet.ts             # تنظیمات و تست اتصال به وب‌سرویس گارنت
│           ├── landing-cms.ts        # مدیریت پویای متون و بنرهای صفحه فرود اصلی
│           ├── mentor.ts             # تنظیم ساعات پاسخگویی تلفنی و پرونده داوطلب
│           ├── messages.ts           # پیام‌رسان مستقیم و مدیریت مکالمات بین پرسنل
│           ├── notifications.ts      # شمارش بلادرنگ هشدارهای تریاژ، کارنامه‌های معلق و تسک‌ها
│           ├── plans.ts              # مدیریت الگوها و پارت‌های برنامه مطالعاتی هفتگی
│           ├── settings.ts           # پیکربندی وب‌سرویس‌ها، درگاه‌های پیامک و سیستم ویپ
│           ├── student.ts            # ثبت ساعت مطالعه روزانه، دریافت پیشرفت و چک‌این
│           ├── supervisor.ts         # مانیتورینگ عملکرد کادر و هشدارهای سرپرستی
│           ├── supervisor-assignment.ts # سازماندهی ساختار سلسله‌مراتبی پوشه‌ها
│           ├── tasks.ts              # ثبت، ارجاع، ردگیری وضعیت دیده‌شدن و تکمیل وظایف
│           ├── terms.ts              # ذخیره تاریخ و IP موافقت با قوانین و تعهدنامه آموزشی
│           ├── video.ts              # تنظیمات و جلسات کارگاه‌ها و مشاوره تصویری
│           ├── voip.ts               # آغاز تماس معکوس دوطرفه با پروتکل استریسک AMI
│           └── whitelist.ts          # مدیریت و ثبت داوطلبان مجاز لیست سفید
│
└── tests/                            # سوئیت جامع آزمون‌های خودکار Vitest
    ├── alert-engine.test.ts          # تست رفتاری قوانین تریاژ و هشدارهای افت تحصیلی
    ├── auth-flow.test.ts             # تست ورود با رمز، OTP، نرمال‌سازی شماره و ریت‌لیمیت
    ├── cbt-exam-engine.test.ts       # تست موتور نمره‌دهی آزمون، نمره منفی و محاسبه درصد
    ├── contrast-and-ui.test.ts       # تست کنتراست رنگی، جهت‌گیری RTL و المان‌های بصری
    ├── exam-targeting-and-submission.test.ts # تست هدف‌گذاری آزمون برای کوهورت یا دوره
    ├── jalali-timezone.test.ts       # تست محاسبات تقویم شمسی و تطابق با منطقه زمانی تهران
    ├── mock-ami.test.ts              # شبیه‌ساز سوکت استریسک AMI برای محیط تست
    ├── replica-shared-state.test.ts  # تست پایداری سشن در محیط‌های چندنسخه‌ای
    ├── security-audit.test.ts        # تست ضداسپم، جلوگیری از تزریق SQL، XSS و مهار CSRF
    ├── sso-settings-and-central-auth.test.ts # تست احراز هویت یکپارچه LMS گارنت
    ├── user-management-and-calling-window.test.ts # تست ساعات پاسخگویی و کنترل دسترسی
    └── voip-ami.test.ts              # تست تولید پکت‌های AMI و پالایش CRLF
```

---

## ۲.۲ مرجع جامع و ستون‌به‌ستون ۳۴ جدول پایگاه داده PostgreSQL 16 (Full Database Schema & DDL Reference)

پایگاه داده سامانه پشتیبانی مشاهیر دانش بر روی موتور **PostgreSQL 16** با معماری رابطه‌ای کاملاً نرمال‌سازی‌شده پیاده‌سازی شده است. کلیه تعاریف اسکیما در فایل `src/server/db/schema.ts` و کدهای DDL خام در `src/server/db/bootstrap.ts` متمرکز هستند.

### ۲.۲.۱ انواع شمارشی استاندارد (PostgreSQL Enums)
۱. **`user_role`**: تعیین نقش کاربر در ماتریس دسترسی سازمانی:
   - `STUDENT`: داوطلب آزمون وکالت
   - `MENTOR`: پشتیبان و مشاور علمی
   - `SUPERVISOR`: سرپرست آموزشی
   - `CEO`: مدیرعامل و مدیریت عالی موسسه
   - `ADMIN`: مدیر ارشد فنی سامانه
۲. **`employment_status`**: وضعیت اشتغال داوطلب جهت تنظیم سقف ساعت مطالعه:
   - `FULL_TIME` (تمام وقت)، `PART_TIME` (پاره وقت)، `FREELANCE` (آزاد)، `UNEMPLOYED` (بدون اشتغال/فارغ‌التحصیل متمرکز)
۳. **`marital_status`**: وضعیت تأهل داوطلب جهت ارزیابی تعهدات خانوادگی:
   - `SINGLE` (مجرد)، `MARRIED` (متأهل)، `ENGAGED` (در شرف ازدواج)، `IN_RELATIONSHIP`، `OTHER`
۴. **`risk_status`**: وضعیت ریسک و پایداری درسی داوطلب در سیستم مانیتورینگ:
   - `GREEN`: وضعیت درسی مطلوب و پایدار
   - `YELLOW`: هشدار انباشت مباحث یا افت خفیف ساعات
   - `RED`: بحران آموزشی حاد (نیازمند مداخله فوری و تماس تلفنی)
۵. **`assessment_type`**: نوع ارزیابی تشخیصی:
   - `BASELINE` (سنجش سطح پایه ورودی)، `FINAL_BENCHMARK` (سنجش آمادگی جامع نهایی)
۶. **`activity_type`**: نوع فعالیت تعریف‌شده در پارت‌های برنامه مطالعاتی:
   - `CLASS`: شرکت در کلاس آموزشی آنلاین یا حضوری
   - `STUDY`: مطالعه تشریحی و مفهومی منابع درسی
   - `REVIEW`: مرور و بازخوانی یادداشت‌ها
   - `STATUTE_READ`: ماده‌خوانی و نص‌خوانی قوانین و مقررات
   - `TEST_STUDY`: بررسی آموزشی تست‌ها به همراه پاسخنامه
   - `TEST_PRACTICE`: تست‌زنی زمان‌دار استاندارد سنجشی
   - `EXAM_ANALYSIS`: تحلیل و کارنامه‌خوانی آزمون
۷. **`item_status`**: وضعیت انجام یک پارت مطالعاتی یا ماموریت:
   - `NOT_DONE` (انجام نشده)، `PARTIAL` (انجام ناقص)، `DONE` (تکمیل کامل)
۸. **`analysis_status`**: وضعیت تحلیل آزمون آزمایشی:
   - `DONE` (تحلیل انجام شده)، `PARTIAL` (تحلیل ناقص)، `NOT_DONE` (تحلیل نشده)

---

### ۲.۲.۲ کاتالوگ تفصیلی جداول پایگاه داده (All 34+ Tables)

#### ۱. جدول کاربران سامانه (`users`)
- **هدف:** ذخیره رکوردهای اصلی هویتی کلیه افراد (داوطلبان، منتورها، سرپرستان، مدیران).
- **کلید اصلی:** `id` (text) مانند `usr_admin`, `usr_mentor1`.
- **ستون‌ها:**
  - `username` (`text`, UNIQUE, Nullable): نام کاربری ورود (اختیاری).
  - `phone_number` (`varchar(20)`, UNIQUE, NOT NULL): شماره تلفن همراه با فرمت نرمال ۱۱ رقمی (۰۹xxxxxxxxx).
  - `full_name` (`text`, NOT NULL): نام و نام خانوادگی به فارسی.
  - `national_id` (`varchar(20)`, Nullable): کدملی ۱۰ رقمی ایرانی.
  - `sip_extension` (`varchar(20)`, Nullable): شماره داخلی تلفنی ایزابل/استریسک منتور (مانند ۱۰۱، ۱۰۲).
  - `role` (`user_role`, NOT NULL, Default: `'STUDENT'`): نقش سیستمی.
  - `password_hash` (`text`, Nullable): رشته هش رمز عبور با فرمت `scrypt$<salt>$<hash>`.
  - `must_change_password` (`boolean`, NOT NULL, Default: `false`): الزام کاربر به تغییر کلمه عبور در اولین ورود.
  - `garnet_user_id` (`text`, Nullable): شناسه یکتای کاربر در دیتابیس LMS گارنت.
  - `garnet_username` (`text`, Nullable): نام کاربری کاربر در گارنت.
  - `can_create_exams` (`boolean`, NOT NULL, Default: `false`): پرمیشن ویژه به منتور برای طراحی آزمون تستی.
  - `supervisor_id` (`text`, Nullable): شناسه سرپرست ارشد جهت ساختار سلسله‌مراتبی پوشه‌ها.
  - `is_active` (`boolean`, NOT NULL, Default: `true`): فعال یا مسدود بودن حساب کاربری.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`): زمان ایجاد حساب.
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`): زمان آخرین ویرایش مشخصات.
- **ایندکس‌ها:**
  - `users_role_idx` بر روی ستون `role`.

#### ۲. جدول پرونده تحصیلی داوطلب (`student_profiles`)
- **هدف:** پروفایل ۳۶۰ درجه داوطلب شامل شرایط زندگی، محدودیت‌ها، سقف ساعت مطالعه و وضعیت انتساب به منتور.
- **کلید اصلی:** `id` (text) مانند `profile_stu_1`.
- **ستون‌ها:**
  - `user_id` (`text`, NOT NULL, Foreign Key -> `users.id` با `onDelete: cascade`): کلید یکتا و متصل به کاربر داوطلب.
  - `mentor_id` (`text`, Nullable, Foreign Key -> `users.id` با `onDelete: set null`): شناسه منتور تخصیص‌یافته.
  - `employment_status` (`employment_status`, Default: `'UNEMPLOYED'`): وضعیت شغلی.
  - `is_student` (`boolean`, NOT NULL, Default: `false`): آیا در حال حاضر دانشجو است.
  - `marital_status` (`marital_status`, Default: `'SINGLE'`): وضعیت تأهل.
  - `has_children` (`boolean`, NOT NULL, Default: `false`): دارای فرزند بودن.
  - `children_count` (`integer`, NOT NULL, Default: `0`): تعداد فرزندان.
  - `has_family_care_duty` (`boolean`, NOT NULL, Default: `false`): تعهد نگهداری از سالمند یا بیمار در خانواده.
  - `family_care_detail` (`text`, Nullable): جزییات مسئولیت خانوادگی.
  - `workday_study_hours_cap` (`integer`, NOT NULL, Default: `6`): حداکثر توان مطالعه در روزهای کاری.
  - `holiday_study_hours_cap` (`integer`, NOT NULL, Default: `10`): حداکثر توان مطالعه در روزهای تعطیل و جمعه.
  - `best_study_time` (`text`, Default: `'MORNING'`): بازه بهینه تمرکز ذهنی (`MORNING`, `AFTERNOON`, `NIGHT`).
  - `primary_constraint` (`text`, Nullable): مانع اصلی درسی یا دغدغه ذهنی داوطلب.
  - `previous_bar_exam_attempts` (`integer`, NOT NULL, Default: `0`): تعداد دفعات شرکت قبلی در آزمون وکالت.
  - `current_daily_study_hours` (`integer`, NOT NULL, Default: `4`): ساعت مطالعه فعلی روزانه پیش از آغاز برنامه.
  - `self_baseline_assessment` (`text`, Nullable): خوداظهاری سطح درسی داوطلب.
  - `masterclass_goal` (`text`, Nullable): هدف داوطلب (مثلاً رتبه تک‌رقمی کانون مرکز).
  - `risk_status` (`risk_status`, NOT NULL, Default: `'GREEN'`): وضعیت پایداری درسی داوطلب.
  - `risk_reason` (`text`, Nullable): دلیل قرار گرفتن در وضعیت زرد یا قرمز.
  - `last_contact_at` (`timestamp`, Nullable): تاریخ و ساعت آخرین تماس تلفنی منتور با داوطلب.
  - `enrolled_course_code` (`text`, Nullable): کد دوره گارنت که داوطلب خریداری کرده است.
  - `enrolled_course_name` (`text`, Nullable): عنوان دوره آموزشی.
  - `has_active_support` (`boolean`, NOT NULL, Default: `true`): وضعیت فعال بودن بسته پشتیبانی ۳۶۰ درجه.
  - `external_user_id` (`text`, Nullable): شناسه کاربر در وب‌سرویس خارجی.
  - `initial_sync_completed` (`boolean`, NOT NULL, Default: `false`): اتمام همگام‌سازی اولیه مشخصات با گارنت.
  - `initial_sync_at` (`timestamp`, Nullable): زمان همگام‌سازی مشخصات.
  - `provisioning_source` (`varchar(30)`, NOT NULL, Default: `'LOCAL'`): منبع ایجاد (`LOCAL`, `GARNET_SSO`, `EXCEL_WHITELIST`).
  - `accepted_legal_terms_at` (`timestamp`, Nullable): زمان پذیرش تعهدنامه و قوانین سامانه توسط داوطلب.
  - `accepted_legal_terms_ip` (`varchar(64)`, Nullable): آدرس IP داوطلب هنگام پذیرش قوانین.
  - `is_probationary` (`boolean`, NOT NULL, Default: `true`): وضعیت آزمایشی اولیه حساب داوطلب.
  - `last_entitlement_check_at` (`timestamp`, Nullable): آخرین زمان استعلام وضعیت دوره از گارنت.
  - `last_central_check_result` (`text`, Nullable): نتیجه آخرین بررسی وب‌سرویس مرکزی گارنت.
  - `suspension_reason` (`text`, Nullable): علت تعلیق یا مسدودی در صورت عدم تایید دوره.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها و محدودیت‌ها:**
  - ایندکس یکتا `student_profiles_user_id_idx` بر روی `user_id`.
  - ایندکس `student_profiles_mentor_id_idx` بر روی `mentor_id`.
  - ایندکس `student_profiles_course_code_idx` بر روی `enrolled_course_code`.

#### ۳. جدول سبک یادگیری داوطلب (`study_preference_profiles`)
- **هدف:** مدل‌سازی ترجیحات حسی-شناختی یادگیری بر اساس تست‌های استاندارد روانشناسی درسی.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id` با `onDelete: cascade`).
  - `auditory_score` (`integer`, NOT NULL, Default: `0`): نمره یادگیری شنیداری (ویس‌ها و تدریس صوتی).
  - `textual_score` (`integer`, NOT NULL, Default: `0`): نمره یادگیری متنی (کتب مرجع و نص قوانین).
  - `structural_score` (`integer`, NOT NULL, Default: `0`): نمره یادگیری ساختاری (جداول و نمودارهای درختی).
  - `practical_score` (`integer`, NOT NULL, Default: `0`): نمره یادگیری کاربردی (حل تست و تحلیل پرونده‌های حقوقی).
  - `dominant_preference` (`text`, NOT NULL): سبک مسلط غالب یادگیری.
  - `actionable_recommendations` (`text`, NOT NULL): توصیه‌های راهبردی به پشتیبان جهت تنظیم برنامه متناسب.

#### ۴. جدول سنجش سطح پایه و نهایی (`benchmark_assessments`)
- **هدف:** ثبت ارزیابی‌های اولیه ورودی (Baseline) و سنجش‌های پیشرفته پایانی داوطلب.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id` با `onDelete: cascade`).
  - `assessment_type` (`assessment_type`, NOT NULL): `BASELINE` یا `FINAL_BENCHMARK`.
  - `overall_score_percent` (`integer`, NOT NULL): میانگین درصد کل کسب‌شده.
  - `subject_scores` (`jsonb`, NOT NULL): نمرات به تفکیک دروس اصلی (`{ "civilLaw": 55, "tradeLaw": 40, ... }`).
  - `academic_notes` (`text`, Nullable): تحلیل تشخیصی منتور بر روی نقاط ضعف مبنایی.
  - `taken_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۵. جدول برنامه‌های هفتگی داوطلب (`student_schedules`)
- **هدف:** سربرگ برنامه مطالعاتی هر هفته آموزشی داوطلب (شنبه تا جمعه).
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id` با `onDelete: cascade`).
  - `jalali_year` (`integer`, NOT NULL): سال تقویم شمسی (مانند ۱۴۰۳ یا ۱۴۰۴).
  - `jalali_week_number` (`integer`, NOT NULL): شماره هفته در تقویم آموزشی (هفته ۱ تا ۵۲).
  - `week_start_date` (`text`, NOT NULL): تاریخ شنبه اول هفته (مانند "۱۴۰۳/۰۷/۲۱").
  - `week_end_date` (`text`, NOT NULL): تاریخ جمعه پایان هفته (مانند "۱۴۰۳/۰۷/۲۷").
  - `weekly_main_goal` (`text`, Nullable): هدف راهبردی اصلی هفته (مثلاً تسلط بر عقود معین مدنی).
  - `top_priorities` (`jsonb`, Nullable): آرایه‌ای از متون اولویت‌های برتر هفته (`string[]`).
  - `is_template_override` (`boolean`, NOT NULL, Default: `false`): مشخص‌کننده اینکه آیا برنامه از روی الگوی پیش‌فرض سفارشی‌سازی شده است.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس یکتای ترکیبی `student_week_idx` بر روی `(student_profile_id, jalali_year, jalali_week_number)`.
  - ایندکس `jalali_week_idx` بر روی `(jalali_year, jalali_week_number)`.

#### ۶. جدول پارت‌ها و آیتم‌های برنامه هفتگی (`schedule_items`)
- **هدف:** جزئیات پارت‌های درسی مشخص‌شده برای هر روز از هفته (شنبه تا جمعه).
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `schedule_id` (`text`, NOT NULL, Foreign Key -> `student_schedules.id` با `onDelete: cascade`).
  - `day_of_week` (`integer`, NOT NULL): روز هفته (۰ = شنبه، ۱ = یکشنبه، ۲ = دوشنبه، ۳ = سه‌شنبه، ۴ = چهارشنبه، ۵ = پنج‌شنبه، ۶ = جمعه).
  - `subject` (`text`, NOT NULL): عنوان درس (حقوق مدنی، آیین دادرسی مدنی، حقوق تجارت، حقوق جزا، آیین دادرسی کیفری، حقوق اساسی، متون فقه).
  - `activity_type` (`activity_type`, NOT NULL, Default: `'STUDY'`): نوع فعالیت.
  - `topicDescription` (`topic_description`, `text`, NOT NULL): شرح مبحث معین (مانند شروط ضمن عقد).
  - `target_volume` (`text`, NOT NULL): حجم هدف‌گذاری‌شده (مانند "۳۵ صفحه کتاب" یا "۵۰ تست").
  - `target_duration_minutes` (`integer`, NOT NULL): مدت زمان پیش‌بینی‌شده به دقیقه (مثلاً ۹۰ دقیقه).
  - `actual_duration_minutes` (`integer`, Nullable, Default: `0`): مدت زمان واقعی مطالعه داوطلب به دقیقه.
  - `student_note` (`text`, Nullable): یادداشت داوطلب در حین مطالعه.
  - `completed_at` (`timestamp`, Nullable): زمان تیک خوردن و اتمام پارت.
  - `is_catchup` (`boolean`, NOT NULL, Default: `false`): آیا پارت جبرانی برای انباشت قبلی است.
  - `status` (`item_status`, NOT NULL, Default: `'NOT_DONE'`): وضعیت انجام (`NOT_DONE`, `PARTIAL`, `DONE`).
- **ایندکس‌ها:**
  - ایندکس `schedule_items_schedule_id_idx` بر روی `schedule_id`.

#### ۷. جدول چک‌این و ثبت بازخورد روزانه داوطلب (`daily_checkins`)
- **هدف:** ثبت ساعات واقعی مطالعه شبانه داوطلب و ریشه‌یابی عدم اجرای برنامه.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id` با `onDelete: cascade`).
  - `checkin_date` (`text`, NOT NULL): تاریخ روز مورد گزارش (فرمت جلالی "۱۴۰۳-۰۷-۲۱").
  - `calculated_execution_percent` (`integer`, NOT NULL): درصد پایبندی محاسبه‌شده توسط سیستم.
  - `planned_hours` (`integer`, Nullable, Default: `6`): ساعت برنامه‌ریزی‌شده در جدول.
  - `actual_hours` (`integer`, Nullable, Default: `0`): ساعت واقعی ثبت‌شده توسط داوطلب.
  - `root_failure_cause` (`text`, Nullable): دلیل اصلی عدم مطالعه (بیماری، خستگی، مشغله کاری، کاهش انگیزه).
  - `help_requested` (`boolean`, NOT NULL, Default: `false`): درخواست مداخله یا تماس فوری از طرف پشتیبان.
  - `student_notes` (`text`, Nullable): توضیحات داوطلب.
  - `logged_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس یکتا `student_checkin_date_idx` بر روی `(student_profile_id, checkin_date)`.

#### ۸. جدول ارزیابی انتهای هفته (`weekly_reviews`)
- **هدف:** تحلیل کلی پیشرفت در پایان هفته و خودارزیابی پایانی جمعه.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id`).
  - `schedule_id` (`text`, NOT NULL, Foreign Key -> `student_schedules.id`).
  - `program_execution_percent` (`integer`, NOT NULL): درصد تحقق اهداف برنامه.
  - `consistency_percent` (`integer`, NOT NULL): درصد ثبات و تداوم روزانه مطالعه.
  - `backlog_minutes_accumulated` (`integer`, NOT NULL, Default: `0`): دقایق انباشت ایجادشده در طول هفته.
  - `backlog_minutes_recovered` (`integer`, NOT NULL, Default: `0`): دقایق انباشت جبران‌شده با پارت‌های جبرانی.
  - `coaching_adherence_percent` (`integer`, NOT NULL): درصد اجرای توصیه‌های منتور.
  - `primary_obstacle` (`text`, Nullable): مهم‌ترین مانع هفته.
  - `assistance_needed_domain` (`text`, Nullable): حوزه‌ای که داوطلب نیاز به راهنمایی دارد.
  - `self_satisfaction_score` (`integer`, NOT NULL): نمره رضایت از عملکرد شخصی (۱ الی ۵).
  - `student_feedback_note` (`text`, Nullable): متن بازخورد داوطلب.
  - `submitted_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۹. جدول آزمون‌های آزمایشی داوطلب (`mock_exams`)
- **هدف:** سوابق شرکت در آزمون‌های آزمایشی استاندارد و ثبت تفکیک نمرات دروس.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id`).
  - `exam_title` (`text`, NOT NULL): عنوان آزمون.
  - `exam_date` (`text`, NOT NULL): تاریخ برگزاری.
  - `has_participated` (`boolean`, NOT NULL, Default: `true`): وضعیت حضور در آزمون.
  - `is_excused_absence` (`boolean`, NOT NULL, Default: `false`): غیبت موجه با هماهنگی پشتیبان.
  - `overall_score_percent` (`integer`, NOT NULL, Default: `0`): درصد کل داوطلب.
  - `overall_rank` (`integer`, Nullable): رتبه کل در جامعه آماری موسسه.
  - `correct_count` (`integer`, NOT NULL, Default: `0`): تعداد پاسخ‌های صحیح.
  - `wrong_count` (`integer`, NOT NULL, Default: `0`): تعداد پاسخ‌های غلط (مشمول نمره منفی).
  - `unanswered_count` (`integer`, NOT NULL, Default: `0`): تعداد سوالات بدون پاسخ (نزده).
  - `subject_scores` (`jsonb`, NOT NULL): درصد دروس مجزا در قالب کلید-مقدار.
  - `analysis_status` (`analysis_status`, NOT NULL, Default: `'NOT_DONE'`): وضعیت تحلیل کارنامه.
  - `primary_error_cause` (`text`, Nullable): ریشه اصلی خطاها (شک بین دو گزینه، بی‌دقتی در متن قانون، کمبود وقت).
  - `priority_review_subject` (`text`, Nullable): درسی که نیازمند تقویت فوری است.
  - `delta_previous_exam` (`integer`, NOT NULL, Default: `0`): رشد یا افت نسبت به آزمون قبلی.
  - `delta_baseline` (`integer`, NOT NULL, Default: `0`): تغییر نسبت به آزمون سطح پایه.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۱۰. جدول ماموریت‌های مهارت‌آموزی و روانشناختی (`coaching_missions`)
- **هدف:** ماموریت‌های آموزشی خارج از کتب درسی مانند تنظیم ساعت خواب، تکنیک‌های تست‌زنی و مدیریت استرس.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `title` (`text`, NOT NULL): عنوان ماموریت.
  - `category` (`text`, NOT NULL): دسته‌بندی موضوعی.
  - `assigned_jalali_week` (`integer`, NOT NULL): هفته مربوطه در تقویم آموزشی.
  - `assigned_jalali_year` (`integer`, NOT NULL): سال تقویم شمسی.

#### ۱۱. جدول لاگ اجرای ماموریت‌های داوطلب (`student_mission_logs`)
- **هدف:** پیگیری میزان پایبندی داوطلب به ماموریت‌های هفتگی منتورینگ.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `mission_id` (`text`, NOT NULL, Foreign Key -> `coaching_missions.id`).
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id`).
  - `adherence_status` (`item_status`, NOT NULL, Default: `'NOT_DONE'`).
  - `obstacle_encountered` (`text`, Nullable): موانع رخ‌داده در انجام مأموریت.
  - `notes` (`text`, Nullable): یادداشت تشریحی داوطلب.
  - `logged_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس یکتا `student_mission_idx` بر روی `(mission_id, student_profile_id)`.

#### ۱۲. جدول پرونده‌های تریاژ و هشدارهای فوری تحصیلی (`mentor_triage_cases`)
- **هدف:** مرکز اعلان بحران‌های درسی داوطلبان بر مبنای محرک‌های ۹گانه موتور تریاژ (A01 الی A09).
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id` با `onDelete: cascade`).
  - `mentor_id` (`text`, Nullable, Foreign Key -> `users.id` با `onDelete: set null`): پشتیبان مسئول حل پرونده.
  - `trigger_code` (`varchar(10)`, NOT NULL): کد ماشینی هشدار (مانند A01 برای افت ساعت، A05 برای نمره منفی بالا).
  - `priority_tier` (`integer`, NOT NULL): سطح اولویت رسیدگی (۱: اضطراری با SLA ۲ ساعته تا ۶: عادی).
  - `description` (`text`, NOT NULL): متن دقیق شرح بحران کشف‌شده.
  - `is_resolved` (`boolean`, NOT NULL, Default: `false`): وضعیت خاتمه پرونده.
  - `resolved_at` (`timestamp`, Nullable): زمان بسته‌شدن و رفع بحران.
  - `sla_due_at` (`timestamp`, NOT NULL): آخرین مهلت زمانی استاندارد برای مداخله پشتیبان.
  - `intervention_notes` (`text`, Nullable): گزارش اقدامات و گفتگوی تلفنی پشتیبان با داوطلب.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس ترکیبی `mentor_triage_idx` بر روی `(mentor_id, is_resolved, priority_tier)`.

#### ۱۳. جدول لاگ‌های ممیزی ساده (`audit_logs`)
- **هدف:** لاگ‌برداری از رخدادهای پایه‌ای سیستم و تغییرات کلیدی موجودیت‌ها.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `actor_id` (`text`, NOT NULL, Foreign Key -> `users.id`).
  - `action` (`text`, NOT NULL): عمل انجام‌شده (مثلاً CREATE, UPDATE, DELETE).
  - `target_entity` (`text`, NOT NULL): نام جدول یا دامنه هدف.
  - `target_id` (`text`, NOT NULL): شناسه رکورد تحت تاثیر قرار گرفته.
  - `metadata` (`jsonb`, Nullable): مقادیر قبلی و جدید در قالب JSON.
  - `createdAt` (`created_at`, `timestamp`, NOT NULL, Default: `now()`).

#### ۱۴. جدول لیست سفید داوطلبان مجاز ثبت‌نام (`student_whitelist`)
- **هدف:** ثبت کدملی و شماره‌های مجاز واردشده از طریق فایل اکسل توسط سرپرست قبل از ثبت‌نام رسمی داوطلب.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `national_id` (`varchar(20)`, NOT NULL): کدملی داوطلب.
  - `phone_number` (`varchar(20)`, NOT NULL): شماره همراه داوطلب.
  - `full_name` (`text`, NOT NULL): نام کامل داوطلب.
  - `enrolled_course_name` (`text`, Nullable): نام دوره خریداری‌شده در موسسه.
  - `enrolled_course_code` (`varchar(100)`, Nullable): کد دوره.
  - `assigned_mentor_id` (`text`, Nullable, Foreign Key -> `users.id`): پشتیبان پیش‌فرض منتسب‌شده.
  - `assigned_mentor_name` (`text`, Nullable): نام پشتیبان پیش‌فرض.
  - `status` (`varchar(20)`, NOT NULL, Default: `'PENDING'`): وضعیت (`PENDING` در انتظار ورود، `REGISTERED` واردشده).
  - `invited_at` (`timestamp`, Nullable): زمان ارسال پیامک دعوت‌نامه.
  - `registered_at` (`timestamp`, Nullable): زمان اولین ورود موفق به سامانه.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `whitelist_phone_idx` بر روی `phone_number`.
  - ایندکس `whitelist_national_id_idx` بر روی `national_id`.

#### ۱۵. جدول تنظیمات درگاه پیامک (`sms_settings`)
- **هدف:** پیکربندی وب‌سرویس پیامک کاوه‌نگار و الگوهای ارسال متنی.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `provider` (`varchar(30)`, NOT NULL, Default: `'KAVENEGAR'`): پرووایدر پیامک.
  - `api_key` (`text`, NOT NULL): کلید دسترسی به درگاه.
  - `sender_number` (`varchar(30)`, NOT NULL): سرشماره فرستنده عادی (مانند ۱۰۰۰۸۵۸۵).
  - `sender_line` (`varchar(30)`, NOT NULL): خط اختصاصی خدماتی بدون بلک‌لیست.
  - `is_active` (`boolean`, NOT NULL, Default: `true`): وضعیت فعال بودن ارسال پیامک.
  - `triggers` (`jsonb`, NOT NULL): تنظیمات متن و وضعیت فعال بودن رویدادهای مختلف پیامکی.
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۱۶. جدول تاریخچه و گزارش‌های پیامک (`sms_logs`)
- **هدف:** ممیزی و ردگیری کلیه پیامک‌های ارسالی از سرور به داوطلبان و پشتیبانان.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `event` (`varchar(50)`, NOT NULL): نوع رویداد (مانند LOGIN, EXAM_PUBLISHED, TASK_ASSIGNED).
  - `recipient_phone` (`varchar(20)`, NOT NULL): شماره همراه گیرنده.
  - `recipient_name` (`text`, NOT NULL): نام گیرنده.
  - `message_text` (`text`, NOT NULL): متن کامل ارسال‌شده.
  - `status` (`varchar(20)`, NOT NULL, Default: `'SENT'`): وضعیت تحویل (`SENT`, `DELIVERED`, `FAILED`, `SIMULATED`).
  - `delivery_time` (`timestamp`, NOT NULL, Default: `now()`).
  - `provider_response` (`text`, Nullable): شرح پاسخ و پیام دریافتی از درگاه کاوه‌نگار.
- **ایندکس‌ها:**
  - ایندکس `sms_logs_phone_idx` بر روی `recipient_phone`.

#### ۱۷. جدول وظایف سازمانی سلسله‌مراتبی (`hierarchy_tasks`)
- **هدف:** مدیریت کارتابل دستورات اداری از مدیران و سرپرستان به پشتیبانان با ردگیری دقیق وضعیت خوانده‌شدن.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `sender_id` (`text`, NOT NULL, Foreign Key -> `users.id` با `onDelete: cascade`).
  - `sender_role` (`varchar(20)`, NOT NULL): نقش ارجاع‌دهنده.
  - `sender_name` (`text`, NOT NULL): نام ارجاع‌دهنده.
  - `receiver_id` (`text`, NOT NULL, Foreign Key -> `users.id` با `onDelete: cascade`).
  - `receiver_role` (`varchar(20)`, NOT NULL): نقش مخاطب وظیفه.
  - `receiver_name` (`text`, NOT NULL): نام مخاطب وظیفه.
  - `title` (`text`, NOT NULL): عنوان ماموریت اداری.
  - `description` (`text`, NOT NULL): دستورالعمل تفصیلی.
  - `priority` (`varchar(20)`, NOT NULL): سطح فوریت (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  - `status` (`varchar(30)`, NOT NULL, Default: `'PENDING'`): وضعیت انجام (`PENDING`, `IN_PROGRESS`, `COMPLETED_BY_MENTOR`, `APPROVED`, `REJECTED`, `COMPLETED`).
  - `due_date` (`varchar(30)`, NOT NULL): مهلت انجام شمسی.
  - `resolution_notes` (`text`, Nullable): گزارش اقدام پشتیبان پس از انجام کار.
  - `seen_at` (`timestamp`, Nullable): زمان دقیق سین خوردن تسک توسط مخاطب با تاریخ و ساعت شمسی.
  - `reviewed_by` (`text`, Nullable, Foreign Key -> `users.id` با `onDelete: set null`): بازبینی‌کننده گزارش نهایی.
  - `reviewed_by_name` (`text`, Nullable): نام بازبینی‌کننده.
  - `review_notes` (`text`, Nullable): یادداشت تایید یا رد عملکرد.
  - `reviewed_at` (`timestamp`, Nullable): زمان بررسی گزارش.
  - `completed_at` (`timestamp`, Nullable): زمان خاتمه موفق.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `task_receiver_idx` بر روی `(receiver_id, status)`.
  - ایندکس `task_sender_idx` بر روی `sender_id`.

#### ۱۸. جدول پیام‌های مستقیم فردبه‌فرد (`direct_messages`)
- **هدف:** پیام‌رسان امن خصوصی میان داوطلب و پشتیبان، یا سرپرست و پرسنل.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `thread_id` (`varchar(100)`, NOT NULL): شناسه کانونی رشته مکالمه (تولیدشده با مرتب‌سازی آلفابتیک شناسه‌ها).
  - `sender_id` (`text`, NOT NULL, Foreign Key -> `users.id` با `onDelete: cascade`).
  - `sender_name` (`text`, NOT NULL): نام فرستنده.
  - `sender_role` (`varchar(20)`, NOT NULL): نقش فرستنده.
  - `receiver_id` (`text`, NOT NULL, Foreign Key -> `users.id` با `onDelete: cascade`).
  - `receiver_name` (`text`, NOT NULL): نام گیرنده.
  - `receiver_role` (`varchar(20)`, NOT NULL): نقش گیرنده.
  - `message` (`text`, NOT NULL): متن پیام.
  - `attachment_url` (`text`, Nullable): آدرس فایل پیوست یا دیتای Base64 مجاز ویس/مدارک.
  - `attachment_name` (`text`, Nullable): نام فایل پیوست.
  - `attachment_size` (`integer`, Nullable): حجم به بایت.
  - `attachment_type` (`text`, Nullable): مایم‌تایپ (مانند `audio/webm`, `application/pdf`).
  - `is_read` (`boolean`, NOT NULL, Default: `false`): وضعیت خوانده‌شدن پیام.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `direct_thread_idx` بر روی `(thread_id, created_at)`.
  - ایندکس `direct_sender_idx` بر روی `sender_id`.
  - ایندکس `direct_receiver_idx` بر روی `receiver_id`.

#### ۱۹. جدول وضعیت بسته‌بودن ترد پیام‌های مستقیم (`direct_chat_threads`)
- **هدف:** امکان بستن موقت یا دائمی گفتگوی مستقیم بین داوطلب و پشتیبان توسط سرپرست آموزشی.
- **کلید اصلی:** `id` (text): شناسه استاندارد ترد.
- **ستون‌ها:**
  - `is_closed` (`boolean`, NOT NULL, Default: `false`): وضعیت مسدود بودن امکان ارسال پیام جدید.
  - `closed_by_id` (`text`, Nullable, Foreign Key -> `users.id`): سرپرستی که مکالمه را بسته است.
  - `closed_at` (`timestamp`, Nullable): زمان انسداد گفتگو.
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۲۰. جدول تیکت‌های ارجاع به سرپرست (`escalation_tickets`)
- **هدف:** کانال رسمی شکایت یا درخواست تغییر پشتیبان توسط داوطلب به سرپرست ارشد آموزشی.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_id` (`text`, NOT NULL, Foreign Key -> `users.id`).
  - `student_name` (`text`, NOT NULL): نام داوطلب شاکی.
  - `student_phone` (`varchar(20)`, NOT NULL): شماره تماس داوطلب.
  - `mentor_id` (`text`, NOT NULL, Foreign Key -> `users.id`): پشتیبان مربوطه.
  - `mentor_name` (`text`, NOT NULL): نام پشتیبان.
  - `supervisor_id` (`text`, NOT NULL, Foreign Key -> `users.id`): سرپرست مسئول بررسی.
  - `subject` (`text`, NOT NULL): عنوان موضوع تیکت.
  - `reason_category` (`varchar(50)`, NOT NULL): دسته‌بندی علت (عدم برقراری تماس، تاخیر در برنامه، عدم تسلط علمی).
  - `description` (`text`, NOT NULL): متن تفصیلی شرح چالش.
  - `attachment_url` (`text`, Nullable): تصویر یا مستندات پیوست.
  - `attachment_name` (`text`, Nullable): نام فایل پیوست.
  - `status` (`varchar(20)`, NOT NULL, Default: `'OPEN'`): وضعیت رسیدگی (`OPEN`, `IN_REVIEW`, `RESOLVED`).
  - `supervisor_response` (`text`, Nullable): پاسخ رسمی و دستور اجرایی سرپرست.
  - `resolved_at` (`timestamp`, Nullable): زمان مختومه‌شدن تیکت.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `ticket_student_idx` بر روی `student_id`.
  - ایندکس `ticket_supervisor_idx` بر روی `supervisor_id`.

#### ۲۱. جدول الگوهای برنامه مطالعاتی هفتگی (`weekly_plan_templates`)
- **هدف:** الگوهای آماده و استانداردسازی‌شده برنامه‌های درسی جهت اعمال سریع برای داوطلبان توسط منتور و سرپرست.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `author_id` (`text`, NOT NULL, Foreign Key -> `users.id`): طراح الگو.
  - `author_name` (`text`, NOT NULL): نام طراح الگو.
  - `title` (`text`, NOT NULL): عنوان تمپلیت (مانند برنامه هفتگی فاز جمع‌بندی مدنی).
  - `jalali_year` (`integer`, NOT NULL): سال تحصیلی.
  - `jalali_week_number` (`integer`, NOT NULL): شماره هفته پیشنهادی.
  - `target_cohort` (`text`, NOT NULL): کوهورت یا دوره هدف.
  - `weekly_main_goal` (`text`, NOT NULL): هدف هفته در الگو.
  - `items` (`jsonb`, NOT NULL): آرایه ساختاریافته پارت‌های شنبه تا جمعه با ساعات و عناوین.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۲۲. جدول آزمون‌های ارزیابی سنجش اولیه (`evaluation_exams`)
- **هدف:** تعریف آزمون‌های تعیین سطح ورودی جهت سنجش داوطلبان جدید.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `creator_id` (`text`, NOT NULL, Foreign Key -> `users.id`).
  - `creator_role` (`varchar(20)`, NOT NULL): نقش سازنده.
  - `creator_name` (`text`, NOT NULL): نام سازنده.
  - `title` (`text`, NOT NULL): عنوان آزمون.
  - `description` (`text`, NOT NULL): توضیحات آزمون.
  - `start_time` (`varchar(30)`, NOT NULL): زمان شروع بازه.
  - `end_time` (`varchar(30)`, NOT NULL): زمان پایان بازه.
  - `duration_minutes` (`integer`, NOT NULL): مدت زمان پاسخگویی به دقیقه.
  - `total_questions` (`integer`, NOT NULL, Default: `0`): تعداد کل سوالات.
  - `subjects_weight` (`jsonb`, NOT NULL): ضرایب و تعداد سوالات هر ماده درسی.
  - `is_published` (`boolean`, NOT NULL, Default: `true`): وضعیت انتشار.
  - `target_cohort` (`text`, NOT NULL): کوهورت مخاطب.
  - `assigned_student_ids` (`jsonb`, NOT NULL): آرایه داوطلبان مشمول.
  - `questions` (`jsonb`, NOT NULL, Default: `[]`): سوالات تعریف‌شده.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `exam_creator_idx` بر روی `creator_id`.

#### ۲۳. جدول آزمون‌های استاندارد زمان‌دار (`exams`)
- **هدف:** موتور مرکزی آزمون‌های حرفه‌ای، آزمایشی و شبیه‌ساز وکالت با قابلیت هدف‌گذاری و تصحیح هوشمند.
- **کلید اصلی:** `id` (text) با فرمت `exam_{nanoid}`.
- **ستون‌ها:**
  - `title` (`text`, NOT NULL): نام کامل آزمون (مثلاً آزمون شبیه‌ساز جامع وکالت کانون مرکز).
  - `course_code` (`text`, Nullable): کد دوره متناظر (مانند GARNET-BAR-360).
  - `category` (`varchar(50)`, NOT NULL): دسته‌بندی (`MOCK_BAR`, `DIAGNOSTIC`, `SUBJECT_SPECIFIC`).
  - `exam_type` (`varchar(30)`, NOT NULL, Default: `'MOCK_BAR'`): نوع آزمون (`MOCK_BAR`, `DIAGNOSTIC`, `COMPREHENSIVE`, `SUBJECT`).
  - `passing_score` (`integer`, NOT NULL, Default: `50`): حدنصاب قبولی به درصد.
  - `duration_minutes` (`integer`, NOT NULL, Default: `120`): مدت زمان آزمون به دقیقه.
  - `total_questions` (`integer`, NOT NULL, Default: `0`): تعداد کل سوالات آزمون.
  - `has_negative_marking` (`boolean`, NOT NULL, Default: `true`): اعمال نمره منفی ۱/۳ طبق استاندارد کنکور و آزمون وکالت.
  - `is_published` (`boolean`, NOT NULL, Default: `false`): وضعیت انتشار رسمی (تا زمانی که false است، داوطلبان امکان مشاهده ندارند).
  - `target_audience` (`varchar(30)`, NOT NULL, Default: `'ALL'`): گستره مخاطبان (`ALL`, `COURSE_CODE`, `SPECIFIC_STUDENTS`).
  - `target_type` (`varchar(30)`, NOT NULL, Default: `'ALL'`): نوع مخاطب (`ALL`, `COHORT`, `SPECIFIC_STUDENTS`, `MENTOR_STUDENTS`).
  - `target_course_codes` (`jsonb`, NOT NULL, Default: `[]`): آرایه کدهای دوره هدف.
  - `target_courses` (`jsonb`, NOT NULL, Default: `[]`): اسامی یا برچسب‌های دوره‌های مشمول.
  - `target_student_ids` (`jsonb`, NOT NULL, Default: `[]`): لیست شناسه‌های اختصاصی داوطلبان مجاز.
  - `target_mentor_id` (`text`, Nullable, Foreign Key -> `users.id`): اختصاص آزمون صرفاً به داوطلبان یک پشتیبان معین.
  - `start_date` (`timestamp`, Nullable): زمان شروع پنجره برگزاری آزمون.
  - `expiry_date` (`timestamp`, Nullable): زمان انقضا و بسته‌شدن قطعی آزمون.
  - `created_by_id` (`text`, NOT NULL, Foreign Key -> `users.id`): کاربری که آزمون را طراحی کرده است.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `exams_created_by_idx` بر روی `created_by_id`.
  - ایندکس `exams_category_idx` بر روی `category`.
  - ایندکس `exams_published_idx` بر روی `is_published`.
  - ایندکس `exams_target_audience_idx` بر روی `target_audience`.
  - ایندکس `exams_course_code_idx` بر روی `course_code`.
  - ایندکس `exams_target_mentor_idx` بر روی `target_mentor_id`.

#### ۲۴. جدول سوالات چهارگزینه‌ای آزمون‌ها (`exam_questions`)
- **هدف:** بانک سوالات آزمون با ضرایب و پاسخ‌های تشریحی و مستندات قانونی.
- **کلید اصلی:** `id` (text) با فرمت `q_{nanoid}`.
- **ستون‌ها:**
  - `exam_id` (`text`, NOT NULL, Foreign Key -> `exams.id` با `onDelete: cascade`).
  - `question_number` (`integer`, NOT NULL): شماره سوال در آزمون (۱، ۲، ۳، ...).
  - `subject` (`varchar(100)`, NOT NULL): عنوان درس حقوقی (حقوق مدنی، آیین دادرسی مدنی، حقوق تجارت، حقوق جزا، آیین دادرسی کیفری، حقوق اساسی).
  - `question_text` (`text`, NOT NULL): متن کامل سوال حقوقی یا سناریوی پرونده.
  - `options` (`jsonb`, NOT NULL): آرایه گزینه‌های چهارگانه (`[{ id: 1, text: "گزینه ۱" }, ...]`).
  - `correct_option` (`integer`, NOT NULL): شماره گزینه صحیح (۱ الی ۴).
  - `explanation` (`text`, Nullable): تحلیل تشریحی پاسخ و استناد به مواد قانونی یا آرای وحدت رویه دیوان عالی کشور.
  - `coefficient` (`integer`, NOT NULL, Default: `1`): ضریب وزنی سوال.
- **ایندکس‌ها:**
  - ایندکس `exam_questions_exam_id_idx` بر روی `exam_id`.
  - ایندکس `exam_questions_num_idx` بر روی `(exam_id, question_number)`.

#### ۲۵. جدول پاسخنامه‌ها و نتایج شرکت در آزمون (`exam_submissions`)
- **هدف:** ثبت پاسخ‌های داوطلب، تله‌متری تقلب، نمرات خام و تراز، و دروازه تایید کارنامه توسط پشتیبان.
- **کلید اصلی:** `id` (text) با فرمت `sub_{nanoid}`.
- **ستون‌ها:**
  - `exam_id` (`text`, NOT NULL, Foreign Key -> `exams.id` با `onDelete: cascade`).
  - `student_id` (`text`, NOT NULL, Foreign Key -> `users.id` با `onDelete: cascade`).
  - `mentor_id` (`text`, Nullable, Foreign Key -> `users.id` با `onDelete: set null`): پشتیبان اختصاصی داوطلب.
  - `reviewed_by_id` (`text`, Nullable, Foreign Key -> `users.id` با `onDelete: set null`): مدرسی که کارنامه را تایید کرده است.
  - `started_at` (`timestamp`, NOT NULL, Default: `now()`): زمان دقیق شروع آزمون در سرور (پایه محاسبه تایمر قطعی).
  - `submitted_at` (`timestamp`, Nullable): زمان ثبت نهایی پاسخنامه.
  - `answers` (`jsonb`, NOT NULL, Default: `{}`): مپ گزینه‌های انتخابی داوطلب (`{ [questionId]: optionNumber }`).
  - `flagged_questions` (`jsonb`, NOT NULL, Default: `[]`): سوالات نشان‌دار شده برای مرور مجدد (`string[]`).
  - `eliminated_options` (`jsonb`, NOT NULL, Default: `{}`): گزینه‌های ردشده و خط‌خورده توسط داوطلب (`{ [questionId]: [optionNumbers] }`).
  - `tab_switch_count` (`integer`, NOT NULL, Default: `0`): شمارنده خروج از تب یا سوئیچ پنجره (ضدتقلب).
  - `correct_count` (`integer`, NOT NULL, Default: `0`): تعداد صحیح.
  - `incorrect_count` (`integer`, NOT NULL, Default: `0`): تعداد غلط.
  - `wrong_count` (`integer`, NOT NULL, Default: `0`): تعداد غلط (فیلد هماهنگی).
  - `unanswered_count` (`integer`, NOT NULL, Default: `0`): تعداد سوالات بدون پاسخ.
  - `blank_count` (`integer`, NOT NULL, Default: `0`): تعداد سوالات بدون پاسخ.
  - `total_percentage` (`numeric(5, 2)`, NOT NULL, Default: `0.00`): درصد نهایی با احتساب نمره منفی کنکور.
  - `raw_score` (`numeric(5, 2)`, NOT NULL, Default: `0.00`): درصد خام بدون احتساب نمره منفی.
  - `net_score` (`numeric(5, 2)`, NOT NULL, Default: `0.00`): درصد نهایی خالص.
  - `subject_breakdown` (`jsonb`, NOT NULL, Default: `[]`): آرایه ریز درصد، تعداد درست، غلط و نزده هر درس حقوقی.
  - `status` (`varchar(40)`, NOT NULL, Default: `'AUTO_GRADED_PENDING_MENTOR'`): وضعیت چرخه (`IN_PROGRESS`, `AUTO_GRADED_PENDING_MENTOR`, `PENDING_MENTOR_REVIEW`, `PUBLISHED_TO_STUDENT`).
  - `mentor_notes` (`text`, Nullable): یادداشت محرمانه منتور بر روی آزمون.
  - `mentor_feedback` (`text`, Nullable): نسخه تجویزی و تحلیل درسی منتور که پس از تایید برای داوطلب نمایش داده می‌شود.
  - `reviewed_at` (`timestamp`, Nullable): زمان تایید نهایی توسط پشتیبان.
  - `published_at` (`timestamp`, Nullable): زمان انتشار در داشبورد داوطلب.
  - فیلدهای سازگاری نماهای آماری: `student_profile_id`, `student_name`, `exam_title`, `score_percent`, `subject_scores`, `rank`, `delta_from_previous`, `delta_from_baseline`.
- **ایندکس‌ها:**
  - ایندکس ترکیبی `exam_sub_exam_student_idx` بر روی `(exam_id, student_id)`.
  - ایندکس `exam_sub_student_idx` بر روی `student_id`.
  - ایندکس `exam_sub_mentor_idx` بر روی `mentor_id`.
  - ایندکس `exam_sub_status_idx` بر روی `status`.
  - ایندکس `exam_submissions_status_submitted_idx` بر روی `(status, submitted_at)`.

#### ۲۶. جدول تنظیمات ویپ استریسک/ایزابل (`voip_settings`)
- **هدف:** پارامترهای اتصال شبکه TCP به پورت ۵۰۳۸ سانترال Issabel Asterisk AMI.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `host` (`varchar(100)`, NOT NULL): آدرس IP یا هاست سرور ایزابل.
  - `port` (`integer`, NOT NULL): پورت اتصال AMI (پیش‌فرض ۵۰۳۸).
  - `username` (`text`, NOT NULL): نام کاربری AMI (معمولاً admin).
  - `secret` (`text`, NOT NULL): رمز عبور اتصال به سوکت استریسک.
  - `context` (`varchar(50)`, NOT NULL): کانتکست دیال‌پلن استریسک (مانند from-internal).
  - `channel_tech` (`varchar(20)`, NOT NULL): تکنولوژی خطوط (SIP یا PJSIP).
  - `trunk` (`text`, NOT NULL): نام ترانک خروجی جهت برقراری تماس با خطوط شهری/موبایل.
  - `caller_id` (`varchar(30)`, NOT NULL): کالرآیدی سازمانی که روی تلفن داوطلب نمایش داده می‌شود (مانند ۰۲۱۹۱۰۰۰۰۰۰).
  - `is_active` (`boolean`, NOT NULL, Default: `true`): وضعیت فعال بودن سرویس تلفنی.
  - `mentor_extensions` (`jsonb`, NOT NULL): نگاشت شناسه کاربری پشتیبانان به داخلی زویپر آن‌ها (`{ "usr_mentor1": "101" }`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۲۷. جدول لاگ مکالمات تلفنی ویپ (`voip_calls`)
- **هدف:** ممیزی و ثبت سوابق کلیه تماس‌های امن دوطرفه، مدت زمان مکالمه و یادداشت‌های مشاوره.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `mentor_id` (`text`, NOT NULL, Foreign Key -> `users.id`).
  - `mentor_name` (`text`, NOT NULL): نام پشتیبان تماس‌گیرنده یا پاسخ‌دهنده.
  - `mentor_extension` (`varchar(20)`, NOT NULL): شماره داخلی زویپر منتور.
  - `student_profile_id` (`text`, NOT NULL, Foreign Key -> `student_profiles.id`).
  - `student_name` (`text`, NOT NULL): نام داوطلب.
  - `masked_phone` (`varchar(30)`, NOT NULL): شماره تلفن همراه ماسک‌شده جهت حفظ کامل حریم خصوصی (مانند ۰۹۱۲***۰۰۰۵).
  - `status` (`varchar(20)`, NOT NULL): وضعیت تماس (`INITIATED`, `RINGING`, `CONNECTED`, `COMPLETED`, `BUSY`, `NO_ANSWER`, `FAILED`).
  - `duration_seconds` (`integer`, NOT NULL, Default: `0`): مدت زمان مکالمه مفید به ثانیه.
  - `call_unique_id` (`text`, Nullable): شناسه یکتای اختصاص داده‌شده توسط استریسک برای ردیابی CDR.
  - `initiated_at` (`timestamp`, NOT NULL, Default: `now()`): تاریخ و ساعت شروع تماس.
  - `notes` (`text`, Nullable): یادداشت خلاصه مباحث مشاوره‌ای و تعهدات داوطلب در این تماس.
- **ایندکس‌ها:**
  - ایندکس `voip_call_mentor_idx` بر روی `mentor_id`.
  - ایندکس `voip_call_student_idx` بر روی `student_profile_id`.

#### ۲۸. جدول کانال‌ها و گروه‌های گفتگو (`chat_conversations`)
- **هدف:** فضاهای گفتگوی گروهی، کانال‌های اطلاعیه رسمی موسسه و چت‌های چندنفره.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `type` (`varchar(20)`, NOT NULL): نوع فضا (`CHANNEL` کانال یکطرفه، `GROUP` گروه تعاملی، `DIRECT`).
  - `title` (`text`, NOT NULL): نام گروه یا کانال.
  - `description` (`text`, Nullable): شرح قوانین یا توضیحات.
  - `creator_id` (`text`, NOT NULL, Foreign Key -> `users.id`): کاربر ایجادکننده.
  - `creator_role` (`varchar(20)`, NOT NULL): نقش ایجادکننده.
  - `creator_name` (`text`, NOT NULL): نام ایجادکننده.
  - `member_ids` (`jsonb`, NOT NULL): آرایه شناسه‌های کاربران عضو (`string[]`).
  - `is_channel_read_only_for_students` (`boolean`, NOT NULL, Default: `false`): فقط‌خواندنی بودن برای داوطلبان (کانال اعلانات).
  - `is_ghost_mode` (`boolean`, NOT NULL, Default: `false`): قابلیت مشاهده مخفی سرپرست بدون نمایش نام در اعضا.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۲۹. جدول پیام‌های کانال و گروه (`chat_messages`)
- **هدف:** پیام‌های متنی، صوتی (ویس) و فایل‌های مبادله‌شده درون کانال‌ها و گروه‌ها.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `conversation_id` (`text`, NOT NULL, Foreign Key -> `chat_conversations.id`).
  - `sender_id` (`text`, NOT NULL, Foreign Key -> `users.id`).
  - `sender_name` (`text`, NOT NULL): نام فرستنده.
  - `sender_role` (`varchar(20)`, NOT NULL): نقش فرستنده.
  - `message` (`text`, NOT NULL): متن پیام ارسالی.
  - `attachment_url` (`text`, Nullable): آدرس دانلود یا دیتای بیس۶۴ ویس/فایل مجاز.
  - `attachment_name` (`text`, Nullable): نام فایل.
  - `attachment_size` (`integer`, Nullable): حجم فایل به بایت.
  - `attachment_type` (`text`, Nullable): مایم‌تایپ فایل.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `chat_msg_conv_idx` بر روی `(conversation_id, created_at)`.

#### ۳۰. جدول تنظیمات وبینار و پلتفرم تصویری (`video_settings`)
- **هدف:** اتصال به پلتفرم‌های جلسات آنلاین تصویری نظیر BigBlueButton, Jitsi یا Skyroom.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `platform_name` (`text`, NOT NULL): نام پلتفرم ویدیویی.
  - `server_url` (`text`, NOT NULL): آدرس سرور ارائه‌دهنده وبینار.
  - `api_key` (`text`, NOT NULL): سکرت اتصال به وب‌سرویس ویدیویی.
  - `is_enabled` (`boolean`, NOT NULL, Default: `true`): فعال بودن سیستم جلسات تصویری.

#### ۳۱. جدول جلسات و کارگاه‌های آنلاین تصویری (`video_sessions`)
- **هدف:** جلسات تحلیل درسی، کارگاه‌های رفع اشکال جمعی و جلسات فردی تریاژ ویدیویی.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `title` (`text`, NOT NULL): موضوع جلسه آنلاین.
  - `host_id` (`text`, NOT NULL, Foreign Key -> `users.id`): استاد یا منتور میزبان.
  - `host_name` (`text`, NOT NULL): نام میزبان جلسه.
  - `host_role` (`varchar(20)`, NOT NULL): نقش میزبان.
  - `room_code` (`varchar(50)`, NOT NULL): شناسه اتاق در پلتفرم ویدیویی.
  - `session_type` (`varchar(50)`, NOT NULL): نوع جلسه (`TRIAGE_VIDEO`, `WORKSHOP`, `COHORT_MEETING`).
  - `target_cohort` (`text`, NOT NULL): دوره یا گروه هدف.
  - `allowed_roles` (`jsonb`, NOT NULL): نقش‌های مجاز به ورود.
  - `participant_ids` (`jsonb`, NOT NULL): لیست کاربران دعوت‌شده.
  - `scheduled_start` (`varchar(30)`, NOT NULL): تاریخ و ساعت آغاز جلسه.
  - `duration_minutes` (`integer`, NOT NULL, Default: `60`): مدت زمان تخمینی به دقیقه.
  - `status` (`varchar(20)`, NOT NULL, Default: `'SCHEDULED'`): وضعیت جلسه (`SCHEDULED`, `LIVE`, `ENDED`, `CANCELLED`).
  - `join_url` (`text`, NOT NULL): لینک ورود مستقیم به اتاق وبینار.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۳۲. جدول محتوای صفحه فرود لندینگ (`landing_content`)
- **هدف:** مدیریت پویای متون، تیترها، آمارها و تنظیمات صفحه اصلی بدون نیاز به دیپلوی مجدد کد.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `content` (`jsonb`, NOT NULL): ساختار جامع متون هدر، بنرها، صوت‌ها، ویدئوها و دپارتمان‌ها.
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۳۳. جدول ساعات پاسخگویی تلفنی پشتیبانان (`mentor_calling_windows`)
- **هدف:** تعیین دقیق ساعات آنلاین بودن روزانه پشتیبان (مثلاً ۱۷:۰۰ الی ۲۰:۰۰) جهت فعال‌سازی دکمه تماس معکوس در پنل داوطلب.
- **کلید اصلی:** `id` (text) با فرمت `window_{mentorId}`.
- **ستون‌ها:**
  - `mentor_id` (`text`, NOT NULL, UNIQUE, Foreign Key -> `users.id`): شناسه یکتای پشتیبان آموزشی.
  - `start_time` (`varchar(10)`, NOT NULL, Default: `'17:00'`): ساعت شروع بازه پاسخگویی (به وقت رسمی ایران).
  - `end_time` (`varchar(10)`, NOT NULL, Default: `'20:00'`): ساعت پایان بازه پاسخگویی (به وقت رسمی ایران).
  - `days_of_week` (`jsonb`, NOT NULL, Default: `[0, 1, 2, 3, 4]`): روزهای فعال هفته (شنبه=۰ تا جمعه=۶).
  - `daily_duration_hours` (`integer`, NOT NULL, Default: `3`): طول مدت تعهد پاسخگویی روزانه به ساعت.
  - `is_active` (`boolean`, NOT NULL, Default: `true`): فعال یا غیرفعال بودن بازه زمانی.
  - `announcement` (`text`, Nullable): پیام کوتاه به داوطلبان درباره نحوه پاسخگویی در این هفته.
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۳۴. جدول دوره‌های آموزشی دارای بسته پشتیبانی ۳۶۰ (`entitled_courses`)
- **هدف:** تطبیق دوره‌های خریداری‌شده در LMS گارنت با بسته‌های رسمی دارای خدمات مشاوره و پشتیبانی مشاهیر دانش.
- **کلید اصلی:** `id` (text) با فرمت `crs_{nanoid}`.
- **ستون‌ها:**
  - `course_code` (`varchar(100)`, NOT NULL, UNIQUE): کد یکتای دوره در گارنت (مانند GARNET-BAR-360).
  - `course_name` (`text`, NOT NULL): عنوان رسمی دوره آموزشی.
  - `description` (`text`, Nullable): خدمات و تعهدات شامل‌شده در بسته.
  - `price_formatted` (`varchar(50)`, Default: `'۵,۸۰۰,۰۰۰ تومان'`): قیمت پکیج جهت نمایش به کاربرانی که دسترسی ندارند.
  - `garnet_purchase_url` (`text`, NOT NULL): آدرس مستقیم صفحه ثبت‌نام و خرید در سامانه گارنت.
  - `has_support` (`boolean`, NOT NULL, Default: `true`): آیا این دوره شامل دسترسی به پلتفرم پشتیبانی و آزمون است یا خیر.
  - `support_tier` (`varchar(50)`, NOT NULL, Default: `'GOLD'`): سطح پشتیبانی (`GOLD`, `VIP`, `STANDARD`).
  - `study_plan_start_date` (`varchar(50)`, Nullable): تاریخ شروع برنامه مطالعاتی این دوره (تقویم شمسی).
  - `study_plan_end_date` (`varchar(50)`, Nullable): تاریخ پایان و روز آزمون وکالت.
  - `is_active` (`boolean`, NOT NULL, Default: `true`): وضعیت فعال بودن در سامانه.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۳۵. جدول گزارش‌های خودارزیابی هفتگی جمعه (`friday_reports`)
- **هدف:** فرم جامع خودارزیابی داوطلب در انتهای هفته شامل ساعات تفکیکی مطالعه و نسخه درمانی تجویزی منتور.
- **کلید اصلی:** `id` (text).
- **ستون‌ها:**
  - `student_id` (`text`, NOT NULL, Foreign Key -> `users.id`).
  - `student_profile_id` (`text`, Nullable, Foreign Key -> `student_profiles.id`).
  - `cohort_id` (`text`, Nullable): دوره یا کوهورت داوطلب.
  - `week_number` (`integer`, NOT NULL): شماره هفته در تقویم آموزشی.
  - `study_hours_civil` (`integer`, NOT NULL, Default: `0`): ساعت مطالعه حقوق مدنی.
  - `study_hours_criminal` (`integer`, NOT NULL, Default: `0`): ساعت مطالعه حقوق جزا و کیفری.
  - `study_hours_trade` (`integer`, NOT NULL, Default: `0`): ساعت مطالعه حقوق تجارت.
  - `study_hours_procedure` (`integer`, NOT NULL, Default: `0`): ساعت مطالعه آیین دادرسی مدنی و کیفری.
  - `total_hours` (`integer`, NOT NULL, Default: `0`): مجموع ساعت مطالعه هفتگی.
  - `tests_count` (`integer`, NOT NULL, Default: `0`): تعداد تست زده‌شده در طول هفته.
  - `weak_points` (`text`, Nullable): نقاط ضعف درسی شناسایی‌شده توسط داوطلب.
  - `strengths` (`text`, Nullable): نقاط قوت و مباحث مسلط.
  - `student_notes` (`text`, Nullable): پیام داوطلب برای پشتیبان.
  - `status` (`varchar(30)`, NOT NULL, Default: `'SUBMITTED'`): وضعیت گزارش (`SUBMITTED`, `APPROVED`, `REJECTED`).
  - `mentor_feedback` (`text`, Nullable): تحلیل جامع و نسخه راهبردی مکتوب پشتیبان برای هفته آینده.
  - `mentor_reviewed_at` (`timestamp`, Nullable): زمان بررسی و ثبت بازخورد توسط پشتیبان.
  - `supervisor_approval` (`boolean`, NOT NULL, Default: `false`): تایید کیفی نحوه پاسخگویی پشتیبان توسط سرپرست.
  - `supervisor_notes` (`text`, Nullable): یادداشت نظارتی سرپرست.
  - `supervisor_approved_at` (`timestamp`, Nullable): زمان تایید سرپرست.
  - `submitted_at` (`timestamp`, NOT NULL, Default: `now()`).
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `friday_report_student_idx` بر روی `(student_id, week_number)`.
  - ایندکس `friday_report_week_idx` بر روی `week_number`.

#### ۳۶. جدول تنظیمات وب‌سرویس حساب مرکزی مشاهیر (`sso_api_settings`)
- **هدف:** تنظیمات داینامیک اتصال به API مرکزی گارنت/مشاهیر شامل آدرس‌ها، کلیدها، تایم‌اوت و مسیرها.
- **کلید اصلی:** `id` (text) پیش‌فرض `'default'`.
- **ستون‌ها:**
  - `is_enabled` (`boolean`, NOT NULL, Default: `true`): فعال بودن ماژول ورود یکپارچه.
  - `service_title` (`text`, NOT NULL, Default: `'حساب کاربری مشاهیر دانش'`): عنوان نمایشی در صفحات لاگین.
  - `base_url` (`text`, NOT NULL, Default: `'https://mashahiredanesh.com/GarnetAPI'`): آدرس پایه وب‌سرویس.
  - `login_endpoint` (`text`, NOT NULL, Default: `'/auth/loginMobile'`): مسیر اعتبارسنجی لاگین.
  - `courses_endpoint` (`text`, NOT NULL, Default: `'/user/courses'`): مسیر استعلام دوره‌های ثبت‌نامی کاربر.
  - `send_otp_endpoint` (`text`, NOT NULL, Default: `'/users/sendVerificationCodeByMobile'`): مسیر درخواست پیامک تایید مرکزی.
  - `verify_otp_endpoint` (`text`, NOT NULL, Default: `'/users/checkVerificationCode'`): مسیر راستی‌آزمایی کد پیامکی مرکزی.
  - `products_endpoint` (`text`, NOT NULL, Default: `'/invoices/productListByUser'`): مسیر واکشی فاکتورها و محصولات.
  - `code_count` (`integer`, NOT NULL, Default: `5`): طول ارقام کد اعتبارسنجی پیامکی.
  - `api_key_header` (`varchar(100)`, NOT NULL, Default: `'g-api-key'`): نام هدر امنیتی کلید API.
  - `api_key_value` (`text`, NOT NULL, Default: `'AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5'`): مقدار سکرت وب‌سرویس مرکزی.
  - `mobile_field_name` (`varchar(50)`, NOT NULL, Default: `'mobile'`): نام فیلد شماره موبایل در بدنه درخواست.
  - `password_field_name` (`varchar(50)`, NOT NULL, Default: `'password'`): نام فیلد کلمه عبور.
  - `success_status_code` (`integer`, NOT NULL, Default: `2000`): کد وضعیت موفقیت دریافتی از سرور گارنت.
  - `timeout_ms` (`integer`, NOT NULL, Default: `8000`): مهلت زمان پاسخگویی به میلی‌ثانیه قبل از قطعی.
  - `auto_create_student` (`boolean`, NOT NULL, Default: `true`): ساخت خودکار پروفایل در صورت تایید دوره کاربر.
  - `bypass_course_check_if_no_endpoint` (`boolean`, NOT NULL, Default: `true`): مکانیزم تحمل خطا در صورت عدم پاسخ سرور محصولات.
  - `updated_at` (`timestamp`, NOT NULL, Default: `now()`).

#### ۳۷. جدول لاگ‌های ممیزی امنیتی فراگیر (`system_audit_logs`)
- **هدف:** ردگیری دست‌نخورده، ممیزی ضدجاسوسی و ثبت کلیه اقدامات حیاتی با آدرس IP و مشخصات مرورگر (User-Agent).
- **کلید اصلی:** `id` (text) با فرمت `sys_log_{nanoid}`.
- **ستون‌ها:**
  - `actor_id` (`text`, NOT NULL): شناسه کاربر انجام‌دهنده عمل.
  - `actor_name` (`text`, NOT NULL): نام کامل کاربر.
  - `actor_role` (`varchar(30)`, NOT NULL): نقش کاربر در زمان انجام عمل.
  - `event_type` (`varchar(50)`, NOT NULL): دسته‌بندی موضوعی رخداد (`AUTH`, `CHANNEL`, `COURSE`, `MESSAGE`, `VOICE`, `VOIP_CALL`, `STUDY_PLAN`, `EXAM`, `TASK`, `USER_MGMT`).
  - `action` (`text`, NOT NULL): نام فنی عمل (مانند USER_DELETED, EXAM_PUBLISHED, CALL_ORIGINATED).
  - `target_entity` (`varchar(50)`, NOT NULL): نام موجودیت یا جدول تحت تاثیر.
  - `target_id` (`text`, Nullable): شناسه ردیف یا موجودیت هدف.
  - `details` (`text`, Nullable): شرح تفصیلی رخداد به فارسی.
  - `metadata` (`jsonb`, Nullable, Default: `{}`): پی‌لود کامل پارامترها و رکوردهای تغییریافته.
  - `ip_address` (`varchar(45)`, Nullable): آدرس IP فرستنده درخواست (پشتیبانی از IPv4 و IPv6).
  - `user_agent` (`text`, Nullable): مشخصات هدر مرورگر کاربر.
  - `created_at` (`timestamp`, NOT NULL, Default: `now()`).
- **ایندکس‌ها:**
  - ایندکس `sys_audit_actor_idx` بر روی `actor_id`.
  - ایندکس `sys_audit_event_idx` بر روی `event_type`.
  - ایندکس `sys_audit_created_idx` بر روی `created_at`.

---

## ۲.۳ موتور خودترمیم بوت‌استرپ و سیدینگ خودکار داده‌ها (Self-Healing Bootstrap & Initial Seeding)

یکی از وجوه تمایز معماری پلتفرم مشاهیر دانش، عدم وابستگی فرآیند اجرای کانتینر به اجرای دستی اسکریپت‌های مایگریشن است. موتور خودترمیم دیتابیس در دو مرحله هماهنگ اجرا می‌شود:

### ۱. اجرای DDL خودترمیم (`runDatabaseBootstrap` در `src/server/db/bootstrap.ts`):
به محض بالا آمدن سرویس بک‌اند، تابع `ensureDatabaseBootstrap()` در `src/server/db/index.ts` فراخوانی می‌شود. این متد دستورات DDL پایگاه داده را با شرط‌های `CREATE TABLE IF NOT EXISTS`, `CREATE TYPE ... IF NOT EXISTS` و `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` به صورت کاملاً غیرمخرب (Idempotent) اجرا می‌کند. بدین ترتیب، حتی اگر یک دیتابیس کاملاً خام و خالی به کانتینر متصل شود، در عرض کمتر از ۱ ثانیه تمامی ۳۴ جدول، ۸ اینام، ۲۵ ایندکس و قیدهای کلید خارجی ساخته می‌شوند.

### ۲. سیدینگ خودکار حساب‌های رسمی پایلوت (`src/server/db/index.ts`):
پس از تضمین وجود جداول، سیستم وجود حساب‌های راهبردی و زیرساختی زیر را بررسی کرده و در صورت نبود، آن‌ها را با رمزهای ایمن مبتنی بر الگوریتم `scrypt` ایجاد می‌کند:

| شناسه کاربری (`id`) | نام کاربری (`username`) | تلفن همراه | نقش (`role`) | کلمه عبور پیش‌فرض تست | شماره داخلی ویپ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `usr_admin` | `admin` | `09120000001` | `CEO` (مدیریت ارشد) | `Admin@123456` | ۱۰۱ |
| `usr_adminsupervisor`| `supervisor` | `09120000002` | `SUPERVISOR` (سرپرست آموزشی)| `Supervisor@123456` | ۱۰۱ |
| `usr_mentor1` | `mentor` | `09121000001` | `MENTOR` (پشتیبان علمی) | `Mentor@123456` | ۱۰۱ |
| `usr_student1` | `student` | `09121000005` | `STUDENT` (داوطلب وکالت)| `Student@123456` | ندارد |
| `usr_mentor_test_09123445103`| `mentor_test` | `09123445103` | `MENTOR` (پشتیبان پایلوت)| `Mentor@123456` | ۱۰۲ |
| `usr_student_test_09227141667`| `student_test` | `09227141667` | `STUDENT` (داوطلب پایلوت)| `Student@123456` | ندارد |

همچنین دوره‌های اولیه مشاهیر و گارنت (`GARNET-BAR-360`, `MASHAHIR-BAR-360`, `GARNET-VIP-COACH`)، ساعات پاسخگویی پیش‌فرض پشتیبانان (۱۷:۰۰ الی ۲۰:۰۰ شنبه تا چهارشنبه) و خطوط ویپ ایزابل به صورت خودکار رجیستر می‌گردند.

---

## ۲.۴ معماری امنیت اعتماد صفر، رمزنگاری و احراز هویت (Zero-Trust Security & Auth Architecture)

سامانه پشتیبانی مشاهیر دانش بر پایه اصول معماری «اعتماد صفر» (Zero-Trust Architecture) طراحی شده است. هیچ کلاینتی قابل اعتماد تلقی نمی‌شود و تمام هویت‌سنجی‌ها، مجوزها و اعتبارسنجی‌ها در لایه سرور به صورت سخت‌گیرانه اعمال می‌گردند.

```
                    ┌───────────────────────────────────────────────┐
                    │       کاربر / کلاینت (داوطلب / پرسنل)          │
                    └───────────────────────┬───────────────────────┘
                                            │ شماره موبایل / نام کاربری
                                            ▼
                     ┌─────────────────────────────────────────────┐
                     │          مرحله ۱: بررسی دیتابیس محلی        │
                     │          (users & student_profiles)         │
                     └──────────────┬──────────────────────────────┘
                                    │
                       یافت شد؟ ───┼─── خیر
                       │            │
                      بله           ▼
                       │    ┌──────────────────────────────────────┐
                       │    │    مرحله ۲: بررسی لیست سفید اکسل     │
                       │    │          (student_whitelist)         │
                       │    └───────┬──────────────────────────────┘
                       │            │
                       │     یافت شد؟ ─── خیر
                       │     │      │
                       │    بله     ▼
                       │     │  ┌──────────────────────────────────┐
                       │     │  │ مرحله ۳: استعلام وب‌سرویس گارنت   │
                       │     │  │      (Garnet Central SSO API)    │
                       │     │  └───────────┬──────────────────────┘
                       │     │              │
                       ▼     ▼              ▼
                    ┌──────────────────────────────────────────────┐
                    │    تولید نشست امن و توکن امضاشده HS256        │
                    │      (HttpOnly Cookie: mashahir_session)     │
                    └──────────────────────────────────────────────┘
```

### ۲.۴.۱ هش کلمات عبور با الگوریتم مقاوم `scrypt`
کلمات عبور با الگوریتم استاندارد و مقاوم در برابر حملات سخت‌افزاری/ASIC به نام `scrypt` رمزنگاری می‌شوند:
- تولید نمک تصادفی (Salt) با طول ۱۶ بایت با `crypto.randomBytes(16)`
- پارامترهای مشتق‌سازی کلید: طول کلید ۶۴ بایت، هزینه پردازشی $N=16384$, $r=8$, $p=1$
- ساختار ذخیره‌سازی: رشته‌ای به فرمت `scrypt$<hex_salt>$<hex_derived_key>`
- اعتبارسنجی کلمه عبور با تابع `crypto.timingSafeEqual` برای مقابله قطعی با حملات کانال جانبی تحلیل زمانی (Timing Attacks)

### ۲.۴.۲ موتور تولید و اعتبارسنجی رمز یکبار مصرف (Cryptographic OTP Engine)
- تولید کد ۵ رقمی کاملاً تصادفی و رمزنگاری‌شده با `crypto.randomInt(10000, 99999)`
- مدت اعتبار دقیق ۲ دقیقه (۱۲۰ ثانیه) از زمان صدور
- ذخیره‌سازی در هش‌مپ امن در حافظه و ردگیری متصل به شماره تلفن
- نرمال‌سازی خودکار و بی‌نقص اعداد فارسی و عربی به ارقام استاندارد انگلیسی قبل از هش یا مقایسه (`toEnglishDigits`)
- پالایش فرمت شماره‌های تلفن همراه ایران: تبدیل تمام فرمت‌های `+98`, `0098`, `98`, شماره‌های بدون صفر، فاصله‌دار یا خط‌تیره‌دار به فرمت استاندارد ۱۱ رقمی `09xxxxxxxxx` (`normalizePhoneNumber`)

### ۲.۴.۳ سیستم محدودسازی نرخ درخواست (Sliding-Window Rate Limiting)
جهت جلوگیری از حملات Brute-Force و هزینه‌تراشی پیامکی (SMS Toll Fraud):
- پنجره لغزان محدودیت ورود با کلمه عبور: حداکثر ۵ تلاش ناموفق در هر ۱۰ دقیقه به ازای هر نام‌کاربری/IP. در تلاش ششم حساب به مدت ۱۵ دقیقه قفل می‌گردد.
- پنجره لغزان درخواست OTP: حداکثر ۳ درخواست در هر ۱۰ دقیقه به ازای هر شماره تلفن همراه.
- معماری دوگانه ذخیره‌سازی: ذخیره در حافظه توزیع‌شده Redis (در صورت اتصال) با کلیدهای انقضادار، و فالبک خودکار و بدون وقفه به ساختار درون‌حافظه‌ای Node.js در صورت عدم دسترسی به ردیس.

### ۲.۴.۴ آبشار ۳ مرحله‌ای ورود سازمانی (Garnet LMS SSO 3-Step Waterfall)
هنگامی که کاربری قصد ورود به سامانه را دارد، جریان احراز هویت در ۳ گام شفاف پردازش می‌شود:
1. **گام اول (بررسی پایگاه‌داده محلی):** ابتدا شماره تلفن یا نام‌کاربری در جدول `users` جستجو می‌شود. در صورت انطباق رمزعبور یا صحت OTP، نشست کاربر بلافاصله ایجاد می‌گردد.
2. **گام دوم (بررسی لیست سفید اکسل):** در صورت عدم وجود در جدول کاربران، جدول `student_whitelist` بررسی می‌گردد. اگر شماره همراه در لیست سفید بارگذاری‌شده توسط سرپرست باشد، کاربر با اطلاعات همان رکورد ساخته شده و پشتیبان پیش‌فرض به وی منتسب می‌گردد.
3. **گام سوم (استعلام زنده از وب‌سرویس مرکزی گارنت):** در صورت عدم وجود در دیتابیس و لیست سفید، سامانه با فراخوانی متد `authenticateWithGarnetCredentials()` لاگین کاربر را با سرور LMS مشاهیر دانش راستی‌آزمایی می‌کند:
   - ارسال نام کاربری و رمز به اندپوینت `login_endpoint` گارنت.
   - استعلام دوره‌های فعال کاربر از `courses_endpoint`.
   - تطبیق با جدول دوره‌های دارای پشتیبانی (`entitled_courses`).
   - در صورت احراز دوره پشتیبانی، رکورد کاربر به صورت محلی ثبت شده (`provisioning_source: 'GARNET_SSO'`) و دسترسی صادر می‌گردد.
   - مکانیزم تحمل خطا: در صورتی که سرور کاتالوگ دوره‌های گارنت دچار قطعی موقت باشد، تنظیم `bypass_course_check_if_no_endpoint: true` از قفل شدن دسترسی دانشجویان ثبت‌نامی جلوگیری می‌کند.

### ۲.۴.۵ چرخه حیات نشست امن (Session Lifecycle & JWT)
- توکن نشست به صورت ساختار امضاشده JSON Web Token با الگوریتم متقارن **HS256** صادر می‌شود.
- کلید سکرت امضا از متغیر محیطی `SESSION_SECRET` (حداقل ۳۲ کاراکتر رندوم) تأمین می‌گردد.
- ذخیره‌سازی انحصاری در کوکی مرورگر با نام `mashahir_session` با ویژگی‌های حیاتی:
  - `HttpOnly: true` (غیرقابل دسترسی با اسکریپت‌های کلاینت و مقابله ۱۰۰٪ با XSS Cookie Theft)
  - `Secure: true` در محیط پروداکشن (ارسال منحصراً بر روی بستر رمزنگاری‌شده HTTPS)
  - `SameSite: "lax"` (جلوگیری از جعل درخواست فراسایت CSRF)
  - `path: "/"`
- طول عمر نشست: ۷ روز کامل (۶۰۴,۸۰۰ ثانیه).
- **تمدید خودکار لغزان (Sliding Session Renewal):** در میدل‌ور سرور (`src/middleware.ts`)، در صورتی که از عمر سشن بیش از ۶ روز گذشته باشد و کمتر از ۲ ساعت به انقضا مانده باشد، توکن به صورت شفاف و نامحسوس برای یک هفته دیگر تمدید و در هدر پاسخ ست می‌شود.

### ۲.۴.۶ ماتریس کنترل دسترسی مبتنی بر نقش (RBAC Matrix)

| دسترسی / ماژول سیستمی | داوطلب (`STUDENT`) | پشتیبان (`MENTOR`) | سرپرست (`SUPERVISOR`) | مدیر ارشد (`CEO`/`ADMIN`) |
| :--- | :---: | :---: | :---: | :---: |
| مشاهده برنامه مطالعاتی شخصی | ✅ | ❌ | ❌ | ❌ |
| ثبت چک‌این و پیشرفت درسی روزانه | ✅ | ❌ | ❌ | ❌ |
| شرکت در آزمون‌های CBT زمان‌دار | ✅ | ❌ | ❌ | ❌ |
| ثبت فرم خودارزیابی جمعه | ✅ | ❌ | ❌ | ❌ |
| ثبت تیکت ارجاع به سرپرست | ✅ | ❌ | ❌ | ❌ |
| شروع تماس امن معکوس با پشتیبان | ✅ (در ساعات مجاز) | ❌ | ❌ | ❌ |
| تدوین و سفارشی‌سازی برنامه هفتگی | ❌ | ✅ (داوطلبان خود) | ✅ (همه) | ✅ (همه) |
| بررسی کارنامه و تجویز نسخه درمانی | ❌ | ✅ (داوطلبان خود) | ✅ (همه) | ✅ (همه) |
| حل پرونده‌های تریاژ و هشدارهای درسی | ❌ | ✅ (داوطلبان خود) | ✅ (نظارت و ارجاع) | ✅ (همه) |
| تعیین ساعات پاسخگویی روزانه تلفنی | ❌ | ✅ (پنجره خود) | ✅ | ✅ |
| آغاز تماس مستقیم تلفنی با داوطلب | ❌ | ✅ (داوطلبان خود) | ✅ (همه) | ✅ (همه) |
| طراحی و انتشار آزمون تستی | ❌ | ⚠️ (با پرمیشن خاص)| ✅ | ✅ |
| بارگذاری اکسل لیست سفید داوطلبان | ❌ | ❌ | ✅ | ✅ |
| انتساب داوطلبان به پشتیبانان | ❌ | ❌ | ✅ | ✅ |
| ممیزی پیام‌ها و مکالمات | ❌ | ❌ | ✅ | ✅ |
| مدیریت کاربران، نقش‌ها و حذف حساب | ❌ | ❌ | ❌ | ✅ |
| پیکربندی سرور ویپ، درگاه پیامک و گارنت| ❌ | ❌ | ❌ | ✅ |
| مشاهده لاگ‌های ممیزی امنیتی ضدجاسوسی | ❌ | ❌ | ❌ | ✅ |

### ۲.۴.۷ گاردها و محافظ‌های سطح سرور (Zero-Trust Server Action Guards)
کلیه جهش‌ها (Mutations) و اکشن‌های سرور تحت حفاظت توابع گارد سخت‌گیرانه قرار دارند:
- `requireAuth()`: اعتبارسنجی صحت امضا و انقضای نشست کاربر.
- `requireRole(["SUPERVISOR", "CEO", "ADMIN"])`: مسدودسازی قطعی دسترسی نقش‌های غیرمجاز و بازگرداندن خطای امنیتی.
- `requireStudentOwnership(studentId)`: تضمین می‌کند که داوطلب صرفاً به رکوردهای متعلق به شناسه خود دسترسی داشته باشد (جلوگیری از IDOR).
- `requireMentorOwnership(studentId)`: تضمین می‌کند که پشتیبان صرفاً داوطلبان منتسب به پورتفولیوی خود را مدیریت کند مگر آنکه نقش سرپرست یا مدیر ارشد داشته باشد.

### ۲.۴.۸ قوانین ماسک‌سازی اطلاعات هویتی و محرمانگی (Strict PII Masking)
جهت پایبندی به الزامات حریم خصوصی و اصول اخلاق حرفه‌ای وکالت:
- شماره‌های تلفن همراه داوطلبان در کلیه جداول، کارتابل پشتیبانان، گزارش‌های ممیزی و لیست‌های عمومی ماسک می‌شوند:
  - فرمت ماسک: ۴ رقم اول + سه ستاره + ۴ رقم آخر (مثال: `۰۹۱۲***۰۰۰۵`).
- کدملی داوطلبان ماسک می‌شود: ۳ رقم اول + سه ستاره + ۴ رقم آخر (مثال: `۰۰۱***۱۲۳۴`).
- شماره تلفن واقعی داوطلب و پشتیبان در زمان تماس تلفنی ویپ هرگز به طرفین نشان داده نمی‌شود؛ طرفین صرفاً سرشماره سازمانی مشاهیر دانش (`۰۲۱۹۱۰۰۰۰۰۰`) را بر روی صفحه گوشی خود مشاهده می‌کنند.

### ۲.۴.۹ موتور استگانوگرافی و واترمارک فارنزیک نامرئی (Invisible Forensic Watermark)
جهت صیانت از محتوای انحصاری، برنامه‌های درسی و سوالات آزمون‌های مشاهیر دانش و شناسایی قطعی عاملان افشا یا فروش محتوا (Anti-Espionage Shield):
- کامپوننت `ForensicWatermark` به صورت یک لایه Overlay در تمام صفحات حساس (`/student/study-plan`, `/student/exams`, `/student/dashboard`) بارگذاری می‌شود.
- متادیتا شامل: نام و نام خانوادگی، شماره تماس، کدملی، شناسه داوطلب، آی‌پی و تایم‌استمپ دقیق.
- **تکنیک لایه‌بندی نامرئی دوکاناله (Dual-Channel Micro-Offsetting):** متادیتا با کانال آبی (`rgba(0, 40, 255, 0.012)`) و افست زاویه‌ای در کانال مکمل کهربایی/قرمز (`rgba(255, 140, 0, 0.012)`) به طور مکرر با زاویه منفی ۲۲ درجه در بوم HTML5 ترسیم می‌شود.
- شفافیت کانال‌ها بر روی آلفای بسیار ناچیز `0.012` قفل شده و به دلیل حذف ویژگی `mixBlendMode: "multiply"`، در هر دو حالت پس‌زمینه روشن (`#F4F6F9`) و حالت دارک‌مود (`#0B101E`) برای چشم غیرمسلح کاملاً نامرئی است و خوانایی متن را کاهش نمی‌دهد.
- **موتور رمزگشایی فارنزیک (`/admin/forensic-decoder`):** در صورت انتشار هرگونه اسکرین‌شات از صفحات در کانال‌های تلگرامی یا شبکه‌های اجتماعی، حراست موسسه تصویر را در پنل دی‌کودر بارگذاری می‌کند. فیلتر تفکیک رنگی با ماتریس باینری کنتراست بالا (`Edge Detection & Thresholding Filter`) کدهای نامرئی را آشکار کرده و هویت و کدملی داوطلب خاطی را در عرض ۳ ثانیه استخراج می‌نماید.

---

## ۲.۵ موتور آزمون‌های زمان‌دار و استاندارد CBT وکالت (CBT Examination Engine)

موتور برگزاری آزمون آنلاین مشاهیر دانش بر اساس آخرین استانداردهای فنی سازمان سنجش و کانون وکلای دادگستری طراحی شده است.

### ۲.۵.۱ محاسبه سرور-محور زمان و مقابله با دستکاری تایمر
- تایمر آزمون هرگز به ساعت محلی کلاینت اعتماد نمی‌کند.
- به محض فشردن دکمه «شروع آزمون»، فیلد `started_at` در پایگاه داده ثبت می‌شود.
- مهلت پایانی با فرمول ریاضی $Deadline = started\_at + durationMinutes$ در سرور محاسبه می‌شود.
- در صورتی که داوطلب صفحه را ببندد یا سیستم خود را خاموش کند، زمان در سرور بدون توقف سپری شده و در پایان مهلت، وضعیت پاسخنامه به صورت خودکار به `SUBMITTED` تغییر می‌یابد.

### ۲.۵.۲ ماشین وضعیت کارنامه و چرخه تایید پشتیبان (Mentor Review Gate)
پاسخنامه‌های آزمون از چرخه وضعیتی ۴ مرحله‌ای زیر عبور می‌کنند:
1. `IN_PROGRESS`: داوطلب در حال پاسخگویی به سوالات در آزمون است. کلید سوالات و گزینه‌های صحیح تحت هیچ شرایطی به کلاینت ارسال نمی‌شوند.
2. `AUTO_GRADED_PENDING_MENTOR`: داوطلب پاسخنامه را ثبت نهایی کرده یا زمان آزمون به پایان رسیده است. سیستم درصدها و نمرات تراز را فوراً در سرور محاسبه می‌کند اما **کارنامه برای داوطلب قفل است** تا زمانی که پشتیبان علمی آن را بررسی کند.
3. `PENDING_MENTOR_REVIEW`: پشتیبان در کارتابل خود پاسخنامه، ریز درصدهای دروس، تست‌های غلط و تله‌متری تقلب را مشاهده کرده و یادداشت‌های راهبردی و نسخه تقویتی خود را ثبت می‌کند.
4. `PUBLISHED_TO_STUDENT`: با تایید نهایی پشتیبان، قفل کارنامه در پنل داوطلب باز شده و درصدها، تحلیل تست‌ها و توصیه‌های مشاوره‌ای به نمایش درمی‌آیند.

### ۲.۵.۳ فرمول استاندارد نمره منفی کنکور و آزمون وکالت
نمره منفی به صورت یک‌سوم (۱ پاسخ غلط = حذف ۱/۳ پاسخ صحیح) محاسبه می‌شود:

$$\text{Percentage} = \frac{3 \times C - W}{3 \times N} \times 100$$

که در آن:
- $C$: تعداد پاسخ‌های صحیح
- $W$: تعداد پاسخ‌های غلط
- $N$: تعداد کل سوالات آزمون یا درس مربوطه

در صورتی که داوطلب تستی را بی‌پاسخ بگذارد ($U$)، هیچ تاثیر منفی در نمره نخواهد داشت.

### ۲.۵.۴ استیت ماشین پالت سوالات، نشان‌دار کردن و خط‌زدن گزینه‌ها
در رابط کاربری رانر آزمون (`exam-runner-client.tsx`):
- **نشان‌دار کردن (Bookmark / Flag):** داوطلب می‌تواند سوالات شک‌دار را نشان‌دار کند تا دکمه مربوطه در پالت سوالات به رنگ زرد/کهربایی درآید.
- **خط‌زدن گزینه‌های انحرافی (Option Strikethrough):** با کلیک راست یا فشردن آیکون ضربدر کنار هر گزینه، داوطلب می‌تواند گزینه‌های ردشده را خط بزند تا تمرکز ذهنی وی بر گزینه‌های باقی‌مانده متمرکز گردد. وضعیت خط‌خوردگی در حافظه محلی ذخیره شده و پس از بازگشت به سوال حفظ می‌شود.
- **شمارنده خروج از آزمون (Anti-Cheat Telemetry):** رویدادهای `window.onblur` و `document.visibilitychange` شنود می‌شوند. هر بار خروج از پنجره آزمون یک واحد به `tab_switch_count` افزوده شده و در کارنامه نهایی به پشتیبان گزارش می‌گردد.

---

## ۲.۶ موتور تماس امن دوطرفه استریسک (Asterisk AMI VoIP Engine)

سامانه از طریق پروتکل رسمی **Asterisk Manager Interface (AMI)** با مرکز تلفن سازمانی مبتنی بر استریسک/ایزابل ارتباط برقرار می‌کند (`src/server/services/voip.ts`).

### ۲.۶.۱ اتصال سوکت TCP و پالایش قطعی تزریق CRLF
- برقراری ارتباط پایدار سوکت TCP بر روی پورت ۵۰۳۸ سرور ایزابل.
- پالایش کامل پارامترهای ارسالی (کد ملی، شماره تلفن و داخلی منتور) از کاراکترهای خطرناک `\r` و `\n` جهت خنثی‌سازی ۱۰۰٪ حملات تزریق فرمان در پروتکل متنی استریسک (CRLF Command Injection).

### ۲.۶.۲ فرایند دو مرحله‌ای تماس امن (Two-Leg Call Origination)
هنگامی که پشتیبان یا داوطلب دکمه تماس را می‌فشارد:
1. **پایه اول تماس (First Leg):** سرور پکت `Action: Originate` را با پارامتر `Channel: SIP/{mentorExtension}` ارسال می‌کند. تلفن نرم‌افزاری (Zoiper) یا آی‌پی فون رومیزی پشتیبان زنگ می‌خورد.
2. **پایه دوم تماس (Second Leg):** به محض اینکه پشتیبان گوشی را برمی‌دارد، سرور با شماره همراه داوطلب تماس گرفته و خطوط را به صورت خودکار در بستر کانتکست استریسک به یکدیگر متصل (Bridge) می‌نماید.
3. **کالرآیدی سازمانی:** سرشماره سازمانی موسسه مشاهیر دانش (`caller_id`) بر روی تلفن همراه داوطلب نشان داده می‌شود و شماره شخصی پرسنل یا داوطلب کاملاً محفوظ می‌ماند.

### ۲.۶.۳ موتور اعتبارسنجی ساعات مجاز تماس پشتیبان (Calling Window Validation)
- پشتیبانان موظفند ساعات روزانه پاسخگویی خود را (معمولاً ۲ الی ۳ ساعت در بازه عصرگاهی، مثلاً ۱۷:۰۰ الی ۲۰:۰۰) در جدول `mentor_calling_windows` ثبت کنند.
- در زمان فشرده شدن دکمه تماس معکوس توسط داوطلب، متد `validateCallingWindow()` زمان فعلی را با منطقه زمانی رسمی ایران (`Asia/Tehran`) بررسی می‌کند:
  - اگر روز جاری جزو روزهای کاری پشتیبان نباشد یا ساعت جاری خارج از بازه باشد، دکمه تماس در پنل داوطلب غیرفعال بوده و زمان باقیمانده تا نوبت بعدی تماس نمایش داده می‌شود.

---

## ۲.۷ پردازش پس‌زمینه Redis و گذرگاه رویدادها (Redis / Background Processing & Event Bus)

### ۲.۷.۱ اتصال منعطف به Redis (`src/server/redis.ts`)
- ماژول اتصال به ردیس با کتابخانه `ioredis` به گونه‌ای پیاده‌سازی شده است که در صورت در دسترس نبودن یا عدم تعریف متغیر `REDIS_URL`، فرایند اجرای سیستم متوقف نشود.
- پیکربندی پارامترهای اتصال: `maxRetriesPerRequest: 1`, `connectTimeout: 2000`, `enableOfflineQueue: true`.
- کلیه هشدارهای قطعی ردیس به شکل غیرمسدودکننده (Non-blocking Warning) ثبت می‌شوند.

### ۲.۷.۲ درگاه ارسال پیامک کاوه‌نگار و فالبک‌های شبیه‌سازی (`src/server/services/sms.ts`)
سرویس پیامک از ساختار قالب‌های اعتبارسنجی (Lookup Templates) و ارسال متنی پشتیبانی می‌کند:
- رویدادهای تحت پوشش: `LOGIN`, `MENTOR_CONTACT`, `MENTOR_ASSIGNED`, `TRIAGE_RESOLVED`, `WEEKLY_PLAN_ASSIGNED`, `TASK_ASSIGNED`, `EXAM_PUBLISHED`, `MESSAGE_RECEIVED`, `WHITELIST_INVITE`.
- در صورتی که کلید API معتبر کاوه‌نگار در جدول `sms_settings` تعریف نشده باشد یا در محیط تست و بیلد (`process.env.VITEST`) اجرا گردد، پیامک در جدول `sms_logs` با وضعیت `SIMULATED` ذخیره شده و هیچ تماس شبکه‌ای مسدودکننده‌ای برقرار نمی‌شود.

---

## ۲.۸ اینورتوری جامع اکشن‌های سرور و مسیرهای API (Full Server Actions & API Inventory)

کلیه جهش‌های داده در سامانه از طریق Server Actions پیاده‌سازی شده‌اند. جدول زیر فهرست کامل آن‌ها را مستند می‌نماید:

### ۱. اکشن‌های احراز هویت و امنیت (`src/server/actions/auth.ts`)
- `loginWithPasswordAction(usernameOrPhone, password)`: ورود رسمی با رمز، اعتبارسنجی ضد Brute-force، ایجاد سشن JWT.
- `requestOtpAction(phoneNumber)`: نرمال‌سازی ارقام فارسی، تولید OTP، ارسال پیامک و ذخیره نشست موقت.
- `verifyOtpAction(phoneNumber, code)`: اعتبارسنجی کد ۵ رقمی و ورود به حساب داوطلب.
- `logoutAction()`: ابطال کوکی نشست و هدایت به صفحه ورود.
- `changePasswordAction(currentPassword, newPassword)`: تغییر کلمه عبور با اعتبارسنجی هش قبلی و ذخیره هش نوین `scrypt`.

### ۲. اکشن‌های برنامه‌ریزی و تقویم درسی (`src/server/actions/schedule.ts`)
- `getStudentScheduleAction(jalaliYear, jalaliWeek)`: واکشی برنامه هفتگی داوطلب و پارت‌های درسی شنبه تا جمعه.
- `toggleScheduleItemAction(itemId, status, actualMinutes)`: ثبت وضعیت انجام پارت و دقایق واقعی مطالعه.
- `submitDailyCheckinAction(payload)`: ثبت چک‌این شبانه، ساعات مطالعه واقعی و اعلام دلایل عدم انجام برنامه.
- `submitWeeklyReviewAction(payload)`: ثبت ارزیابی پایانی جمعه و ثبت دقایق انباشت.
- `saveStudentScheduleAction(scheduleId, items)`: ویرایش و ذخیره پارت‌های درسی توسط پشتیبان یا سرپرست.

### ۳. اکشن‌های آزمون‌های CBT (`src/server/actions/exams.ts`)
- `listPublishedExamsAction()`: لیست آزمون‌های فعال مجاز برای داوطلب با در نظر گرفتن دوره‌ها و کوهورت‌ها.
- `getExamWithQuestionsAction(examId)`: دریافت مشخصات و سوالات آزمون با گارد عدم افشای پاسخ‌های صحیح.
- `startExamSubmissionAction(examId)`: ثبت شروع آزمون و قفل زمان در سرور.
- `submitExamAnswersAction(submissionId, answers, flags, eliminated, tabSwitches)`: پایان آزمون و محاسبه درصدهای خام و منفی.
- `reviewAndPublishExamSubmissionAction(submissionId, feedback, notes)`: تایید نهایی کارنامه توسط پشتیبان و صدور دسترسی برای داوطلب.
- `deleteExamAction(examId)`: حذف آزمون توسط سرپرست یا ادمین با پاکسازی آبشاری وابستگی‌ها.

### ۴. اکشن‌های پیام‌رسان و چت سازمانی (`src/server/actions/chat.ts` & `messages.ts`)
- `sendDirectMessageAction(receiverId, message, attachment)`: ارسال پیام مستقیم و فایل صوتی/متنی.
- `sendChatMessageAction(conversationId, message, attachment)`: ارسال پیام در گروه یا کانال.
- `bulkAddMembersByMentorAction(conversationId, mentorId)`: افزودن دسته‌جمعی کلیه داوطلبان یک پشتیبان به کانال اطلاع‌رسانی.
- `deleteChatMessageAction(messageId)`: حذف پیام گروهی توسط مدیر گروه یا سرپرست.
- `deleteDirectMessageAction(messageId)`: حذف پیام خصوصی توسط فرستنده یا ناظر امنیتی.

### ۵. اکشن‌های تلفن ویپ و ارتباطات (`src/server/actions/voip.ts` & `mentor.ts`)
- `originateMentorCallAction(studentProfileId)`: شروع تماس پشتیبان با داوطلب از طریق AMI استریسک.
- `originateStudentToMentorCallAction()`: شروع تماس معکوس داوطلب با پشتیبان پس از احراز پنجره مجاز زمانی.
- `updateMentorCallingWindowAction(payload)`: تنظیم روزها و ساعات پاسخگویی روزانه توسط پشتیبان.

### ۶. اکشن‌های مدیریت کاربران و ساختار سازمانی (`src/server/actions/admin-users.ts` & `supervisor.ts`)
- `createUserAction(userData)`: ایجاد کاربر با نقش مشخص و تنظیم اولیه حساب.
- `updateUserAction(userId, updateData)`: ویرایش اطلاعات، نقش یا شماره داخلی پرسنل.
- `deleteUserAction(userId)`: حذف ایمن کاربر با تراکنش آبشاری معکوس و پاکسازی ۲۵ جدول وابسته بدون خطای کلید خارجی.
- `assignMentorToStudentAction(studentProfileId, mentorId)`: تخصیص یا جابجایی پشتیبان داوطلب توسط سرپرست.
- `importWhitelistExcelAction(records)`: بارگذاری فایل اکسل لیست سفید داوطلبان جدید.

---

# بخش سوم: راهنمای تفصیلی ماژول‌ها و دفترچه راهنمای گام‌به‌گام ۴ لایه کاربری (Step-by-Step User Manual)

سامانه پشتیبانی مشاهیر دانش برای ۴ سطح مخاطب تخصصی طراحی شده است. در این بخش، راهنمای گام‌به‌گام هر لایه با تکیه بر اسامی دقیق دکمه‌ها، برچسب‌ها، تب‌ها و کارت‌های رابط کاربری ارائه می‌گردد.

---

## ۳.۱ لایه داوطلب آزمون وکالت (Student Layer - `/student/*`)

داوطلب آزمون‌های کانون وکلای دادگستری (اسکودا) و مرکز وکلای قوه قضاییه، هسته مرکزی خدمات پلتفرم مشاهیر دانش است.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        داشبورد اختصاصی داوطلب                          │
├─────────────────┬───────────────────────────────┬──────────────────────┤
│  ساعات مطالعه   │       تماس امن با پشتیبان     │    وضعیت درسی        │
│   ۴۲ ساعت       │   [ تماس تلفنی با پشتیبان ]    │     پایدار (سبز)     │
├─────────────────┴───────────────────────────────┴──────────────────────┤
│  برنامه هفتگی: شنبه تا جمعه (پارت‌های مدنی، جزا، تجارت، آیین دادرسی)  │
├────────────────────────────────────────────────────────────────────────┤
│  [ چک‌این شبانه مطالعه ]   [ آزمون‌های آنلاین زمان‌دار ]   [ خودارزیابی جمعه ] │
└────────────────────────────────────────────────────────────────────────┘
```

### ۱. ورود، احراز هویت و موافقت با مرام‌نامه آموزشی
1. **ورود با پیامک (OTP):** در صفحه `/auth/login`، تب «ورود با کد یکبار مصرف پیامکی» را انتخاب کنید. شماره تلفن همراه خود را (با کیبورد فارسی یا انگلیسی) وارد نموده و دکمه **«دریافت کد تایید»** را فشار دهید. کد ۵ رقمی دریافتی را وارد نمایید.
2. **ورود با کلمه عبور / حساب مشاهیر دانش:** در تب «ورود با کلمه عبور»، شماره همراه یا نام‌کاربری و رمز عبور رسمی خود را وارد کنید. در صورت تعریف حساب در سامانه گارنت، سیستم به طور خودکار هویت شما را با وب‌سرویس مرکزی مشاهیر دانش تطبیق می‌دهد.
3. **پذیرش مرام‌نامه و تعهدنامه حفظ محتوا:** در اولین ورود، مودال رسمی حقوقی شامل تعهدنامه عدم افشای محتوای آموزشی، حق کپی‌رایت موسسه و قوانین مشاوره به نمایش درمی‌آید. داوطلب با کلیک بر روی چک‌باکس «کلیه شرایط و قوانین را مطالعه نموده و می‌پذیرم» و فشردن دکمه **«تایید و ورود به پرتال»**، هویت خود را تثبیت می‌کند. در این لحظه، آدرس IP و زمان دقیق در دیتابیس ثبت می‌گردد.

### ۲. داشبورد جامع ۳۶۰ درجه داوطلب (`/student/dashboard`)
پس از ورود، داشبورد اختصاصی داوطلب نمایش داده می‌شود که شامل بخش‌های حیاتی زیر است:
- **نوار وضعیت هویت و دوره:** نمایش نام کامل، عنوان دوره ثبت‌نامی (مانند *دوره جامع طلایی وکالت کانون مرکز*)، نام پشتیبان اختصاصی و نشان وضعیت درسی (سبز: مطلوب، زرد: هشدار انباشت، قرمز: بحرانی).
- **شاخص‌های کلیدی عملکرد (KPI Cards):**
  - مجموع ساعات مطالعه در هفته جاری
  - درصد پایبندی به برنامه مطالعاتی
  - تعداد تست‌های پاسخ داده‌شده در هفته
  - دقایق انباشت (مباحث عقب‌افتاده)
- **کارت تماس تلفنی امن با پشتیبان (ویجت زمان‌بندی پاسخگویی):**
  - این ویجت ساعات آنلاین بودن پشتیبان (مثلاً ۱۷:۰۰ الی ۲۰:۰۰) را مستقیماً از دیتابیس استعلام می‌کند.
  - **در بازه مجاز:** دکمه سبز رنگ و تپنده **«تماس تلفنی با پشتیبان آموزشی»** فعال است. با کلیک بر روی آن، سیستم بدون افشای شماره تلفن شخصی طرفین، تماس دوطرفه امن را از طریق سرور تلفنی موسسه برقرار می‌سازد (ابتدا تلفن پشتیبان زنگ می‌خورد و پس از پاسخ، گوشی داوطلب با سرشماره ۰۲۱۹۱۰۰۰۰۰۰ به صدا درمی‌آید).
  - **خارج از بازه مجاز:** دکمه غیرفعال بوده و برچسب «پشتیبان شما در ساعت ۱۷:۰۰ آنلاین خواهد شد» به همراه تایمر معکوس نشان داده می‌شود.

### ۳. برنامه مطالعاتی شنبه تا جمعه (`/student/study-plan`)
این صفحه هسته درسی داوطلب را تشکیل می‌دهد:
- **جابجایی میان هفته‌ها:** با استفاده از دکمه‌های «هفته قبل» و «هفته بعد» در تقویم جلالی، برنامه هر هفته آموزشی (از شنبه تا جمعه) قابل مرور است.
- **تفکیک پارت‌های روزانه:** برای هر روز، پارت‌های درسی شامل: عنوان درس (حقوق مدنی، جزا، تجارت و...)، نوع فعالیت (مطالعه تشریحی، ماده‌خوانی، تست آموزشی، مرور)، مبحث معین (مثلاً شروط باطل و مبطل عقد)، حجم هدف (مثلاً ۳۰ صفحه یا ۴۰ تست) و مدت زمان پیشنهادی (مثلاً ۹۰ دقیقه) درج شده است.
- **تکمیل و بازخورد پارت:** در پایان هر پارت، داوطلب وضعیت پارت را به یکی از حالت‌های «انجام شد» (سبز)، «ناقص» (زرد) یا «انجام نشد» (قرمز) تغییر می‌دهد. در صورت تمایل، مدت زمان واقعی مطالعه به دقیقه و یادداشت درسی را ثبت کرده و دکمه **«ثبت وضعیت»** را می‌زند.
- **پارت‌های جبرانی انباشت:** در روزهای پنج‌شنبه و جمعه، پارت‌های ویژه‌ای با برچسب بنفش «جبرانی انباشت» قرار دارند تا در صورت عقب‌ماندگی از برنامه شنبه تا چهارشنبه، زمان کافی برای رسیدن به بودجه‌بندی وجود داشته باشد.

### ۴. سامانه آزمون‌های آنلاین زمان‌دار CBT (`/student/exams`)
- **فهرست آزمون‌های فعال:** آزمون‌های منتشرشده مرتبط با دوره داوطلب در این صفحه فهرست شده‌اند (همراه با مدت زمان، تعداد سوالات، مهلت شرکت و ضریب نمره منفی).
- **آغاز آزمون:** با فشردن دکمه **«ورود به آزمون»**، صفحه آزمون تمام‌صفحه باز شده و تایمر سرور به جریان می‌افتد.
- **پالت سوالات و نشان‌دار کردن:** در سمت راست، پالت شماره سوالات قرار دارد:
  - رنگ سفید/خاکستری: سوال دیده نشده
  - رنگ آبی: سوال پاسخ داده شده
  - رنگ زرد/کهربایی: سوال نشان‌دار شده برای مرور مجدد (با دکمه **«نشان‌دار کردن سوال»**)
- **خط‌زدن گزینه‌های غلط:** داوطلب می‌تواند با کلیک بر روی آیکون ضربدر کنار گزینه‌هایی که مطمئن است نادرست هستند، آن‌ها را خط بزند تا از خطای دید جلوگیری شود.
- **ثبت نهایی و هدایت به وضعیت در انتظار تایید:** پس از پاسخگویی به سوالات، داوطلب دکمه قرمز **«ثبت نهایی و ارسال پاسخنامه»** را تایید می‌کند. پیام «پاسخنامه شما با موفقیت ثبت شد. درصدها و کارنامه پس از بررسی و تایید پشتیبان علمی شما در همین صفحه در دسترس خواهد بود» به نمایش درمی‌آید.

### ۵. چک‌این شبانه و خودارزیابی انتهای هفته جمعه (`/student/weekly-review`)
- **چک‌این شبانه:** هر شب رأس ساعت ۲۲، داوطلب فرم کوتاه پایش شبانه را باز کرده و ساعات مطالعه واقعی خود را وارد می‌کند. در صورت عدم اجرای برنامه، علت اصلی (خستگی جسمی، عدم تمرکز، مشغله کاری یا عدم تفهیم مبحث) را انتخاب کرده و در صورت نیاز، کلید **«درخواست تماس فوری پشتیبان»** را فعال می‌نماید.
- **فرم جامع خودارزیابی جمعه:** جمعه شب، داوطلب ساعات مطالعه تفکیکی دروس هفته، نقاط قوت، نقاط ضعف، نمره رضایت شخصی از عملکرد (از ۱ تا ۵) را در فرم ثبت کرده و با دکمه **«ارسال گزارش جمعه»** پرونده هفتگی خود را برای پشتیبان ارسال می‌کند.

### ۶. ارتباط پیام‌رسان و تیکتینگ سرپرستی
- **پیام‌رسان مستقیم (`/student/messages`):** تبادل پیام متنی، ارسال ویس مشاوره و تصاویر خلاصه یادداشت‌ها به طور مستقیم با پشتیبان علمی در محیطی کاملاً رمزنگاری‌شده.
- **ارجاع و شکایت به سرپرست (`/student/tickets`):** در صورت بروز هرگونه مشکل اساسی، عدم پاسخگویی پشتیبان یا درخواست تغییر مشاور، داوطلب تیکت رسمی ایجاد کرده و موضوع مستقیماً روی میز سرپرست ارشد قرار می‌گیرد.

---

## ۳.۲ لایه پشتیبان و مشاور علمی (Mentor Layer - `/mentor/*`)

پشتیبان علمی، هدایت‌گر آموزشی داوطلب بوده و وظیفه نظارت روزانه، برنامه‌ریزی، تحلیل آزمون‌ها و مداخلات درسی را بر عهده دارد.

```
┌────────────────────────────────────────────────────────────────────────┐
│                         کارتابل جامع پشتیبان علمی                     │
├─────────────────┬───────────────────────────────┬──────────────────────┤
│ هشدارهای تریاژ  │      پورتفولیوی داوطلبان      │   کارنامه‌های آزمون   │
│ ۳ پرونده باز    │         ۴۲ داوطلب فعال        │  ۵ کارنامه در انتظار │
├─────────────────┴───────────────────────────────┴──────────────────────┤
│  [ تنظیم ساعات پاسخگویی روزانه ]   [ کارتابل وظایف سازمانی سرپرست ]     │
└────────────────────────────────────────────────────────────────────────┘
```

### ۱. مرکز تریاژ و هشدارهای تحصیلی (`/mentor/triage`)
مرکز فرماندهی پشتیبان، صفحه تریاژ است که هشدارهای خودکار سیستم مبتنی بر محرک‌های ۹گانه را نمایش می‌دهد:
- **کدهای محرک تریاژ:**
  - `A01`: افت ساعات مطالعه روزانه به کمتر از ۵۰٪ توان تعهدشده
  - `A02`: عدم ثبت چک‌این شبانه برای ۲ روز متوالی
  - `A03`: انباشت مباحث درسی بیش از ۱۸۰ دقیقه در هفته
  - `A04`: غیبت غیرموجه در آزمون آزمایشی استاندارد
  - `A05`: درصد منفی بالا یا افت شدید تراز نسبت به سطح پایه
  - `A06`: اعلام نیاز به کمک فوری توسط داوطلب در چک‌این
  - `A07`: عدم بازخوانی نص قوانین مدنی یا کیفری طبق بودجه‌بندی
  - `A08`: عدم تداوم و نوسان شدید در ساعات درسی روزهای هفته
  - `A09`: عدم تکمیل ماموریت مهارتی/روانشناختی
- **اقدام پشتیبان:** برای هر پرونده، سطح فوریت (SLA مهلت مداخله) نمایش داده می‌شود. پشتیبان بر روی دکمه **«بررسی و مداخله»** کلیک کرده، با داوطلب تماس گرفته، ریشه مشکل را بررسی نموده، یادداشت تفصیلی خود را ثبت کرده و دکمه **«حل و مختومه کردن پرونده تریاژ»** را می‌زند.

### ۲. پورتفولیوی داوطلبان تحت سرپرستی (`/mentor/students`)
- **جدول داوطلبان:** فهرست تمام داوطلبان تحت پوشش با مشخصات: نام، کد دوره، وضعیت ریسک تحصیلی (سبز، زرد، قرمز)، آخرین تاریخ تماس تلفنی، و درصد پیشرفت برنامه هفته جاری.
- **پرونده ۳۶۰ درجه داوطلب:** با کلیک روی نام هر داوطلب، پروفایل جامع شامل شرایط اشتغال، تأهل، ساعات توان مطالعه، سبک یادگیری غالب (شنیداری، متنی یا تحلیلی) و سوابق آزمون‌های پیشین نمایش داده می‌شود.
- **شروع تماس تلفنی مستقیم:** در ردیف هر داوطلب، دکمه آبی **«تماس تلفنی»** تعبیه شده است. با کلیک بر روی آن، داخلی زویپر پشتیبان زنگ خورده و پس از برداشتن گوشی، به شماره داوطلب متصل می‌گردد. پس از پایان تماس، کادر ثبت یادداشت مکالمه باز می‌شود.

### ۳. کارتابل بررسی و تایید کارنامه‌های آزمون (`/mentor/exams`)
- **لیست آزمون‌های در انتظار تایید:** پاسخنامه‌های ارسال‌شده توسط داوطلبان با برچسب نارنجی «نیازمند بررسی و تایید پشتیبان» فهرست شده‌اند.
- **بررسی تحلیلی کارنامه:** پشتیبان با کلیک بر روی پاسخنامه، درصد کل، درصد تفکیکی دروس، تعداد پاسخ‌های صحیح، غلط و نزده و مدت زمان صرف‌شده را مشاهده می‌کند.
- **ثبت نسخه راهبردی درمانی:** در باکس «نسخه و تحلیل درسی پشتیبان»، پشتیبان نقاط ضعف داوطلب (مثلاً اشتباه مکرر در تست‌های خیارات احکام یا مرور زمان کیفری) و منابع مورد نیاز برای بازخوانی را می‌نویسد.
- **انتشار کارنامه:** با فشردن دکمه سبز **«تایید علمی و انتشار کارنامه برای داوطلب»**، نتایج بلافاصله در پنل داوطلب فعال و قابل مشاهده می‌گردد.

### ۴. تنظیم ساعات پاسخگویی تلفنی روزانه
- در صفحه مدیریت داوطلبان یا تنظیمات، کادر «پنجره پاسخگویی روزانه به داوطلبان» قرار دارد.
- پشتیبان ساعت شروع (مثلاً ۱۷:۰۰)، ساعت پایان (مثلاً ۲۰:۰۰)، روزهای فعال هفته (شنبه تا چهارشنبه) و پیام کوتاه به داوطلبان را تنظیم نموده و دکمه **«به‌روزرسانی ساعات پاسخگویی»** را کلیک می‌کند. این کار دکمه تماس معکوس را در پنل داوطلبان در بازه تعیین‌شده فعال می‌سازد.

### ۵. کارتابل وظایف سازمانی ارجاعی (`/mentor/tasks`)
- دستورات اداری، وظایف و ماموریت‌های محوله از سوی سرپرست آموزشی یا مدیرعامل در این صفحه قرار می‌گیرد.
- به محض باز کردن وظیفه، وضعیت «سین خوردن» به همراه تاریخ و ساعت شمسی دقیق برای سرپرست ثبت می‌شود.
- پس از انجام ماموریت، پشتیبان توضیحات اقدام خود را در باکس مربوطه نوشته و دکمه **«اعلام تکمیل وظیفه به سرپرست»** را می‌فشارد.

---

## ۳.۳ لایه سرپرست آموزشی (Supervisor Layer - `/supervisor/*`)

سرپرست آموزشی، ناظر عالی بر عملکرد تیم پشتیبانان علمی و تضمین‌کننده کیفیت خدمات ۳۶۰ درجه موسسه است.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        میز کار سرپرست ارشد آموزشی                      │
├─────────────────┬───────────────────────────────┬──────────────────────┤
│  کل داوطلبان    │     پشتیبانان فعال            │   تیکت‌های باز       │
│  ۱,۲۴۰ نفر      │        ۱۸ مشاور               │     ۲ شکایت          │
├─────────────────┴───────────────────────────────┴──────────────────────┤
│  [ بارگذاری اکسل لیست سفید ]   [ صف تخصیص منتور ]   [ الگوهای هفتگی ]  │
│  [ ممیزی مکالمات و پیام‌ها ]    [ مانیتورینگ تریاژ ]  [ وظایف سلسله‌مراتب] │
└────────────────────────────────────────────────────────────────────────┘
```

### ۱. داشبورد کلان و پایش تیمی سرپرستی (`/supervisor`)
- **شاخص‌های کلیدی سلامت آموزشی:**
  - مجموع داوطلبان به تفکیک دوره‌ها و کوهورت‌ها
  - درصد کلی پایداری درسی داوطلبان (نسبت وضعیت سبز به زرد و قرمز)
  - میانگین زمان مداخله پشتیبانان در پرونده‌های تریاژ (تطابق با SLA)
  - شاخص میانگین رضایت داوطلبان در گزارش‌های جمعه
- **ماتریس عملکرد پشتیبانان:** جدولی از کلیه پشتیبانان با ستون‌های: تعداد داوطلبان تحت پوشش، ساعات تماس ثبت‌شده در هفته، تعداد کارنامه‌های بررسی‌شده، و تعداد وظایف معوق.

### ۲. بارگذاری اکسل لیست سفید و دعوت داوطلبان (`/supervisor/whitelist`)
- **بارگذاری فایل اکسل:** سرپرست فایل اکسل حاوی ستون‌های: نام کامل، شماره همراه، کدملی، عنوان دوره و پشتیبان پیشنهادی را در دراپ‌زون بارگذاری می‌کند.
- **پیش‌نمایش و تایید داده‌ها:** سیستم فایل را اعتبارسنجی کرده، شماره‌های تکراری یا نامعتبر را گزارش می‌دهد و پیش‌نمایش را نشان می‌دهد.
- **ایجاد و ارسال پیامک دعوت:** با فشردن دکمه **«تایید نهایی و ثبت در لیست سفید»**، رکوردها در جدول `student_whitelist` ثبت شده و پیامک حاوی لینک مستقیم ورود برای داوطلبان ارسال می‌گردد.

### ۳. صف تخصیص و جابجایی داوطلبان (`/supervisor/assignments`)
- **داوطلبان بدون پشتیبان:** لیستی از داوطلبانی که به تازگی ثبت‌نام کرده و هنوز مشاور به آن‌ها تخصیص نیافته است.
- **تخصیص هوشمند:** سرپرست با بررسی ظرفیت مشاوران، داوطلب را انتخاب و با دکمه **«انتساب به پشتیبان»**، وی را به منتور مورد نظر واگذار می‌کند. در این لحظه پیامک اطلاع‌رسانی برای هر دو طرف ارسال می‌شود.
- **انتقال و تغییر پشتیبان:** در صورت وصول شکایت یا عدم هماهنگی، سرپرست می‌تواند داوطلب را به مشاور دیگری منتقل کند؛ تمامی سوابق درسی و گزارش‌های قبلی به طور کامل حفظ می‌گردند.

### ۴. بانک الگوهای برنامه‌ریزی هفتگی (`/supervisor/plans`)
- سرپرست می‌تواند تمپلیت‌های آماده برنامه درسی شنبه تا جمعه را متناسب با فازهای آموزشی (فاز صفر مبانی، فاز یادگیری تشریحی، فاز تست‌زنی، فاز جمع‌بندی طلایی) تعریف نماید.
- این الگوها در اختیار پشتیبانان قرار می‌گیرد تا با یک کلیک بتوانند آن را برای داوطلبان خود اعمال و شخصی‌سازی کنند.

### ۵. ممیزی پیام‌ها، گروه‌ها و حالت نامحسوس (Ghost Mode)
- **ممیزی پیام‌های مستقیم:** سرپرست جهت کنترل کیفیت مشاوره و الزامات انضباطی، امکان بازبینی کلیه مکالمات متنی و فایل‌های صوتی میان داوطلب و پشتیبان را در بخش ممیزی دارد.
- **حالت مشاهده نامحسوس در کانال‌ها و گروه‌ها:** سرپرست می‌تواند در کلیه کانال‌ها و گروه‌های درسی موسسه بدون ثبت نام خود در لیست اعضای قابل مشاهده برای داوطلبان، بر محتوای ارسالی نظارت داشته باشد.
- **بستن موقت ترد مکالمه:** در صورت بروز تخلف یا بی‌احترامی، سرپرست می‌تواند ترد گفتگوی مستقیم بین داوطلب و منتور را به حالت «بسته‌شده» درآورد.

### ۶. رسیدگی به تیکت‌های شکایات داوطلبان (`/supervisor/tickets`)
- داوطلبانی که از روند مشاوره ناراضی هستند، تیکت خود را مستقیماً به سرپرست ارسال می‌کنند.
- سرپرست شرح شکواییه و مستندات را بررسی کرده، دستور اصلاحی یا جابجایی منتور را صادر می‌کند، متن پاسخ رسمی را ثبت کرده و وضعیت تیکت را به «پاسخ داده شد و مختومه» تغییر می‌دهد.

---

## ۳.۴ لایه مدیریت عالی و ارشد فنی (CEO & Admin Layer - `/executive/*`)

لایه مدیریت عالی و راهبری سیستم، نظارت استراتژیک، کنترل مالی، زیرساخت شبکه و امنیت ضدجاسوسی را در بر می‌گیرد.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     میز مدیریت عالی و راهبری ارشد                      │
├─────────────────┬───────────────────────────────┬──────────────────────┤
│  آمار کلی موسسه │       درگاه‌های متصل          │   امنیت و ممیزی      │
│  ۲۰۰,۰۰۰ داوطلب │   استریسک / گارنت / کاوه‌نگار │   دی‌کودر فارنزیک     │
├─────────────────┴───────────────────────────────┴──────────────────────┤
│  [ تنظیمات حساب مرکزی گارنت ]   [ مدیریت دوره‌های مجاز ۳۶۰ ]           │
│  [ مدیریت کاربران و پرسنل ]      [ مرکز تماس ویپ ایزابل ]               │
│  [ لاگ‌های ممیزی ضدجاسوسی ]     [ دی‌کودر واترمارک فارنزیک ]           │
└────────────────────────────────────────────────────────────────────────┘
```

### ۱. داشبورد راهبردی هوش تجاری (`/executive`)
- نمودارهای کلان رشد جامعه آماری داوطلبان و نرخ مشارکت در آزمون‌ها
- گزارش تحلیلی ضریب قبولی داوطلبان در آزمون‌های پیشین کانون وکلا
- شاخص‌های بهره‌وری تیم پشتیبانی و توزیع بار کاری

### ۲. مدیریت کاربران، نقش‌ها و حذف ایمن حساب‌ها (`/executive/users`)
- **تعریف پرسنل:** ایجاد حساب کاربری برای پشتیبانان، سرپرستان و مدیران با تعیین نام، شماره تلفن، نقش سازمانی و شماره داخلی تلفنی ایزابل.
- **تنظیم مجدد رمز عبور:** بازنشانی رمز عبور پرسنل و فعال‌سازی گزینه «الزام به تغییر رمز عبور در اولین ورود».
- **حذف ایمن و آبشاری حساب (Cascade Deletion):** در صورت نیاز به حذف یک حساب، سیستم با اجرای یک تراکنش اتمیک معکوس، رکوردهای وابسته در ۲۵ جدول پایگاه داده را بدون بروز خطای کلید خارجی پاکسازی می‌کند.

### ۳. پنل تنظیمات وب‌سرویس حساب مرکزی مشاهیر دانش / گارنت (`/executive/sso-settings`)
- پیکربندی آدرس پایه وب‌سرویس (`https://mashahiredanesh.com/GarnetAPI`).
- تنظیم هدر امنیتی کلید API (`g-api-key`) و مقدار سکرت آن.
- تنظیم مسیرهای وب‌سرویس: لاگین موبایل، کاتالوگ محصولات، ارسال و تایید OTP.
- **تست زنده اتصال:** ادمین می‌تواند با کلیک بر روی دکمه **«تست زنده اتصال به وب‌سرویس»**، ارتباط شبکه و صحت پاسخ سرور گارنت را در کمتر از ۱ ثانیه ارزیابی کند.
- **تست ورود کاربر نمونه:** ادمین می‌تواند شماره و رمز یک کاربر را وارد کرده و خروجی دریافتی از گارنت را به همراه لیست دوره‌ها در یک پنجره دیباگ مشاهده نماید.

### ۴. مدیریت دوره‌های دارای بسته پشتیبانی ۳۶۰ درجه (`/executive/courses`)
- تعریف کدهای دوره مجاز گارنت (مانند `GARNET-BAR-360` و `MASHAHIR-BAR-360`).
- تعیین نام دوره، قیمت، سطح پشتیبانی (طلایی، VIP)، تاریخ شروع و پایان برنامه درسی، و لینک صفحه خرید در گارنت.
- در صورتی که کاربری دوره‌ای فاقد پشتیبانی خریده باشد، سامانه با استناد به این جدول، صفحه ارتقا و خرید بسته را نمایش می‌دهد.

### ۵. پیکربندی مرکز تماس ویپ ایزابل / استریسک (`/executive/voip`)
- تنظیم آدرس IP سرور ایزابل، پورت سوکت AMI (۵۰۳۸)، نام کاربری و رمز عبور.
- تعیین کانتکست دایال‌پلن (`from-internal`)، تکنولوژی خطوط (`SIP`/`PJSIP`) و نام ترانک خروجی.
- تعیین سرشماره سازمانی کالرآیدی (`۰۲۱۹۱۰۰۰۰۰۰`).
- نگاشت شماره‌های داخلی پرسنل و مربیان (مانند داخلی ۱۰۱ و ۱۰۲).
- مشاهده زنده لاگ مکالمات، مدت زمان مکالمات مفید و ممیزی فایل‌های ضبط‌شده.

### ۶. تنظیمات سامانه پیامک کاوه‌نگار (`/executive/sms`)
- تنظیم کلید وب‌سرویس کاوه‌نگار، سرشماره ارسال عادی و خط خدماتی اختصاصی بدون مسدودی بلک‌لیست.
- فعال/غیرفعال‌سازی تک‌تک تریگرهای پیامکی (ورود، ثبت تماس، تخصیص برنامه، آزمون و...).
- مشاهده تاریخچه کلیه پیامک‌های ارسالی با وضعیت مخابراتی دقیق و پیام‌های خطای سرور کاوه‌نگار.

### ۷. دی‌کودر واترمارک فارنزیک و لاگ‌های ممیزی ضدجاسوسی (`/admin/forensic-decoder` & `/executive/audit`)
- **آشکارساز اسکرین‌شات‌های لورفته:** در صورت مشاهده انتشار عکس برنامه درسی یا سوالات در فضای مجازی، تصویر در پنل دی‌کودر بارگذاری می‌شود. فیلتر تفکیک فرکانسی کدهای مخفی را آشکار کرده و نام، شماره تماس و کدملی داوطلب متخلف را به همراه ساعت دقیق وقوع تخلف استخراج می‌نماید.
- **لاگ‌های ممیزی فراگیر (System Audit Logs):** ثبت دست‌نخورده کلیه لاگین‌ها، حذف‌ها، ویرایش‌ها، آزمون‌ها و مکالمات با IP واقعی کاربر و هدر مرورگر با قابلیت فیلتر بر اساس تاریخ، نقش و نوع رخداد.

---

# بخش چهارم: راهنمای عملیات، استقرار پروداکشن، نگهداری و عیب‌یابی (DevOps & Production Runbook)

این بخش شامل مستندات زیرساختی، فایل‌های پیکربندی سرور پروداکشن، چک‌لیست‌های دیپلوی، اسکریپت‌های پشتیبان‌گیری پایگاه‌داده و راهنمای حل بحران‌های عملیاتی (Troubleshooting) است.

---

## ۴.۱ مشخصات زیرساخت سرور پروداکشن (Production Infrastructure Spec)

- **آدرس IP سرور اصلی پروداکشن:** `185.181.183.239`
- **دامنه رسمی سامانه:** `support.mashahiredanesh.com`
- **سیستم‌عامل سرور:** Ubuntu Linux 22.04 LTS (x86_64 Architecture)
- **موتور کانتینرسازی:** Docker Engine v26+ و Docker Compose v2.27+
- **وب‌سرور لبه (Edge Reverse Proxy):** Nginx 1.24+ همراه با ماژول SSL و گواهی رایگان خودکار Let's Encrypt (Certbot)
- **پایگاه داده اصلی:** PostgreSQL 16.2 اجراشده بر روی پورت داخلی ۵۴۳۲ کانتینری
- **کش و صف پس‌زمینه:** Redis 7.2 Alpine بر روی پورت داخلی ۶۳۷۹
- **نرم‌افزار سانترال و ویپ:** Issabel PBX مبتنی بر Asterisk 18/20 واقع در شبکه داخلی/اختصاصی موسسه

```
   اینترنت / کاربران (HTTPS:443)
              │
              ▼
   ┌────────────────────────────────────────────────────────┐
   │ Nginx Reverse Proxy (185.181.183.239)                 │
   │ SSL Termination (Let's Encrypt / Certbot)              │
   │ Rate Limiting & Gzip/Brotli Compression                │
   └──────────┬─────────────────────────────────────────────┘
              │ HTTP:3000 (شبکه داخلی لوپ‌بک / Docker Bridge)
              ▼
   ┌────────────────────────────────────────────────────────┐
   │ Mashahir Web Application (Next.js 15 Standalone Node) │
   │ Port 3000                                              │
   └─────┬───────────────────────────┬──────────────────────┘
         │ TCP:5432                  │ TCP:6379
         ▼                           ▼
   ┌─────────────────────┐     ┌──────────────────────┐
   │ PostgreSQL 16.2     │     │ Redis 7.2 Alpine     │
   │ Volume: pgdata      │     │ Cache & Rate Limiting│
   └─────────────────────┘     └──────────────────────┘
         │
         │ TCP:5038 (Asterisk Manager Interface)
         ▼
   ┌────────────────────────────────────────────────────────┐
   │ Issabel PBX / Asterisk Server (Two-Leg VoIP Trunk)     │
   └────────────────────────────────────────────────────────┘
```

---

## ۴.۲ ساختار فایل کانتینرسازی `docker-compose.yml` پروداکشن

فایل `docker-compose.yml` اصلی در ریشه پروژه قرار دارد:

```yaml
version: "3.8"

services:
  mashahir-postgres:
    image: postgres:16-alpine
    container_name: mashahir-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-mashahir_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-MashahirSuperSecurePass2026!}
      POSTGRES_DB: ${POSTGRES_DB:-mashahir_support_db}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-mashahir_user} -d ${POSTGRES_DB:-mashahir_support_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mashahir-internal-net

  mashahir-redis:
    image: redis:7-alpine
    container_name: mashahir-redis
    restart: always
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD:-MashahirRedisPass2026!}"]
    volumes:
      - redisdata:/data
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-MashahirRedisPass2026!}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mashahir-internal-net

  mashahir-web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mashahir-web
    restart: always
    depends_on:
      mashahir-postgres:
        condition: service_healthy
      mashahir-redis:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${POSTGRES_USER:-mashahir_user}:${POSTGRES_PASSWORD:-MashahirSuperSecurePass2026!}@mashahir-postgres:5432/${POSTGRES_DB:-mashahir_support_db}
      REDIS_URL: redis://:${REDIS_PASSWORD:-MashahirRedisPass2026!}@mashahir-redis:6379
      SESSION_SECRET: ${SESSION_SECRET}
      APP_URL: https://support.mashahiredanesh.com
    networks:
      - mashahir-internal-net

volumes:
  pgdata:
    name: mashahir_pgdata
  redisdata:
    name: mashahir_redisdata

networks:
  mashahir-internal-net:
    driver: bridge
```

---

## ۴.۳ فرهنگ متغیرهای محیطی سیستم (Environment Variables Reference)

فایل `.env.production` روی سرور در مسیر `/opt/mashahir-support/.env.production` نگهداری می‌شود:

| نام متغیر | نوع داده | وضعیت | مقدار پیش‌فرض / پیشنهادی | شرح کارکرد در سیستم |
| :--- | :---: | :---: | :--- | :--- |
| `NODE_ENV` | String | الزامی | `production` | تعیین حالت اجرای بهینه و سفت‌وسخت سرور |
| `PORT` | Integer | اختیاری | `3000` | پورت داخلی اجرای سرور وب Node.js |
| `DATABASE_URL` | String | الزامی | `postgresql://user:pass@host:5432/db` | رشته اتصال به دیتابیس PostgreSQL با کانکشن‌پول |
| `REDIS_URL` | String | اختیاری | `redis://:pass@host:6379` | اتصال به پایگاه داده سریع کلید-مقدار ردیس |
| `SESSION_SECRET` | String | الزامی | رشته تصادفی ۶۴ کاراکتری | کلید رمزنگاری امضای توکن‌های نشست JWT (HS256) |
| `APP_URL` | String | الزامی | `https://support.mashahiredanesh.com` | آدرس مبنای سامانه جهت تولید لینک‌های پیامک و متادیتا |
| `KAVENEGAR_API_KEY` | String | اختیاری | رشته سکرت کاوه‌نگار | کلید دسترسی به وب‌سرویس پیامک کاوه‌نگار |
| `ASTERISK_HOST` | String | اختیاری | IP سرور ایزابل | آدرس سرور سانترال استریسک برای AMI |
| `ASTERISK_PORT` | Integer | اختیاری | `5038` | پورت سوکت ارتباطی Asterisk Manager |
| `ASTERISK_USER` | String | اختیاری | `admin` | نام کاربری پنل AMI |
| `ASTERISK_SECRET` | String | اختیاری | سکرت ایزابل | کلمه عبور سوکت استریسک |
| `ASTERISK_CALLER_ID`| String | اختیاری | `02191000000` | شماره سازمانی جهت نمایش روی تلفن داوطلب |
| `GARNET_API_URL` | String | اختیاری | `https://mashahiredanesh.com/GarnetAPI` | آدرس پایه وب‌سرویس مرکزی مشاهیر/گارنت |
| `GARNET_API_KEY` | String | اختیاری | سکرت ۳۲ کاراکتری | کلید اختصاصی احراز هویت در وب‌سرویس گارنت |

---

## ۴.۴ پیکربندی وب‌سرور Nginx و گواهی امنیتی SSL (`support.mashahiredanesh.com`)

پیکربندی Nginx در مسیر `/etc/nginx/sites-available/support.mashahiredanesh.com`:

```nginx
# هدایت خودکار ترافیک HTTP به HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name support.mashahiredanesh.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# پیکربندی امنیتی سرور HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name support.mashahiredanesh.com;

    # گواهی‌های معتبر Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/support.mashahiredanesh.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/support.mashahiredanesh.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/support.mashahiredanesh.com/chain.pem;

    # پارامترهای مقاوم‌سازی SSL/TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # هدرهای امنیتی ضدحمله
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # سقف مجاز بارگذاری فایل (جهت ویس‌ها و مدارک تحصیلی)
    client_max_body_size 50M;

    # فشرده‌سازی متن و اسکریپت‌ها با Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # تنظیم تایم‌اوت‌های مناسب برای تماس‌های تلفنی و ارسال فایل
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 120s;
    }
}
```

---

## ۴.۵ چک‌لیست و فرامین استقرار بدون توقف (Zero-Downtime Deployment Playbook)

جهت به‌روزرسانی کد و دیپلوی نسخه جدید روی سرور `185.181.183.239`:

```bash
# ۱. اتصال به سرور پروداکشن از طریق SSH
ssh root@185.181.183.239

# ۲. ورود به مسیر اصلی پروژه
cd /opt/mashahir-support

# ۳. دریافت آخرین تغییرات و کدهای نسخه از برنچ اصلی
git fetch origin
git pull origin audit/verify-2026-10-18

# ۴. بررسی متغیرهای محیطی در فایل .env.production
cat .env.production

# ۵. ساخت ایمیج نسخه جدید داکر بدون داون‌تایم
docker compose build --no-cache mashahir-web

# ۶. بالا آوردن کانتینر جدید
docker compose up -d --no-deps mashahir-web

# ۷. بررسی لاگ‌های استارتاپ جهت اطمینان از سلامت دیتابیس و بوت‌استرپ
docker compose logs -f --tail=100 mashahir-web

# ۸. تست بررسی وضعیت وب‌سایت با cURL
curl -I https://support.mashahiredanesh.com
```

---

## ۴.۶ نگهداری، پشتیبان‌گیری خودکار و بازیابی فاجعه (Disaster Recovery & Backup)

### اسکریپت پشتیبان‌گیری خودکار شبانه پایگاه داده (`/opt/scripts/backup_postgres.sh`):

```bash
#!/bin/bash
# Mashahir Danesh Law School - Automated PostgreSQL Daily Backup Script
set -e

BACKUP_DIR="/var/backups/mashahir-db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mashahir_backup_${TIMESTAMP}.dump"
DAYS_TO_KEEP=30

mkdir -p ${BACKUP_DIR}

echo "[$(date)] Starting PostgreSQL Backup..."
docker exec -t mashahir-postgres pg_dump -U mashahir_user -d mashahir_support_db -F c -b -v > "${BACKUP_FILE}"

echo "[$(date)] Backup completed successfully: ${BACKUP_FILE}"
ls -lh "${BACKUP_FILE}"

# پاکسازی بک‌آپ‌های قدیمی‌تر از ۳۰ روز
echo "[$(date)] Cleaning up backups older than ${DAYS_TO_KEEP} days..."
find ${BACKUP_DIR} -name "mashahir_backup_*.dump" -type f -mtime +${DAYS_TO_KEEP} -delete

echo "[$(date)] Backup maintenance routine complete."
```

### تنظیم کرون‌جاب لینوکس (اجرای هر شب ساعت ۰۳:۳۰ بامداد):
```bash
30 3 * * * /bin/bash /opt/scripts/backup_postgres.sh >> /var/log/mashahir_backup.log 2>&1
```

### دستور بازیابی کامل دیتابیس در شرایط بحران (Disaster Recovery Command):
```bash
# متوقف کردن کانتینر وب جهت جلوگیری از تراکنش همزمان
docker compose stop mashahir-web

# بازیابی فایل دامپ به دیتابیس پستگرس با pg_restore
cat /var/backups/mashahir-db/mashahir_backup_20261018_033000.dump | docker exec -i mashahir-postgres pg_restore -U mashahir_user -d mashahir_support_db --clean --if-exists -v

# راه‌اندازی مجدد سرویس وب
docker compose start mashahir-web
```

---

## ۴.۷ راهنمای عیب‌یابی و ۱۰ سناریوی بحران عملیاتی (Top 10 Troubleshooting Scenarios)

### سناریوی ۱: خطای قطع اتصال به دیتابیس (`ECONNREFUSED` / Database Connection Pool Exhaustion)
- **علائم:** صفحات ارور ۵۰۰ بازمی‌گردانند یا ارور `Can't reach database server at mashahir-postgres:5432` در لاگ ظاهر می‌شود.
- **علت:** کانتینر پستگرس دان شده یا سقف کانکشن‌های مجاز (`max_connections`) پر شده است.
- **اقدام اصلاحی:**
  1. بررسی وضعیت کانتینر: `docker compose ps`
  2. بررسی لاگ پستگرس: `docker compose logs -n 100 mashahir-postgres`
  3. در صورت پر شدن رم و افتادن OOM، ری‌استارت کانتینر: `docker compose restart mashahir-postgres`

### سناریوی ۲: خطای ارور باندری Next.js با دایجست (`خطا در بارگذاری اطلاعات سامانه Digest: 1133214300`)
- **علائم:** کلاینت کارت قرمز خطا را با یک کد Digest عددی نمایش می‌دهد.
- **علت:** بروز یک استثنای مدیریت‌نشده (Unhandled Exception) در کامپوننت‌های سمت سرور (RSC).
- **اقدام اصلاحی:**
  1. شماره Digest را در لاگ سرور جستجو کنید:
     ```bash
     docker compose logs mashahir-web | grep "1133214300" -A 10 -B 5
     ```
  2. استک‌تریس خط ارور را مشخص می‌کند (معمولاً تلاش برای دسترسی به مشخصات کاربر ناموجود یا سشن منقضی).
  3. به دلیل وجود موتور خودترمیم، با پاکسازی کوکی مرورگر کاربر مشکل موقت حل شده و باگ در سرور کد لاگ می‌شود.

### سناریوی ۳: عدم برقراری تماس تلفنی ویپ (Asterisk AMI Socket Timeout or Refusal)
- **علائم:** هنگام فشردن دکمه تماس، ارور «خطا در برقراری تماس تلفنی، لطفاً با پشتیبانی فنی تماس بگیرید» بازمی‌گردد.
- **علت:** فایروال سرور پورت ۵۰۳۸ را مسدود کرده یا نام کاربری/رمز عبور در `voip_settings` تغییر یافته است.
- **اقدام اصلاحی:**
  1. بررسی دسترسی به پورت استریسک با نت‌کت: `nc -zv <ASTERISK_IP> 5038`
  2. لاگین به پنل سرپرست `/executive/voip` و فشردن دکمه «تست اتصال به AMI».
  3. بررسی لاگ استریسک در سرور ایزابل: `tail -f /var/log/asterisk/messages`

### سناریوی ۴: عدم ارسال پیامک یا خطای کاوه‌نگار (Kavenegar HTTP 401 / Blacklist)
- **علائم:** کد پیامکی ارسال نمی‌شود یا وضعیت پیامک در جدول `sms_logs` به حالت `FAILED` درمی‌آید.
- **علت:** اعتبار ریالی پنل کاوه‌نگار تمام شده، کلید API منقضی گردیده یا شماره مقصد در بلک‌لیست مخابرات است.
- **اقدام اصلاحی:**
  1. ورود به پنل `/executive/sms` و بررسی جدول گزارش‌های ارسال پیامک (`sms_logs`).
  2. خواندن ستون «پاسخ درگاه کاوه‌نگار» (کدهای ۴۰۱ برای رمز، ۴۰۲ برای اعتبار ریالی، ۴۲۰ برای بلک‌لیست).
  3. برای داوطلبان در بلک‌لیست، خط خدماتی اختصاصی موسسه به صورت خودکار پیامک‌های وب‌سرویس پترن (Lookup) را عبور می‌دهد.

### سناریوی ۵: قطعی یا عدم پاسخگویی وب‌سرویس مرکزی مشاهیر/گارنت (SSO Timeout)
- **علائم:** داوطلبان جدید امکان ورود با حساب گارنت را ندارند و خطای تایم‌اوت وب‌سرویس رخ می‌دهد.
- **علت:** سرور مرکزی گارنت با ترافیک سنگین مواجه است یا در حال بروزرسانی پایگاه داده است.
- **اقدام اصلاحی:**
  1. ورود به پنل `/executive/sso-settings` و فشردن دکمه «تست زنده اتصال».
  2. اطمینان از اینکه کلید `bypass_course_check_if_no_endpoint` بر روی `true` تنظیم شده است تا داوطلبانی که قبلاً تایید شده‌اند بتوانند با دیتابیس محلی بدون وقفه وارد شوند.

### سناریوی ۶: عدم توانایی دی‌کودر فارنزیک در خواندن اسکرین‌شات فشرده‌شده
- **علائم:** پس از بارگذاری تصویر در `/admin/forensic-decoder`، کدملی استخراج نمی‌شود.
- **علت:** تصویر در تلگرام با فشرده‌سازی بسیار بالا (Lossy JPEG Compression) ارسال شده است.
- **اقدام اصلاحی:**
  1. از تصویر اصلی به صورت File (بدون فشرده‌سازی عکس) خروجی بگیرید.
  2. در پنل دی‌کودر، اسلایدر حساسیت فیلتر کنتراست (`Contrast Threshold`) را از مقدار پیش‌فرض ۱۲ به ۸ یا ۱۵ تغییر دهید تا رد کانال‌های آبی و قرمز متمایز گردند.

### سناریوی ۷: ناهماهنگی تایمر آزمون CBT یا قطع اتصال اینترنت داوطلب
- **علائم:** داوطلب مدعی است زمان آزمون وی پیش از موعد به پایان رسیده یا در حین قطعی نت زمان از دست داده است.
- **علت:** قطعی اتصال کلاینت در حالی رخ داده که تایمر سرور به طور مستقل در حال حرکت بوده است.
- **اقدام اصلاحی:**
  1. بررسی جدول `exam_submissions` و زمان دقیق فیلدهای `started_at` و `duration_minutes`.
  2. به دلیل سیاست سرور-محور، مهلت آزمون غیرقابل جعل است. سرپرست آموزشی در صورت احراز عذر موجه داوطلب می‌تواند رکورد سابمیشن را در پنل سرپرست بازنشانی نماید تا داوطلب مجدداً در آزمون شرکت کند.

### سناریوی ۸: پر شدن فضای دیسک سرور (Disk Full / Inode Exhaustion)
- **علائم:** داکر اجازه نوشتن نمی‌دهد، دیتابیس به حالت Read-Only می‌رود یا بیلد شکست می‌خورد.
- **علت:** انباشت ایمیج‌های بی‌استفاده داکر یا لاگ‌های قدیمی سیستم.
- **اقدام اصلاحی:**
  ```bash
  # بررسی فضای دیسک
  df -h
  # پاکسازی ایمیج‌ها و کانتینرهای متوقف‌شده داکر
  docker system prune -af --volumes=false
  # پاکسازی ژورنال‌های لینوکس
  journalctl --vacuum-time=7d
  ```

### سناریوی ۹: خطای کمبود حافظه در حین کامپایل Next.js (Node.js Out of Memory)
- **علائم:** اجرای دستور `npm run build` با خطای `JavaScript heap out of memory` متوقف می‌شود.
- **علت:** تحلیل استاتیک صفحات در پردازنده‌های چندردیف محدود سرور.
- **اقدام اصلاحی:**
  تعیین متغیر حافظه نود در زمان بیلد:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" npm run build
  ```

### سناریوی ۱۰: انقضای گواهی SSL یا خطای Nginx 502 Bad Gateway
- **علائم:** مرورگر هشدار امنیتی منقضی شدن SSL نمایش می‌دهد یا ارور ۵۰۲ بازمی‌گردد.
- **علت:** عدم تمدید گواهی Certbot یا خاموش بودن کانتینر پورت ۳۰۰۰.
- **اقدام اصلاحی:**
  ```bash
  # تمدید اضطراری گواهی Let's Encrypt
  certbot renew --force-renewal
  # بررسی وضعیت پورت ۳۰۰۰
  curl -I http://127.0.0.1:3000
  # ری‌لود تنظیمات انجین‌ایکس
  nginx -t && systemctl reload nginx
  ```

---

# پایان سند مرجع جامع سامانه پشتیبانی مشاهیر دانش (پایان فایل)




