import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useDerivedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, type SharedValue } from 'react-native-reanimated';
import { Canvas, Path, LinearGradient, vec, Circle, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Colors, Typography, Spacing, MoodColors, Radii, Shadows, Durations } from '../../src/theme/theme';
import SegmentedToggle from '../../components/SegmentedToggle';
import CurrentLogo from '../../components/CurrentLogo';
import Header from '../../src/components/Header';
import { useFocusEffect } from 'expo-router';
import { getLogs } from '../../src/utils/db';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 450;
const BOTTOM_PADDING = 80; // Padding for the bottom of the chart area
const TOP_PADDING = 50;

export type MockLog = { id: string; date: string; score: number; note: string };

// Generate dummy gradient arrays for 14 extra boxes
const DUMMY_BOXES = Array.from({ length: 14 }, (_, i) => [
  MoodColors[((i % 3) + 3) as 3|4|5], // random-ish bright
  MoodColors[(((i * 2 + 1) % 3) + 1) as 1|2|3] // random-ish cool
]);

function getTrendQuote(data: MockLog[]) {
  if (data.length === 0) return "No logs recorded for this day. The waters were still.";
  if (data.length === 1) {
    if (data[0].score >= 4) return "A steady breeze carried this day forward.";
    if (data[0].score <= 2) return "Choppy waters, but you weathered the storm.";
    return "A quiet passage. Sometimes, calm is all we need.";
  }
  const avg = data.reduce((sum, item) => sum + item.score, 0) / data.length;
  const variance = data.reduce((sum, item) => sum + Math.pow(item.score - avg, 2), 0) / data.length;
  if (variance > 1.5) {
    return "Navigating the crests and troughs. A true sailor is forged in unpredictable seas.";
  }
  if (avg >= 3.5) {
    return "Steady winds and clear horizons. You are holding your course well.";
  }
  return "Deep waters and heavy weather. Batten down the hatches, this too shall pass.";
}

// Format date to "10th March 2026"
function getFormattedDate() {
  const date = new Date();
  const day = date.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  return { day: `${day}${suffix}`, monthYear: `${month} ${year}` };
}

// Isolate Skia chart rendering to prevent aggressive re-renders on JS state changes
const MemoizedWavesChart = React.memo(({ data, scrubPosition, onActivePointChange, activeNodeIdx }: { data: MockLog[], scrubPosition: SharedValue<number>, onActivePointChange: (idx: number | null) => void, activeNodeIdx: SharedValue<number> }) => {
  if (data.length === 0) {
    return (
      <View style={[styles.chartContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.patternCardText}>No logs recorded for this day.</Text>
      </View>
    );
  }

  const pointSpacing = data.length > 1 ? SCREEN_WIDTH / (data.length - 1) : SCREEN_WIDTH;

  const points = useMemo(() => {
    if (data.length === 1) {
      const y = interpolate(data[0].score, [1, 5], [CHART_HEIGHT - BOTTOM_PADDING, TOP_PADDING]);
      return [
        { x: 0, y, score: data[0].score },
        { x: SCREEN_WIDTH, y, score: data[0].score },
      ];
    }
    return data.map((d, i) => {
      const x = i * pointSpacing;
      const y = interpolate(d.score, [1, 5], [CHART_HEIGHT - BOTTOM_PADDING, TOP_PADDING]);
      return { x, y, score: d.score };
    });
  }, [data, pointSpacing]);

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    if (points.length < 2) return p;
    p.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      p.cubicTo(cx, p0.y, cx, p1.y, p1.x, p1.y);
    }
    return p;
  }, [points]);

  const fillPath = useMemo(() => {
    if (points.length < 2) return path.copy();
    const p = path.copy();
    p.lineTo(SCREEN_WIDTH, CHART_HEIGHT);
    p.lineTo(0, CHART_HEIGHT);
    p.close();
    return p;
  }, [path, points]);

  // Vertical stroke tracking the scrub
  const indicatorWidth = 1; // Width of the indicator line
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: scrubPosition.value - indicatorWidth / 2 }],
      opacity: scrubPosition.value === -1 ? 0 : 1,
    };
  });

  const gesture = Gesture.Pan()
    .onBegin((e) => {
      scrubPosition.value = Math.max(0, Math.min(e.x, SCREEN_WIDTH));
      if (data.length > 1) {
        const closestIdx = Math.round(scrubPosition.value / pointSpacing);
        activeNodeIdx.value = Math.max(0, Math.min(closestIdx, data.length - 1));
        runOnJS(onActivePointChange)(activeNodeIdx.value);
      } else {
        runOnJS(onActivePointChange)(0);
      }
    })
    .onChange((e) => {
      scrubPosition.value = Math.max(0, Math.min(e.x, SCREEN_WIDTH));
      if (data.length > 1) {
        const closestIdx = Math.round(scrubPosition.value / pointSpacing);
        activeNodeIdx.value = Math.max(0, Math.min(closestIdx, data.length - 1));
        runOnJS(onActivePointChange)(activeNodeIdx.value);
      } else {
        runOnJS(onActivePointChange)(0);
      }
    })
    .onEnd(() => {
      scrubPosition.value = withTiming(-1, { duration: Durations.fast });
      activeNodeIdx.value = withTiming(-1, { duration: Durations.fast });
      runOnJS(onActivePointChange)(null);
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ width: SCREEN_WIDTH, height: CHART_HEIGHT }}>
        <Canvas style={{ flex: 1 }}>
          {/* Gradient fill representing the ocean depths */}
          <Path path={fillPath}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, CHART_HEIGHT)} // Explicit canvasHeight as requested
              colors={[MoodColors[5], MoodColors[4], MoodColors[3], MoodColors[2], MoodColors[1]]}
              positions={[0, 0.25, 0.5, 0.75, 1]}
            />
          </Path>
          
          {/* Surface Wave Path */}
          <Path path={path} style="stroke" strokeWidth={1} color="rgba(255, 255, 255, 0.4)" />

          {/* Activity nodes (white circles) */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} color={Colors.lightCanvas} style="fill" />
          ))}
          {/* Node Stroke rings */}
          {points.map((p, i) => (
            <Circle key={`stroke-${i}`} cx={p.x} cy={p.y} r={5} color="rgba(0,0,0,0.2)" style="stroke" strokeWidth={0.5} />
          ))}

        </Canvas>

        {/* Active scrub crosshair MUST be outside Canvas */}
        <Animated.View 
          style={[
            { position: 'absolute', top: 0, bottom: 0, width: indicatorWidth }, 
            indicatorStyle
          ]} 
          pointerEvents="none"
        >
          <View style={styles.indicatorLine} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

