import Constants from 'expo-constants';

type Extra = { apiUrl?: string; webUrl?: string; school?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const trim = (url: string) => url.trim().replace(/\/+$/, '');

/** FastAPI base URL, e.g. https://api.example.com/api/v1 (push registration). */
export const API_URL = trim(process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || '');
/** Hosted web portal the app shows, e.g. https://portal.example.com */
export const WEB_URL = trim(process.env.EXPO_PUBLIC_WEB_URL || extra.webUrl || '');

export const BRAND = {
  product: 'Edureone Campus',
  school: extra.school || "Mother's Public School",
  poweredBy: 'Powered by Edureone Campus',
  company: 'Seereon Consulting & IT Services Pvt. Ltd.',
  supportEmail: 'support@edureonecampus.com',
};

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
