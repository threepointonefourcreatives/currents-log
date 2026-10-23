// Pretend this build was made with real (fake-valued) Supabase settings.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://unit-test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'unit-test-anon-key';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// In-memory stand-in for the Android Keystore-backed SecureStore.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => { store.set(k, v); }),
    deleteItemAsync: jest.fn(async (k) => { store.delete(k); }),
  };
});

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n) => new Uint8Array(require('crypto').randomBytes(n)),
}));

// Native Skia / Reanimated can't run in Node.
jest.mock('@shopify/react-native-skia', () => {
  const Null = () => null;
  return new Proxy({}, {
    get: (_t, key) => {
      if (key === '__esModule') return true;
      if (key === 'vec') return (x = 0, y = 0) => ({ x, y });
      if (key === 'rrect' || key === 'rect') return () => ({});
      if (key === 'Skia') return { Path: { Make: () => ({ moveTo() {}, lineTo() {}, cubicTo() {}, close() {}, quadTo() {}, addRRect() {} }) }, XYWHRect: () => ({}), RRectXY: () => ({}) };
      return Null;
    },
  });
});
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Fake SQLCipher database: records every statement so tests can inspect them.
jest.mock('expo-sqlite', () => {
  const dbs = {};
  const make = (name) => {
    const db = {
      name, exec: [], rows: [],
      execAsync: jest.fn(async (sql) => { db.exec.push(sql); }),
      runAsync: jest.fn(async (sql, ...args) => { db.exec.push(sql); if (/INSERT INTO logs/.test(sql)) db.rows.push({ id: db.rows.length + 1, date: args[0], score: args[1], note: args[2] }); }),
      getFirstAsync: jest.fn(async (sql) => (/FROM meta/.test(sql) ? null : /sqlite_master WHERE type/.test(sql) ? null : { 'count(*)': 0 })),
      getAllAsync: jest.fn(async () => db.rows),
      withTransactionAsync: jest.fn(async (fn) => fn()),
      closeAsync: jest.fn(async () => {}),
    };
    return db;
  };
  return {
    __dbs: dbs,
    openDatabaseAsync: jest.fn(async (name) => (dbs[name] = dbs[name] || make(name))),
    deleteDatabaseAsync: jest.fn(async (name) => { delete dbs[name]; }),
  };
});

// Fake Supabase auth. Tests set global.__session to simulate a signed-in user.
global.__session = null;
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url) => {
    if (!url) throw new Error('supabaseUrl is required.');
    return {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: global.__session } })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
        signInWithOtp: jest.fn(async () => ({ error: null })),
        verifyOtp: jest.fn(async () => ({ data: { session: null }, error: { message: 'Token has expired or is invalid' } })),
        signOut: jest.fn(async () => ({ error: null })),
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
      },
    };
  }),
}));
