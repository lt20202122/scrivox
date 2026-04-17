import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { loadPersistedFonts } from '../services/fontStorage';
import { useAppStore } from '../store/useAppStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setCustomFonts = useAppStore((s) => s.setCustomFonts);

  const [fontsLoaded] = useFonts({
    'Caveat-Regular': require('../assets/fonts/Caveat-Regular.ttf'),
    'Kalam-Regular': require('../assets/fonts/Kalam-Regular.ttf'),
    'HomemadeApple-Regular': require('../assets/fonts/HomemadeApple-Regular.ttf'),
    'IndieFlower-Regular': require('../assets/fonts/IndieFlower-Regular.ttf'),
    'ShadowsIntoLight-Regular': require('../assets/fonts/ShadowsIntoLight-Regular.ttf'),
    'PatrickHand-Regular': require('../assets/fonts/PatrickHand-Regular.ttf'),
    'ArchitectsDaughter-Regular': require('../assets/fonts/ArchitectsDaughter-Regular.ttf'),
    'RockSalt-Regular': require('../assets/fonts/RockSalt-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    loadPersistedFonts().then((fonts) => {
      setCustomFonts(fonts);
    });
  }, [setCustomFonts]);

  if (!fontsLoaded) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="dictation/document"
        options={{ title: 'Document', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="dictation/quick"
        options={{
          title: 'Quick Mode',
          presentation: 'modal',
          headerBackTitle: 'Close',
        }}
      />
      <Stack.Screen
        name="export/preview"
        options={{ title: 'Export', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="font-workshop/index"
        options={{ title: 'Font Workshop', headerBackTitle: 'Fonts' }}
      />
    </Stack>
  );
}
