import { create } from "zustand";

interface ProfileFormState {
  data: Record<string, string | undefined>;
  setData: (key: string, value: string | undefined) => void;
  resetData: () => void;
}

export const useProfileFormStore = create<ProfileFormState>((set) => ({
  data: {},
  setData: (key, value) =>
    set((state) => ({ data: { ...state.data, [key]: value } })),
  resetData: () => set({ data: {} }),
}));
