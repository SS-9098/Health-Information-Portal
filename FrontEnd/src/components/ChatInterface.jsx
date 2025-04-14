  import { useState, useRef, useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import LoadingIndicator from './LoadingIndicator';
  import translations from '../utils/translations';

  const API_URL = import.meta.env.PROD
  ? 'https://health-advice-api.onrender.com'
  : 'http://localhost:8000';

  function ChatInterface({ language }) {
    const navigate = useNavigate();
    const t = translations[language.toLowerCase()] || translations.english;
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isListening, setIsListening] = useState(false);
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
            setError(t.microphoneDenied);
          } else {
            setError(`${t.speechRecognitionError}: ${event.error}`);
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
    }, [t]);

    // Scroll to bottom when messages change
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const toggleListening = () => {
      if (!recognition.current) {
        setError(t.speechRecognitionNotSupported);
        return;
      }

      if (isListening) {
        recognition.current.stop();
      } else {
        setError(null);

        if (micPermission === 'denied') {
          setError(t.microphoneDenied);
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
          setError(`${t.speechRecognitionError}: ${e.message}`);
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
            language: language
          }),
        });

        if (!response.ok) throw new Error('Server error');

        const data = await response.json();

        const formattedResponse = `
  **${data.name}**
  
  **${t.remedies}**
  ${data.remedies.map(r => `• ${r}`).join('\n')}
  
  **${t.advice}**
  ${data.advice.map(a => `• ${a}`).join('\n')}
  
  **${t.consult}**
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
        setError(t.serverStarting);
      } finally {
        setIsLoading(false);
      }
    };

    const changeLanguage = () => {
      navigate('/');
    };

    return (
      <>
        <div className="flex items-center justify-between bg-blue-500 px-6 py-2">
          <div className="text-white">
            <span className="mr-2">{t.languageLabel}: {language.charAt(0).toUpperCase() + language.slice(1)}</span>
            <button
              onClick={changeLanguage}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded ml-2"
            >
              {t.changeLanguage}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>{t.emptyMessage}</p>
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
          {isLoading && <LoadingIndicator />}
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
              placeholder={t.inputPlaceholder}
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
              title={isListening ? t.stopListening : t.startSpeaking}
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
              {t.send}
            </button>
          </div>
        </form>
      </>
    );
  }

  export default ChatInterface;