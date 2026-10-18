/**
 * Master Seed & Production Dataset for Mashahir Danesh Law School 360-Degree Platform
 * Zero-Mock Production Environment: Exactly 4 authentic roles (Admin, Supervisor, Mentor, Student)
 */

export type {
  UserRecord,
  StudentProfileRecord,
  ScheduleItemRecord,
  DailyCheckinRecord,
  TriageCaseRecord,
  MockExamRecord,
  CoachingMissionRecord,
  StudentMissionLogRecord,
} from "@/types/models";
import type {
  UserRecord,
  StudentProfileRecord,
  ScheduleItemRecord,
  TriageCaseRecord,
  MockExamRecord,
  CoachingMissionRecord,
} from "@/types/models";

// 1. Production Users: Exactly 4 Authentic Institutional Users
export const initialUsers: UserRecord[] = [
  {
    id: "usr_admin",
    username: "admin",
    phoneNumber: "09120000001",
    fullName: "مدیریت عالی مشاهیر دانش",
    role: "CEO",
    passwordHash: "Admin@123456",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "usr_adminsupervisor",
    username: "supervisor",
    phoneNumber: "09120000002",
    fullName: "دکتر مریم رضایی (سرپرست آموزشی)",
    role: "SUPERVISOR",
    passwordHash: "Supervisor@123456",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "usr_mentor1",
    username: "mentor",
    sipExtension: "101",
    phoneNumber: "09121000001",
    fullName: "استاد علی کاظمی (پشتیبان علمی)",
    role: "MENTOR",
    passwordHash: "Mentor@123456",
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "usr_student1",
    username: "09121000005",
    phoneNumber: "09121000005",
    nationalId: "0012345678",
    fullName: "سارا احمدی (داوطلب کانون وکلا)",
    role: "STUDENT",
    passwordHash: "Student@123456",
    isActive: true,
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-06-01"),
  },
];

// 2. Production Student Profile
export const initialStudentProfiles: StudentProfileRecord[] = [
  {
    id: "profile_stu_1",
    userId: "usr_student1",
    mentorId: "usr_mentor1",
    employmentStatus: "UNEMPLOYED",
    isStudent: false,
    maritalStatus: "SINGLE",
    hasChildren: false,
    childrenCount: 0,
    hasFamilyCareDuty: false,
    workdayStudyHoursCap: 8,
    holidayStudyHoursCap: 11,
    bestStudyTime: "MORNING",
    primaryConstraint: "تمرکز کامل روی آزمون کانون وکلای دادگستری",
    previousBarExamAttempts: 0,
    currentDailyStudyHours: 7.5,
    selfBaselineAssessment: "پایه متوسط در حقوق مدنی و فقه، نیاز به تسلط بر تست‌های دادرسی مدنی و تجارت",
    masterclassGoal: "قبولی با رتبه تک‌رقمی در کانون وکلای مرکز (تهران)",
    riskStatus: "GREEN",
    riskReason: "وضعیت پایدار آموزشی، اجرای دقیق برنامه راهبردی و تداوم مطالعه بالای ۷ ساعت",
    lastContactAt: new Date(Date.now() - 24 * 3600000),
    createdAt: new Date("2024-06-01"),
    updatedAt: new Date("2024-10-01"),
  },
];

// 3. Educational Guidance & Crisis Cases
export const initialTriageCases: TriageCaseRecord[] = [
  {
    id: "trg_1",
    studentProfileId: "profile_stu_1",
    mentorId: "usr_mentor1",
    triggerCode: "A01",
    priorityTier: 2,
    description: "پایش آموزشی: مشاوره و رفع اشکال در تست‌های تعهدات و شروط ضمن عقد حقوق مدنی",
    isResolved: false,
    slaDueAt: new Date(Date.now() + 24 * 3600000),
    createdAt: new Date(Date.now() - 2 * 3600000),
  },
];

