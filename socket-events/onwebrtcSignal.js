import { io } from '../server.js';

const onwebrtcSignal = async (data) => {
    const { isCaller, ongoingCall } = data;
    const { caller, receiver } = ongoingCall.participants;

    if (isCaller) {
        // Send offer (caller to receiver)
        if (data.ongoingCall.participants.receiver.socketId) {
            io.to(receiver.socketId).emit('webrtcSignal', data);
        } else {
            console.warn('receiver socketId not found.');
        }
    } else {
        // Send answer (receiver to caller)
        if (data.ongoingCall.participants.caller.socketId) {
            io.to(caller.socketId).emit('webrtcSignal', data);
        } else {
            console.warn('Caller socketId not found.');
        }
    }
};

export default onwebrtcSignal;
