import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

/**
 * Lightweight 2‑column Waterfall / Masonry component (no third‑party libs).
 *
 * - Places each item into the shorter column (greedy) to avoid tall gaps
 * - Preserves image aspect ratio using Image.getSize() when width/height are not provided
 * - Supports pull‑to‑refresh and infinite loading hooks
 * - Render‑prop to inject overlays, placeholders, etc.
 *
 * NOTE: This template favors clarity. For feeds with thousands of items,
 * consider swapping the inner <ScrollView> to two <FlatList>s (one per column)
 * to leverage virtualization more aggressively.
 */

export type WaterfallItem = {
  id: string;
  uri: string; // remote or local file URI
  width?: number; // intrinsic width (px)
  height?: number; // intrinsic height (px)
  /** Any extra per‑item metadata you need */
  [key: string]: any;
};

export type RenderImageOverlay = (args: {
  item: WaterfallItem;
  displayedWidth: number;
  displayedHeight: number;
}) => React.ReactNode;

export interface WaterfallProps {
  data: WaterfallItem[];
  /** Container padding (outer) */
  contentPadding?: number;
  /** Gap between the two columns and vertical gap between items */
  gap?: number;
  /** Optional header/footer */
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  /** Fired near the bottom; hook your pagination here */
  onEndReached?: () => void;
  /** Pixels from bottom to trigger onEndReached */
  onEndReachedThreshold?: number; // default 400
  /** Pull‑to‑refresh */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Loading spinner shown while measuring images */
  loadingIndicator?: React.ReactNode;
  /** Image corner radius */
  borderRadius?: number;
  /** Optional overlay render (badges, gradients, etc.) */
  renderOverlay?: RenderImageOverlay;
  /** Per‑image press handler */
  onPressItem?: (item: WaterfallItem, index: number) => void;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/** Utility: promisified Image.getSize with simple in‑memory cache */
const sizeCache = new Map<string, { width: number; height: number }>();
const getImageSize = async (uri: string): Promise<{ width: number; height: number }> => {
  const cached = sizeCache.get(uri);
  if (cached) return cached;
  const size: { width: number; height: number } = { width: 0, height: 0 };
  await Image.getSize(uri, (width, height) => {
    size.width = width;
    size.height = height;
  }, (e: Error) => {throw e});
  sizeCache.set(uri, size);
  return size;
};

/** Representation after layout calculation */
interface LaidOutItem extends WaterfallItem {
  _displayW: number;
  _displayH: number;
}

export default function Waterfall({
  data,
  gap = 8,
  contentPadding = 12,
  onEndReached,
  onEndReachedThreshold = 400,
  ListHeaderComponent,
  ListFooterComponent,
  refreshing,
  onRefresh,
  loadingIndicator,
  borderRadius = 10,
  renderOverlay,
  onPressItem,
  style,
}: Readonly<WaterfallProps>) {
  const [containerW, setContainerW] = useState<number>(0);
  const [left, setLeft] = useState<LaidOutItem[]>([]);
  const [right, setRight] = useState<LaidOutItem[]>([]);
  const [measuring, setMeasuring] = useState<boolean>(false);

  const scrollRef = useRef<ScrollView>(null);
  const totalHeightRef = useRef({ left: 0, right: 0 });
  const mountedRef = useRef(true);

  const columnW = useMemo(() => {
    if (containerW === 0) return 0;
    return (containerW - contentPadding * 2 - gap) / 2;
  }, [containerW, contentPadding, gap]);

  const onLayoutContainer = useCallback((e: LayoutChangeEvent) => {
    setContainerW(e.nativeEvent.layout.width);
  }, []);

  // Memoized layout computation function
  const computeLayout = useCallback(async () => {
    setMeasuring(true);
    // 并发收集尺寸
    const sizeItems: LaidOutItem[] = await Promise.all(data.map(async (item) => {
      let w = item.width;
      let h = item.height;
      try {
        if (!w || !h) {
          const sz = await getImageSize(item.uri);
          w = sz.width;
          h = sz.height;
        }
      } catch (e) {
        // Fallback to square if size fails
        console.warn('Failed to get image size for', item.uri, e);
        w = w ?? 1;
        h = h ?? 1;
      }
      const scale = columnW / (w || 1);
      const displayW = columnW;
      const displayH = Math.max(1, Math.round((h || 1) * scale));
      return { ...item, _displayW: displayW, _displayH: displayH };
    }));
    // 两列贪心分配
    const L: LaidOutItem[] = [];
    const R: LaidOutItem[] = [];
    let hL = 0;
    let hR = 0;
    for (let laid of sizeItems) {
      if (hL <= hR) {
        L.push(laid);
        hL += laid._displayH + gap;
      } else {
        R.push(laid);
        hR += laid._displayH + gap;
      }
    }
    if (!mountedRef.current) return;
    setLeft(L);
    setRight(R);
    totalHeightRef.current = { left: hL, right: hR };
    setMeasuring(false);
  }, [data, columnW, gap]);

  // Compute layout when container width or data changes
  useEffect(() => {
    mountedRef.current = true;
    if (!columnW || data.length === 0) {
      setLeft([]);
      setRight([]);
      totalHeightRef.current = { left: 0, right: 0 };
      return;
    }

    computeLayout();
    return () => {
      mountedRef.current = false;
    };
  }, [columnW, data.length, computeLayout]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!onEndReached) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < onEndReachedThreshold) {
        onEndReached();
      }
    },
    [onEndReached, onEndReachedThreshold]
  );

  const renderImg = useCallback(
    (item: LaidOutItem, index: number) => (
      <Pressable
        key={item.id}
        onPress={() => onPressItem?.(item, index)}
        style={{ marginBottom: gap }}
      >
        <View style={{ width: item._displayW, height: item._displayH }}>
          <Image
            source={{ uri: item.uri }}
            style={{ width: '100%', height: '100%', borderRadius }}
            resizeMode="cover"
            progressiveRenderingEnabled
            fadeDuration={150}
          />
          {renderOverlay ? (
            <View style={StyleSheet.absoluteFill}>
              {renderOverlay({ item, displayedWidth: item._displayW, displayedHeight: item._displayH })}
            </View>
          ) : null}
        </View>
      </Pressable>
    ),
    [gap, borderRadius, renderOverlay, onPressItem]
  );

  return (
    <View style={[styles.container, style]} onLayout={onLayoutContainer}>
      {ListHeaderComponent}
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
        contentContainerStyle={{
          paddingHorizontal: contentPadding,
          paddingTop: contentPadding,
          paddingBottom: Math.max(contentPadding, gap),
        }}
      >
        {measuring && (loadingIndicator ?? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
          </View>
        ))}

        <View style={{ flexDirection: 'row', columnGap: gap }}>
          <View style={{ width: columnW }}>{left.map(renderImg)}</View>
          <View style={{ width: columnW, marginLeft: gap }}>{right.map(renderImg)}</View>
        </View>
        {ListFooterComponent}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});

/**
 * --------------------
 * Minimal Usage Example
 * --------------------
 *
 * <Waterfall
 *   data={photos}
 *   onEndReached={() => fetchMore()}
 *   onRefresh={() => refetch()}
 *   refreshing={loading}
 *   renderOverlay={({ item }) => (
 *     <View style={{ flex: 1 }} />
 *   )}
 * />
 *
 * const photos = [
 *   { id: '1', uri: 'https://picsum.photos/id/10/400/600', width: 400, height: 600 },
 *   { id: '2', uri: 'https://picsum.photos/id/20/800/500' }, // width/height will be measured
 *   ...
 * ];
 */