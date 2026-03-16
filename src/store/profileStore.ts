import { create } from 'zustand'
import type { UserProfile } from '../types'
import { supabase } from '../lib/supabase'

interface ProfileState {
  profile: UserProfile | null
  loading: boolean
  setProfile: (profile: UserProfile | null) => void
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId: string) => {
    if (!get().profile) set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      set({ profile: data ?? null })
    } finally {
      set({ loading: false })
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { profile } = get()
    if (!profile) return

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) throw error
    set({ profile: data })
  },
}))
