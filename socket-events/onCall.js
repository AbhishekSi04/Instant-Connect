// const onCall = async (participants, io) => {  // ✅ Accept io as a parameter
//     console.log("participants me to undefine kyo hai", participants);

//     if (participants?.receiver?.socketId) {
//         console.log("📤 Sending incomingCall to:", participants.receiver.socketId);
//         io.to(participants.receiver.socketId).emit("incomingCall", participants);
//     } else {
//         console.error("❌ participants.receiver.socketId is undefined!");
//     }
// };


// export default onCall;



const onCall = async (participants, io) => {
    console.log("Participants in call:", participants);

    if (participants.receiver.socketId) {
        console.log("Emitting incomingCall to", participants.receiver.socketId);
        io.to(participants.receiver.socketId).emit("incomingCall", participants);
    }
};

export default onCall;
