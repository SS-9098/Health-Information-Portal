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
  const [audioPlayer, setAudioPlayer] = useState(null);

  const messagesEndRef = useRef(null);
  const recognition = useRef(null);

  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };
    setAudioPlayer(audio);

    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

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

  const speakText = async (text, messageId) => {
    // If already speaking the same message, stop it
    if (isSpeaking && messageId === speakingMessageId) {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.src = '';
      }
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    // Clean the text (remove markdown)
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/•/g, '');
    console.log("Speaking text:", cleanText);

    try {
      setIsSpeaking(true);
      setSpeakingMessageId(messageId);

      // Call the TTS endpoint
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          language_code: language
        }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      // Get the audio blob and create an object URL
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      if (audioPlayer) {
        audioPlayer.src = audioUrl;
        await audioPlayer.play();
      }
    } catch (err) {
      console.error('TTS Error:', err);
      setError(t.ttsError || "Error generating speech");
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

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
