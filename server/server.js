import express from "express";
import { Server } from "socket.io";
import {DatabaseSync} from "node:sqlite";
import {randomBytes} from "node:crypto";
import {createServer} from "http";
const __dirname = import.meta.dirname;
import { join } from 'path';
import cors from "cors";
import cookieParser from "cookie-parser";
import cookie from "cookie";
const db = new DatabaseSync("./data/users.db");
db.exec("PRAGMA foreign_keys = ON;");
const app = express();
const port = 3000;
const isProd = process.env.NODE_ENV === "production";
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
db.exec('CREATE TABLE IF NOT EXISTS users(' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'user TEXT,' +
    'password TEXT,' +
    'cookie TEXT' +
    ')')
db.exec('CREATE TABLE IF NOT EXISTS chats(' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'userID INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,' +
    'name TEXT NOT NULL' +
    ')')
db.exec('CREATE TABLE IF NOT EXISTS messages(' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'userID INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,' +
    'chatID INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,' +
    'body TEXT,' +
    'createdAt DATETIME DEFAULT CURRENT_TIMESTAMP' + // Added this
    ')')
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_users (
    userID INTEGER NOT NULL,
    chatID INTEGER NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (userID, chatID),
    FOREIGN KEY (userID) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (chatID) REFERENCES chats(id) ON DELETE CASCADE
  )
`);
// Updated to select the timestamp
// Fix the table definition to ensure the column name matches your queries
db.exec(`
  CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userID INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chatID INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    body TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepared statement to fetch history
const getMessagesByChat = db.prepare(`
    SELECT 
        messages.id, 
        users.user AS author, 
        messages.body AS content, 
        messages.createdAt AS timestamp
    FROM messages
    JOIN users ON messages.userID = users.id
    WHERE messages.chatID = ?
    ORDER BY messages.id DESC LIMIT 50
`);

// Prepared statement to save a message
const saveMessage = db.prepare(`
    INSERT INTO messages (userID, chatID, body)
    VALUES (?, ?, ?)
        RETURNING id, createdAt
`);
const checkMembership = db.prepare(`
    SELECT 1 FROM chat_users 
    WHERE userID = ? AND chatID = ?
`);
const queryUser = db.prepare("SELECT id, user, password, cookie FROM users WHERE user = ?")
const userStatus = db.prepare('SELECT 1 FROM users WHERE user = ?');
const newUser = db.prepare(`INSERT INTO users (user, password, cookie) VALUES (?,?,?)`);
const userIntoChat = db.prepare(`INSERT INTO chat_users (userID, chatID) VALUES (?,?)`)
const queryCookie = db.prepare("SELECT user, id FROM users WHERE cookie = ?")

const newChat = db.prepare(`INSERT INTO chats (id, userID, name) VALUES (?, ?, ?)`)
function userExists(user) {
    const row = userStatus.get(user);
    return row !== undefined;
}

if (!userExists("guest")) {
    newUser.run("guest", "test", "test");
    newChat.run(1,1,"global")
    userIntoChat.run(1,1)
}


app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ['GET', 'POST'],
    credentials: true,
}));
app.use(express.json());                         // for Content-Type: application/json
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next)=>{
    if(!req.cookies.security) res.cookie("security", "test");
    if(!queryCookie.get(req.cookies.security)) res.cookie("security", "test")
    next();
})
app.use(express.static(isProd ? "./client/dist/" : "../client/dist"));

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
            const theUser = newUser.run(req.body.user, req.body.password, cookieGen);
            res.cookie("security", cookieGen, {httpOnly: true, maxAge: 86400000});
            console.log("user registered")
            userIntoChat.run(theUser.lastInsertRowid, 1);
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


io.on("connect", (socket, req) =>
{
    const aChatID = parseInt(socket.handshake.query.chatID) || 1
    const user = queryCookie.get(socket.cookies.security);
    console.log("connected the webSocket");
    socket.emit("user", user.user);
    if (checkMembership.get(user.id, aChatID)) {
        socket.join(aChatID.toString())
        console.log(aChatID)
    }
    socket.on("message", info => {
        const chatID = info.chatID || 1;
        if (checkMembership.get(user.id, chatID)) {
        const result = saveMessage.get(user.id, chatID, info.message);
        console.log("message")
        const messageObject = {
            id: result.id,
            author: user.user,
            content: info.message,
            timestamp: result.createdAt,
        };
        io.to(chatID.toString()).emit('send message', messageObject);}
    })
    socket.on("addUser", (res, req) => {
        if(checkMembership.get(user.id, chatID)) {
            const userID = queryUser.get(req.user).id
            if(!checkMembership.get(userID, req.chatID)) {
                userIntoChat.run(userID, req.chatID)
            }
        }
    })
    socket.on("getHistory", (chatID) => {
        if (checkMembership.get(user.id, chatID)) {
            socket.emit("history", getMessagesByChat.all(chatID).reverse())
        }
    })

})



app.get(/.*/, (req, res) => {
    if (!req.cookies.security) {
        res.cookie("security", "test", {httpOnly: true});
    }
    res.sendFile(join(__dirname, isProd ? "./client/dist/" : "../client/dist", "index.html"))


})

server.listen(port, ()=> {console.log(`server at http://localhost:${port}`)});