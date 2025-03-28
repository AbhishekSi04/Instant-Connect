import { SocketUser } from '@/types';
import { useUser } from '@clerk/nextjs';
import { error } from 'console'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client';

interface iSocketContext{

}

export const SocketContext = createContext<iSocketContext | null >(null)

export const SocketContextProvider = ({children}: {children:React.ReactNode}) => {
    
    const {user} = useUser();
    const [socket,setSocket] = useState<Socket| null>(null);
    const [isSocketConnected,setIsSocketConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<SocketUser[]>([]);


    console.log('isconnected>>', isSocketConnected);
    console.log('onlineusers',onlineUsers);

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
    
    

    return <SocketContext.Provider value={{}}>
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