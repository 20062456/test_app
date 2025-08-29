import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { RevenueData, DailyTotal } from './types';
import RevenueChart from './components/RevenueChart';
import { CalendarIcon, DollarSignIcon, BarChartIcon, MoonIcon, TableIcon } from './components/Icons';

// --- LocalStorage Constants ---
const LOCAL_STORAGE_PREFIX = 'hotelRevenueApp';

// Helper function to format currency in Vietnamese Dong (VND)
const formatCurrency = (value: number): string => {
    if (isNaN(value)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper function to format a number with Vietnamese locale
const formatNumber = (value: number): string => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
};

// Helper to analyze a cell's value for total and overnight stays
const analyzeCellValue = (value: string): { total: number; hasOvernight: boolean } => {
    if (!value?.trim()) return { total: 0, hasOvernight: false };
    let hasOvernight = false;
    const total = value
        .split(' ')
        .filter(Boolean)
        .reduce((sum, entry) => {
            const cleanedEntry = entry.replace(/[\.,]/g, '');
            // Always multiply the parsed number by 1000
            const multipliedValue = (parseInt(cleanedEntry, 10) || 0) * 1000; 
            
            if (multipliedValue > 150000) { // Threshold for overnight stay
                hasOvernight = true;
            }
            return sum + multipliedValue;
        }, 0);
    return { total, hasOvernight };
};


// --- Sub-components defined outside the main component to avoid re-creation on re-renders ---

interface HeaderProps {
    month: string;
    year: number;
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const Header: React.FC<HeaderProps> = ({ month, year, onDateChange }) => (
    <header className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-700">Trình tính doanh thu khách sạn</h1>
            <div className="relative flex items-center">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="month"
                    value={`${year}-${month}`}
                    onChange={onDateChange}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>
        </div>
    </header>
);

interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-primary-100 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// --- Main Application Component ---

const App: React.FC = () => {
    const [currentDate, setCurrentDate] = useState<Date>(() => {
        const savedDate = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}-lastDate`);
        try {
            if (savedDate && new Date(savedDate).getTime()) {
                return new Date(savedDate);
            }
        } catch (e) {
            console.error("Failed to parse saved date, defaulting to current date.", e);
        }
        return new Date();
    });

    const [revenueData, setRevenueData] = useState<RevenueData>({});
    
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>(() => {
        const savedMode = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}-viewMode`);
        return (savedMode === 'daily' || savedMode === 'monthly') ? savedMode : 'daily';
    });

    const { year, month, daysInMonth } = useMemo(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        return {
            year: y,
            month: (m + 1).toString().padStart(2, '0'),
            daysInMonth: new Date(y, m + 1, 0).getDate(),
        };
    }, [currentDate]);

    // Effect for loading data from localStorage when the month changes
    useEffect(() => {
        const storageKey = `${LOCAL_STORAGE_PREFIX}-data-${year}-${month}`;
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                setRevenueData(JSON.parse(savedData));
            } catch (e) {
                console.error("Failed to load or parse data from storage.", e);
                setRevenueData({});
            }
        } else {
            setRevenueData({});
        }
    }, [year, month]);
    
    const dailyTotals = useMemo<DailyTotal[]>(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayRevenue = revenueData[day] || '';
            const total = analyzeCellValue(dayRevenue).total;
            return { day, total };
        });
    }, [revenueData, daysInMonth]);

    const monthlyTotal = useMemo(() => {
        return dailyTotals.reduce((sum, day) => sum + day.total, 0);
    }, [dailyTotals]);
    
    const averageDailyRevenue = useMemo(() => {
        const totalDaysWithRevenue = dailyTotals.filter(d => d.total > 0).length;
        return totalDaysWithRevenue > 0 ? monthlyTotal / totalDaysWithRevenue : 0;
    }, [monthlyTotal, dailyTotals]);

     const overnightSummary = useMemo(() => {
        let totalOvernightStays = 0;
        for (const day in revenueData) {
            const cellValue = revenueData[day];
            const entries = cellValue.split(' ').filter(Boolean);
            for (const entry of entries) {
                const multipliedValue = (parseInt(entry.replace(/[\.,]/g, ''), 10) || 0) * 1000;
                if (multipliedValue > 150000) {
                    totalOvernightStays++;
                }
            }
        }
        return { total: totalOvernightStays };
    }, [revenueData]);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month] = e.target.value.split('-');
        const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}-lastDate`, newDate.toISOString());
        setCurrentDate(newDate);
    }, []);

    const handleRevenueChange = useCallback((day: number, value: string) => {
        const sanitizedValue = value.replace(/[^0-9\s.,]/g, '').replace(/\s+/g, ' ');
        setRevenueData(prevData => {
            const updatedData = {
                ...prevData,
                [day]: sanitizedValue,
            };
            const storageKey = `${LOCAL_STORAGE_PREFIX}-data-${year}-${month}`;
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
            return updatedData;
        });
    }, [year, month]);
    
    const handleViewModeChange = useCallback((mode: 'daily' | 'monthly') => {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}-viewMode`, mode);
        setViewMode(mode);
    }, []);

    const monthName = useMemo(() => {
        return currentDate.toLocaleString('vi-VN', { month: 'long' });
    }, [currentDate]);

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <Header month={month} year={year} onDateChange={handleDateChange} />
            
            <main className="container mx-auto p-4 md:p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                    Tổng quan doanh thu tháng {monthName} năm {year}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <SummaryCard title="Tổng doanh thu tháng" value={formatCurrency(monthlyTotal)} icon={<DollarSignIcon className="h-6 w-6 text-primary-600"/>} />
                    <SummaryCard title="Doanh thu trung bình ngày" value={formatCurrency(averageDailyRevenue)} icon={<BarChartIcon className="h-6 w-6 text-primary-600"/>} />
                    <SummaryCard title="Tổng lượt qua đêm (>150k)" value={formatNumber(overnightSummary.total)} icon={<MoonIcon className="h-6 w-6 text-primary-600"/>} />
                </div>
                
                <div className="flex justify-center mb-6">
                    <div className="flex items-center bg-gray-200 rounded-lg p-1 space-x-1 transition-all duration-300">
                        <button
                          onClick={() => handleViewModeChange('daily')}
                          className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors duration-200 ${viewMode === 'daily' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`}
                          aria-pressed={viewMode === 'daily'}
                        >
                          <TableIcon className="h-5 w-5" />
                          Xem theo ngày
                        </button>
                        <button
                          onClick={() => handleViewModeChange('monthly')}
                          className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors duration-200 ${viewMode === 'monthly' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`}
                           aria-pressed={viewMode === 'monthly'}
                        >
                          <BarChartIcon className="h-5 w-5" />
                          Xem theo tháng
                        </button>
                    </div>
                </div>

                {viewMode === 'daily' && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Bảng nhập liệu doanh thu</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold w-1/4">Ngày</th>
                                        <th className="px-4 py-3 font-semibold w-1/2">Doanh thu trong ngày</th>
                                        <th className="px-4 py-3 font-semibold text-right w-1/4">Tổng ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyTotals.map(({ day, total }) => {
                                        const cellValue = revenueData[day] || '';
                                        const { total: cellTotal, hasOvernight } = analyzeCellValue(cellValue);
                                        return (
                                            <tr key={day} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">{day}</td>
                                                <td className="px-2 py-1">
                                                    <div className="relative">
                                                        {hasOvernight && (
                                                            <MoonIcon className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
                                                        )}
                                                        <input
                                                            type="text"
                                                            placeholder="VD: 50 120 (tự động x1000)"
                                                            value={cellValue}
                                                            onChange={e => handleRevenueChange(day, e.target.value)}
                                                            className={`w-full p-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${hasOvernight ? 'pl-7' : 'pl-2'}`}
                                                            aria-label={`Doanh thu ngày ${day}`}
                                                        />
                                                    </div>
                                                    {cellValue && (
                                                        <div className="text-xs text-primary-700 font-medium text-right pr-1 pt-0.5" aria-label={`Tổng phụ cho ngày ${day}`}>
                                                            = {formatNumber(cellTotal)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 font-semibold text-right text-primary-700">{formatCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                 <tfoot className="bg-gray-100">
                                    <tr className="font-semibold text-gray-900">
                                        <td colSpan={2} className="px-4 py-3 text-right text-base">Tổng doanh thu tháng</td>
                                        <td className="px-4 py-3 text-right text-base">{formatCurrency(monthlyTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
                
                {viewMode === 'monthly' && (
                    <div className="grid grid-cols-1">
                        <RevenueChart data={dailyTotals} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
