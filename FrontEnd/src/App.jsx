import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './components/Header';
import LanguageSelector from './components/LanguageSelector';
import ChatInterface from './components/ChatInterface';
import './App.css';

const API_URL = 'https://health-information-portal.onrender.com';

function App() {
  const [language, setLanguage] = useState(null);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen bg-gray-100">
        <Header language={language || 'english'} />

        <Routes>
          <Route
            path="/"
            element={
              <LanguageSelector
                supportedLanguages={supportedLanguages}
                isLoading={isLanguageLoading}
                setLanguage={setLanguage}
              />
            }
          />
          <Route
            path="/chat"
            element={
              language ?
              <ChatInterface language={language} /> :
              <Navigate to="/" replace />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
