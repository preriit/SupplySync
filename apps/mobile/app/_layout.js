import { useEffect, useLayoutEffect, useRef } from 'react';
import { Text, TextInput } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FONT } from '../theme/typography';

SplashScreen.preventAutoHideAsync();

function applyInterTextDefaults() {
  const base = { fontFamily: FONT.regular };
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = Text.defaultProps.style
    ? [Text.defaultProps.style, base]
    : base;
  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.style = TextInput.defaultProps.style
    ? [TextInput.defaultProps.style, base]
    : base;
}

export default function RootLayout() {
  const defaultsApplied = useRef(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useLayoutEffect(() => {
    if (!fontsLoaded || defaultsApplied.current) return;
    defaultsApplied.current = true;
    applyInterTextDefaults();
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaProvider>
  );
}
