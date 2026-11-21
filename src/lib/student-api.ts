import { api, getApiContext, request, unwrap } from './api';

/**
 * Student endpoints, matching the web portal (src/api/studentModel.js) and
 * the FastAPI routes in app/api/v1/endpoints (student_auth_api, student portal).
 */
export type Student = {
  student_uuid: string;
  institute_uuid: string;
  student_no?: string | null;
  full_name: string;
  email?: string | null;
  class_uuid?: string | null;
  section_uuid?: string | null;
  class_name?: string | null;
  section_name?: string | null;
  session_year?: string | null;
};

const year = () => getApiContext().sessionYear ?? undefined;

export const auth = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; student_uuid: string; institute_uuid: string; student_context?: { session_year?: string } }>(
      '/student-auth/login',
      { email: email.trim(), password },
      { auth: false },
    ),
  me: async () => unwrap<Student>(await api.get('/student-auth/me')),
  logout: () => api.post('/student-auth/logout').catch(() => null),
  forgot: (email: string, admission_no: string) =>
    api.post<{ message?: string }>('/student-auth/forgot-password', { email: email.trim(), admission_no: admission_no.trim() }, { auth: false }),
  verifyOtp: (email: string, admission_no: string, otp: string) =>
    api.post<{ reset_token: string }>(
      '/student-auth/forgot-password-otp-verify',
      { email: email.trim(), admission_no: admission_no.trim(), otp: otp.trim() },
      { auth: false },
    ),
  reset: (reset_token: string, new_password: string, confirm_password: string) =>
    api.post('/student-auth/forgot-password-reset', { reset_token, new_password, confirm_password }, { auth: false }),
  changePassword: (current_password: string, new_password: string, confirm_password: string) =>
    api.post('/student-auth/reset-password', { current_password, new_password, confirm_password }),
};

export const portal = {
  dashboard: () => api.get('/student-auth/dashboard'),
  attendance: () => api.get('/student-portal/attendance').then(unwrap),
  timetable: () => api.get('/student-portal/my-timetable', { session_year: year() }).then(unwrap),
  notices: () => api.get('/student-portal/notices', { page: 1, page_size: 100 }).then(unwrap),
  examSchedule: () => api.get('/student-portal/exams/schedule', { session_year: year() }),
  examResults: () => api.get('/student-portal/exams/results', { session_year: year() }),
  gatePasses: () => api.get('/student-portal/gate-passes').then(unwrap),
  assignments: () => api.get('/assignments', { page: 1, page_size: 100, session_year: year() }).then(unwrap),
  assignmentDetail: (uuid: string) => api.get(`/assignments/${uuid}/detail`).then(unwrap),
  inquiries: (uuid: string) => api.get(`/assignments/${uuid}/inquiries`).then(unwrap),
  ask: (uuid: string, question: string) => api.post(`/assignments/${uuid}/inquiries`, { question: question.trim() }),
  materials: () => api.get('/materials').then(unwrap),
  materialUrl: (uuid: string) => api.get(`/materials/${uuid}/download`).then(unwrap),
  lessonPlans: () => api.get('/lesson-plans').then(unwrap),
  lessonPlanUrl: (uuid: string) => api.get(`/lesson-plans/${uuid}/download`).then(unwrap),
  dues: () => api.get('/student-dues', { session_year: year() }).then(unwrap),
  payments: () => api.get('/payments', { academic_year: year() }).then(unwrap),
};

export async function submitAssignment(
  uuid: string,
  file: { uri: string; name: string; mimeType?: string | null },
  comment: string,
) {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } descriptor for files.
  form.append('submission_file_1', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
  if (comment.trim()) form.append('comment', comment.trim());
  return request(`/assignments/${uuid}/submit`, { method: 'POST', form, timeoutMs: 120000 });
}
