// src/socket.js
import { io } from "socket.io-client";

const socket = io("http://10.82.225.230:3000", {
    autoConnect: true, // set to false to connect manually
});

export default socket;