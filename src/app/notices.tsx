import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Empty, ErrorView, Loading, Screen, Segmented, colors } from '@/components/ui';
import { asArray } from '@/lib/api';
import { openUrl } from '@/lib/files';
import { formatDate, pick } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

const categoryOf = (n: any) => n?.category?.name || n?.category_name || (typeof n?.category === 'string' && n.category) || 'General';

export default function Notices() {
  const [tab, setTab] = useState<'notices' | 'calendar'>('notices');
  const { data, error, loading, refreshing, refresh } = useData(async () => {
    const [dash, notes] = await Promise.allSettled([portal.dashboard(), portal.notices()]);
    const dashboard: any = dash.status === 'fulfilled' ? dash.value : {};
    const list = notes.status === 'fulfilled' ? asArray(notes.value, ['notes', 'notices']) : asArray(dashboard?.communication_notes);
    if (dash.status === 'rejected' && notes.status === 'rejected') throw notes.reason;
    return { notes: list, calendar: asArray(dashboard?.calendar) };
  });
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...new Set((data?.notes ?? []).map(categoryOf))], [data]);
  const notes = (data?.notes ?? []).filter((n) => category === 'All' || categoryOf(n) === category);
  const calendar = [...(data?.calendar ?? [])].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'notices', label: 'Notices' }, { value: 'calendar', label: 'Calendar & Holidays' }]} />
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && tab === 'notices' ? (
        <>
          {categories.length > 2 ? <Segmented value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} /> : null}
          {notes.length === 0 ? <Card><Empty icon="megaphone-outline" title="No notices" /></Card> : null}
          {notes.map((n, i) => {
            const attachments = (Array.isArray(n.attachments) ? n.attachments : []).map((a: any) => ({ name: a.original_file_name ?? a.name ?? 'Attachment', url: a.file_url ?? a.url }));
            return (
              <Card key={pick(n, ['notes_uuid', 'notice_uuid', 'uuid'], i)} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{pick(n, ['title', 'subject', 'notice_title'], 'Notice')}</Text>
                  <Badge label={categoryOf(n)} tone="blue" />
                </View>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{formatDate(pick(n, ['start_date', 'published_at', 'created_at', 'date']))}</Text>
                <Text style={{ color: colors.text, lineHeight: 21 }}>{pick(n, ['body', 'content', 'description', 'message'], '')}</Text>
                {attachments.filter((a: any) => a.url).map((a: any, j: number) => (
                  <Text key={j} onPress={() => openUrl(a.url)} style={{ color: colors.accent }}>
                    <Ionicons name="attach-outline" size={14} /> {a.name}
                  </Text>
                ))}
              </Card>
            );
          })}
        </>
      ) : null}
      {data && tab === 'calendar' ? (
        calendar.length === 0 ? (
          <Card><Empty icon="calendar-outline" title="No calendar entries" /></Card>
        ) : (
          calendar.map((c, i) => {
            const holiday = c.category === 'HOLIDAY';
            const end = c.end_date && c.end_date !== c.start_date ? ` – ${formatDate(c.end_date)}` : '';
            return (
              <Card key={pick(c, ['calendar_uuid', 'holiday_uuid'], i)} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{c.title}</Text>
                  <Badge label={holiday ? 'Holiday' : c.category || 'Academic'} tone={holiday ? 'amber' : 'blue'} />
                </View>
                <Text style={{ color: colors.muted }}>{formatDate(c.start_date)}{end}</Text>
                {c.description ? <Text style={{ color: colors.text }}>{c.description}</Text> : null}
              </Card>
            );
          })
        )
      ) : null}
    </Screen>
  );
}
