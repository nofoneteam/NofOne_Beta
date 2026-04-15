"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { CountryConfig } from "@/lib/countryData";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countryData";
import { cn } from "@/lib/utils";

interface CountryCodeSelectorProps {
  value: CountryConfig;
  onChange: (country: CountryConfig) => void;
  disabled?: boolean;
}

export function CountryCodeSelector({ value, onChange, disabled = false }: CountryCodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
            : "border-green-200 bg-white text-green-950 hover:border-green-300 hover:bg-green-50",
        )}
      >
        <span className="text-lg">{value.flag}</span>
        <span className="hidden text-green-700 sm:inline">{value.dialCode}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-green-600 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-lg border border-green-200 bg-white shadow-lg">
          {/* Search Input */}
          <div className="border-b border-green-100 p-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-green-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-green-200 bg-green-50 py-2 pl-8 pr-3 text-sm focus:border-green-400 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-green-50 px-4 py-3 text-left text-sm transition-colors hover:bg-green-50",
                    value.code === country.code && "bg-green-50",
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-green-950">{country.name}</div>
                    <div className="text-xs text-green-700">{country.dialCode}</div>
                  </div>
                  {value.code === country.code && (
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-green-700">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
