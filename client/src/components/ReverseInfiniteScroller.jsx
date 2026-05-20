import { useState, useEffect, useRef, useCallback } from "react";

// ── Palette ──────────────────────────────────────────────────────
const C = {
    bg:        "#09090b",
    card:      "#18181b",
    elevated:  "#27272a",
    border:    "#3f3f46",
    mutedFg:   "#71717a",
    subtleFg:  "#a1a1aa",
    fg:        "#fafafa",
    dimFg:     "#e4e4e7",
    primary:   "#6366f1",
    primaryFg: "#fff",
    success:   "#22c55e",
    error:     "#ef4444",
};

// ── Helpers ──────────────────────────────────────────────────────
function userColor(name) {
    let hash = 0;
    for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue},65%,62%)`;
}

// Intercepts raw SQLite strings to ensure JavaScript treats them as UTC
function parseDate(ts) {
    if (!ts) return new Date();
    if (typeof ts === 'number') return new Date(ts);

    // If it's a raw SQLite string ("YYYY-MM-DD HH:MM:SS"), make it a valid ISO UTC string
    if (typeof ts === 'string' && !ts.includes('Z') && !ts.includes('+')) {
        return new Date(ts.replace(' ', 'T') + 'Z');
    }
    return new Date(ts);
}

function formatTime(d) {
    return parseDate(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(date) {
    const now = new Date();
    const d = parseDate(date);

    // Strip hours/minutes to compare pure calendar dates in local time
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (targetDate.getTime() === today.getTime()) return "Today";
    if (targetDate.getTime() === yesterday.getTime()) return "Yesterday";

    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth()    === b.getMonth()    &&
        a.getDate()     === b.getDate();
}

// ── Sub-components ───────────────────────────────────────────────
function Avatar({ name, size = 32 }) {
    const color = userColor(name);
    return (
        <div style={{
            width: size, height: size, borderRadius: 8, flexShrink: 0,
            background: color + "22", border: `1px solid ${color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.32, fontWeight: 600, color, userSelect: "none",
        }}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}

// ── DateDivider ──────────────────────────────────────────────────
function DateDivider({ date }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 16px 10px", userSelect: "none" }}>
            <div style={{ flex: 1, height: "1px", background: C.elevated }} />
            <span style={{
                fontSize: 11, fontWeight: 500, color: C.mutedFg,
                letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "2px 10px", borderRadius: 9999,
                border: `1px solid ${C.elevated}`, background: C.card,
            }}>
        {formatDateLabel(date)}
      </span>
            <div style={{ flex: 1, height: "1px", background: C.elevated }} />
        </div>
    );
}

