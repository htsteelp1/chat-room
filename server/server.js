import express from "express";
import { Server } from "socket.io";
import {DatabaseSync} from "node:sqlite";
import {randomBytes} from "node:crypto";
import {createServer} from "http";
const __dirname = import.meta.dirname;
import cors from "cors";
import cookieParser from "cookie-parser";
import cookie from "cookie";
const db = new DatabaseSync("./data/users.db");
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

if (!userExists("guest")) {
    newUser.run("guest", "test", "test");
}


app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ['GET', 'POST'],
    credentials: true,
}));
app.use(express.json());                         // for Content-Type: application/json
app.use(express.urlencoded({ extended: true }));

app.use(express.static("./client/dist/"));
app.use(cookieParser());
app.post("/login", (req,res) => {
    switch (req.body.action) {
        case "login":
            if (!userExists(req.body.user)) break;
            if (queryUser.get(req.body.user).password === req.body.password) {
                res.cookie("security", queryUser.get(req.body.user).cookie, {httpOnly: true, maxAge: 86400000});
                console.log("user logged in");
            }
            break;
        case "register":
            if (userExists(req.body.user)) break;
            const cookieGen = randomBytes(10).toString('hex');
            newUser.run(req.body.user, req.body.password, cookieGen);
            res.cookie("security", cookieGen, {httpOnly: true, maxAge: 86400000});
            console.log("user registered")
            break;
        default:
            res.cookie("security", "test");
            break;


    }
    return res.json({ success: true });

});


io.use((socket, next) => {
    const header = socket.handshake.headers.cookie;
    if (!header) return next(new Error("Authentication error: No cookies found"));

    socket.cookies = cookie.parse(header);
    next();
});


io.on("connect", (socket) =>
{

    console.log("connected the webSocket");
    socket.on("message", info => {
        console.log("message")
        let theMessage = queryCookie.get(socket.cookies.security).user + ": " + info.message;
        io.emit('send message', theMessage);
    })

})



app.get("/", (req, res) => {
    if (!req.cookies.security) {
        res.cookie("security", "test", {httpOnly: true});
    }
    res.send();

})

server.listen(port, ()=> {console.log(`server at http://localhost:${port}`)});