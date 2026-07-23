import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/authService.ts";

interface JoinRoomData {
  token: string;
  interviewId: string | number;
}

export function setupWebRTCInterviewSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    // console.log("WebRTC Client connected:", socket.id);

    // Track the active room and role for this socket
    let currentRoom: string | null = null;
    let currentUserRole: string | null = null;
    let currentUserId: string | null = null;

    socket.on("interview:join-room", async (data: JoinRoomData) => {
      const { token, interviewId } = data;
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const roomId = `interview_${interviewId}`;
        const role = decoded.role;
        const userId = decoded.userId;

        currentRoom = roomId;
        currentUserRole = role;
        currentUserId = userId;

        socket.join(roomId);

        // Notify the user that they joined
        socket.emit("interview:joined", { roomId, role });

        // Notify others in the room that a user joined
        socket.to(roomId).emit("interview:user-joined", { role });

        // Check how many users are in the room
        const clients = io.sockets.adapter.rooms.get(roomId);
        if (clients && clients.size === 2) {
          // Both are present, we can ready up the callers
          // Generally the interviewer (COMPANY) should act as initiator to create the offer
          // Let's find out if there's a company here. 
          // But to be simple, we just pick the first socket or if it's COMPANY
          // We will designate COMPANY as initiator if possible, otherwise just pick one
          io.to(roomId).emit("interview:ready", { initiatorId: socket.id });
        }

      } catch (err) {
        socket.emit("interview:error", { message: "Unauthorized or invalid token" });
      }
    });

    socket.on("rtc:offer", (data: { offer: any }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("rtc:offer", { offer: data.offer });
      }
    });

    socket.on("rtc:answer", (data: { answer: any }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("rtc:answer", { answer: data.answer });
      }
    });

    socket.on("rtc:ice-candidate", (data: { candidate: any }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("rtc:ice-candidate", { candidate: data.candidate });
      }
    });

    socket.on("interview:chat-message", (data: { message: any }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("interview:chat-message", { message: data.message });
      }
    });

    socket.on("interview:code-change", (data: { code: string, lang: string }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("interview:code-change", { code: data.code, lang: data.lang });
      }
    });

    socket.on("interview:peer-audio-toggle", (data: { micOn: boolean }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("interview:peer-audio-toggle", { micOn: data.micOn });
      }
    });

    socket.on("interview:peer-video-toggle", (data: { videoOn: boolean }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("interview:peer-video-toggle", { videoOn: data.videoOn });
      }
    });

    socket.on("interview:frame", (data: { frame: string }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit("interview:frame", { frame: data.frame });
      }
    });

    socket.on("interview:end-call", () => {
      if (currentRoom) {
        // Emit to everyone in the room!
        io.to(currentRoom).emit("interview:ended");
        
        // Let's disconnect people from the room
        io.in(currentRoom).socketsLeave(currentRoom);
      }
    });

    socket.on("disconnect", () => {
      if (currentRoom) {
        socket.to(currentRoom).emit("interview:user-left", { role: currentUserRole });
      }
    });
  });
}
