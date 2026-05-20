import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { ChevronRight, LogIn, MessageSquare, Plus } from "lucide-react";

const DEMO_PAGES = [
    { route: "/chat/1", name: "Design System Q&A" },
    { route: "/chat/2", name: "React Patterns Deep Dive" },
];

const NAV_ITEMS = [
    { route: "/create", name: "Create group chat", icon: Plus },
    { route: "/login", name: "Login / Register", icon: LogIn },
];

function AppSidebarInner({ pages, username }) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(true);

    const activeRoute = window.location.pathname;

    const filtered = pages.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center gap-2 px-1 py-1">
                            <SidebarTrigger className="-ml-1" />
                            <span className="font-semibold text-sm">Chats</span>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarInput
                    placeholder="Search chats…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </SidebarHeader>

            <SidebarContent>
                {/* ── Chats section ── */}
                <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
                    <SidebarGroup>
                        <SidebarGroupLabel asChild>
                            <CollapsibleTrigger className="flex w-full items-center">
                                Conversations
                                <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {filtered.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-sidebar-foreground/50">
                                            No chats found
                                        </p>
                                    ) : (
                                        filtered.map((page) => (
                                            <SidebarMenuItem key={page.route}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={activeRoute === page.route}
                                                    tooltip={page.name}
                                                >
                                                    <a href={page.route}>
                                                        <MessageSquare />
                                                        <span>{page.name}</span>
                                                    </a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))
                                    )}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>

                <SidebarSeparator />

                {/* ── Actions section ── */}
                <SidebarGroup>
                    <SidebarGroupLabel>Actions</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {NAV_ITEMS.map(({ route, name, icon: Icon }) => (
                                <SidebarMenuItem key={route}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={activeRoute === route}
                                        tooltip={name}
                                    >
                                        <a href={route}>
                                            <Icon />
                                            <span>{name}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Your account">
                            <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                                {username[0].toLocaleUpperCase()}
                            </div>
                            <span className="font-medium">{username}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}

export { SidebarTrigger };

export default function AppSidebar({ pages = DEMO_PAGES, children, username }) {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebarInner pages={pages} username={username}/>
                <SidebarInset>
                    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
                        <SidebarTrigger />
                    </header>
                    <div className="flex flex-1 flex-col">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}