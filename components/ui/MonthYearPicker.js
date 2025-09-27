import { useState, useEffect } from 'react';

const MonthYearPicker = ({ value, onChange, className = '' }) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Convert to 1-12

  // Parse the current value (YYYY-MM format) 
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value && value.includes('-')) {
      return parseInt(value.split('-')[0]);
    }
    return currentYear; // Default to current year
  });
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (value && value.includes('-')) {
      return parseInt(value.split('-')[1]);
    }
    return currentMonth; // Default to current month
  });

  // Sync state when value prop changes (but don't auto-reset to current)
  useEffect(() => {
    if (value && value.includes('-')) {
      const [year, month] = value.split('-').map(Number);
      setSelectedYear(year);
      setSelectedMonth(month);
    }
    // Don't auto-reset when value is empty - let user control dropdowns
  }, [value]);

  // Generate year options (Todos + current year and 2 previous years)
  const yearOptions = [
    { value: '', label: 'Todos' }, // Option to show all years
    ...Array.from({ length: 3 }, (_, i) => {
      const year = currentYear - i;
      return { value: year, label: year.toString() };
    })
  ];

  const monthOptions = [
    { value: '', label: 'Todos' }, // Option to show all months
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  // Initialize with current month/year on first load only
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (!hasInitialized && (!value || value.trim() === '')) {
      // Auto-set to current month/year on initialization
      const monthString = String(currentMonth).padStart(2, '0');
      const defaultValue = `${currentYear}-${monthString}`;
      if (onChange) {
        onChange(defaultValue);
      }
      setHasInitialized(true);
    }
  }, [value, hasInitialized, currentMonth, currentYear, onChange]);

  // Update parent when month or year changes
  useEffect(() => {
    // If either month or year is "Todos" (empty), clear the filter
    if (selectedMonth === '' || selectedYear === '') {
      if (onChange) {
        onChange('');
      }
    } else {
      // Both month and year are selected, create filter value
      const monthString = String(selectedMonth).padStart(2, '0');
      const newValue = `${selectedYear}-${monthString}`;
      if (onChange) {
        onChange(newValue);
      }
    }
  }, [selectedMonth, selectedYear, onChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Month and Year Dropdowns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Month Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Mes
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedMonth(value === '' ? '' : parseInt(value));
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Año
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedYear(value === '' ? '' : parseInt(value));
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {yearOptions.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
};

export default MonthYearPicker;
