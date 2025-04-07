import { io } from '../server.js';

const onwebrtcSignal = async (data) => {
    const { isCaller, ongoingCall } = data;
    const { caller, receiver } = ongoingCall.participants;

    if (isCaller) {
        // Send offer (caller to receiver)
        if (receiver?.socketId) {
            io.to(receiver.socketId).emit('webrtcSignal', data);
        } else {
            console.warn('Receiver socketId not found.');
        }
    } else {
        // Send answer (receiver to caller)
        if (caller?.socketId) {
            io.to(caller.socketId).emit('webrtcSignal', data);
        } else {
            console.warn('Caller socketId not found.');
        }
    }
};

export default onwebrtcSignal;
