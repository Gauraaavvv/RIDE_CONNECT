import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import ridesReducer from './slices/ridesSlice';
import notificationReducer from './slices/notificationSlice';
import inboxReducer from './slices/inboxSlice';
import callReducer from './slices/callSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rides: ridesReducer,
    notification: notificationReducer,
    inbox: inboxReducer,
    call: callReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 
