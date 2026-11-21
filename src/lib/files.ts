import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { authHeaders, buildUrl } from './api';

const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'download';

/**
 * Download a protected API file (receipts, report cards) with the student's
 * auth headers, then hand it to the system viewer / share sheet.
 */
export async function downloadAndOpen(path: string, filename: string, mimeType = 'application/pdf') {
  const dir = new Directory(Paths.cache, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const target = new File(dir, safeName(filename));
  const file = await File.downloadFileAsync(buildUrl(path), target, { headers: authHeaders(), idempotent: true });
  await openLocalFile(file.uri, mimeType);
  return file.uri;
}

export async function openLocalFile(uri: string, mimeType?: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
  }
}

/** Public or pre-signed URLs (study material downloads, notice attachments). */
export async function openUrl(url: string) {
  if (!url) return;
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: '#1C2540',
  });
}
