import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingIndicator from './LoadingIndicator';
import translations from '../utils/translations';

const API_URL = 'https://health-information-portal.onrender.com';

function ChatInterface({ language }) {
  const navigate = useNavigate();
  const t = translations[language.toLowerCase()] || translations.english;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [micPermission, setMicPermission] = useState('prompt');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [speechInterval, setSpeechInterval] = useState(null);

  const messagesEndRef = useRef(null);
  const recognition = useRef(null);
  useEffect(() => {
  if (!window.speechSynthesis) return;

  // Create a more robust voice loading function
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log("Voices loaded:", voices.length);

    if (voices.length > 0) {
      setVoicesLoaded(true);
      return true;
    }
    return false;
  };

  // Try immediate loading
  if (loadVoices()) return;

  // Set up event listener
  window.speechSynthesis.onvoiceschanged = loadVoices;

  // Chrome sometimes needs a "kick" to load voices
  window.speechSynthesis.cancel();

  // For testing only - auto try forcing voices
  // Uncomment if needed: setTimeout(forceVoiceLoad, 1000);

  return () => {
    window.speechSynthesis.onvoiceschanged = null;
  };
}, []);
  // Add this function to your component
const forceVoiceLoad = () => {
  // Create a silent utterance to force voice loading
  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0; // Silent
  utterance.rate = 1;
  utterance.onend = () => {
    // Check if voices are now available
    const voices = window.speechSynthesis.getVoices();
    console.log("Voices after user interaction:", voices.length);
    if (voices.length > 0) {
      setVoicesLoaded(true);
    }
  };

  // This forces Chrome to load voices
  window.speechSynthesis.speak(utterance);
};

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

  // Initialize and load voices
  useEffect(() => {
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }

    // Force voice loading with multiple attempts
    let attempts = 0;
    let voiceLoadTimer = null;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log(`Attempt ${attempts+1}: Voices loaded:`, voices.length);

      if (voices.length > 0) {
        setVoicesLoaded(true);
        clearTimeout(voiceLoadTimer);

        // Log available languages
        const langSet = new Set();
        voices.forEach(voice => {
          langSet.add(voice.lang.split('-')[0]);
          console.log(`Voice: ${voice.name}, Lang: ${voice.lang}`);
        });
        console.log("Available languages:", [...langSet]);

      } else if (attempts < 10) {
        // Try again with increasing delays
        attempts++;
        const delay = attempts * 100;
        voiceLoadTimer = setTimeout(loadVoices, delay);
      }
    };

    // Set up the onvoiceschanged event
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Initial try
    loadVoices();

    // One more attempt after 1 second
    setTimeout(loadVoices, 1000);

    return () => {
      if (voiceLoadTimer) clearTimeout(voiceLoadTimer);
    };
  }, []);

  // Function to speak text
  const speakText = (text, messageId) => {
    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      setError("Speech synthesis not supported in your browser");
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    if (speechInterval) {
      clearInterval(speechInterval);
      setSpeechInterval(null);
    }

    // Toggle off if already speaking this message
    if (isSpeaking && messageId === speakingMessageId) {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    // Clean text by removing markdown
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/•/g, '');
    console.log("Speaking text:", cleanText);

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log(`Found ${voices.length} voices`);

    // If no voices at all, alert the user
    if (voices.length === 0) {
      setError("No speech voices available in your browser");
      return;
    }

    // Map language codes to BCP 47 language tags
    const langMap = {
      'english': 'en',
      'hindi': 'hi',
      'bengali': 'bn',
      'telugu': 'te',
      'tamil': 'ta',
      'marathi': 'mr',
      'gujarati': 'gu',
      'kannada': 'kn',
      'malayalam': 'ml',
      'punjabi': 'pa'
    };

    // Get language code
    const langCode = langMap[language.toLowerCase()] || 'en';
    console.log("Selected language code:", langCode);

    // Try to find a language match - first exact match, then close match, then default to first voice
    const exactMatch = voices.find(v => v.lang === langCode);
    const closeMatch = voices.find(v => v.lang.startsWith(langCode));
    const defaultVoice = voices[0];

    const selectedVoice = exactMatch || closeMatch || defaultVoice;

    console.log("Using voice:", selectedVoice.name);
    utterance.voice = selectedVoice;

    // Set language (even if no matching voice)
    utterance.lang = langCode;

    // Set rate and pitch for better understanding
    utterance.rate = 0.9;  // slightly slower
    utterance.pitch = 1.0; // normal pitch

    // Set speaking states
    setIsSpeaking(true);
    setSpeakingMessageId(messageId);

    // Handle speech end
    utterance.onend = () => {
      console.log("Speech ended");
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    // Handle speech error
    utterance.onerror = (event) => {
      console.error("Speech error:", event);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      setError("Error speaking text");
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
    console.log("Speech started");

    // Chrome workaround - keep speech alive
    if (navigator.userAgent.includes('Chrome')) {
      clearInterval(speechInterval);
      const intervalId = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(intervalId);
          setSpeechInterval(null);
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);
      setSpeechInterval(intervalId);
    }
  };

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (speechInterval) clearInterval(speechInterval);
    };
  }, [speechInterval]);

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
          language_code: language
        }),
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();

      const formattedResponse = `
**${t.condition}** ${data.name}

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
                <div
                  className="whitespace-pre-line"
                  dangerouslySetInnerHTML={{
                    __html: message.text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                  }}
                />

                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>

                  {message.sender === 'bot' && (
                    <button
                      onClick={() => speakText(message.text, index)}
                      className={`p-1 rounded-full ${
                        isSpeaking && speakingMessageId === index
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={isSpeaking && speakingMessageId === index ? t.stopSpeaking : t.startSpeaking}
                    >
                      {isSpeaking && speakingMessageId === index ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
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