// ── Message ──────────────────────────────────────────────────────
function Message({ msg, isGrouped }) {
    const [hovered, setHovered] = useState(false);
    const color = userColor(msg.author);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex", gap: 10,
                padding: isGrouped ? "1px 16px" : "8px 16px 2px",
                background: msg.failed ? `${C.error}11` : hovered ? `${C.elevated}55` : "transparent",
                borderRadius: 6, transition: "background 100ms", alignItems: "flex-start",
            }}
        >
            <div style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: isGrouped ? 0 : 2 }}>
                {isGrouped ? (
                    <span style={{ fontSize: 10, color: hovered ? C.mutedFg : "transparent", transition: "color 100ms", lineHeight: "20px" }}>
            {formatTime(msg.timestamp)}
          </span>
                ) : (
                    <Avatar name={msg.author} />
                )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                {!isGrouped && (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 500, fontSize: 13.5, color, cursor: "pointer" }}>{msg.author}</span>
                        <span style={{ fontSize: 11, color: C.mutedFg }}>{formatTime(msg.timestamp)}</span>
                        {msg.pending && <span style={{ fontSize: 11, color: C.mutedFg, fontStyle: "italic" }}>sending…</span>}
                    </div>
                )}
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: msg.pending ? C.mutedFg : C.dimFg, wordBreak: "break-word" }}>
                    {msg.content}
                </p>
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────
export default function ChatUI({
                                   channelName = "general",
                                   currentUser,
                                   messages = [],
                                   isConnected = true,
                                   onSendMessage,
                                   onLoadMore,
                                   chatID
                               }) {
    const [input, setInput] = useState("");
    const [inputFocused, setInputFocused] = useState(false);
    const [atBottom, setAtBottom] = useState(true);
    const [newCount, setNewCount] = useState(0);

    const scrollRef = useRef(null);
    const autoScrollRef = useRef(true);

    const isNearBottom = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    }, []);

    const scrollToBottom = useCallback((smooth = false) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
    }, []);

    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;

        const near = isNearBottom();
        autoScrollRef.current = near;
        setAtBottom(near);
        if (near) setNewCount(0);

        if (el.scrollTop === 0 && onLoadMore) onLoadMore();
    }, [isNearBottom, onLoadMore]);

    useEffect(() => {
        if (autoScrollRef.current) {
            scrollToBottom();
        } else {
            setNewCount(prev => prev + 1);
        }
    }, [messages.length, scrollToBottom]);

    const handleSend = () => {
        const text = input.trim();
        if (!text || !isConnected) return;
        onSendMessage(text, chatID);
        setInput("");
        requestAnimationFrame(() => scrollToBottom(true));
    };

    const rows = buildRows(messages);
    const canSend = input.trim().length > 0 && isConnected;

    return (
        <div style={{
            display: "flex", flexDirection: "column", height: "100vh",
            background: C.bg, color: C.fg,
            fontFamily: `ui-sans-serif, system-ui, sans-serif`
        }}>
            <style>{`
        .ris-scroll::-webkit-scrollbar { width: 6px }
        .ris-scroll::-webkit-scrollbar-thumb { background: ${C.elevated}; border-radius: 3px }
        .ris-jump:hover { background: ${C.elevated} !important; color: ${C.fg} !important; }
        .ris-send:hover:not(:disabled) { background: #4f46e5 !important; }
        @keyframes ris-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

            {/* Header */}
            <div style={{
                height: 52, display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
                background: C.card, borderBottom: `1px solid ${C.elevated}`, flexShrink: 0
            }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `${C.primary}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.primary }}>#</div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{channelName}</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: isConnected ? C.success : C.error }} />
                    <span style={{ fontSize: 12, color: C.mutedFg }}>{isConnected ? "connected" : "reconnecting…"}</span>
                </div>
            </div>

            {/* Scroll Area */}
            <div ref={scrollRef} onScroll={handleScroll} className="ris-scroll" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                <div style={{ paddingBottom: 6 }}>
                    {rows.map(row => (
                        row.type === "divider"
                            ? <DateDivider key={row.key} date={row.date} />
                            : <div key={row.key} style={{ animation: "ris-in 140ms ease-out" }}><Message msg={row.msg} isGrouped={row.grouped} /></div>
                    ))}
                </div>
            </div>

            {/* Input Bar */}
            <div style={{ padding: "0 12px 12px", background: C.bg, position: "relative" }}>
                {!atBottom && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 2px)", right: 16, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        {newCount > 0 && (
                            <div onClick={() => scrollToBottom(true)} style={{ background: C.primary, color: C.primaryFg, fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: "6px 6px 0 0", cursor: "pointer" }}>
                                {newCount} new messages ↓
                            </div>
                        )}
                        <button className="ris-jump" onClick={() => scrollToBottom(true)} style={{ background: C.card, border: `1px solid ${C.elevated}`, borderRadius: newCount > 0 ? "0 0 6px 6px" : 6, color: C.subtleFg, padding: "5px 14px", fontSize: 12.5, cursor: "pointer" }}>
                            Jump to present ↓
                        </button>
                    </div>
                )}

                <div style={{
                    display: "flex", alignItems: "center", gap: 6, background: C.card,
                    border: `1px solid ${inputFocused ? C.border : C.elevated}`, borderRadius: 8, padding: "0 6px 0 12px",
                    boxShadow: inputFocused ? `0 0 0 2px ${C.primary}33` : "none", opacity: isConnected ? 1 : 0.5
                }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        placeholder={`Message #${channelName}`}
                        disabled={!isConnected}
                        style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.fg, fontSize: 13.5, padding: "10px 0" }}
                    />
                    <button
                        className="ris-send"
                        onClick={handleSend}
                        disabled={!canSend}
                        style={{
                            background: canSend ? C.primary : "transparent", border: "none", borderRadius: 6,
                            color: canSend ? C.primaryFg : C.border, width: 32, height: 32, cursor: canSend ? "pointer" : "default"
                        }}
                    >↵</button>
                </div>
            </div>
        </div>
    );
}

// ── Row Builder ──────────────────────────────────────────────────
function buildRows(messages) {
    const rows = [];
    let lastDay = null, lastAuthor = null, lastTime = null;
    messages.forEach((msg, idx) => {
        const d = parseDate(msg.timestamp);
        if (!lastDay || !isSameDay(lastDay, d)) {
            rows.push({ type: "divider", date: d, key: `div-${idx}` });
            lastDay = d; lastAuthor = null;
        }
        const grouped = lastAuthor === msg.author && lastTime && d - lastTime < 5 * 60 * 1000;
        rows.push({ type: "msg", msg, grouped, key: msg.id || idx });
        lastAuthor = msg.author;
        lastTime = d;
    });
    return rows;
}