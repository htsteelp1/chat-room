import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldSeparator,
} from "@/components/ui/field";
import socket from "@/socket"; // still used for addUser

/**
 * CreateGroupChat
 *
 * Add to your router:
 *   <Route path="/create" element={<CreateGroupChat />} />
 *
 * Emits:
 *   socket.emit("createGroup", { name })  — on group creation
 *   socket.emit("addUser", { user, chatID }) — on adding a user
 */
export default function CreateGroupChat() {
    const [nameError, setNameError] = useState("");
    const [createdGroup, setCreatedGroup] = useState(null); // { id, name }
    const [addedUsers, setAddedUsers] = useState([]);

    // Step 1 — create the group
    async function handleCreateGroup(formData) {
        const name = formData.get("groupName")?.trim();
        if (!name) {
            setNameError("Group chat name is required.");
            return;
        }
        setNameError("");
        try {
            const response = await fetch("/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) {
                setNameError("Failed to create group chat. Please try again.");
                return;
            }
            const data = await response.json().catch(() => ({}));
            const chatID = data?.chatID ?? Date.now();
            setCreatedGroup({ id: chatID, name });
        } catch {
            setNameError("Could not reach the server. Please try again.");
        }
    }

    // Step 2 — add a user (mirrors the original addUserHandle)
    function handleAddUser(formData) {
        const user = formData.get("user")?.trim();
        if (!user || !createdGroup) return;
        socket.emit("addUser", { user, chatID: createdGroup.id });
        setAddedUsers((prev) => [...prev, user]);
    }

    return (
        <div className="max-w-md mx-auto mt-12 px-4">
            {/* ── Step 1: Create group ── */}
            <form action={handleCreateGroup} autoComplete="off">
                <FieldGroup>
                    <FieldSet>
                        <FieldLegend>New group chat</FieldLegend>
                        <FieldDescription>
                            Give your group chat a name to get started.
                        </FieldDescription>
                        <Field>
                            <FieldLabel htmlFor="groupName">Chat name</FieldLabel>
                            <FieldContent>
                                <Input
                                    id="groupName"
                                    name="groupName"
                                    placeholder="e.g. Weekend crew"
                                    disabled={!!createdGroup}
                                    onChange={() => { if (nameError) setNameError(""); }}
                                />
                            </FieldContent>
                            {nameError && (
                                <p className="text-sm text-destructive">{nameError}</p>
                            )}
                        </Field>
                    </FieldSet>

                    {createdGroup ? (
                        <p className="text-sm text-green-600">
                            "{createdGroup.name}" created — now add some users below.
                        </p>
                    ) : (
                        <Button type="submit" className="w-full">
                            Create group chat
                        </Button>
                    )}
                </FieldGroup>
            </form>

            {/* ── Step 2: Add users (unlocks after group is created) ── */}
            {createdGroup && (
                <>
                    <FieldSeparator className="my-6" />

                    <form id="addUser" action={handleAddUser} autoComplete="off">
                        <FieldGroup>
                            <FieldSet>
                                <FieldLegend>Add users</FieldLegend>
                                <FieldDescription>
                                    Add people to {createdGroup.name} by username.
                                </FieldDescription>
                                <Field>
                                    <FieldLabel htmlFor="user">Username</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            id="user"
                                            name="user"
                                            type="text"
                                            placeholder="e.g. alice"
                                        />
                                    </FieldContent>
                                </Field>
                            </FieldSet>

                            {addedUsers.length > 0 && (
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    {addedUsers.map((u) => (
                                        <li key={u}>✓ {u} added</li>
                                    ))}
                                </ul>
                            )}

                            <Field orientation="horizontal">
                                <Button type="submit" className="flex-1">
                                    Add user
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => (location.href = `/chat/${createdGroup.id}`)}
                                >
                                    Go to chat
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </>
            )}
        </div>
    );
}