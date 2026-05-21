import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, Stock } from '../api';
import { useAuth } from '../auth';
import { connectSocket } from '../socket';
import { RootStackParamList } from './types';

type LivePrice = { price: number; previousClose: number };

type Props = NativeStackScreenProps<RootStackParamList, 'Stocks'>;

function prettySymbol(symbol: string): string {
  if (symbol.includes(':')) {
    const pair = symbol.split(':')[1];
    return pair.endsWith('USDT') ? pair.replace('USDT', '') : pair;
  }
  return symbol;
}

const StockRow: React.FC<{
  item: Stock;
  live?: LivePrice;
  onPress: () => void;
}> = ({ item, live, onPress }) => {
  const flash = useRef(new Animated.Value(0)).current;
  const prevPrice = useRef<number | undefined>(live?.price);
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (live?.price === undefined) return;
    const prev = prevPrice.current;
    if (prev !== undefined && live.price !== prev) {
      setDirection(live.price > prev ? 'up' : 'down');
      flash.setValue(1);
      Animated.timing(flash, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
    prevPrice.current = live.price;
  }, [live?.price, flash]);

  const change = live ? ((live.price - live.previousClose) / live.previousClose) * 100 : 0;
  const positive = change >= 0;

  const backgroundColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: ['#151B2B', direction === 'up' ? '#12351F' : '#3A1A1F'],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.row, { backgroundColor }]}>
        <View>
          <Text style={styles.symbol}>{prettySymbol(item.symbol)}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>{live ? `$${live.price.toFixed(2)}` : '—'}</Text>
          {live ? (
            <Text style={[styles.change, { color: positive ? '#10B981' : '#EF4444' }]}>
              {positive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
};

export const StocksScreen: React.FC<Props> = ({ navigation }) => {
  const { logout } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);

  const fetchStocks = useCallback(async () => {
    const data = await api.listStocks();
    setStocks(data);
    setLivePrices((prev) => {
      const next = { ...prev };
      for (const s of data) {
        if (s.quote) next[s.symbol] = { price: s.quote.c, previousClose: s.quote.pc };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    fetchStocks()
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [fetchStocks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStocks();
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchStocks]);

  useEffect(() => {
    if (stocks.length === 0) return;
    const socket = connectSocket();
    const symbols = stocks.map((s) => s.symbol);

    const onTrade = (trade: { s: string; p: number }) => {
      setLivePrices((prev) => ({
        ...prev,
        [trade.s]: { price: trade.p, previousClose: prev[trade.s]?.previousClose ?? trade.p },
      }));
    };

    setConnected(socket.connected);
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', symbols);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('trade', onTrade);
    if (socket.connected) socket.emit('subscribe', symbols);

    return () => {
      socket.off('trade', onTrade);
      socket.emit('unsubscribe', symbols);
    };
  }, [stocks]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Stocks</Text>
          <View style={styles.liveBadge}>
            <View style={[styles.dot, { backgroundColor: connected ? '#10B981' : '#5E6580' }]} />
            <Text style={[styles.liveText, { color: connected ? '#10B981' : '#5E6580' }]}>
              {connected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <FlatList
        data={stocks}
        keyExtractor={(item) => item.symbol}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={['#3B82F6']} />
        }
        renderItem={({ item }) => (
          <StockRow
            item={item}
            live={livePrices[item.symbol]}
            onPress={() => navigation.navigate('Chart', { symbol: item.symbol })}
          />
        )}
      />

      <Pressable style={styles.alertsBtn} onPress={() => navigation.navigate('Alerts')}>
        <Text style={styles.alertsBtnText}>Manage Alerts</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  liveText: { fontSize: 12, fontWeight: '600' },
  logout: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  row: {
    borderRadius: 12, padding: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  symbol: { color: '#fff', fontSize: 16, fontWeight: '600' },
  name: { color: '#9BA3B8', fontSize: 13, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { color: '#fff', fontSize: 16, fontWeight: '600' },
  change: { fontSize: 13, marginTop: 2 },
  alertsBtn: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  alertsBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
