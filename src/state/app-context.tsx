import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cyberpath.learner.v1';

export type ExperienceLevel = 'explorer' | 'it-professional' | 'security-practitioner' | 'leader';
export type LearningGoal = 'explore' | 'first-role' | 'specialize' | 'promotion' | 'interview';

export interface LearnerProfile {
  name: string;
  onboarded: boolean;
  targetRoleIds: string[];
  primaryRoleId: string;
  experience: ExperienceLevel;
  goal: LearningGoal;
  weeklyHours: number;
}

export interface LearningProgress {
  completedLessonIds: string[];
  scenarioScores: Record<string, number>;
  scenarioAttempts: Record<string, number>;
  minutesLearned: number;
  xp: number;
  streakDays: number;
  lastActiveAt?: string;
}

interface PersistedState {
  profile: LearnerProfile;
  progress: LearningProgress;
}

interface AppContextValue extends PersistedState {
  ready: boolean;
  updateProfile: (next: Partial<LearnerProfile>) => void;
  finishOnboarding: (next: Partial<LearnerProfile>) => void;
  completeLesson: (lessonId: string, minutes?: number) => void;
  recordScenario: (scenarioId: string, score: number) => void;
  resetLearningData: () => Promise<void>;
}

const initialProfile: LearnerProfile = {
  name: '',
  onboarded: false,
  targetRoleIds: ['soc-analyst'],
  primaryRoleId: 'soc-analyst',
  experience: 'explorer',
  goal: 'first-role',
  weeklyHours: 5,
};

const initialProgress: LearningProgress = {
  completedLessonIds: [],
  scenarioScores: {},
  scenarioAttempts: {},
  minutesLearned: 0,
  xp: 0,
  streakDays: 1,
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState(initialProfile);
  const [progress, setProgress] = useState(initialProgress);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed.profile) setProfile({ ...initialProfile, ...parsed.profile });
        if (parsed.progress) setProgress({ ...initialProgress, ...parsed.progress });
      })
      .catch(() => undefined)
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, progress })).catch(() => undefined);
  }, [profile, progress, ready]);

  const updateProfile = useCallback((next: Partial<LearnerProfile>) => {
    setProfile((current) => ({ ...current, ...next }));
  }, []);

  const finishOnboarding = useCallback((next: Partial<LearnerProfile>) => {
    setProfile((current) => ({ ...current, ...next, onboarded: true }));
  }, []);

  const completeLesson = useCallback((lessonId: string, minutes = 8) => {
    setProgress((current) => {
      if (current.completedLessonIds.includes(lessonId)) return current;
      return {
        ...current,
        completedLessonIds: [...current.completedLessonIds, lessonId],
        minutesLearned: current.minutesLearned + minutes,
        xp: current.xp + 80,
        lastActiveAt: new Date().toISOString(),
      };
    });
  }, []);

  const recordScenario = useCallback((scenarioId: string, score: number) => {
    setProgress((current) => ({
      ...current,
      scenarioScores: {
        ...current.scenarioScores,
        [scenarioId]: Math.max(current.scenarioScores[scenarioId] ?? 0, score),
      },
      scenarioAttempts: {
        ...current.scenarioAttempts,
        [scenarioId]: (current.scenarioAttempts[scenarioId] ?? 0) + 1,
      },
      minutesLearned: current.minutesLearned + 12,
      xp: current.xp + Math.round(score * 1.5),
      lastActiveAt: new Date().toISOString(),
    }));
  }, []);

  const resetLearningData = useCallback(async () => {
    setProfile(initialProfile);
    setProgress(initialProgress);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      profile,
      progress,
      updateProfile,
      finishOnboarding,
      completeLesson,
      recordScenario,
      resetLearningData,
    }),
    [ready, profile, progress, updateProfile, finishOnboarding, completeLesson, recordScenario, resetLearningData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used within AppProvider');
  return value;
}

