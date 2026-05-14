// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
    autoConnect: true, // set to false to connect manually
});

export default socket;