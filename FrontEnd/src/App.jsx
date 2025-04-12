import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_URL = 'https://health-information-portal.onrender.com';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('english');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);
  const [micPermission, setMicPermission] = useState('prompt');

  const messagesEndRef = useRef(null);
  const recognition = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    const initSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        return false;
      }

      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);
        setInput(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicPermission('denied');
          setError('Microphone access denied. Please enable it in your browser settings.');
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };

      return true;
    };

    initSpeechRecognition();

    return () => {
      if (recognition.current) {
        try {
          recognition.current.abort();
        } catch (e) {
          console.error('Error cleaning up:', e);
        }
      }
    };
  }, []);

  // Fetch languages and handle scrolling
  useEffect(() => {
    // Fetch languages only once
    if (isLanguageLoading) {
      fetch(`${API_URL}/languages`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log("Languages loaded:", data.languages);
          setSupportedLanguages(data.languages);
        })
        .catch(err => {
          console.error('Failed to fetch languages:', err);
          setSupportedLanguages(['english', 'hindi', 'bengali']);
        })
        .finally(() => {
          setIsLanguageLoading(false);
        });
    }

    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isLanguageLoading, messages]);

  const toggleListening = () => {
    if (!recognition.current) {
      setError('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognition.current.stop();
    } else {
      setError(null);

      if (micPermission === 'denied') {
        setError('Microphone access denied');
        return;
      }

      try {
        // Map language to BCP 47 language tag
        const langMap = {
          'english': 'en-US',
          'hindi': 'hi-IN',
          'bengali': 'bn-IN',
          'telugu': 'te-IN',
          'tamil': 'ta-IN',
          'marathi': 'mr-IN',
          'gujarati': 'gu-IN',
          'kannada': 'kn-IN',
          'malayalam': 'ml-IN',
          'punjabi': 'pa-IN'
        };

        recognition.current.lang = langMap[language.toLowerCase()] || 'en-US';
        console.log('Starting recognition with:', recognition.current.lang);
        recognition.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Error starting recognition:', e);
        setError(`Failed to start recognition: ${e.message}`);
      }
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();

    if (!input.trim()) return;

    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/health-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: input,
          language_code: language
        }),
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();

      // Format the response
      const formattedResponse = `
**${data.name}**

**Home Remedies:**
${data.remedies.map(r => `• ${r}`).join('\n')}

**Advice:**
${data.advice.map(a => `• ${a}`).join('\n')}

**When to Consult:**
${data.consult.map(c => `• ${c}`).join('\n')}`;

      const botMessage = {
        text: formattedResponse,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        structuredData: data
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
        <h1 className="text-2xl font-bold">Rural India AI Assistant</h1>
      </header>

      <div className="flex items-center justify-between bg-blue-500 px-6 py-2">
        <div className="text-white">
          <label htmlFor="language-select" className="mr-2">Select Language:</label>
          {isLanguageLoading ? (
            <span className="text-white text-opacity-80">Loading languages...</span>
          ) : (
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border rounded bg-white text-gray-800 px-2 py-1"
            >
              {supportedLanguages.length > 0 ? (
                supportedLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                ))
              ) : (
                <option value="english">English</option>
              )}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Describe your symptoms in your preferred language</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 border border-gray-300'
                }`}
              >
                <p className="whitespace-pre-line">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 max-w-xs">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-300 p-4 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-full ${
              isListening
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            disabled={isLoading}
            title={isListening ? "Stop listening" : "Start speaking"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>

        {/* Debug button (visible only in development) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-2">
            <button
              type="button"
              className="text-xs bg-gray-200 px-2 py-1 rounded"
              onClick={() => console.log('Speech recognition:', {
                supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
                instance: recognition.current,
                listening: isListening,
                permission: micPermission
              })}
            >
              Debug Speech Recognition
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default App;