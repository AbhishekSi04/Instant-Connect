"use client"

import { useSocket } from "@/context/SocketContext";

const CallNotification = () => {
    const {ongoingCall} = useSocket();
    if(!ongoingCall?.isRinging) return;

    return ( <div className="absolute bg-slate-500 bg-opacityh-70 w-screen h-screen top-0 bottom-0 flex items-center justify-center">
        someone is calling 
    </div> );
}
 
export default CallNotification;







// "use client"

// import { useSocket } from "@/context/SocketContext";

// const CallNotification = () => {
//     const { ongoingCall } = useSocket();
    
//     if (!ongoingCall || !ongoingCall.isRinging) return null;

//     return (
//         <div className="absolute bg-slate-500 bg-opacity-70 w-screen h-screen top-0 bottom-0 flex items-center justify-center">
//             {ongoingCall.participants.caller.profile.fullName} is calling...
//         </div>
//     );
// };

// export default CallNotification;
