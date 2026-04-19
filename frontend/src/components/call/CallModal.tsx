import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { getSocket, ensureSocketJoined } from '../../services/socket';
import { addNotification } from '../../store/slices/notificationSlice';

interface CallModalProps {
  isOpen: boolean;
  isIncoming: boolean;
  callerName?: string;
  currentUserId: string;
  currentUserName?: string;
  peerUserId: string;
  callType?: 'audio' | 'video';
  incomingSignalData?: any;
  entityId?: string | null;
  entityType?: string | null;
  onAccept?: () => void;
  onReject: () => void;
  onEndCall: () => void;
}

const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  isIncoming,
  callerName,
  currentUserId,
  currentUserName,
  peerUserId,
  callType = 'audio',
  incomingSignalData,
  entityId,
  entityType,
  onAccept,
  onReject,
  onEndCall
}) => {
  const dispatch = useDispatch();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);

  const cleanupConnection = () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      // noop
    }
    localStreamRef.current = null;

    try {
      peerConnectionRef.current?.close();
    } catch (e) {
      // noop
    }
    peerConnectionRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsConnected(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    startedRef.current = false;
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupConnection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const setupPeerConnection = (socket: any) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', { targetUserId: peerUserId, candidate: event.candidate });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.warn('WebRTC connection dropped. State:', state);
        dispatch(addNotification({
          type: 'error',
          title: 'Call Dropped',
          message: 'Connection was lost.',
          duration: 4000
        }));
        handleEndCall();
      }
    };

    return peerConnection;
  };

  useEffect(() => {
    if (!isOpen) return;
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket) return;

    const onIceCandidate = async (data: any) => {
      if (!data?.candidate) return;
      if (data?.senderId && String(data.senderId) !== String(peerUserId)) return;
      try {
        await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Failed to add ICE candidate:', e);
      }
    };

    const onOffer = async (data: any) => {
      if (!data?.offer) return;
      if (data?.senderId && String(data.senderId) !== String(peerUserId)) return;
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnectionRef.current?.createAnswer();
        if (answer) {
          await peerConnectionRef.current?.setLocalDescription(answer);
          socket.emit('answer', { targetUserId: peerUserId, answer });
        }
      } catch (e) {
        console.error('Failed to handle offer:', e);
      }
    };

    const onAnswer = async (data: any) => {
      if (!data?.answer) return;
      if (data?.senderId && String(data.senderId) !== String(peerUserId)) return;
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (e) {
        console.error('Failed to handle answer:', e);
      }
    };

    socket.on('ice_candidate', onIceCandidate);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('call_accepted', async (data: any) => {
      // Used for outgoing calls (server sends answer back via call_accepted)
      if (!data?.signalData) return;
      if (data?.receiverId && String(data.receiverId) !== String(peerUserId)) return;
      try {
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.signalData));
        setIsConnected(true);
      } catch (e) {
        console.error('Failed to apply call_accepted signalData:', e);
      }
    });

    return () => {
      socket.off('ice_candidate', onIceCandidate);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('call_accepted');
    };
  }, [isOpen, peerUserId]);

  useEffect(() => {
    if (!isOpen) {
      startedRef.current = false;
      return;
    }
    if (isIncoming) {
      startedRef.current = false;
      return;
    }
    if (!peerUserId || !currentUserId) {
      return;
    }
    if (startedRef.current) {
      return;
    }

    const socket = socketRef.current || getSocket();
    if (!socket) {
      return;
    }
    startedRef.current = true;

    (async () => {
      try {
        // Ensure server associates this socket with the current user room before signaling
        await ensureSocketJoined(currentUserId);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const peerConnection = setupPeerConnection(socket);
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('call_user', {
          receiverId: peerUserId,
          callerName: currentUserName || 'Someone',
          callType,
          signalData: offer,
          entityId: entityId || null,
          entityType: entityType || null
        });
      } catch (e: any) {
        console.error('Failed to start outgoing call:', e);
        startedRef.current = false;
        
        let message = 'Could not start call.';
        if (e.name === 'NotAllowedError') {
           message = 'Microphone/Camera permission denied.';
        } else if (e.name === 'NotFoundError') {
           message = 'No microphone or camera found.';
        }
        dispatch(addNotification({
           type: 'error',
           title: 'Call Error',
           message,
           duration: 4000
        }));

        onReject();
      }
    })();
  }, [callType, currentUserId, currentUserName, entityId, entityType, isIncoming, isOpen, onReject, peerUserId, dispatch]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      await ensureSocketJoined(currentUserId);
      const socket = socketRef.current || getSocket();
      
      const peerConnection = setupPeerConnection(socket);

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // If this is an incoming call with an offer attached, answer it.
      if (incomingSignalData && incomingSignalData.type) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingSignalData));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        if (socket) {
          socket.emit('accept_call', {
            callerId: peerUserId,
            receiverId: currentUserId,
            signalData: answer
          });
        }
      }

      setIsConnected(true);
      onAccept?.();
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      
      let message = 'Could not access camera/microphone';
      if (error.name === 'NotAllowedError') {
         message = 'Microphone/Camera permission denied.';
      } else if (error.name === 'NotFoundError') {
         message = 'No microphone or camera found.';
      }
      dispatch(addNotification({
         type: 'error',
         title: 'Call Error',
         message,
         duration: 4000
      }));
      
      onReject();
    }
  };

  const handleEndCall = () => {
    cleanupConnection();
    onEndCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      >
        {/* Remote Video */}
        <div className="absolute inset-0 bg-slate-900">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center">
                <Phone className="w-12 h-12 text-slate-600" />
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        {isConnected && (
          <div className="absolute bottom-32 right-8 w-48 h-32 bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Call Info */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
          <h2 className="text-white text-2xl font-semibold mb-2">
            {isIncoming ? callerName : 'Calling...'}
          </h2>
          {isConnected && (
            <p className="text-white/80">{formatDuration(callDuration)}</p>
          )}
          {!isConnected && !isIncoming && (
            <p className="text-white/60 animate-pulse">Connecting...</p>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          {isIncoming && !isConnected ? (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAccept}
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
              >
                <Phone className="w-8 h-8 text-white" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReject}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-red-500' : 'bg-slate-700'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOff ? 'bg-red-500' : 'bg-slate-700'
                }`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallModal;
