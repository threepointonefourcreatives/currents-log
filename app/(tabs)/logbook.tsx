import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Colors, Typography, Spacing, MoodColors } from '../../src/theme/theme';
import CurrentLogo from '../../components/CurrentLogo';
import Header from '../../src/components/Header';
import { useFocusEffect } from 'expo-router';
import { getLogs } from '../../src/utils/db';
import { parseSafeDate } from '../../src/utils/dateUtils';
import { logger } from '../../src/utils/logger';

type MockLog = { id: string; date: string; score: number; note: string };



export default function LogbookScreen() {
  const [logs, setLogs] = useState<MockLog[]>([]);
  const [topDate, setTopDate] = useState<string | null>(null);
  const [trackHeight, setTrackHeight] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  
  const flatListRef = useRef<FlatList>(null);
  const pillY = useSharedValue(0);

  const PILL_HEIGHT = 30;

  const scrubList = useCallback((yValue: number) => {
    const maxTravel = Math.max(1, trackHeight - PILL_HEIGHT);
    const percentage = Math.max(0, Math.min(yValue / maxTravel, 1));
    if (flatListRef.current && contentHeight > listHeight) {
      const maxScroll = contentHeight - listHeight;
      const targetOffset = percentage * maxScroll;
      flatListRef.current.scrollToOffset({ offset: targetOffset, animated: false });
    }
  }, [trackHeight, contentHeight, listHeight]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      const maxTravel = Math.max(0, trackHeight - PILL_HEIGHT);
      pillY.value = Math.max(0, Math.min(pillY.value + e.changeY, maxTravel));
      runOnJS(scrubList)(pillY.value);
    });

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pillY.value }],
  }));

  const handleScroll = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const maxScroll = contentHeight - listHeight;
    const maxTravel = Math.max(0, trackHeight - PILL_HEIGHT);
    if (maxScroll > 0 && maxTravel > 0) {
      const percentage = Math.max(0, Math.min(offsetY / maxScroll, 1));
      pillY.value = percentage * maxTravel;
    }
  }, [contentHeight, listHeight, trackHeight, pillY]);

  const sortedData = useMemo(() => {
    // Ascending sort (oldest first) as requested
    return [...logs].sort((a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime());
  }, [logs]);

  useEffect(() => {
    logger.debug('Logbook State Length:', logs.length);
  }, [logs]);

  useFocusEffect(
    useCallback(() => {
      const fetchLogs = async () => {
        const data = await getLogs();
        logger.debug('Logbook fetched', { count: data.length });
        setLogs(data);
      };
      fetchLogs();
    }, [])
  );

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const topItem = viewableItems[0].item as MockLog;
      // Provide a slight delay or directly update
      setTopDate(topItem.date);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const formatPillDate = (dateStr: string) => {
    try {
      const d = parseSafeDate(dateStr);
      if (d.getTime() === 0) return 'Unknown Date';
      const day = d.getDate();
      const suffix = (day >= 11 && day <= 13) ? 'th' : ['st', 'nd', 'rd'][(day % 10) - 1] || 'th';
      const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const year = d.getFullYear();
      return `${day}${suffix} ${month} ${year}`;
    } catch {
      return 'Unknown Date';
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = parseSafeDate(dateStr);
      if (d.getTime() === 0) return '--:--';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
    } catch {
      return '--:--';
    }
  };

  const renderItem = ({ item }: { item: MockLog }) => {
    // Assess text contrast. Scores 1-3 are dark (white text), 4 and 5 are lighter (dark text).
    const isLightText = item.score <= 3;
    const textColor = isLightText ? Colors.lightCanvas : Colors.textPrimaryLight;

    return (
      <View style={styles.logContainer}>
        <Text style={[styles.timestampText, { color: Colors.textPrimaryLight }]}>{formatTimestamp(item.date)}</Text>
        <View style={[styles.logCard, { backgroundColor: MoodColors[item.score as 1|2|3|4|5] }]}>
          <Text style={[styles.logNote, { color: textColor }]}>
            “{item.note}”
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {/* Header Block */}
      <Header />

      {/* Title Block */}
      <View style={styles.titleBlock}>
        <View style={styles.titleCenterContainer}>
          <Text style={styles.title}>March 2026</Text>
          <Text style={styles.subtext}>Scroll up/down through your entries</Text>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <FlatList
          ref={flatListRef}
          data={sortedData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1, width: '100%' }}
          horizontal={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled={true}
          bounces={true}
          alwaysBounceHorizontal={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(w, h) => setContentHeight(h)}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />

        {/* Timeline Track */}
        <View style={styles.timelineTrack} />
        
        {/* Floating Date Pill */}
        <View 
          style={styles.floatingPillContainer}
          onLayout={(e) => setTrackHeight(e.nativeEvent.layout.height)}
          pointerEvents="box-none"
        >
          {topDate && (
            <GestureDetector gesture={pan}>
              <Animated.View style={[animatedPillStyle, styles.scrubberRow]}>
                <View style={styles.floatingPill}>
                  <Text style={styles.floatingPillText}>{formatPillDate(topDate)}</Text>
                </View>
                <View style={styles.scrubberThumb} />
              </Animated.View>
            </GestureDetector>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.lightCanvas,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D7D5B2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  avatarText: {
    fontFamily: Typography.serif.bold,
    color: Colors.textPrimaryLight,
    fontSize: 18,
  },
  titleBlock: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCenterContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: Typography.serif.medium,
    fontSize: 24,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontFamily: Typography.serif.italic,
    fontSize: 11,
    color: '#8A887E',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: 120, // Breathing space at end of list to clear tab bar
  },
  logContainer: {
    marginBottom: Spacing.xxl,
    marginHorizontal: 60,
  },
  timestampText: {
    fontFamily: Typography.sans.light,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  logCard: {
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 140,
    // Neumorphic subtle shadows
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  logNote: {
    fontFamily: Typography.serif.italic,
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 28,
  },
  timelineTrack: {
    position: 'absolute',
    right: Spacing.xl, // E.g., 24
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#CCCCCC',
    zIndex: 1,
  },
  floatingPillContainer: {
    position: 'absolute',
    right: typeof Spacing.xl === 'number' ? Spacing.xl - 3.5 : 20.5,
    top: typeof Spacing.xl === 'number' ? Spacing.xl : 24,
    bottom: typeof Spacing.xl === 'number' ? Spacing.xl : 24,
    alignItems: 'flex-end',
    zIndex: 5,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  floatingPill: {
    backgroundColor: Colors.lightCanvas,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    // Soft drop shadow distinguishing it
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  scrubberThumb: {
    width: 8,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#D7D5B2',
  },
  floatingPillText: {
    fontFamily: Typography.sans.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
});
