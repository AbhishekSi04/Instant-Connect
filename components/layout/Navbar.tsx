"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Container from "./Container";
import { Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

const NavBar = () => {
  const router = useRouter();
  const {userId} = useAuth();

  return (
    <div>
      <Container>
        <div className=" flex justify-between items-center">
          <div
            className=" flex items-center gap-1 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <Video />
            <div className=" font-bold text-2xl">VidChat</div>
          </div>
          <div className=" flex gap-3 items-center">
            <UserButton/>
            {!userId && <>
                <Button onClick={() => router.push('/sign-in')} size='sm' variant='outline'>Sign-In</Button>
                <Button onClick={()=> router.push('/sign-up')} size='sm' variant='outline'>Sign-Up</Button>
            </>}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default NavBar;
