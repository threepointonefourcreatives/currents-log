import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://eroagrpowfoeqaqwvfnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyb2FncnBvd2ZvZXFhcXd2Zm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3OTc0NDQsImV4cCI6MjA5MDM3MzQ0NH0.pGHO9ZDCpBoXP66WFnmbJT8mqWIQXt3sdeSvIYjhl_w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
