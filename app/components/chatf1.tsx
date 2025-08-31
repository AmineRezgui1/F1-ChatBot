import React, { useState, useRef, useEffect } from "react";


export default function F1Chat() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = async (messageText = input) => {
        if (!messageText.trim() || isLoading) return;

        const newUserMessage = {
            id: Date.now(),
            role: "user",
            content: messageText
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, newUserMessage]
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Add AI response
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: "assistant",
                content: data.message
            }]);

        } catch (error) {
            console.error('Error calling API:', error);
            // Add error message
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: "assistant",
                content: "Sorry, I'm having trouble connecting. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickButtons = [
        { label: "📅 Calendar", value: "Show me the F1 calendar" },
        { label: "🏆 Results", value: "Latest race results" },
        { label: "👨‍💼 Drivers", value: "Current driver standings" },
        { label: "🏁 Teams", value: "Constructor teams standings" }
    ];

    return (
        <div className="app-container">
            <div className="chat-container">

                {/* Header */}
                <div className="chat-header">
                    <h1>🏎️ F1 RACING HQ 🏁</h1>
                    <p>Season 2025 • Live Data</p>
                </div>
                <div className="messages-container">
                    {messages.length === 0 && (
                        <div className="welcome-message">
                            🏁 Welcome to F1 Racing Command Center!
                            <br />Ask me about races, drivers, or standings! 🏆
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`message ${message.role === "user" ? "user-message" : "bot-message"}`}
                        >
                            <div className="message-bubble">
                                {message.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message bot-message">
                            <div className="message-bubble loading">
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <div className="quick-buttons">
                    {quickButtons.map((button, idx) => (
                        <button
                            key={idx}
                            onClick={() => sendMessage(button.value)}
                            disabled={isLoading}
                            className="quick-button"
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
                <div className="input-container">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Ask about F1..."
                        disabled={isLoading}
                        className="chat-input"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={isLoading || !input.trim()}
                        className="send-button"
                    >
                        {isLoading ? "..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}