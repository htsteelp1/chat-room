// src/socket.js
import { io } from "socket.io-client";
const chatID = window.location.pathname.match(/\/chat\/(\d+)/)?.[1] || 1;
const socket = io( {
    autoConnect: true,
    query: {chatID}
});

export default socket;