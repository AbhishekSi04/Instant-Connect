"use client"

import { useSocket } from "@/context/SocketContext";
import { useUser } from "@clerk/nextjs";
import Avatar from "./Avatar";

const ListOnlineUsers = () => {
    const {onlineUsers,handleCall} = useSocket();
    const {user} = useUser();

    return ( 
        <div>
            {onlineUsers && onlineUsers.map((onlineUser) => {

                if(onlineUser.profile.id == user?.id) return null;

                return <div key={onlineUser.userId} onClick={()=>handleCall(onlineUser)}>
                    <Avatar src={onlineUser.profile.imageUrl}/>
                    <div>{onlineUser.profile.fullName?.split(' ')[0]}</div>
                </div>
            })}
        </div>
     );
}

 
export default ListOnlineUsers;