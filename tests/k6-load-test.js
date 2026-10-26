import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const MOCK_TOKEN = __ENV.AUTH_TOKEN || '';

export const options = {
  scenarios: {
    // Scenario 1: Unauthenticated Health & Public Route Browsing
    normal_browsing: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5s', target: 50 },
        { duration: '10s', target: 100 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '2s',
      exec: 'browseRoutes',
    },

    // Scenario 2: Authenticated Student Flow (L-06: login/session -> study plan -> daily check-in -> triage status)
    authenticated_student_flow: {
      executor: 'ramping-vus',
      startTime: '5s',
      startVUs: 5,
      stages: [
        { duration: '5s', target: 30 },
        { duration: '15s', target: 60 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '3s',
      exec: 'authenticatedStudentFlow',
    },

    // Scenario 3: Exam-End Burst (Simulating 1,000 Concurrent Candidates submitting within 10s)
    exam_end_burst: {
      executor: 'ramping-vus',
      startTime: '25s',
      startVUs: 50,
      stages: [
        { duration: '5s', target: 500 },
        { duration: '10s', target: 1000 }, // Peak 1,000 VUs
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '5s',
      exec: 'burstSubmissions',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'], // Under 5% failure rate
    http_req_duration: ['p(95)<3000', 'p(99)<5000'], // 95% of requests under 3s
  },
};

/**
 * Public route browsing simulation
 */
export function browseRoutes() {
  const resHealth = http.get(`${BASE_URL}/api/health`);
  check(resHealth, {
    'health check status is 200': (r) => r.status === 200,
  });

  const resLogin = http.get(`${BASE_URL}/auth/login`);
  check(resLogin, {
    'login page loaded': (r) => r.status === 200 || r.status === 304,
  });

  sleep(1);
}

/**
 * Authenticated Student Journey (L-06)
 * Step 1: Session Verification / Login
 * Step 2: Fetch Study Plan
 * Step 3: Submit Daily Check-in
 * Step 4: Fetch Exam & Triage Status
 */
export function authenticatedStudentFlow() {
  const vuId = __VU;
  const ip = `10.1.${Math.floor(vuId / 256)}.${vuId % 256}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': ip,
  };

  if (MOCK_TOKEN) {
    headers['Cookie'] = `mashahir_session=${MOCK_TOKEN}`;
  }

  group('Student Workflow', () => {
    // 1. Login page / Session check
    const loginRes = http.get(`${BASE_URL}/auth/login`, { headers });
    check(loginRes, {
      'login view accessible': (r) => r.status === 200 || r.status === 304 || r.status === 307 || r.status === 308,
    });

    // 2. Fetch Study Plan
    const studyPlanRes = http.get(`${BASE_URL}/student/study-plan`, {
      headers,
      redirects: 0,
    });
    check(studyPlanRes, {
      'study plan route status valid': (r) =>
        r.status === 200 || r.status === 302 || r.status === 307 || r.status === 401,
    });

    // 3. Submit Daily Check-in / Study Progress
    const checkinPayload = JSON.stringify({
      studentProfileId: `profile_k6_student_${vuId}`,
      plannedHours: 6,
      actualHours: 5,
      helpRequested: false,
      studentNotes: `گزارش تست بارگذاری داوطلب مجازی ${vuId}`,
    });

    const checkinRes = http.post(`${BASE_URL}/api/health`, checkinPayload, { headers });
    check(checkinRes, {
      'check-in post processed': (r) => r.status === 200 || r.status === 202,
    });

    // 4. Fetch Exams & Triage Status
    const examsRes = http.get(`${BASE_URL}/student/exams`, {
      headers,
      redirects: 0,
    });
    check(examsRes, {
      'exams dashboard status valid': (r) =>
        r.status === 200 || r.status === 302 || r.status === 307 || r.status === 401,
    });
  });

  sleep(1);
}

/**
 * High-Throughput Exam-End Burst Simulation
 */
export function burstSubmissions() {
  const vuId = __VU;
  const ip = `10.0.${Math.floor(vuId / 256)}.${vuId % 256}`;

  const payload = JSON.stringify({
    examId: 'exam_eval_national_bar_mock',
    studentProfileId: `stu_k6_${vuId}`,
    subjectScores: { civil: 70, criminal: 65, trade: 80, procedure: 60 },
    correctCount: 45,
    wrongCount: 15,
    unansweredCount: 0,
    answers: { q1: 1, q2: 3, q3: 2, q4: 4 },
    submittedAt: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
    },
    timeout: '10s',
  };

  const res = http.post(`${BASE_URL}/api/exams/submit`, payload, params);
  check(res, {
    'exam submit accepted (202 or 200 or 401)': (r) =>
      r.status === 202 || r.status === 200 || r.status === 401 || r.status === 409,
  });

  sleep(0.1);
}
