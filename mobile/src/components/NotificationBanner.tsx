import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BannerData {
  title: string;
  body: string;
}

interface Props {
  data: BannerData | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<Props> = ({ data, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
      timer.current = setTimeout(hide, 4000);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const hide = () => {
    Animated.timing(translateY, { toValue: -200, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  };

  if (!data) return null;

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={hide} style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📈</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{data.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{data.body}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, zIndex: 1000 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2538',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A3045',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 20 },
  textWrap: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  body: { color: '#9BA3B8', fontSize: 13, marginTop: 2 },
});
