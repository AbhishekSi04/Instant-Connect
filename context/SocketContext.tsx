import { OngoingCall, Participants, PeerData, SocketUser } from '@/types';
import { useUser } from '@clerk/nextjs';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer, { SignalData } from 'simple-peer'

interface iSocketContext {
    onlineUsers: SocketUser[] | null;
    ongoingCall: OngoingCall | null;
    localStream: MediaStream | null;
    handleCall: (user: SocketUser) => void;
    handleJoinCall : (ongoingCall:OngoingCall) => void;
    peer : PeerData | null;
    isCallEnded: boolean;
    handleHangup: (data: {ongoingCall?:OngoingCall, isEmitHangup?:boolean}) => void 
}

 
export const SocketContext = createContext<iSocketContext | null>(null);

export const SocketContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useUser();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<SocketUser[]>([]);
    const [ongoingCall, setOngoingCall] = useState<OngoingCall | null>(null);
    const [localStream,setLocalStream] = useState<MediaStream|null>(null);
    const [peer,setPeer] = useState<PeerData|null>(null)
    const [isCallEnded,setIsCallEnded] = useState(false);
    let val = 0;

    console.log('isConnected >>', isSocketConnected);
    console.log('Online Users >>', onlineUsers);

    const currentSocketUser = onlineUsers?.find(onlineUser => onlineUser.userId === user?.id);

    const getMediaStream = useCallback(async (faceMode?: string) => {
        if (localStream) {
          // Stop all tracks before retrying
        //   localStream.getTracks().forEach((track) => track.stop());
        //   setLocalStream(null);
        return localStream;
        }
      
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 360, ideal: 720, max: 1080 },
              frameRate: { min: 16, ideal: 30, max: 30 },
              facingMode: videoDevices.length > 0 ? faceMode : undefined,
            },
          });
      
          setLocalStream(stream);
          return stream;
        } catch (error) {
          console.log('failed to get the stream', error);
          setLocalStream(null);
          return null;
        }
      }, [localStream]);    

    /** ✅ Fix: Handle Call Properly */
    const handleCall = useCallback(async(user: SocketUser) => {
        setIsCallEnded(false)
        if (!currentSocketUser || !socket) return;

        const stream = await getMediaStream();
 
        if(!stream){
            console.log('no stream in the handle call');
            handleHangup({ongoingCall:ongoingCall ? ongoingCall : undefined, isEmitHangup: true});
            return;
        }

        // setLocalStream(stream);

        const participants = { caller: currentSocketUser,receiver: user };
        setOngoingCall({
            participants,
            isRinging: false,
        });

        console.log("📞 Emitting call event:", participants);
        socket.emit('call', participants);
    }, [socket, currentSocketUser,ongoingCall]);

    /** ✅ Fix: Handle Incoming Call */
    const onIncomingCall = useCallback((participants: Participants) => {
        console.log("📥 Incoming call from:", participants.caller);

        setOngoingCall({
            participants,
            isRinging: true,
        });
    }, [socket,user,ongoingCall]);

    const handleHangup = useCallback((data: { ongoingCall?: OngoingCall | null; isEmitHangup?: boolean }) => {
        if(socket && user && data?.ongoingCall && data?.isEmitHangup){
            socket.emit('hangup',{
                ongoingCall:data.ongoingCall,
                userHangingupId: user.id,
            })
        }
        setOngoingCall(null);
        setPeer(null);
        if(localStream){
            // console.log('localsterem end karna hai',localStream)
            localStream.getTracks().forEach((track)=>track.stop());
            setLocalStream(null);
        }
        setIsCallEnded(true);

    },[socket,user,localStream]);

    // initiator: person who is creating the offer and emitting the offer   // that is caller
    const createPeer = useCallback((stream:MediaStream, initiator:boolean)=> {
        const iceServers: RTCIceServer[] = [
            {
                urls:[
                    "stun:stun.l.google.com.19302",
                    "stun:stun1.l.google.com.19302",
                    "stun:stun2.l.google.com.19302",
                    "stun:stun3.l.google.com.19302",
                ]
            }
        ]

        const peer = new Peer({
            stream,
            initiator,
            trickle:true,
            config:{iceServers}
        })
          

        peer.on('stream', (remoteStream) => {
            console.log("📡 Got remote stream from peer");
            setPeer((prev) => {
                if (!prev) return prev; // don't update if prev is null
                return {
                    ...prev,
                    stream: remoteStream,
                };
            });
        });
        
        peer.on('error',console.error);
        peer.on('close',()=> handleHangup({}));

        const rtcPeerConnection: RTCPeerConnection = (peer as any)._pc

        rtcPeerConnection.oniceconnectionstatechange = async() => {
            if(rtcPeerConnection.iceConnectionState === 'disconnected' || rtcPeerConnection.iceConnectionState === 'failed'){
                handleHangup({});
            }
        }

        return peer;

    },[ongoingCall,setPeer]);

    const completePeerConnection = useCallback(async(connectionData:{sdp:SignalData, ongoingCall:OngoingCall, isCaller:boolean})=> {
        if(!localStream){
            console.log('missing the localstream');
            return;
        }
        if(peer){
            peer.peerConnection?.signal(connectionData.sdp);
            return;
        }

        const newPeer = createPeer(localStream,true);
        

        setPeer({
            peerConnection: newPeer,
            partipantUser: connectionData.ongoingCall.participants.receiver,
            stream:localStream
        })

        newPeer.on('signal', async(data:SignalData)=> {
            if(socket){
                // emit offer
                console.log('emit offer by the caller',socket);
                // console.log('webrtcSignal')
                socket.emit('webrtcSignal',{
                    sdp:data,
                    ongoingCall,
                    isCaller:true
                })
            }
        })
    },[localStream,createPeer,peer,ongoingCall])

    const handleJoinCall = useCallback(async(ongoingCall:OngoingCall)=> {
        // join call
        setIsCallEnded(false);
        console.log('ongoing call is :',ongoingCall);
        setOngoingCall(prev => {
            if(prev){
                return {...prev,isRinging:false}
            }
            return prev;
        });

        // for see the video to the user we have create peer so that ither user can also get the video and and talk

        const stream = await getMediaStream();     // receiver ne ye isko call kia hai   
        if(!stream){
            console.log('could not get stream in handlejoin call');
            return;
        }
        // setLocalStream(stream);

        const newPeer = createPeer(stream,true) 

        setPeer({
            peerConnection: newPeer,
            partipantUser: ongoingCall.participants.caller,
            stream:stream  
        })

        newPeer.on('signal', async(data:SignalData)=> {
            if(socket){
                // emit offer
                console.log('emit offer by thr socket',socket) // here it is receiver
                socket.emit('webrtcSignal',{
                    sdp:data,
                    ongoingCall,
                    isCaller:false
                })
            }
        })
    },[socket,currentSocketUser])

    /** ✅ Fix: Initialize Socket */
    useEffect(() => {
        if (!user) return;

        const newSocket = io(); // Ensure this matches backend
        setSocket(newSocket);
        console.log('newSOCKET',newSocket)

        return () => {
            newSocket.disconnect();
        }; 
    }, [user]);

    /** ✅ Fix: Handle Socket Connection */
    useEffect(() => {
        if (!socket) return;

        const onConnect = () => {
            console.log("✅ Socket Connected");
            setIsSocketConnected(true);
        };

        const onDisconnect = () => {
            console.log("❌ Socket Disconnected");
            setIsSocketConnected(false);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [socket]);

    /** ✅ Fix: Handle Online Users */
    useEffect(() => {
        if (!socket || !isSocketConnected) return;

        console.log("📤 Emitting addNewUser with:", user);
        socket.emit("addNewUser", user);

        const updateUsers = (res: SocketUser[]) => {
            console.log("📥 Received getUsers:", res);
            setOnlineUsers(res);
        };

        socket.on("getUsers", updateUsers);

        // cleanUP FUNCTION

        return () => {
            socket.off("getUsers", updateUsers);
        };
    }, [user, socket, isSocketConnected]);

    /** ✅ Fix: Listen for Incoming Calls */
    useEffect(() => {
        if (!socket || !isSocketConnected) return;

        socket.on('incomingCall', onIncomingCall);
        socket.on('webrtcSignal',completePeerConnection);
        socket.on('hangup',handleHangup);

        return () => {
            socket.off('incomingCall', onIncomingCall);
            socket.off('webrtcSignal',completePeerConnection);
            socket.off('hangup',handleHangup);
        };
    }, [socket, isSocketConnected, onIncomingCall,user]);
 
    useEffect(()=> {
        let timeout: ReturnType<typeof setTimeout>
        if(isCallEnded){
            timeout = setTimeout(()=> {
                setIsCallEnded(false);
            },2000);
        }

        return () => clearTimeout(timeout);
    },[isCallEnded])
    
    return (
        <SocketContext.Provider value={{ onlineUsers, ongoingCall, handleCall,localStream, handleJoinCall, peer, handleHangup , isCallEnded }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);

    if (context === null) {
        throw new Error("useSocket must be used within a SocketContextProvider");
    }

    return context;
};



