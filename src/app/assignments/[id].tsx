import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Badge, Button, Card, Empty, ErrorView, Field, KeyValue, Loading, Screen, SectionTitle, colors } from '@/components/ui';
import { asArray } from '@/lib/api';
import { openUrl } from '@/lib/files';
import { formatDate, formatDateTime } from '@/lib/format';
import { portal, submitAssignment } from '@/lib/student-api';
import { useData } from '@/lib/use-data';
import { statusOf } from '@/lib/assignment';

type Picked = { uri: string; name: string; mimeType?: string | null; size?: number | null };
const MAX_MB = 10;

export default function AssignmentDetail() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const detail = useData(() => portal.assignmentDetail(id), [id]);
  const inquiries = useData(async () => asArray(await portal.inquiries(id), ['inquiries']), [id]);
  const [file, setFile] = useState<Picked | null>(null);
  const [comment, setComment] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState<'submit' | 'ask' | null>(null);

  const d = detail.data ?? {};
  const mine = d.my_submission ?? {};
  const status = String(mine.status || d.submission_status || 'PENDING').toUpperCase();
  const st = statusOf({ ...d, submission_status: status });
  const attachments: any[] = d.attachments ?? [];

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_MB * 1024 * 1024) {
      Alert.alert('File too large', `Please choose a file under ${MAX_MB} MB.`);
      return;
    }
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size });
  };

  const submit = async () => {
    if (!file) return;
    setBusy('submit');
    try {
      await submitAssignment(id, file, comment);
      Alert.alert('Submitted', 'Your assignment was submitted successfully.');
      setFile(null);
      setComment('');
      detail.reload();
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setBusy('ask');
    try {
      await portal.ask(id, question);
      setQuestion('');
      inquiries.reload();
    } catch (e: any) {
      Alert.alert('Could not send', e?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen refreshing={detail.refreshing} onRefresh={detail.refresh}>
      <Stack.Screen options={{ title: d.title || title || 'Assignment' }} />
      {detail.error ? <ErrorView message={detail.error} onRetry={detail.refresh} /> : null}
      {detail.loading && !detail.data ? <Loading /> : null}
      {detail.data ? (
        <>
          <Card style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }}>{d.title}</Text>
              <Badge label={st.label} tone={st.tone} />
            </View>
            <KeyValue label="Subject" value={d.subject_name || '—'} />
            <KeyValue label="Due" value={formatDate(d.due_date)} />
            <KeyValue label="Max marks" value={d.max_marks ?? '—'} />
            {d.instructions ? <Text style={{ color: colors.text, marginTop: 6, lineHeight: 21 }}>{d.instructions}</Text> : null}
          </Card>

          {attachments.length > 0 ? (
            <>
              <SectionTitle>Attachments</SectionTitle>
              {attachments.map((att) => (
                <Card key={att.attachment_uuid} onPress={() => openUrl(att.file_url || att.resource_url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="attach-outline" size={20} color={colors.primary} />
                  <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>{att.original_file_name || att.attachment_type || 'Attachment'}</Text>
                  <Ionicons name="open-outline" size={18} color={colors.muted} />
                </Card>
              ))}
            </>
          ) : null}

          {status === 'GRADED' ? (
            <Card style={{ backgroundColor: colors.greenSoft, borderColor: '#BFDDC1' }}>
              <Text style={{ color: colors.green, fontWeight: '700', fontSize: 16 }}>
                {mine.obtained_marks ?? d.obtained_marks ?? '—'}/{d.max_marks ?? '—'} marks
              </Text>
              {mine.feedback || mine.remarks ? <Text style={{ color: colors.text, marginTop: 4 }}>{mine.feedback || mine.remarks}</Text> : null}
            </Card>
          ) : null}

          {status === 'PENDING' ? (
            <>
              <SectionTitle>Submit your work</SectionTitle>
              <Card style={{ gap: 12 }}>
                <Button title={file ? 'Choose a different file' : 'Choose file (PDF, image, Word)'} variant="outline" icon="cloud-upload-outline" onPress={pick} />
                {file ? <Text style={{ color: colors.text }}>Selected: {file.name}</Text> : null}
                <Field label="Comment (optional)" value={comment} onChangeText={setComment} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
                <Button title="Submit assignment" onPress={submit} loading={busy === 'submit'} disabled={!file} />
              </Card>
            </>
          ) : mine.submitted_at ? (
            <Text style={{ color: colors.muted }}>Submitted {formatDateTime(mine.submitted_at)}</Text>
          ) : null}

          <SectionTitle>Questions to your teacher</SectionTitle>
          {(inquiries.data ?? []).length === 0 ? <Card><Empty icon="chatbubbles-outline" title="No questions yet" /></Card> : null}
          {(inquiries.data ?? []).map((q) => (
            <Card key={q.inquiry_uuid} style={{ gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{q.question}</Text>
              {q.answer || q.reply ? <Text style={{ color: colors.green }}>{q.answer || q.reply}</Text> : <Text style={{ color: colors.muted, fontSize: 12 }}>Awaiting reply</Text>}
            </Card>
          ))}
          <Card style={{ gap: 10 }}>
            <Field label="Ask a question" value={question} onChangeText={setQuestion} multiline style={{ minHeight: 60, textAlignVertical: 'top' }} />
            <Button title="Send" small onPress={ask} loading={busy === 'ask'} disabled={!question.trim()} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
