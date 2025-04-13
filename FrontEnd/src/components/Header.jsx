import React from 'react';
import translations from '../utils/translations';
import logo from '../assets/logo.jpg';

function Header({ language }) {
  const t = translations[language?.toLowerCase()] || translations.english;

  return (
    <header className="bg-blue-600 text-white py-4 px-6 shadow-md">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t.appTitle || 'Health Assistant'}</h1>
        <img
          src={logo}
          alt="Health Assistant Logo"
          className="h-10 w-auto"
        />
      </div>
    </header>
  );
}

export default Header;