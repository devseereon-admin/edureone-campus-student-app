import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, Empty, ErrorView, Loading, Row, Screen, SectionTitle, Stat, colors, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { BRAND } from '@/lib/config';
import { formatDate, money, num, pick } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

const QUICK: { label: string; icon: IconName; href: Href }[] = [
  { label: 'Assignments', icon: 'document-text-outline', href: '/assignments' },
  { label: 'Exams', icon: 'ribbon-outline', href: '/exams' },
  { label: 'Notices', icon: 'megaphone-outline', href: '/notices' },
  { label: 'Materials', icon: 'library-outline', href: '/materials' },
  { label: 'Timetable', icon: 'time-outline', href: '/timetable' },
  { label: 'Gate Pass', icon: 'exit-outline', href: '/gate-passes' },
];

export default function Home() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { data, error, loading, refreshing, refresh } = useData(() => portal.dashboard());
  const student = { ...session?.student, ...(data?.student ?? {}) };
  const summary = data?.summary ?? {};
  const fees = data?.fees ?? {};
  const assignments: any[] = data?.upcoming_assignments ?? [];
  const results: any[] = data?.latest_results ?? [];
  const notes: any[] = Array.isArray(data?.communication_notes) ? data.communication_notes : data?.communication_notes?.data ?? [];
  const classLabel = [student.class_name, student.section_name].filter(Boolean).join(' - ');

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} contentStyle={{ paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Image source={require('@/assets/brand/mps-logo.png')} style={{ width: 42, height: 42 }} contentFit="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{BRAND.school}</Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }} numberOfLines={1}>
            Hi, {(student.full_name || 'Student').split(' ')[0]}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} accessibilityLabel="My profile" hitSlop={8}>
          <Ionicons name="person-circle-outline" size={34} color={colors.primary} />
        </Pressable>
      </View>
      {classLabel || student.session_year ? (
        <Text style={{ color: colors.muted }}>
          {[classLabel && `Class ${classLabel}`, student.session_year && `Session ${student.session_year}`].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading label="Loading your dashboard…" /> : null}

      {data ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Attendance" value={`${num(summary.attendance_percentage)}%`} icon="calendar-outline" tone={num(summary.attendance_percentage) >= 75 ? 'green' : 'amber'} />
            <Stat label="Pending work" value={num(summary.pending_assignments)} icon="document-text-outline" tone="blue" />
            <Stat label="Upcoming exams" value={num(summary.upcoming_exams)} icon="ribbon-outline" tone="blue" />
            <Stat label="Fee balance" value={money(fees.balance_amount)} icon="wallet-outline" tone={num(fees.balance_amount) > 0 ? 'red' : 'green'} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {QUICK.map((q) => (
              <Pressable key={q.label} onPress={() => router.push(q.href)} style={{ width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
                <Ionicons name={q.icon} size={22} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          {num(fees.balance_amount) > 0 ? (
            <Row icon="alert-circle-outline" title={`${money(fees.balance_amount)} due`} subtitle={fees.next_due_date ? `Next due ${formatDate(fees.next_due_date)}` : 'Tap to view your fee details'} onPress={() => router.push('/fees')} />
          ) : null}

          <SectionTitle>Upcoming assignments</SectionTitle>
          {assignments.length === 0 ? (
            <Card><Empty icon="checkmark-done-outline" title="You're all caught up" /></Card>
          ) : (
            assignments.slice(0, 4).map((a) => (
              <Row key={a.assignment_uuid} icon="document-text-outline" title={a.title || 'Assignment'} subtitle={`${a.subject_name || ''}${a.due_date ? ` · Due ${formatDate(a.due_date)}` : ''}`} onPress={() => router.push({ pathname: '/assignments/[id]', params: { id: a.assignment_uuid } })} />
            ))
          )}

          {results.length > 0 ? (
            <>
              <SectionTitle>Latest results</SectionTitle>
              {results.slice(0, 3).map((r, i) => (
                <Row key={r.result_uuid || i} icon="ribbon-outline" title={pick(r, ['exam_name', 'exam_title'], 'Exam')} subtitle={r.published_at ? `Published ${formatDate(r.published_at)}` : undefined} right={<Badge label={`${num(r.percentage)}%${r.grade ? ` · ${r.grade}` : ''}`} tone="green" />} onPress={() => router.push('/exams')} />
              ))}
            </>
          ) : null}

          <SectionTitle right={<Text style={{ color: colors.accent }} onPress={() => router.push('/notices')}>See all</Text>}>Notices</SectionTitle>
          {notes.length === 0 ? (
            <Card><Empty icon="megaphone-outline" title="No notices" /></Card>
          ) : (
            notes.slice(0, 3).map((n, i) => (
              <Card key={pick(n, ['notes_uuid', 'notice_uuid', 'uuid'], i)} onPress={() => router.push('/notices')}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{pick(n, ['title', 'subject'], 'Notice')}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{formatDate(pick(n, ['start_date', 'published_at', 'created_at']))}</Text>
                <Text style={{ color: colors.text, marginTop: 6 }} numberOfLines={2}>{pick(n, ['body', 'content', 'description', 'message'], '')}</Text>
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
