import { Input } from "@/components/ui/input"
import './App.css'
import socket from "./socket";
import {useEffect, useState} from "react";
import ReverseInfiniteScroller from "./components/ReverseInfiniteScroller.jsx"
import { Button } from "@/components/ui/button"
import {BrowserRouter, Routes, Route, useParams} from "react-router-dom";
import CreateGroupChat from "./pages/CreateGroupChat.jsx";
import Login from "./pages/LoginPage.jsx"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field"
import AppSidebar from "./components/AppSidebar.jsx"
let chatID = 1;

function LoadScroller({messages, onSendMessages,onLoadMore}) {
    const params = useParams();
    console.log(params);
    useEffect(() => {
        chatID = params.theChatID || 1;
        socket.emit("getHistory", chatID);
    }, [params.theChatID]);
    return <ReverseInfiniteScroller messages={messages} currentUser={"Test"} channelName={"general"} chatID={params.theChatID} isConnected={true} onSendMessage={messageHandle} onLoadMore={loadMore}></ReverseInfiniteScroller>
}
function loadMore() {
    console.log("loadMore");
}

function messageHandle(formData, chatID) {
    debugger;
    console.log(formData)
    const info = {}
    socket.emit("message", {chatID, message:formData} );
}

function Message({text}) {
    return <div className={"messages"}>
        {text}
    </div>
}
function addUserHandle(formData) {
    console.log(formData.get("user"))
    socket.emit("addUser", {user:formData.get("user"), chatID})
}

async function loginHandle(e) {
    e.preventDefault();
    const fd = new FormData(e.target)
    fd.append("action", e.nativeEvent.submitter.value);
    const params = new URLSearchParams(fd);
    try {
        const response = await fetch("/login", {
            method: "POST",
            body: params
        });
        if (response.ok) {
            console.log("responsed");
        }
    }
    catch (e) {
        console.log(e);
    }
    location.reload();
}


function App() {
    let params = useParams();
    const [servers, setServers] = useState([]);
    async function getServerList(){
        let response = await fetch('/serverList');
        let serverList = await response.json();
        console.log(serverList);
        setServers(serverList);
    }
    const [messages, setMessages] = useState([]);
    const [user, setUser] = useState("guest");
    useEffect(() => {
        getServerList();
        socket.on("user", (res) => {setUser(res)})
        console.log("test");
        socket.on("send message", (res) => {
            setMessages(prev => [...prev, res])
            console.log("message")
        } )
        socket.on("history", (res) => {
            const format = res.map(msg => {
                msg["timestamp"] = new Date(msg.timestamp);
                return msg;
            })
            setMessages(format);
        })
    }, []);
  return (<AppSidebar pages={servers} username={user}>
          <div className="bg-background text-foreground min-h-screen m-5">


              <form id={"addUser"} autoComplete={"off"} className={"mb-10"} action={addUserHandle}>
                  <FieldGroup>
                      <FieldSet>
                          <FieldLegend>Add User to Group</FieldLegend>
                          <Input name={"user"} id={"user"} type={"text"}/>
                          <Button name={"addUser"} id={"addUser"} type={"submit"}>Add User</Button>
                      </FieldSet>
                  </FieldGroup>
              </form>
              <BrowserRouter>
                  <Routes>
                      <Route path={"/"} element={<LoadScroller messages={messages} onSendMessages={messageHandle}
                                                               onLoadMore={loadMore}/>}/>
                      <Route path={"/chat/:theChatID"}
                             element={<LoadScroller messages={messages} onSendMessages={messageHandle}
                                                    onLoadMore={loadMore}/>}/>
                      <Route path={"/create"} element={<CreateGroupChat/>}/>
                      <Route path={"/login"} element={<Login/>}/>
                  </Routes>
              </BrowserRouter>

          </div>
      </AppSidebar>
  );
}

export default App
