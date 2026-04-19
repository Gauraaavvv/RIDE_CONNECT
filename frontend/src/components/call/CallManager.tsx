import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { getSocket } from '../../services/socket';
import CallModal from './CallModal';
import { closeCall, showIncomingCall } from '../../store/slices/callSlice';

const CallManager: React.FC = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const userName = useSelector((state: RootState) => state.auth.user?.name);
  const callState = useSelector((state: RootState) => state.call);

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;

    const onIncomingCall = (data: any) => {
      if (!data?.callerId) return;
      dispatch(showIncomingCall({
        callerId: String(data.callerId),
        callerName: data.callerName,
        callType: data.callType,
        signalData: data.signalData,
        entityId: data.entityId,
        entityType: data.entityType,
      }));
    };

    const onCallEnded = () => {
      dispatch(closeCall());
    };

    const onCallRejected = () => {
      dispatch(closeCall());
    };

    socket.on('incoming_call', onIncomingCall);
    socket.on('call_ended', onCallEnded);
    socket.on('call_rejected', onCallRejected);

    return () => {
      socket.off('incoming_call', onIncomingCall);
      socket.off('call_ended', onCallEnded);
      socket.off('call_rejected', onCallRejected);
    };
  }, [dispatch, userId]);

  if (!userId) return null;

  const peerId = callState.callerId;
  const socket = getSocket();

  return (
    <CallModal
      isOpen={callState.isOpen}
      isIncoming={callState.isIncoming}
      callerName={callState.callerName || undefined}
      currentUserId={userId}
      currentUserName={userName || undefined}
      peerUserId={peerId || ''}
      callType={callState.callType}
      incomingSignalData={callState.signalData}
      entityId={callState.entityId}
      entityType={callState.entityType}
      onAccept={() => {
        // CallModal handles WebRTC accept + signaling; keep modal open.
      }}
      onReject={() => {
        if (socket && peerId) {
          if (callState.isIncoming) {
            socket.emit('reject_call', { callerId: peerId, receiverId: userId });
          } else {
            // Cancel outgoing call
            socket.emit('end_call', { callerId: userId, receiverId: peerId });
          }
        }
        dispatch(closeCall());
      }}
      onEndCall={() => {
        if (socket && peerId) {
          if (callState.isIncoming) {
            socket.emit('end_call', { callerId: peerId, receiverId: userId });
          } else {
            socket.emit('end_call', { callerId: userId, receiverId: peerId });
          }
        }
        dispatch(closeCall());
      }}
    />
  );
};

export default CallManager;