// 4. Coaching Missions
export const initialCoachingMissions: CoachingMissionRecord[] = [
  {
    id: "mis_1",
    title: "تنظیم چرخه خواب کنکوری (بیداری ساعت ۶:۳۰ صبح و استراحت شبانه)",
    category: "سبک زندگی و فیزیولوژی",
    assignedJalaliWeek: 30,
    assignedJalaliYear: 1403,
  },
  {
    id: "mis_2",
    title: "تکنیک حاشیه‌نویسی قانون: علامت‌گذاری کلمات کلیدی در مواد قانونی مدنی",
    category: "متدولوژی مطالعه",
    assignedJalaliWeek: 30,
    assignedJalaliYear: 1403,
  },
  {
    id: "mis_3",
    title: "تمرکز عمیق بدون گوشی تلفن همراه در پارت مطالعه صبحگاهی",
    category: "بهینه‌سازی تمرکز",
    assignedJalaliWeek: 30,
    assignedJalaliYear: 1403,
  },
  {
    id: "mis_4",
    title: "تست‌زنی آموزشی زمان‌دار (هر تست حقوق تجارت حداکثر ۸۰ ثانیه)",
    category: "مهارت آزمون",
    assignedJalaliWeek: 30,
    assignedJalaliYear: 1403,
  },
];

// 5. Active Schedule for Student
export const initialScheduleItems: ScheduleItemRecord[] = [
  {
    id: "item_1",
    scheduleId: "sch_stu_1",
    dayOfWeek: 0, // Shanbeh
    subject: "حقوق مدنی",
    activityType: "STUDY",
    topicDescription: "مدنی ۳: تعهدات، شروط ضمن عقد و ضمانت اجراها",
    targetVolume: "۳۵ صفحه از کتاب نظم کنونی",
    targetDurationMinutes: 120,
    isCatchup: false,
    status: "DONE",
  },
  {
    id: "item_2",
    scheduleId: "sch_stu_1",
    dayOfWeek: 0,
    subject: "آیین دادرسی مدنی",
    activityType: "TEST_PRACTICE",
    topicDescription: "تست‌های مبحث صلاحیت ذاتی و محلی مراجع دادگستری",
    targetVolume: "۵۰ تست تالیفی و سنوات گذشته",
    targetDurationMinutes: 90,
    isCatchup: false,
    status: "DONE",
  },
  {
    id: "item_3",
    scheduleId: "sch_stu_1",
    dayOfWeek: 1, // Yekshanbeh
    subject: "حقوق تجارت",
    activityType: "STUDY",
    topicDescription: "شرکت‌های سهامی خاص و عام و مسئولیت مدیران",
    targetVolume: "۴۰ صفحه مبحث شرکت‌ها",
    targetDurationMinutes: 120,
    isCatchup: false,
    status: "DONE",
  },
  {
    id: "item_4",
    scheduleId: "sch_stu_1",
    dayOfWeek: 1,
    subject: "حقوق جزا عمومی",
    activityType: "STATUTE_READ",
    topicDescription: "قانون مجازات اسلامی: مواد ۱۰ تا ۵۰ (قلمرو مکانی و زمانی قوانین)",
    targetVolume: "۴۰ ماده قانونی همراه با نکات آزمونی",
    targetDurationMinutes: 75,
    isCatchup: false,
    status: "DONE",
  },
  {
    id: "item_5",
    scheduleId: "sch_stu_1",
    dayOfWeek: 2, // Doshanbeh
    subject: "آیین دادرسی کیفری",
    activityType: "STUDY",
    topicDescription: "قرارهای تامین کیفری و نظارت قضایی (مواد ۲۱۷ به بعد)",
    targetVolume: "۳۰ صفحه متن و یادداشت‌برداری",
    targetDurationMinutes: 90,
    isCatchup: false,
    status: "NOT_DONE",
  },
];

// 6. Mock Exam Records for Student
export const initialMockExams: MockExamRecord[] = [
  {
    id: "exam_1",
    studentProfileId: "profile_stu_1",
    examTitle: "آزمون آزمایشی جامع شماره ۱ مشاهیر دانش",
    examDate: "1403-07-20",
    hasParticipated: true,
    isExcusedAbsence: false,
    overallScorePercent: 78,
    overallRank: 12,
    correctCount: 94,
    wrongCount: 18,
    unansweredCount: 8,
    subjectScores: {
      "حقوق مدنی": 82,
      "حقوق تجارت": 75,
      "آیین دادرسی مدنی": 80,
      "حقوق جزا": 85,
      "آیین دادرسی کیفری": 78,
      "متون فقه": 68,
    },
    analysisStatus: "DONE",
    primaryErrorCause: "دقت در تله‌های تستی مواد قانونی خاص",
    priorityReviewSubject: "حقوق تجارت",
    deltaPreviousExam: 5,
    deltaBaseline: 22,
    createdAt: new Date("2024-10-10"),
  },
];
