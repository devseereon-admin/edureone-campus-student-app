import * as Sharing from 'expo-sharing';

/** Hand a downloaded file to the system viewer / share sheet. */
export async function openLocalFile(uri: string, mimeType?: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined });
  }
}
