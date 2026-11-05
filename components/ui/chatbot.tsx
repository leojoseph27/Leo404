"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import "./chatbot.css";

const WELCOME_MESSAGE =
  "Hello, I'm Leo — the AI version of Leo Joseph. Feel free to ask me anything to learn more about me!";
const AVATAR_SRC = "/chatbot-avatar.png";

function markdownToHTML(text: string): string {
  if (!text) return "";
  let html = text;
  html = html.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\n/g, "<br>");
  const lines = html.split("<br>");
  let inList = false;
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const listMatch = line.match(/^[\*\-\•]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line) result.push(line);
    }
  }
  if (inList) result.push("</ul>");
  html = result.join("<br>");
  html = html.replace(/<br>\s*<\/ul>/g, "</ul>");
  html = html.replace(/<ul>\s*<br>/g, "<ul>");
  html = html.replace(/<\/ul>\s*<br>\s*<ul>/g, "</ul><ul>");
  return html;
}

function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

type MessageItem = { text: string; sender: "user" | "bot"; time: string };

// ---------------------------------------------------------------------------
// Shared chatbot open/close store.
//
// The Chatbot widget is mounted once in app/layout.tsx. Anywhere else on
// the page (e.g. the "Chat with Leo AI" hero button) can open that SAME
// instance through openLeoChat() — one conversation, one state, no
// duplicate widgets. useSyncExternalStore keeps consumers in sync without
// a context provider spanning the whole layout.
// ---------------------------------------------------------------------------

let chatOpen = false;
const chatListeners = new Set<() => void>();

function setChatOpen(next: boolean) {
  if (chatOpen === next) return;
  chatOpen = next;
  for (const l of chatListeners) l();
}

/** Open the existing Leo AI chatbot (same instance as the floating icon). */
export function openLeoChat() {
  setChatOpen(true);
}

function subscribeChatOpen(listener: () => void) {
  chatListeners.add(listener);
  return () => chatListeners.delete(listener);
}

function useChatOpen(): [boolean, (next: boolean) => void] {
  const open = React.useSyncExternalStore(
    subscribeChatOpen,
    () => chatOpen,
    () => false
  );
  return [open, setChatOpen];
}

export function Chatbot() {
  // Open state lives in the shared store so other entry points
  // (hero CTA, floating icon) drive the same single widget instance.
  const [open, setOpen] = useChatOpen();
  const [tooltipShow, setTooltipShow] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  // Stable per-conversation id: the server keeps this visitor's chat
  // history under it, so separate visitors never share context.
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [typing, setTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [sendDisabled, setSendDisabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTooltipShow(true), 100);
    const hide = setTimeout(() => setTooltipShow(false), 4600);
    return () => {
      clearTimeout(t);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (open && !welcomeShown) {
      const t = setTimeout(() => {
        setMessages((m) => [
          ...m,
          { text: WELCOME_MESSAGE, sender: "bot", time: getCurrentTime() },
        ]);
        setWelcomeShown(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [open, welcomeShown]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const toggleChat = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const addMessage = useCallback((text: string, sender: "user" | "bot") => {
    setMessages((m) => [
      ...m,
      { text, sender, time: getCurrentTime() },
    ]);
  }, []);

  const sendMessage = useCallback(async () => {
    const msg = inputValue.trim();
    if (!msg) return;

    setInputValue("");
    setInputDisabled(true);
    setSendDisabled(true);
    addMessage(msg, "user");
    setTyping(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sessionId: sessionIdRef.current }),
      });
      const data = await res.json();
      const reply = data.reply || "I'm sorry, but this information is not available.";
      setTyping(false);
      // Stream reply word by word like Elora
      const words = reply.split(" ");
      for (let i = 0; i <= words.length; i++) {
        await new Promise((r) => setTimeout(r, 50));
        const partial = words.slice(0, i + 1).join(" ");
        setMessages((m) => {
          const next = [...m];
          if (i === 0) next.push({ text: partial, sender: "bot", time: getCurrentTime() });
          else next[next.length - 1] = { ...next[next.length - 1], text: partial };
          return next;
        });
      }
    } catch (err) {
      setTyping(false);
      addMessage("Error contacting server. Please try again.", "bot");
      console.error("Chatbot error:", err);
    } finally {
      setInputDisabled(false);
      setSendDisabled(false);
    }
  }, [inputValue, addMessage]);

  const onKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {tooltipShow && (
        <div
          className={`leo-chat-tooltip ${tooltipShow ? "leo-chat-tooltip-show" : ""}`}
          id="leoChatTooltip"
        >
          Chat with my AI Version
        </div>
      )}
      <button
        type="button"
        className={`leo-chat-button ${open ? "leo-chat-button-hidden" : ""}`}
        onClick={toggleChat}
        aria-label="Open chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      <div
        className={`leo-chat-container ${open ? "leo-chat-container-open" : ""}`}
        id="leoChatContainer"
      >
        <div className="leo-chat-header">
          <div className="leo-chat-header-content">
            <Image src={AVATAR_SRC} alt="Leo AI" width={32} height={32} className="leo-chat-header-avatar" />
            <div className="leo-chat-header-info">
              <h2>Leo AI</h2>
              <span className="leo-chat-status">Online</span>
            </div>
          </div>
          <button
            type="button"
            className="leo-chat-close-button"
            onClick={toggleChat}
            aria-label="Close chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="leo-chat-messages">
          {messages.map((item, i) => (
            <div
              key={i}
              className={`leo-chat-message ${item.sender === "user" ? "leo-chat-message-user" : "leo-chat-message-bot"}`}
            >
              {item.sender === "bot" && (
                <Image
                  src={AVATAR_SRC}
                  alt="Leo AI"
                  width={32}
                  height={32}
                  className="leo-chat-message-avatar"
                />
              )}
              <div className="leo-chat-message-bubble">
                {item.sender === "bot" ? (
                  <span dangerouslySetInnerHTML={{ __html: markdownToHTML(item.text) }} />
                ) : (
                  item.text
                )}
                <div className="leo-chat-message-time">{item.time}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={`leo-chat-typing-indicator ${typing ? "leo-chat-typing-indicator-active" : ""}`}>
          <div className="leo-chat-typing-dots">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="leo-chat-input-container">
          <input
            ref={inputRef}
            type="text"
            className="leo-chat-user-input"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={inputDisabled}
            autoComplete="off"
          />
          <button
            type="button"
            className="leo-chat-send-button"
            onClick={sendMessage}
            disabled={sendDisabled}
            aria-label="Send"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
