import { OngoingCall, Participants, SocketUser } from '@/types';
import { useUser } from '@clerk/nextjs';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer'

interface iSocketContext {
    onlineUsers: SocketUser[] | null;
    ongoingCall: OngoingCall | null;
    localStream: MediaStream | null;
    handleCall: (user: SocketUser) => void;
    handleJoinCall : (ongoingCall:OngoingCall) => void;
}

 
export const SocketContext = createContext<iSocketContext | null>(null);

export const SocketContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useUser();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<SocketUser[]>([]);
    const [ongoingCall, setOngoingCall] = useState<OngoingCall | null>(null);
    const [localStream,setLocalStream] = useState<MediaStream|null>(null);

    console.log('isConnected >>', isSocketConnected);
    console.log('Online Users >>', onlineUsers);

    const currentSocketUser = onlineUsers?.find(onlineUser => onlineUser.userId === user?.id);

    const getMediaStream = useCallback(async(faceMode ?: string)=> {
        if(localStream){
            return localStream;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video:{
                    width:{min:640 , ideal:1280, max:1920},
                    height:{min:360 , ideal:720 , max: 1080},
                    frameRate:{min:16 , ideal:30 , max:30},
                    facingMode:videoDevices.length > 0 ? faceMode  : undefined
                }
            })
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.log('failed to get the stream',error);
            setLocalStream(null);
            return null;
        }
    },[localStream])

    /** ✅ Fix: Handle Call Properly */
    const handleCall = useCallback(async(user: SocketUser) => {
        if (!currentSocketUser || !socket) return;

        const stream = await getMediaStream();
 
        if(!stream){
            console.log('no stream in the handle call');
            return;
        }

        const participants = { caller: currentSocketUser,receiver: user };
        setOngoingCall({
            participants,
            isRinging: false,
        });

        console.log("📞 Emitting call event:", participants);
        socket.emit('call', participants);
    }, [socket, currentSocketUser]);

    /** ✅ Fix: Handle Incoming Call */
    const onIncomingCall = useCallback((participants: Participants) => {
        console.log("📥 Incoming call from:", participants.caller);

        setOngoingCall({
            participants,
            isRinging: true,
        });
    }, []);

    const createPeer = useCallback((stream:MediaStream, initiator:boolean)=> {
        const iceServers: RTCIceServer[] = [
            {
                urls:[
                    "stun:stun.1.google.com.19302",
                    "stun:stun1.1.google.com.19302",
                    "stun:stun2.1.google.com.19302",
                    "stun:stun3.1.google.com.19302",
                ]
            }
        ]

        // const peer = new Peer({
        //     stream,
        //     initiator,
        //     trickle:true,
        //     config:{iceServers}
        // })

        // peer.on('stream',(stream)=> {
            
        // })
    },[ongoingCall])

    const handleJoinCall = useCallback(async(ongoingCall:OngoingCall)=> {
        // join call
        console.log(ongoingCall);
        setOngoingCall(prev => {
            if(prev){
                return {...prev,isRinging:false}
            }
            return prev;
        });

        const stream = await getMediaStream();
        if(!stream){
            console.log('colud not get stream in habdlejoin call');
            return;
        }
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

        return () => {
            socket.off('incomingCall', onIncomingCall);
        };
    }, [socket, isSocketConnected, onIncomingCall]);

    return (
        <SocketContext.Provider value={{ onlineUsers, ongoingCall, handleCall,localStream, handleJoinCall }}>
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
