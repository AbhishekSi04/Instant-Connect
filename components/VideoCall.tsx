"use client"

import { useSocket } from "@/context/SocketContext";
import VideoContainer from "./VideoContainer";
import { useCallback, useEffect, useState } from "react";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md";

const VideoCall = () => {
    const {localStream} = useSocket();
    const [isMikeOn,setIsMikeOn] = useState(true);
    const [isVidOn,setIsVidOn] = useState(true);

    useEffect(()=> {
        if(localStream){
            const videoTrack = localStream?.getVideoTracks()[0]
            setIsVidOn(videoTrack.enabled);
            const audioTrack = localStream?.getAudioTracks()[0]
            setIsMikeOn(audioTrack.enabled);
        }

    },[localStream])

    const toggleCamera = useCallback(() => {
        if(localStream){
            const videoTrack = localStream?.getVideoTracks()[0]
            videoTrack.enabled = !videoTrack?.enabled;
            setIsVidOn(videoTrack.enabled);
        }
    },[localStream]);

    const toggleMic = useCallback(() => {
        if(localStream){
            const audioTrack = localStream?.getAudioTracks()[0]
            audioTrack.enabled = !audioTrack?.enabled;
            setIsMikeOn(audioTrack.enabled);
        }
    },[localStream])

    return ( <div>
        <div>
            {localStream && <VideoContainer stream={localStream} isLocalStream={true} isOnCall={false}/>}
        </div>
        <div className=" mt-8 flex items-center justify-center">
            <button onClick={toggleMic}>
                {isMikeOn && <MdMicOff size={24}/>}
                {!isMikeOn && <MdMic size={24}/>}
            </button>
            <button className=" px-4 py-2 bg-rose-500 text-white rounded mx-4" onClick={()=> {}}>
                End Call
            </button>
            <button onClick={toggleCamera}>
                {isVidOn && <MdVideocamOff size={24}/>}
                {!isVidOn && <MdVideocam size={24}/>}
            </button>
        </div>

    </div> );
}
 
export default VideoCall;
