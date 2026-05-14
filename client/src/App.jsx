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



function messageHandle(formData) {
    socket.emit("message", {message:formData.get("message")})
}

function Message({text}) {
    return <div className={"messages"}>
        {text}
    </div>
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
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        console.log("test");
        socket.on("send message", (res) => {
            setMessages(prev => [...prev, res])
            console.log("message")
        } )
    }, []);
  return (<div className="bg-background text-foreground min-h-screen m-5">
          <div className="w-full max-w-md mb-3">
              <form id="loginForm" onSubmit={loginHandle}>
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
                          <Button type="submit" id="login" name={"action"} value={"login"}>Login</Button>
                          <Button type="submit" id="register" name={"action"} value={"register"} variant="outline">Register</Button>
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
