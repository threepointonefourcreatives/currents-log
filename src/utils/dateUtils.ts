import { Alert } from 'react-native';

export const parseSafeDate = (dateStr: string | undefined | null): Date => {
  if (!dateStr) return new Date(0); // Epoch fallback for completely empty strings

  let parsedDate = new Date(dateStr);

  // If parsed cleanly and is valid, return it
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  // Attempt to repair common SQLite or malformed formats
  try {
    // Convert 'YYYY-MM-DD HH:MM:SS' to strict ISO 'YYYY-MM-DDTHH:MM:SSZ'
    let repairedStr = dateStr.trim();
    
    if (repairedStr.includes(' ') && !repairedStr.includes('T')) {
      repairedStr = repairedStr.replace(' ', 'T');
      if (!repairedStr.endsWith('Z') && !repairedStr.includes('+') && !repairedStr.includes('-')) {
        // If there's no timezone info, assume UTC by appending Z to ensure consistent parsing
        repairedStr += 'Z';
      }
    }

    parsedDate = new Date(repairedStr);
    
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {
    console.warn(`[DateUtils] Error repairing date string: ${dateStr}`, e);
  }

  // Ultimate fallback to Epoch to prevent polluting current day and avoid breaking the map loops
  console.warn(`[DateUtils] Using epoch fallback for unparseable date string: ${dateStr}`);
  Alert.alert("Parser Fallback Triggered", "Raw string was: " + dateStr);
  return new Date(0);
};

export const normalizeDateString = (dateStr: string): string => {
  // Returns a strictly valid ISO string, or the epoch ISO string in case of failure
  return parseSafeDate(dateStr).toISOString();
};
