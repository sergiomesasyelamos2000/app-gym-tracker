import AsyncStorage from '@react-native-async-storage/async-storage';

async function debugCache() {
  console.log('\n=== DEBUG CACHE ===\n');
  
  // Check all routine-related keys
  const allKeys = await AsyncStorage.getAllKeys();
  const routineKeys = allKeys.filter(key => 
    key.includes('routine') || key.includes('exercise') || key.includes('session')
  );
  
  console.log('Found keys:', routineKeys);
  
  for (const key of routineKeys) {
    const data = await AsyncStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          console.log(`\n${key}: Array with ${parsed.length} items`);
          if (parsed[0]) {
            console.log('First item:', JSON.stringify(parsed[0], null, 2).substring(0, 500));
          }
        } else {
          console.log(`\n${key}:`, JSON.stringify(parsed, null, 2).substring(0, 500));
        }
      } catch (e) {
        console.log(`${key}: Parse error`);
      }
    }
  }
  
  console.log('\n=== END DEBUG ===\n');
}

debugCache();
