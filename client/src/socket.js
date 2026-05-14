// src/socket.js
import { io } from "socket.io-client";

const socket = io( {
    autoConnect: true, // set to false to connect manually
});

export default socket;