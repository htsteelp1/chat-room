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
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { ChevronRight, MessageSquare } from "lucide-react";

const DEMO_PAGES = [
    { route: "/chat/1", name: "Design System Q&A" },
    { route: "/chat/2", name: "React Patterns Deep Dive" },
];

function AppSidebarInner({ pages }) {
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
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Your account">
                            <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                                YO
                            </div>
                            <span className="font-medium">Your Name</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}

/**
 * AppSidebar — layout shell with collapsible sidebar.
 *
 * Wrap your entire app content as children so the sidebar provider
 * can shift the layout correctly with no leftover empty space.
 *
 * Usage in App.jsx:
 *   <AppSidebar pages={[{ route: "/chat/1", name: "global" }]}>
 *     <SidebarTrigger /> ← optional extra trigger inside your content
 *     <div>...rest of your app...</div>
 *   </AppSidebar>
 *
 * A toggle button is already rendered at the top-left of SidebarInset.
 * Import and place <SidebarTrigger /> anywhere inside AppSidebar children
 * for additional triggers.
 */
export { SidebarTrigger };

export default function AppSidebar({ pages = DEMO_PAGES, children }) {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebarInner pages={pages} />

                {/* SidebarInset shifts its content when the sidebar opens/closes
            and collapses to zero width when the sidebar is hidden */}
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