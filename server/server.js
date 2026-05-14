import express from "express";
import { Server } from "socket.io";
import {DatabaseSync} from "node:sqlite";
import {randomBytes} from "node:crypto";
import {createServer} from "http";
const __dirname = import.meta.dirname;
import cors from "cors";

const db = new DatabaseSync("./users.db");
const app = express();
const port = 3000;
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:4173"],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
db.exec('CREATE TABLE IF NOT EXISTS users(' +
    'user TEXT PRIMARY KEY,' +
    'password TEXT,' +
    'cookie TEXT' +
    ')')

const queryUser = db.prepare("SELECT user, password, cookie FROM users WHERE user = ?")
const userStatus = db.prepare('SELECT 1 FROM users WHERE user = ?');
const newUser = db.prepare("INSERT INTO users (user, password, cookie) VALUES (?,?,?)")
const queryCookie = db.prepare("SELECT user FROM users WHERE cookie = ?")

function userExists(user) {
    const row = userStatus.get(user);
    return row !== undefined;
}

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ['GET', 'POST'],
    credentials: true,
}));


app.use(express.static("public"));
io.on("connect", (socket) =>
{

    console.log("connected the webSocket");
    socket.on("message", info => {
        let theMessage = queryCookie.get(info.cookie).user + ": " + info.message;
        io.emit('send message', theMessage);
    })
    socket.on("login", req => {
        switch (req.action) {
            case "login":
                if (!userExists(req.user)) break;
                if (queryUser.get(req.user).password === req.password) {
                    socket.emit("cookie", queryUser.get(req.user).cookie);
                    console.log("user logged in");
                }
                break;
            case "register":
                if (userExists(req.user)) break;
                const cookieGen = randomBytes(10).toString('hex');
                newUser.run(req.user, req.password, cookieGen);
                socket.emit("cookie", cookieGen);
                console.log("user registered")
                break;
                socket.emit("cookie", "guest");
        }
    });
})

server.listen(port, ()=> {console.log(`server at http://localhost:${port}`)});