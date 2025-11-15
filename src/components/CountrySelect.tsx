import React, { useState, useRef, useEffect } from 'react';
import { FormField } from './FormField';
import './CountrySelect.css';
import { API_ENDPOINTS } from '../config/api';
import { apiClient } from '../utils/apiClient';

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface CountrySelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

// Country name to code mapping for flags (using common names from database)
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'United States': 'US',
  'United Kingdom': 'GB',
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'Poland': 'PL',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Switzerland': 'CH',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Portugal': 'PT',
  'Ireland': 'IE',
  'Luxembourg': 'LU',
  'Greece': 'GR',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Croatia': 'HR',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Canada': 'CA',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Singapore': 'SG',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'India': 'IN',
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Uruguay': 'UY',
  'Paraguay': 'PY',
  'Bolivia': 'BO',
  'Ecuador': 'EC',
  'Venezuela': 'VE',
  'Guyana': 'GY',
  'Suriname': 'SR',
  'French Guiana': 'GF',
  'South Africa': 'ZA',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Tunisia': 'TN',
  'Algeria': 'DZ',
  'Libya': 'LY',
  'Angola': 'AO',
  'Mozambique': 'MZ',
  'Botswana': 'BW',
  'Zimbabwe': 'ZW',
  'Namibia': 'NA',
  'Madagascar': 'MG',
  'Mauritius': 'MU',
  'Seychelles': 'SC',
  'Cape Verde': 'CV',
  'São Tomé and Príncipe': 'ST',
  'Guinea-Bissau': 'GW',
  'Guinea': 'GN',
  'Sierra Leone': 'SL',
  'Liberia': 'LR',
  'Ivory Coast': 'CI',
  'Mali': 'ML',
  'Senegal': 'SN',
  'Gambia': 'GM',
  'Benin': 'BJ',
  'Togo': 'TG',
  'Ghana': 'GH',
  'Nigeria': 'NG',
  'Cameroon': 'CM',
  'Gabon': 'GA',
  'Republic of the Congo': 'CG',
  'Democratic Republic of the Congo': 'CD',
  'Central African Republic': 'CF',
  'Chad': 'TD',
  'Niger': 'NE',
  'Burkina Faso': 'BF',
  'Mauritania': 'MR',
  'Western Sahara': 'EH',
  'Israel': 'IL',
  'Palestine': 'PS',
  'Jordan': 'JO',
  'Lebanon': 'LB',
  'Syria': 'SY',
  'Iraq': 'IQ',
  'Iran': 'IR',
  'Afghanistan': 'AF',
  'Pakistan': 'PK',
  'Nepal': 'NP',
  'Bhutan': 'BT',
  'Bangladesh': 'BD',
  'Sri Lanka': 'LK',
  'Maldives': 'MV',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  'Laos': 'LA',
  'Cambodia': 'KH',
  'Myanmar': 'MM',
  'Brunei': 'BN',
  'East Timor': 'TL',
  'China': 'CN',
  'Mongolia': 'MN',
  'North Korea': 'KP',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'Belarus': 'BY',
  'Moldova': 'MD',
  'Georgia': 'GE',
  'Armenia': 'AM',
  'Azerbaijan': 'AZ',
  'Kazakhstan': 'KZ',
  'Uzbekistan': 'UZ',
  'Turkmenistan': 'TM',
  'Tajikistan': 'TJ',
  'Kyrgyzstan': 'KG',
  'Turkey': 'TR',
};

// Helper function to get country code from name
const getCountryCode = (countryName: string): string => {
  return COUNTRY_NAME_TO_CODE[countryName] || countryName.substring(0, 2).toUpperCase();
};

export const CountrySelect: React.FC<CountrySelectProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
  placeholder = "Select country...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.get<{ countries: string[] }>(API_ENDPOINTS.b2bStats);
        const countryNames: string[] = data.countries || [];
        const countriesList: Country[] = countryNames
          .sort((a, b) => a.localeCompare(b))
          .map(name => ({
            name,
            code: getCountryCode(name),
            flag: '', // Flag icon is handled via CSS class
          }));
        setCountries(countriesList);
        setFilteredCountries(countriesList);
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Filter and sort countries
  useEffect(() => {
    if (isLoading) return;
    
    let filtered = countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // De-duplicate by country name
    const uniqueByName = Array.from(new Map(filtered.map(c => [c.name, c])).values());

    // Sort alphabetically
    uniqueByName.sort((a, b) => a.name.localeCompare(b.name));

    setFilteredCountries(uniqueByName);
  }, [searchTerm, countries, isLoading]);

  // Find selected country (by name)
  useEffect(() => {
    if (isLoading) return;
    
    if (value) {
      const country = countries.find(c => c.name === value || c.code === value);
      setSelectedCountry(country || null);
    } else {
      setSelectedCountry(null);
    }
  }, [value, countries, isLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: Country) => {
    // Send full country name instead of code for database filtering
    onChange({ target: { name, value: country.name } } as React.ChangeEvent<HTMLSelectElement>);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <FormField
      label={label}
      htmlFor={name}
      error={error}
      hint={hint}
      required={required}
    >
      <div className="country-select-wrapper" ref={dropdownRef}>
        <div
          className={`country-select-display ${error ? 'error' : ''} ${isOpen ? 'open' : ''}`}
          onClick={handleToggleDropdown}
        >
          {selectedCountry ? (
            <span className="country-option">
              <span className={`country-flag fi fi-${selectedCountry.code.toLowerCase()}`}></span>
              <span className="country-name">{selectedCountry.name}</span>
            </span>
          ) : (
            <span className="placeholder">{placeholder}</span>
          )}
          <span className="dropdown-arrow">▼</span>
        </div>

        {isOpen && (
          <div className="country-dropdown">
            <div className="country-search">
              <input
                type="text"
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="country-search-input"
                autoFocus
              />
            </div>
            <div className="country-options">
              {isLoading ? (
                <div className="country-no-results">
                  Loading countries...
                </div>
              ) : filteredCountries.length === 0 ? (
                <div className="country-no-results">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country) => (
                  <div
                    key={country.name}
                    className="country-option"
                    onClick={() => handleSelect(country)}
                  >
                    <span className={`country-flag fi fi-${country.code.toLowerCase()}`}></span>
                    <span className="country-name">{country.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
};
