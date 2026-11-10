import { createContext, useContext, useState, ReactNode } from 'react';
import { COUNTRIES, CountryCode } from '../lib/constants';

type Country = typeof COUNTRIES[number];

type CountryContextType = {
  selectedCountry: Country;
  setCountryCode: (code: CountryCode) => void;
};

const CountryContext = createContext<CountryContextType | null>(null);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);

  const setCountryCode = (code: CountryCode) => {
    const c = COUNTRIES.find(c => c.code === code);
    if (c) setSelectedCountry(c);
  };

  return (
    <CountryContext.Provider value={{ selectedCountry, setCountryCode }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used within CountryProvider');
  return ctx;
}
