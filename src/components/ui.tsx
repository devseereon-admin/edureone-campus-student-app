import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export const colors = {
  primary: '#1C2540',
  primarySoft: '#E8EBF3',
  accent: '#2073B8',
  gold: '#C9A646',
  green: '#2E7D32',
  greenSoft: '#E6F2E7',
  red: '#C62828',
  redSoft: '#FCE8E8',
  amber: '#B26A00',
  amberSoft: '#FFF3E0',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F5F7FB',
  card: '#FFFFFF',
};

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ padding: 16, paddingBottom: 32, gap: 12 }, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => null);
          onPress();
        }}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}
        accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.muted }}>{label}</Text>
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <View style={{ paddingVertical: 36, alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={36} color={colors.muted} />
      <Text style={{ color: colors.text, fontWeight: '600' }}>{title}</Text>
      {hint ? <Text style={{ color: colors.muted, textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: '#F5C2C2', backgroundColor: colors.redSoft }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Ionicons name="alert-circle" size={20} color={colors.red} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ color: colors.red }}>{message}</Text>
          {onRetry ? <Button title="Try again" variant="outline" small onPress={onRetry} /> : null}
        </View>
      </View>
    </Card>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  small,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  icon?: IconName;
  small?: boolean;
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.red : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        { backgroundColor: bg, borderColor: variant === 'outline' ? colors.primary : bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={{ color: fg, fontWeight: '600', fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, right, ...props }: TextInputProps & { label: string; right?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{label}</Text>
        {right}
      </View>
      <TextInput placeholderTextColor="#94A3B8" {...props} style={[styles.input, props.style]} />
    </View>
  );
}

const TONES = {
  green: [colors.greenSoft, colors.green],
  red: [colors.redSoft, colors.red],
  amber: [colors.amberSoft, colors.amber],
  blue: [colors.primarySoft, colors.primary],
  grey: ['#F1F5F9', colors.muted],
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ label, tone = 'blue' }: { label: string; tone?: Tone }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, icon, tone = 'blue' }: { label: string; value: string | number; icon: IconName; tone?: Tone }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[styles.card, { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }]}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function Row({ icon, title, subtitle, right, onPress }: { icon?: IconName; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Card>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 }}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => null);
              onChange(o.value);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : colors.card,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
            }}>
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  h1: { fontSize: 22, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
});
