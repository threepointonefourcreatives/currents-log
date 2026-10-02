/**
 * Root Layout — Font Loading, Providers & Startup Error Boundary
 */
import 'react-native-gesture-handler';

import React, { Component, useEffect, useState, ErrorInfo, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { initDB } from '../src/utils/db';
import { saveProfile, loadProfile } from '../src/utils/profileStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CurrentLogo from '../components/CurrentLogo';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
  Lora_600SemiBold_Italic,
  Lora_700Bold,
  Lora_700Bold_Italic,
} from '@expo-google-fonts/lora';
import {
  Nunito_200ExtraLight,
  Nunito_300Light,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Global Startup Error Boundary ───────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class StartupErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[StartupErrorBoundary] Uncaught startup error:', error, errorInfo);
    this.setState({ errorInfo });
    SplashScreen.hideAsync().catch(() => {});
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer} testID="startup-error-screen">
          <View style={styles.errorCard}>
            <CurrentLogo size={70} />
            <Text style={styles.errorTitle}>Application Startup Error</Text>
            <Text style={styles.errorSub}>
              Current hit an unexpected issue while loading. Details below:
            </Text>
            <ScrollView style={styles.errorBox} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.errorText}>
                {this.state.error?.toString() || 'Unknown runtime exception'}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
              )}
            </ScrollView>
            <Pressable style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryText}>RETRY</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Root Layout Core ─────────────────────────────────────────

function RootLayoutCore() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_500Medium_Italic,
    Lora_600SemiBold,
    Lora_600SemiBold_Italic,
    Lora_700Bold,
    Lora_700Bold_Italic,
    Nunito_200ExtraLight,
    Nunito_300Light,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  // Force-proceed after timeout to prevent infinite blank splash screen
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const safeStartup = async () => {
      try {
        await initDB();
      } catch (err) {
        console.warn('[RootLayout] Database initialization failed safely:', err);
      }

      try {
        await saveProfile({ name: 'Captain Test', mantra: 'Smooth sailing' });
        await loadProfile();
      } catch (err) {
        console.warn('[RootLayout] Profile storage test failed safely:', err);
      }
    };

    safeStartup();
  }, []);

  const ready = fontsLoaded || !!fontError || timedOut;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#EC4724" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F9F8F1' },
            animation: 'fade',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── Default Export with Boundary ─────────────────────────────

export default function RootLayout() {
  return (
    <StartupErrorBoundary>
      <RootLayoutCore />
    </StartupErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F9F8F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F9F8F1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EC4724',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    color: '#555555',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    maxHeight: 180,
    width: '100%',
    backgroundColor: '#FFF5F2',
    borderColor: 'rgba(236,71,36,0.2)',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#900',
  },
  stackText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#EC4724',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
});

