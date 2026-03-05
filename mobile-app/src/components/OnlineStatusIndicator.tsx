import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Text,
} from 'react-native';
import { Wifi } from 'lucide-react-native';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  showBorder?: boolean;
  showAnimation?: boolean;
}

type SizeConfig = {
  dotSize: number;
  fontSize: number;
  borderWidth: number;
  pulseSize: number;
  iconSize: number;
};

const sizeConfigs: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: {
    dotSize: 8,
    fontSize: 11,
    borderWidth: 1.5,
    pulseSize: 12,
    iconSize: 10,
  },
  md: {
    dotSize: 12,
    fontSize: 12,
    borderWidth: 2,
    pulseSize: 16,
    iconSize: 12,
  },
  lg: {
    dotSize: 16,
    fontSize: 14,
    borderWidth: 2.5,
    pulseSize: 22,
    iconSize: 14,
  },
};

const TEAL_ONLINE = '#0F766E';
const GRAY_OFFLINE = '#9CA3AF';

export default function OnlineStatusIndicator({
  isOnline,
  size = 'md',
  showLabel = true,
  showIcon = true,
  showBorder = true,
  showAnimation = true,
}: OnlineStatusIndicatorProps) {
  const config = sizeConfigs[size];
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline || !showAnimation) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [isOnline, showAnimation, pulseAnim, opacityAnim]);

  const dotColor = isOnline ? TEAL_ONLINE : GRAY_OFFLINE;
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, config.pulseSize / config.dotSize],
  });

  const accessibilityLabel = isOnline
    ? 'User is online'
    : 'User is offline';

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="summary"
    >
      {isOnline && showAnimation && (
        <Animated.View
          style={[
            styles.pulse,
            {
              width: config.pulseSize,
              height: config.pulseSize,
              borderRadius: config.pulseSize / 2,
              opacity: opacityAnim,
              transform: [{ scale: pulseScale }],
              backgroundColor: dotColor,
            },
          ]}
          pointerEvents="none"
        />
      )}

      <View
        style={[
          styles.dot,
          {
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: config.dotSize / 2,
            backgroundColor: dotColor,
            borderWidth: showBorder ? config.borderWidth : 0,
            borderColor: '#FFFFFF',
          },
        ]}
      >
        {showIcon && size !== 'sm' && (
          <View style={styles.iconContainer}>
            <Wifi size={config.iconSize} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        )}
      </View>

      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: config.fontSize,
              color: dotColor,
            },
          ]}
        >
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pulse: {
    position: 'absolute',
  },
  dot: {
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
    letterSpacing: -0.3,
  },
});