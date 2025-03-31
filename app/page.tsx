"use client"

import CallNotification from "@/components/CallNotification";
import ListOnlineUsers from "@/components/ListOnlineUsers";
import VideoCall from "@/components/VideoCall";
import Image from "next/image";


export default function Home() {
  return (
    <div className=" text-red-400">
      <ListOnlineUsers/>
      <CallNotification/>
      <VideoCall/>
    </div>
  );
}
