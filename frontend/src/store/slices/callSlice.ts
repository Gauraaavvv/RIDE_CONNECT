import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type CallType = 'audio' | 'video';

export interface IncomingCallPayload {
  callerId: string;
  callerName?: string;
  callType?: CallType;
  signalData?: any;
  entityId?: string | null;
  entityType?: string | null;
}

export interface OutgoingCallPayload {
  peerUserId: string;
  peerName?: string;
  callType?: CallType;
  entityId?: string | null;
  entityType?: string | null;
}

interface CallState {
  isOpen: boolean;
  isIncoming: boolean;
  callerId: string | null;
  callerName: string | null;
  callType: CallType;
  signalData: any;
  entityId: string | null;
  entityType: string | null;
}

const initialState: CallState = {
  isOpen: false,
  isIncoming: false,
  callerId: null,
  callerName: null,
  callType: 'audio',
  signalData: null,
  entityId: null,
  entityType: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    showIncomingCall: (state, action: PayloadAction<IncomingCallPayload>) => {
      state.isOpen = true;
      state.isIncoming = true;
      state.callerId = action.payload.callerId;
      state.callerName = action.payload.callerName || 'Unknown';
      state.callType = action.payload.callType || 'audio';
      state.signalData = action.payload.signalData || null;
      state.entityId = (action.payload.entityId as string) || null;
      state.entityType = (action.payload.entityType as string) || null;
    },
    showOutgoingCall: (state, action: PayloadAction<OutgoingCallPayload>) => {
      state.isOpen = true;
      state.isIncoming = false;
      // Reuse `callerId` field as "remote peer id" for outgoing calls.
      state.callerId = action.payload.peerUserId;
      state.callerName = action.payload.peerName || 'User';
      state.callType = action.payload.callType || 'audio';
      state.signalData = null;
      state.entityId = (action.payload.entityId as string) || null;
      state.entityType = (action.payload.entityType as string) || null;
    },
    closeCall: () => initialState,
  },
});

export const { showIncomingCall, showOutgoingCall, closeCall } = callSlice.actions;
export default callSlice.reducer;
