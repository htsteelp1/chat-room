import { Input } from "@/components/ui/input"
import './App.css'
import socket from "./socket";
import {useEffect, useState} from "react";
import { Button } from "@/components/ui/button"
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

let cookie = "test";

function loginHandle(formData) {
    let user = formData.get("user");
    let password = formData.get("password");
    const info = {user:user, password:password, action:"login"}
    socket.emit("login", info);
}

function messageHandle(formData) {
    socket.emit("message", {cookie:cookie, message:formData.get("message")})
}

function registerHandle(formData) {
    let user = formData.get("user");
    let password = formData.get("password");
    const info = {user:user, password:password, action:"register"}
    socket.emit("login", info);
    console.log("register")
}
function Message({text}) {
    return <div className={"messages"}>
        {text}
    </div>
}


function App() {
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        socket.on("cookie", (res) => {cookie = res;
        console.log(cookie)})
        console.log("test");
        socket.on("send message", (res) => {
            setMessages(prev => [...prev, res])
        } )
    }, []);
  return (<div className="bg-background text-foreground min-h-screen m-5">
          <div className="w-full max-w-md mb-3">
              <form id="loginForm" action={loginHandle}>
                  <FieldGroup>
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
                          <Button type="submit" id="login" formAction={loginHandle}>Login</Button>
                          <Button type="submit" id="register" formAction={registerHandle} variant="outline">Register</Button>
                      </Field>
                  </FieldGroup>
              </form>
          </div>
          <form action={messageHandle} className={"w-full max-w-md"}>
              <FieldGroup>
                  <Field>
                      <FieldLabel htmlFor={"message"}>Message</FieldLabel>
                      <Input id={"message"} placeholder={"Message"} type={"text"} name={"message"}/>
                  </Field>
                  <Field orientation={"vertical"}><Button type={"submit"}>Send</Button></Field>
              </FieldGroup>
          </form>
          <div>
              {messages.map((msg, i) =>
                  <Message text={msg} key={i}></Message>
              )}
          </div>
        <script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
  </div>
  );
}

export default App
