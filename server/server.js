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
import passport from "passport";
import {Strategy as LocalStrategy} from "passport-local";
import session from "express-session"
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


function onlyForHandshake(middleware) {
    return (req, res, next) => {
        const isHandshake = req._query.sid === undefined;
        if (isHandshake) {
            middleware(req, res, next);
        } else {
            next();
        }
    };
}

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
        datetime(messages.createdAt, 'localtime') AS timestamp
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
const newUser = db.prepare(`INSERT INTO users (user, password, cookie) VALUES (?,?,?) RETURNING user, id, password, cookie`);
const userIntoChat = db.prepare(`INSERT INTO chat_users (userID, chatID) VALUES (?,?)`)
const queryCookie = db.prepare("SELECT user, id FROM users WHERE cookie = ?")
const queryID = db.prepare("SELECT user, id, password, cookie FROM users WHERE id = ?")

const chatList = db.prepare(`SELECT chats.id, chats.name 
    FROM chats JOIN chat_users ON chats.id = chat_users.chatID
    WHERE chat_users.userID = ?`);

const newChat = db.prepare(`INSERT INTO chats (userID, name) VALUES (?, ?) RETURNING id, name`)
function userExists(user) {
    const row = userStatus.get(user);
    return row !== undefined;
}

if (!userExists("guest")) {
    newUser.run("guest", "test", "test");
    db.prepare(`INSERT INTO chats (id, userID, name) VALUES (?, ?, ?)`).run(1,1,"global")
    userIntoChat.run(1,1)
}


function ensureAuth(req, res, next) {
    // Passport automatically adds this method to the request object
    if (req.isAuthenticated()) {
        console.log("authenticated");
        return next();
    }
    res.redirect("/login");
}



passport.use(new LocalStrategy(async (username, password, done) => {
    const user = await queryUser.get(username);
    if (!user) return done(null, false);
    if (user.password !== password) return done(null, false);
    return done(null, user);
}));

const sessionMiddleware = session({
    secret: randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
})


app.use(sessionMiddleware)


app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:4173"],
    methods: ['GET', 'POST'],
    credentials: true,
}));
app.use(express.json());                         // for Content-Type: application/json
app.use(express.urlencoded({ extended: true }));
app.use(passport.authenticate("session"));


passport.serializeUser((user, cb) => {
    console.log(`serializeUser ${user.id}`);
    cb(null, user.id);
});

passport.deserializeUser((user, cb) => {
    console.log(`deserializeUser ${user}`);
    cb(null, queryID.get(user));
});




app.use("/assets", express.static(isProd ? "./client/dist/assets" : "../client/dist/assets"));

app.post("/login", passport.authenticate('local', {failureRedirect:"/login", successRedirect:"/"}));
app.post("/register", (req, res, next) => {
    if (userExists(req.body.username)) return res.redirect("/login");
    const cookieGen = randomBytes(10).toString('hex');
    const theUser = newUser.get(req.body.username, req.body.password, cookieGen);
    console.log("user registered")
    userIntoChat.run(theUser.id, 1);
    req.login(theUser, (err) => {if (err) next(err);
        res.redirect("/login");
    })
});

app.post("/create", ensureAuth, (req, res) => {
    const { name } = req.body;
    const userID = req.user.id
    const chatID = newChat.get(userID, name).id
    userIntoChat.get(userID, chatID)
    res.json({ chatID });
});



io.engine.use(onlyForHandshake(sessionMiddleware));
io.engine.use(onlyForHandshake(passport.authenticate("session")));
io.engine.use(
    onlyForHandshake((req, res, next) => {
        if (req.user) {
            next();
        } else {
            res.writeHead(401);
            res.end();
        }
    }),
);

io.on("connect", (socket, req) =>
{
    const aChatID = parseInt(socket.handshake.query.chatID) || 1
    const user = socket.request.user
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
    socket.on("addUser", (req, res) => {
        if(checkMembership.get(user.id, aChatID) && userExists(req.user)) {
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

app.get("/serverList", ensureAuth, async (req, res) => {
    let userID = await req.user.id;
    let serverList = await chatList.all(userID)
    let formattedServerList = await serverList.map(val => {return {"route":"/chat/"+val.id.toString(), "name":val.name}})
    res.json(formattedServerList);
})

app.get(/.*/, (req, res) => {
    res.sendFile(join(__dirname, isProd ? "./client/dist/" : "../client/dist", "index.html"))
})

server.listen(port, ()=> {console.log(`server at http://localhost:${port}`)});