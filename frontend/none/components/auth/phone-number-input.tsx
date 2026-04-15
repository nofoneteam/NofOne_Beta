"use client";

import { useState, useEffect } from "react";
import type { CountryConfig } from "@/lib/countryData";
import { DEFAULT_COUNTRY, COUNTRIES } from "@/lib/countryData";
import { CountryCodeSelector } from "./country-code-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneNumberInputProps {
  value: string;
  onChange: (phoneNumber: string) => void;
  onCountryChange?: (country: CountryConfig) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function PhoneNumberInput({
  value,
  onChange,
  onCountryChange,
  placeholder = "Enter phone number",
  id = "phone",
  disabled = false,
  label = "Phone number",
  required = false,
}: PhoneNumberInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(DEFAULT_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Extract dial code from value if it starts with one
  useEffect(() => {
    if (value && value.startsWith("+")) {
      // Try to find and extract the dial code
      const match = value.match(/^\+(\d+)/);
      if (match) {
        const dialCode = "+" + match[1];
        // Try to match with a country
        const parts = value.substring(dialCode.length).trim();
        
        // Find country by dial code (handle prefixes like +1-242 for Bahamas)
        for (let i = dialCode.length; i > 1; i--) {
          const possibleDialCode = dialCode.substring(0, i);
          const country = COUNTRIES.find((c) => c.dialCode === possibleDialCode);
          
          if (country) {
            setSelectedCountry(country);
            setPhoneNumber(value.substring(possibleDialCode.length).trim());
            return;
          }
        }
      }
    } else {
      setPhoneNumber(value);
    }
  }, [value]);

  const handleCountryChange = (country: CountryConfig) => {
    setSelectedCountry(country);
    onCountryChange?.(country);
    // Update phone number with new country code
    const fullNumber = country.dialCode + (phoneNumber ? " " + phoneNumber : "");
    onChange(fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value;
    setPhoneNumber(newPhoneNumber);
    // Combine country dial code with phone number
    const fullNumber = selectedCountry.dialCode + (newPhoneNumber ? " " + newPhoneNumber : "");
    onChange(fullNumber);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex gap-2">
        <CountryCodeSelector
          value={selectedCountry}
          onChange={handleCountryChange}
          disabled={disabled}
        />
        <Input
          id={id}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="flex-1"
        />
      </div>
      <p className="text-xs text-green-600">
        Full number: <span className="font-mono font-medium">{selectedCountry.dialCode} {phoneNumber}</span>
      </p>
    </div>
  );
}
