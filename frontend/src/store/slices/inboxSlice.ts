import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InboxNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

interface InboxState {
  items: InboxNotification[];
  unreadCount: number;
  loading: boolean;
  loaded: boolean;
}

const initialState: InboxState = {
  items: [],
  unreadCount: 0,
  loading: false,
  loaded: false,
};

const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setAll: (
      state,
      action: PayloadAction<{ notifications: InboxNotification[]; unreadCount: number }>
    ) => {
      const persisted = action.payload.notifications || [];
      const localEphemeral = state.items.filter((n) => {
        const id = n._id || '';
        return (
          id.startsWith('local-') ||
          id.startsWith('booking-') ||
          id.startsWith('booking-status-') ||
          id.startsWith('call-')
        );
      });

      const mergedEphemeral = localEphemeral.filter(
        (n) => !persisted.some((p) => p._id === n._id)
      );

      state.items = [...mergedEphemeral, ...persisted];
      const ephemeralUnread = mergedEphemeral.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0);
      state.unreadCount = Math.max(0, Number(action.payload.unreadCount || 0) + ephemeralUnread);
      state.loaded = true;
      state.loading = false;
    },
    prepend: (state, action: PayloadAction<InboxNotification>) => {
      const existing = state.items.find((n) => n._id === action.payload._id);
      if (existing) {
        return;
      }
      state.items.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    markReadLocal: (state, action: PayloadAction<string>) => {
      const item = state.items.find((n) => n._id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = Math.max(0, action.payload);
    },
    clear: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.loaded = false;
      state.loading = false;
    },
  },
});

export const { setLoading, setAll, prepend, markReadLocal, setUnreadCount, clear } =
  inboxSlice.actions;
export default inboxSlice.reducer;
