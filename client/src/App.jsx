import { Input } from "@/components/ui/input"
import './App.css'
import socket from "./socket";
import {useEffect, useState} from "react";
import ReverseInfiniteScroller from "./components/ReverseInfiniteScroller.jsx"
import { Button } from "@/components/ui/button"
import {BrowserRouter, Routes, Route, useParams} from "react-router-dom";
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
    const [messages, setMessages] = useState([]);
    const [user, setUser] = useState([]);
    useEffect(() => {
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
  return (<div className="bg-background text-foreground min-h-screen m-5">
          <div className="w-full max-w-md mb-3">
              <form id="loginForm" onSubmit={loginHandle} autoComplete={"off"}>
                  <FieldGroup>
                      <FieldDescription>Logged in as <span>{user}</span></FieldDescription>
                      <FieldSet>
                          <FieldLegend>Login</FieldLegend>
                          <FieldGroup>
                              <Field>
                                  <FieldLabel htmlFor="user">Username</FieldLabel>
                                  <Input id="user" name="user" placeholder="user" />
                              </Field>
                              <Field>
                                  <FieldLabel htmlFor="password">Password</FieldLabel>
                                  <Input id="password" name="password" placeholder="password" type="password" />
                              </Field>
                          </FieldGroup>
                      </FieldSet>
                      <Field orientation="horizontal">
                          <Button type="submit" id="login" name={"action"} value={"login"}>Login</Button>
                          <Button type="submit" id="register" name={"action"} value={"register"} variant="outline">Register</Button>
                      </Field>
                  </FieldGroup>
              </form>
          </div>

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
                         <Route path={"/"} element={<LoadScroller messages={messages} onSendMessages={messageHandle} onLoadMore={loadMore}/>}/>
                         <Route path={"/chat/:theChatID"} element={<LoadScroller messages={messages} onSendMessages={messageHandle} onLoadMore={loadMore}/>}/>
                     </Routes>
                     </BrowserRouter>

  </div>
  );
}

export default App
