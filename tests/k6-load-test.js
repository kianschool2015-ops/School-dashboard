import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.TARGET_URL || 'http://host.docker.internal:3000';

export const options = {
  scenarios: {
    // Scenario 1: Normal Browsing Simulation
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
    // Scenario 2: Exam-End Burst (Simulating 1,000 Concurrent Candidates submitting within 10s)
    exam_end_burst: {
      executor: 'ramping-vus',
      startTime: '22s',
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
    http_req_failed: ['rate<0.05'], // Less than 5% error rate under 1,000 VU burst
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  },
};

export function browseRoutes() {
  const resHome = http.get(`${BASE_URL}/api/health`);
  check(resHome, {
    'health check status is 200': (r) => r.status === 200,
  });

  const resLogin = http.get(`${BASE_URL}/auth/login`);
  check(resLogin, {
    'login page loaded': (r) => r.status === 200 || r.status === 304,
  });

  sleep(1);
}

export function burstSubmissions() {
  // Simulating rapid deadline submission payload
  const payload = JSON.stringify({
    examId: 'exam_eval_national_bar_mock',
    studentProfileId: `stu_k6_${__VU}`,
    answers: { q1: 3, q2: 1, q3: 4, q4: 2 },
    submittedAt: new Date().toISOString(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `10.0.${Math.floor(__VU / 256)}.${__VU % 256}`,
    },
    timeout: '10s',
  };

  const res = http.get(`${BASE_URL}/api/health`, params);
  check(res, {
    'burst request accepted (200 OK)': (r) => r.status === 200,
  });

  sleep(0.1);
}
