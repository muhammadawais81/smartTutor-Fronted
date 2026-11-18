import React, {memo} from 'react';
import {Platform, StatusBar, StatusBarStyle, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export const APP_STATUS_BAR_COLOR = '#10284C';

type AppStatusBarProps = {
  backgroundColor?: string;
  barStyle?: StatusBarStyle;
};

const AppStatusBar = ({
  backgroundColor = APP_STATUS_BAR_COLOR,
  barStyle = 'light-content',
}: AppStatusBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar
        animated
        backgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
        barStyle={barStyle}
        translucent={Platform.OS === 'android'}
      />
      <View
        pointerEvents="none"
        style={[styles.statusBarBackground, {height: insets.top, backgroundColor}]}
      />
    </>
  );
};

export default memo(AppStatusBar);

const styles = StyleSheet.create({
  statusBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
});