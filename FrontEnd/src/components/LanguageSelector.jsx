      import { useNavigate } from 'react-router-dom';
      import translations from '../utils/translations';

      function LanguageSelector({ supportedLanguages, isLoading, setLanguage }) {
        const navigate = useNavigate();
        const t = translations.english;

        const handleLanguageSelect = (selectedLanguage) => {
          setLanguage(selectedLanguage);
          navigate('/chat');
        };

        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-center mb-6">{t.selectLanguage}</h2>

              {isLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supportedLanguages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageSelect(lang)}
                      className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <span>{translations[lang.toLowerCase()]?.nativeName || lang}</span>
                      <span className="text-xs ml-2">({lang})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      export default LanguageSelector;