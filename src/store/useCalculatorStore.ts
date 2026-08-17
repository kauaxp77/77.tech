import { create } from "zustand";

export interface CalculatorAnswers {
    projectType: string;
    experienceLevel: string;
    complexity: string;
    infrastructure: string;
    deadline: string;
    challengeDescription: string;
    leadName: string;
    leadEmail: string;
    leadPhone: string;
    leadCompany: string;
}

interface CalculatorState {
    step: number;
    answers: Partial<CalculatorAnswers>;
    setAnswer: (key: keyof CalculatorAnswers, value: string) => void;
    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set) => ({
    step: 1,
    answers: {},
    setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
    nextStep: () => set((state) => ({ step: state.step + 1 })),
    prevStep: () => set((state) => ({ step: Math.max(1, state.step - 1) })),
    reset: () => set({ step: 1, answers: {} }),
}));
