import React, { useState } from "react";
import { Button } from "@/components/ui/button";

const App = () => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  };

  const handleVoiceInput = () => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "hi-IN"; // Change to dynamic lang if needed
    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setQuery(spokenText);
      sendToBackend(spokenText);
    };
    recognition.start();
  };

  const sendToBackend = async (text) => {
    const res = await fetch("http://localhost:5000/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: text }),
    });
    const data = await res.json();
    setResponse(data.response);
    speak(data.response);
  };

  return (
    <div className="p-4 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">Health Info Portal 🇮🇳</h1>
      <Button onClick={handleVoiceInput}>🎙️ Speak</Button>
      <p className="mt-4 text-lg">You asked: {query}</p>
      <p className="mt-2 text-green-600 font-medium">Response: {response}</p>
    </div>
  );
};

export default App;