import { OngoingCall, Participants, SocketUser } from '@/types';
import { useUser } from '@clerk/nextjs';
import { error } from 'console'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client';

interface iSocketContext{
    onlineUsers: SocketUser[] | null;
    ongoingCall: OngoingCall | null;
    handleCall:(user:SocketUser) => void
}

export const SocketContext = createContext<iSocketContext | null >(null)

export const SocketContextProvider = ({children}: {children:React.ReactNode}) => {
    
    const {user} = useUser();
    const [socket,setSocket] = useState<Socket| null>(null);
    const [isSocketConnected,setIsSocketConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<SocketUser[]>([]);
    const [ongoingCall,setOngoingCall] = useState<OngoingCall|null>(null)

    console.log('isconnected>>', isSocketConnected);
    console.log('onlineusers',onlineUsers);

    const currentSocketUser = onlineUsers?.find(onlineUser => onlineUser.userId === user?.id);

    const handleCall = useCallback((user:SocketUser)=> {
        if(!currentSocketUser) return;
        const participants = {caller: currentSocketUser,receiver:user}
        setOngoingCall({
            participants,
            isRinging:false,
        })
        socket?.emit('call',participants);
    },[socket,currentSocketUser,ongoingCall])

    const onIncomingCall = useCallback((participants:Participants)=> {
        return()=> {
            socket?.off('incomingCall',onIncomingCall);
        }
    },[socket,user,ongoingCall]);

    // initialising a socket
    useEffect(()=> {
        const newSocket = io()
        setSocket(newSocket);

        return ()=> {
            newSocket.disconnect();
        } 
    },[user]);

    useEffect(()=> {
        if(socket===null) return;

        if(socket.connected){
            onConnect()
        }
        function onConnect(){
            setIsSocketConnected(true);
        }
        function onDisconnect(){
            setIsSocketConnected(false);
        }

        socket.on('connect',onConnect);
        socket.on('disconnect',onDisconnect);

        return ()=> {
            socket.off('connect',onConnect);
            socket.off('disconnect',onDisconnect);
        }
    },[socket]);

    // set online users
    useEffect(() => {
        if (!socket || !isSocketConnected) return;
    
        console.log("📤 Emitting addNewUser with:", user); // ✅ Check if it's being sent  
    
        socket.emit("addNewUser", user);
        
        const updateUsers = (res: SocketUser[]) => {
            console.log("📥 Received getUsers:", res); // ✅ Check if response is received  
            setOnlineUsers(res);
        };
    
        socket.on("getUsers", updateUsers);
    
        return () => {
            socket.off("getUsers", updateUsers);
        };
    }, [user, socket, isSocketConnected]);
    
    useEffect(()=> {
        if(!socket || !isSocketConnected) return;
        socket.on('incomingCall',onIncomingCall);
    },[user, socket, isSocketConnected,onIncomingCall])
    

    return <SocketContext.Provider value={
        {onlineUsers,
        ongoingCall,
        handleCall,
    }}>
        {children}
    </SocketContext.Provider>
}

export const useSocket = () => {
    const context = useContext(SocketContext)

    if(context === null) {
        throw new Error("usesocket must be used within a socketcontextprovider")
    }

    return context
}