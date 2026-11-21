import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Empty, ErrorView, Field, Loading, Screen, Segmented, colors } from '@/components/ui';
import { asArray } from '@/lib/api';
import { openUrl } from '@/lib/files';
import { formatDate } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

export default function Materials() {
  const [tab, setTab] = useState<'materials' | 'lessons'>('materials');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh } = useData(async () => {
    const [m, l] = await Promise.allSettled([portal.materials(), portal.lessonPlans()]);
    if (m.status === 'rejected' && l.status === 'rejected') throw m.reason;
    return {
      materials: m.status === 'fulfilled' ? asArray(m.value, ['materials']) : [],
      lessons: l.status === 'fulfilled' ? asArray(l.value, ['lesson_plans']) : [],
    };
  });
  const rows = useMemo(() => {
    const list = (tab === 'materials' ? data?.materials : data?.lessons) ?? [];
    const s = q.trim().toLowerCase();
    return s ? list.filter((r: any) => [r.title, r.description, r.subject_name, r.chapter, r.topic].some((f) => String(f ?? '').toLowerCase().includes(s))) : list;
  }, [data, tab, q]);

  const open = async (uuid: string, kind: 'material' | 'lesson') => {
    setBusy(uuid);
    try {
      const res: any = kind === 'material' ? await portal.materialUrl(uuid) : await portal.lessonPlanUrl(uuid);
      const url = res?.download_url || res?.url;
      if (!url) throw new Error('No download link was returned.');
      await openUrl(url);
    } catch (e: any) {
      Alert.alert('Download', e?.message || 'Unable to open the file.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'materials', label: `Materials (${data?.materials.length ?? 0})` }, { value: 'lessons', label: `Lesson plans (${data?.lessons.length ?? 0})` }]} />
      <Field label="Search" value={q} onChangeText={setQ} placeholder="Title, subject, chapter…" autoCapitalize="none" />
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && rows.length === 0 ? <Card><Empty icon="library-outline" title="Nothing found" /></Card> : null}
      {rows.map((r: any) => {
        const uuid = tab === 'materials' ? r.material_uuid : r.lesson_plan_uuid;
        const hasFile = tab === 'materials' ? true : !!r.pdf_file_name;
        return (
          <Card key={uuid} style={{ gap: 6 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{r.title}</Text>
            <Text style={{ color: colors.muted }}>
              {[r.subject_name, r.chapter, r.topic, tab === 'lessons' && r.week_of && `Week of ${formatDate(r.week_of)}`, tab === 'materials' && r.created_at && formatDate(r.created_at)].filter(Boolean).join(' · ')}
            </Text>
            {r.description || r.learning_objectives ? <Text style={{ color: colors.text }}>{r.description || r.learning_objectives}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {hasFile ? <Button small variant="outline" icon="download-outline" title="Open" loading={busy === uuid} onPress={() => open(uuid, tab === 'materials' ? 'material' : 'lesson')} /> : null}
              {r.reference_url ? <Button small variant="ghost" icon="open-outline" title="Reference" onPress={() => openUrl(r.reference_url)} /> : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