export default function SurfaceScreen() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'waves' | 'surface'>('waves');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [selectedGridDate, setSelectedGridDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<MockLog[]>([]);
  const scrubPosition = useSharedValue(-1);
  const activeNodeIdx = useSharedValue(-1);

  useFocusEffect(
    useCallback(() => {
      const fetchLogs = async () => {
        const data = await getLogs();
        setLogs(data);
      };
      fetchLogs();
    }, [])
  );

  // Derive logical prefixes
  const currentDayPrefix = currentDate.toISOString().split('T')[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dailyLogs = logs.filter(l => l.date.startsWith(currentDayPrefix));
  const activeLog = (activePointIndex !== null && dailyLogs[activePointIndex]) ? dailyLogs[activePointIndex] : null;
  const selectedDayLogs = selectedGridDate ? logs.filter(l => l.date.startsWith(selectedGridDate)) : [];

  const moodCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    logs.forEach(log => {
      if (counts[log.score] !== undefined) counts[log.score]++;
    });
    return counts;
  }, [logs]);
  
  let selectedGridGradient = ['#EAE7D8', '#EAE7D8']; // default pattern bg
  if (selectedDayLogs.length > 0) {
    selectedGridGradient = selectedDayLogs.map(l => MoodColors[l.score as 1|2|3|4|5] || '#8A887E');
    if (selectedGridGradient.length === 1) {
      selectedGridGradient.push(selectedGridGradient[0]); // Duplicate for single color gradient
    }
  }

  let dailyLogsGradient = ['#EAE7D8', '#EAE7D8'];
  if (dailyLogs.length > 0) {
    dailyLogsGradient = dailyLogs.map(l => MoodColors[l.score as 1|2|3|4|5] || '#8A887E');
    if (dailyLogsGradient.length === 1) {
      dailyLogsGradient.push(dailyLogsGradient[0]);
    }
  }

  const formatHeaderDate = (dateStr: string) => {
    const ds = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00Z' : dateStr);
    const day = ds.getDate();
    const suffix = (day >= 11 && day <= 13) ? 'th' : ['st', 'nd', 'rd'][(day % 10) - 1] || 'th';
    return `${day}${suffix} ${ds.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  let displayTitle = '';
  if (viewMode === 'waves') {
    displayTitle = formatHeaderDate(currentDate.toISOString());
  } else {
    displayTitle = selectedGridDate 
      ? formatHeaderDate(selectedGridDate) 
      : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const shiftDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setActivePointIndex(null);
    setSelectedGridDate(null);
  };

  const handleExport = async () => {
    try {
      const allLogs = await getLogs();
      const csvHeader = "Date,Score,Note\n";
      const csvRows = allLogs.map(log => {
        const safeNote = log.note.replace(/"/g, '""');
        return `${log.date},${log.score},"${safeNote}"`;
      }).join('\n');
      const formattedString = csvHeader + csvRows;

      if (Platform.OS === 'web') {
        console.log(formattedString);
        alert('Logs exported to console (Web environment).');
        return;
      }

      const fileUri = FileSystem.cacheDirectory + 'Captains_Log.csv';
      await FileSystem.writeAsStringAsync(fileUri, formattedString);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // --- RENDERING ---

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.safe}>
        {/* Header Block */}
        <Header />

        {/* Toggle Block */}
        <View style={styles.toggleWrapper}>
          <SegmentedToggle
            options={['Waves', 'Surface']}
            selectedOption={viewMode === 'waves' ? 'Waves' : 'Surface'}
            onSelect={(val) => {
              setViewMode(val.toLowerCase() as 'waves' | 'surface');
              setActivePointIndex(null);
            }}
            variant="light"
          />
        </View>

        {/* Title Block */}
        <View style={styles.titleBlock}>
          <View style={styles.titleCenterContainer}>
            <View style={styles.titleRowWithChevrons}>
              {viewMode === 'waves' && (
                <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.chevronBtn}>
                  <Text style={styles.chevronText}>‹</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.title}>{displayTitle}</Text>
              {viewMode === 'waves' && (
                <TouchableOpacity onPress={() => shiftDate(1)} style={styles.chevronBtn}>
                  <Text style={styles.chevronText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.subtext}>Scroll up/down through your voyage</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Text style={styles.exportText}>EXPORT ⤓</Text>
          </TouchableOpacity>
        </View>

        {/* Chart Area */}
        <Animated.View style={{ width: SCREEN_WIDTH, height: CHART_HEIGHT, marginBottom: Spacing.xxl }}>
          {viewMode === 'waves' ? (
            <MemoizedWavesChart 
              data={dailyLogs} 
              scrubPosition={scrubPosition} 
              onActivePointChange={setActivePointIndex}
              activeNodeIdx={activeNodeIdx}
            />
          ) : (
            <>
             <View style={styles.daysHeader}>
               {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                 <Text key={d} style={styles.dayHeaderText}>{d}</Text>
               ))}
             </View>
             <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
               <View style={styles.gridContainer}>
                 {currentMonthDays.map(day => {
                 const dayStr = day.toString().padStart(2, '0');
                 const datePrefix = `${monthPrefix}-${dayStr}`;
                 const logsForDay = logs.filter(l => l.date.startsWith(datePrefix));
                 const isSelected = selectedGridDate === datePrefix;
                 
                 let gradColors = logsForDay.map(l => MoodColors[l.score as 1|2|3|4|5] || '#8A887E');
                 if (gradColors.length === 1) gradColors.push(gradColors[0]);

                 return (
                   <TouchableOpacity
                     key={day}
                     activeOpacity={0.8}
                     onPress={() => setSelectedGridDate(isSelected ? null : datePrefix)}
                     style={[
                       styles.dayBox,
                       logsForDay.length === 0 && styles.emptyDayBox,
                       isSelected && styles.selectedDayBox
                     ]}
                   >
                     {logsForDay.length > 0 && (
                       <ExpoLinearGradient
                         colors={gradColors as [string, string, ...string[]]}
                         start={{ x: 0, y: 0 }}
                         end={{ x: 0, y: 1 }}
                         style={StyleSheet.absoluteFillObject}
                       />
                     )}
                     
                     <View style={styles.dayTopRight}>
                       <Text style={logsForDay.length > 0 ? styles.dayText : styles.emptyDayText}>{day}</Text>
                     </View>

                     {/* Fake Inner Shadow for Pressed State */}
                     {isSelected && <View style={styles.pressedOverlay} />}
                   </TouchableOpacity>
                 );
               })}
             </View>
             
             <View style={{ height: Spacing.xl }} />

             <View style={styles.gridContainer}>
               {/* Next Month Scroll Preview */}
               {DUMMY_BOXES.map((gradColors, index) => (
                 <View key={`dummy-${index}`} style={[styles.dayBox, { opacity: 0.3 }]}>
                   <ExpoLinearGradient
                     colors={gradColors as [string, string, ...string[]]}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 0, y: 1 }}
                     style={StyleSheet.absoluteFillObject}
                   />
                 </View>
               ))}
             </View>
           </ScrollView>
           </>
          )}
        </Animated.View>

        {/* Bottom Card - Pattern Engine or Active Log */}
        <View style={styles.cardWrapper}>
          {viewMode === 'waves' ? (
            activeLog ? (
              <View style={[styles.logCard, { backgroundColor: MoodColors[activeLog.score] }]}>
                <Text style={styles.timeLabelTextCard}>
                  {new Date(activeLog.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()}
                </Text>
                <Text style={styles.logCardNote}>“{activeLog.note}”</Text>
              </View>
            ) : (
              <View style={[styles.logCard, { overflow: 'hidden' }]}>
                <ExpoLinearGradient
                  colors={dailyLogsGradient as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { opacity: dailyLogs.length > 0 ? 1 : 0.4 }]}
                />
                <Text style={[styles.patternCardText, { color: dailyLogs.length > 0 ? Colors.lightCanvas : Colors.textPrimaryLight }]}>
                  {getTrendQuote(dailyLogs)}
                </Text>
              </View>
            )
          ) : (
            // Surface Mode Bottom Area
            selectedGridDate ? (
              <View style={[styles.logCard, { overflow: 'hidden' }]}>
                <ExpoLinearGradient
                  colors={selectedGridGradient as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFillObject, { opacity: selectedDayLogs.length > 0 ? 1 : 0.4 }]}
                />
                <Text style={[styles.patternCardText, { color: selectedDayLogs.length > 0 ? Colors.lightCanvas : Colors.textPrimaryLight }]}>
                  {getTrendQuote(selectedDayLogs)}
                </Text>
              </View>
            ) : (
              <View style={styles.tallyContainer}>
                {[5, 4, 3, 2, 1].map(score => (
                  <View key={score} style={styles.tallyItem}>
                    <View style={[styles.tallyPebble, { backgroundColor: MoodColors[score as 1|2|3|4|5] }]} />
                    <Text style={styles.tallyText}>{moodCounts[score as 1|2|3|4|5]}</Text>
                  </View>
                ))}
              </View>
            )
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
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  toggleWrapper: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
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
    position: 'relative',
  },
  titleCenterContainer: {
    alignItems: 'center',
  },
  titleRowWithChevrons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs, // Push subtext down slightly
  },
  chevronBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontFamily: Typography.sans.light,
    fontSize: 28,
    color: Colors.textSecondary,
    lineHeight: 32, // Helps center the chevron vertically with Lora Serif text
  },
  title: {
    fontFamily: Typography.serif.medium,
    fontSize: 24,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
    lineHeight: 32,
    marginHorizontal: 12,
  },
  subtext: {
    fontFamily: Typography.serif.italic,
    fontSize: 11,
    color: '#8A887E',
    textAlign: 'center',
  },
  exportBtn: {
    position: 'absolute',
    right: Spacing.xl,
    top: 6,
  },
  exportText: {
    fontFamily: Typography.serif.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.textPrimaryLight,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    width: '100%',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  surfacePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    paddingHorizontal: Spacing.xl,
    marginTop: 'auto',
    marginBottom: 100, // Clear the custom tab bar
  },
  logCard: {
    padding: Spacing.xl,
    borderRadius: 16,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  patternCard: {
    backgroundColor: '#EAE7D8', // Light cream pattern base
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  logCardNote: {
    fontFamily: Typography.serif.italic,
    fontSize: 18,
    color: Colors.lightCanvas,
    textAlign: 'center',
    lineHeight: 24,
  },
  patternCardText: {
    fontFamily: Typography.serif.italic,
    fontSize: 18,
    color: Colors.textPrimaryLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  timeLabelTextCard: {
    fontFamily: Typography.sans.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  dayHeaderText: {
    fontFamily: Typography.sans.bold,
    fontSize: 10,
    color: Colors.textSecondary,
    width: (SCREEN_WIDTH - (Spacing.xl * 2) - (6 * 6)) / 7,
    textAlign: 'center',
    opacity: 0.8,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6, // Changed from 10 to 6 for tighter packing
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.xl,
  },
  dayBox: {
    width: (SCREEN_WIDTH - (Spacing.xl * 2) - (6 * 6)) / 7,
    aspectRatio: 1,
    borderRadius: Radii.sm, // 8px
    overflow: 'hidden',
  },
  dayTopRight: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  pressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.sm,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  emptyDayBox: {
    backgroundColor: '#E5E3D5', // Muted version of light canvas
  },
  selectedDayBox: {
    // Rely exclusively on pressedOverlay for visual update
  },
  indicatorLine: {
    width: 2,
    height: '100%',
    backgroundColor: Colors.textPrimaryLight,
    opacity: 0.3,
  },
  dayText: {
    fontFamily: Typography.sans.bold,
    fontSize: 11,
    color: Colors.textPrimaryDark,
  },
  emptyDayText: {
    fontFamily: Typography.sans.regular,
    fontSize: 11,
    color: Colors.textSecondary, // Standard contrast text
  },
  tallyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#EAE7D8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tallyItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tallyPebble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tallyText: {
    fontFamily: Typography.sans.bold,
    fontSize: 14,
    color: Colors.textPrimaryLight,
  },
});
