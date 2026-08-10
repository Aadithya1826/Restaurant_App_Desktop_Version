import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../locales/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('app_language');
        if (storedLang && translations[storedLang]) {
          setLanguageState(storedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang) => {
    try {
      if (translations[lang]) {
        setLanguageState(lang);
        await AsyncStorage.setItem('app_language', lang);
      }
    } catch (e) {
      console.error('Failed to set language', e);
    }
  };

  const t = (key) => {
    const translationSet = translations[language] || translations['en'];
    return translationSet[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
