import translations from '../utils/translations';

function Header({ language = 'english' }) {
  const t = translations[language.toLowerCase()] || translations.english;

  return (
    <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
      <h1 className="text-2xl font-bold">{t.appTitle}</h1>
    </header>
  );
}

export default Header;