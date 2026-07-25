import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

import { AppColors } from '@/constants/theme';
import { normalizeLipSyncLevel } from '@/domain/lip-sync';
import { type VoicePersonaId, type VoiceSessionState } from '@/domain/voice';

interface AvatarFrameSet {
  neutral: ImageSource;
  ah: ImageSource;
  oh: ImageSource;
  mouth: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

const avatarFrames: Record<VoicePersonaId, AvatarFrameSet> = {
  maya: {
    neutral: require('../../../assets/images/tutors/maya.png'),
    ah: require('../../../assets/images/tutors/maya-mouth-ah.png'),
    oh: require('../../../assets/images/tutors/maya-mouth-oh.png'),
    mouth: { left: 0.37, top: 0.445, width: 0.26, height: 0.145 },
  },
  daniel: {
    neutral: require('../../../assets/images/tutors/daniel.png'),
    ah: require('../../../assets/images/tutors/daniel-mouth-ah.png'),
    oh: require('../../../assets/images/tutors/daniel-mouth-oh.png'),
    mouth: { left: 0.38, top: 0.44, width: 0.24, height: 0.16 },
  },
};

export function ProfessionalAvatar({
  personaId,
  state,
  size = 260,
  audioLevel,
  speechCue = 0,
}: {
  personaId: VoicePersonaId;
  state: VoiceSessionState;
  size?: number;
  audioLevel?: number;
  speechCue?: number;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mouth] = useState(() => new Animated.Value(0));
  const [roundness] = useState(() => new Animated.Value(0));
  const [boundaryAccent] = useState(() => new Animated.Value(0));
  const [halo] = useState(() => new Animated.Value(0.25));
  const audioShapeStep = useRef(0);
  const speaking = state === 'speaking';
  const listening = state === 'listening';
  const active = speaking || listening || state === 'thinking' || state === 'connecting';
  const normalizedAudioLevel = normalizeLipSyncLevel(audioLevel);
  const hasAudioLevel = normalizedAudioLevel !== undefined;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    mouth.stopAnimation();
    roundness.stopAnimation();
    boundaryAccent.stopAnimation();

    if (!speaking || reduceMotion) {
      boundaryAccent.setValue(0);
      const close = Animated.parallel([
        Animated.timing(mouth, {
          toValue: 0,
          duration: reduceMotion ? 0 : 95,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(roundness, {
          toValue: 0,
          duration: reduceMotion ? 0 : 95,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      close.start();
      return () => close.stop();
    }

    if (hasAudioLevel) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(mouth, { toValue: 0.72, duration: 115, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(roundness, { toValue: 0.08, duration: 115, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(mouth, { toValue: 0.18, duration: 105, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(mouth, { toValue: 0.58, duration: 125, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(roundness, { toValue: 0.92, duration: 125, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(mouth, { toValue: 0.08, duration: 135, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(roundness, { toValue: 0.1, duration: 135, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [
    boundaryAccent,
    hasAudioLevel,
    mouth,
    reduceMotion,
    roundness,
    speaking,
  ]);

  useEffect(() => {
    if (
      !speaking ||
      reduceMotion ||
      normalizedAudioLevel === undefined
    ) {
      return;
    }

    audioShapeStep.current += 1;
    const rounded =
      normalizedAudioLevel > 0.12 &&
      Math.floor(audioShapeStep.current / 4) % 3 === 2;
    const animation = Animated.parallel([
      Animated.timing(mouth, {
        toValue: normalizedAudioLevel,
        duration: normalizedAudioLevel > 0.16 ? 48 : 105,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(roundness, {
        toValue: rounded ? 0.88 : 0.08,
        duration: 70,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [
    mouth,
    normalizedAudioLevel,
    reduceMotion,
    roundness,
    speaking,
  ]);

  useEffect(() => {
    if (!speechCue || !speaking || reduceMotion) return;

    boundaryAccent.stopAnimation();
    boundaryAccent.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(boundaryAccent, {
        toValue: 1,
        duration: 48,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boundaryAccent, {
        toValue: 0,
        duration: 130,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [boundaryAccent, reduceMotion, speaking, speechCue]);

  useEffect(() => {
    halo.stopAnimation();
    halo.setValue(active ? 0.35 : 0.18);
    if (!active || reduceMotion) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 0.95, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0.35, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, halo, reduceMotion]);

  const frames = avatarFrames[personaId];
  const placement = frames.mouth;
  const haloColor = state === 'error' ? AppColors.red : listening ? AppColors.cyan : AppColors.mint;
  const openness = Animated.add(
    mouth,
    Animated.multiply(boundaryAccent, 0.28),
  ).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const ahOpacity = Animated.multiply(
    openness,
    roundness.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  );
  const ohOpacity = Animated.multiply(openness, roundness);
  const mouthLeft = size * placement.left;
  const mouthTop = size * placement.top;
  const mouthWidth = size * placement.width;
  const mouthHeight = size * placement.height;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${personaId === 'maya' ? 'Maya' : 'Daniel'}, photoreal AI cybersecurity tutor`}
      style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.halo,
          {
            borderColor: haloColor,
            opacity: halo,
            transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.035] }) }],
          },
        ]}
      />
      <View style={[styles.frame, { borderRadius: size / 2.75 }]}>
        <Image source={frames.neutral} contentFit="cover" transition={220} style={styles.image} />
        <View pointerEvents="none" style={styles.depthShade} />
        <View
          pointerEvents="none"
          style={[
            styles.mouthRegion,
            {
              left: mouthLeft,
              top: mouthTop,
              width: mouthWidth,
              height: mouthHeight,
              borderRadius: mouthHeight * 0.28,
            },
          ]}>
          <Animated.View style={[styles.mouthFrame, { opacity: ahOpacity }]}>
            <Image
              source={frames.ah}
              contentFit="fill"
              style={styles.mouthImage}
            />
          </Animated.View>
          <Animated.View style={[styles.mouthFrame, { opacity: ohOpacity }]}>
            <Image
              source={frames.oh}
              contentFit="fill"
              style={styles.mouthImage}
            />
          </Animated.View>
        </View>
      </View>
      <View style={[styles.statusDot, { backgroundColor: haloColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    inset: 0,
    borderWidth: 3,
    borderRadius: 999,
    shadowColor: AppColors.mint,
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  frame: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AppColors.borderBright,
    backgroundColor: AppColors.panel,
  },
  depthShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(4, 17, 22, 0.03)',
  },
  image: {
    position: 'absolute',
    inset: 0,
  },
  mouthRegion: {
    position: 'absolute',
    overflow: 'hidden',
  },
  mouthFrame: {
    position: 'absolute',
    inset: 0,
  },
  mouthImage: {
    position: 'absolute',
    inset: 0,
  },
  statusDot: {
    position: 'absolute',
    right: 10,
    bottom: 13,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 4,
    borderColor: AppColors.ink,
  },
});
