import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { RevenueData, DailyTotal, MonthSummary } from './types';
import RevenueChart from './components/RevenueChart';
import ComparisonChart from './components/ComparisonChart';
import { CalendarIcon, DollarSignIcon, BarChartIcon, MoonIcon, TableIcon, UploadCloudIcon, SearchIcon, UsersIcon } from './components/Icons';

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

// Helper to process a day's raw revenue string into structured data
const processDayRevenue = (value: string): { total: number; hasOvernight: boolean; overnightCount: number } => {
    if (!value?.trim()) return { total: 0, hasOvernight: false, overnightCount: 0 };
    let hasOvernight = false;
    let overnightCount = 0;
    const total = value
        .split(' ')
        .filter(Boolean)
        .reduce((sum, entry) => {
            const cleanedEntry = entry.replace(/[\.,]/g, '');
            const multipliedValue = (parseInt(cleanedEntry, 10) || 0) * 1000;
            
            if (multipliedValue > 150000) { // Threshold for overnight stay
                hasOvernight = true;
                overnightCount++;
            }
            return sum + multipliedValue;
        }, 0);
    return { total, hasOvernight, overnightCount };
};

// Standalone utility function to get summary for any given month (for comparison)
const getMonthSummaryForDate = (date: Date): MonthSummary => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const monthStr = (m + 1).toString().padStart(2, '0');
    const dInMonth = new Date(y, m + 1, 0).getDate();
    const storageKey = `${LOCAL_STORAGE_PREFIX}-data-${y}-${monthStr}`;
    const savedDataStr = localStorage.getItem(storageKey);
    const data: RevenueData = savedDataStr ? JSON.parse(savedDataStr) : {};

    let monthlyTotal = 0, totalOvernightStays = 0, daysWithRevenue = 0;
    const dailyTotals = Array.from({ length: dInMonth }, (_, i) => {
        const day = i + 1;
        const { total, overnightCount } = processDayRevenue(data[day] || '');
        monthlyTotal += total;
        if (total > 0) daysWithRevenue++;
        totalOvernightStays += overnightCount;
        return { day, total };
    });

    const averageDailyRevenue = daysWithRevenue > 0 ? monthlyTotal / daysWithRevenue : 0;

    return {
        monthlyTotal, averageDailyRevenue, totalOvernightStays, dailyTotals,
        monthName: date.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })
    };
};


// --- Sub-components defined outside the main component to avoid re-creation on re-renders ---
interface HeaderProps {
    month: string;
    year: number;
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const Header: React.FC<HeaderProps> = ({ month, year, onDateChange }) => (
    <header className="bg-white shadow-md p-4 sticky top-0 z-20">
        <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-700">Trình tính doanh thu khách sạn</h1>
            <div className="relative flex items-center">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="month"
                    value={`${year}-${month}`}
                    onChange={onDateChange}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Select month"
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
        return savedDate ? new Date(savedDate) : new Date();
    });

    const [revenueData, setRevenueData] = useState<RevenueData>({});
    const [searchTerm, setSearchTerm] = useState('');
    
    const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'compare'>(() => {
        const savedMode = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}-viewMode`);
        return (savedMode === 'daily' || savedMode === 'monthly' || savedMode === 'compare') ? savedMode : 'daily';
    });

    // State for comparison view
    const [comparisonDateA, setComparisonDateA] = useState<Date>(() => new Date());
    const [comparisonDateB, setComparisonDateB] = useState<Date>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d;
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

    // Load data for the primary view
    useEffect(() => {
        const storageKey = `${LOCAL_STORAGE_PREFIX}-data-${year}-${month}`;
        try {
            const savedData = localStorage.getItem(storageKey);
            setRevenueData(savedData ? JSON.parse(savedData) : {});
        } catch (e) {
            console.error("Failed to load or parse data from storage.", e);
            setRevenueData({});
        }
    }, [year, month]);
    
    // Memoized summary for the primary view
    const currentMonthSummary = useMemo<MonthSummary>(() => {
        let monthlyTotal = 0;
        let totalOvernightStays = 0;
        let daysWithRevenue = 0;
        
        const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const { total, overnightCount } = processDayRevenue(revenueData[day] || '');
            monthlyTotal += total;
            if(total > 0) daysWithRevenue++;
            totalOvernightStays += overnightCount;
            return { day, total };
        });
        
        const averageDailyRevenue = daysWithRevenue > 0 ? monthlyTotal / daysWithRevenue : 0;
        
        return { 
            monthlyTotal, 
            averageDailyRevenue, 
            totalOvernightStays, 
            dailyTotals,
            monthName: currentDate.toLocaleString('vi-VN', { month: 'long', year: 'numeric' })
        };
    }, [revenueData, daysInMonth, currentDate]);


    const summaryA = useMemo(() => getMonthSummaryForDate(comparisonDateA), [comparisonDateA]);
    const summaryB = useMemo(() => getMonthSummaryForDate(comparisonDateB), [comparisonDateB]);

    const filteredDailyTotals = useMemo(() => {
        if (!searchTerm.trim()) return currentMonthSummary.dailyTotals;
        return currentMonthSummary.dailyTotals.filter(({ day }) => {
            const dayString = String(day);
            const revenueString = revenueData[day] || '';
            return dayString.includes(searchTerm) || revenueString.includes(searchTerm);
        });
    }, [currentMonthSummary.dailyTotals, searchTerm, revenueData]);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value + '-02'); // Use day 2 to avoid timezone issues
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}-lastDate`, newDate.toISOString());
        setCurrentDate(newDate);
    }, []);

    const handleRevenueChange = useCallback((day: number, value: string) => {
        const sanitizedValue = value.replace(/[^0-9\s.,]/g, '').replace(/\s+/g, ' ');
        setRevenueData(prevData => {
            const updatedData = { ...prevData, [day]: sanitizedValue };
            const storageKey = `${LOCAL_STORAGE_PREFIX}-data-${year}-${month}`;
            localStorage.setItem(storageKey, JSON.stringify(updatedData));
            return updatedData;
        });
    }, [year, month]);
    
    const handleViewModeChange = useCallback((mode: 'daily' | 'monthly' | 'compare') => {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}-viewMode`, mode);
        setViewMode(mode);
    }, []);

    const handleExport = useCallback(() => {
        const header = "Ngày,Chi tiết doanh thu,Tổng ngày (VND)\n";
        const rows = currentMonthSummary.dailyTotals.map(({ day, total }) => {
            const rawInput = revenueData[day] || '';
            const escapedInput = `"${rawInput.replace(/"/g, '""')}"`;
            return `${day},${escapedInput},${total}`;
        }).join("\n");
        const csvContent = header + rows;
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `DoanhThu_Thang_${month}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [currentMonthSummary.dailyTotals, revenueData, month, year]);

    const handleComparisonDateChange = (period: 'A' | 'B', value: string) => {
        const newDate = new Date(value + '-02');
        if (period === 'A') setComparisonDateA(newDate);
        else setComparisonDateB(newDate);
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <Header month={month} year={year} onDateChange={handleDateChange} />
            
            <main className="container mx-auto p-4 md:p-6">
                {viewMode !== 'compare' && (
                    <>
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">
                            Tổng quan doanh thu {currentMonthSummary.monthName}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            <SummaryCard title="Tổng doanh thu tháng" value={formatCurrency(currentMonthSummary.monthlyTotal)} icon={<DollarSignIcon className="h-6 w-6 text-primary-600"/>} />
                            <SummaryCard title="Doanh thu trung bình ngày" value={formatCurrency(currentMonthSummary.averageDailyRevenue)} icon={<BarChartIcon className="h-6 w-6 text-primary-600"/>} />
                            <SummaryCard title="Tổng lượt qua đêm (>150k)" value={formatNumber(currentMonthSummary.totalOvernightStays)} icon={<MoonIcon className="h-6 w-6 text-primary-600"/>} />
                        </div>
                    </>
                )}
                
                <div className="flex justify-center mb-6">
                    <div className="flex items-center bg-gray-200 rounded-lg p-1 space-x-1 transition-all duration-300">
                        {/* View Toggles */}
                        <button onClick={() => handleViewModeChange('daily')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors duration-200 ${viewMode === 'daily' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`} aria-pressed={viewMode === 'daily'}><TableIcon className="h-5 w-5" />Xem theo ngày</button>
                        <button onClick={() => handleViewModeChange('monthly')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors duration-200 ${viewMode === 'monthly' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`} aria-pressed={viewMode === 'monthly'}><BarChartIcon className="h-5 w-5" />Xem theo tháng</button>
                        <button onClick={() => handleViewModeChange('compare')} className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors duration-200 ${viewMode === 'compare' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-300/50'}`} aria-pressed={viewMode === 'compare'}><UsersIcon className="h-5 w-5" />So sánh</button>
                    </div>
                </div>

                {viewMode === 'daily' && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <h3 className="text-lg font-semibold text-gray-700">Bảng nhập liệu doanh thu</h3>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-grow">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="text" placeholder="Tìm ngày hoặc số tiền..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"/>
                                </div>
                                <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"><UploadCloudIcon className="h-4 w-4"/>Export</button>
                            </div>
                        </div>
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
                                    {filteredDailyTotals.map(({ day, total }) => {
                                        const cellValue = revenueData[day] || '';
                                        const { hasOvernight, total: cellTotal } = processDayRevenue(cellValue);
                                        return (
                                            <tr key={day} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-900">{day}</td>
                                                <td className="px-2 py-1">
                                                    <div className="relative">
                                                        {hasOvernight && <MoonIcon className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />}
                                                        <input type="text" placeholder="VD: 50 120 (tự động x1000)" value={cellValue} onChange={e => handleRevenueChange(day, e.target.value)} className={`w-full p-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${hasOvernight ? 'pl-7' : 'pl-2'}`} aria-label={`Doanh thu ngày ${day}`} />
                                                    </div>
                                                    {cellValue && <div className="text-xs text-primary-700 font-medium text-right pr-1 pt-0.5" aria-label={`Tổng phụ cho ngày ${day}`}>= {formatNumber(cellTotal)}</div>}
                                                </td>
                                                <td className="px-4 py-2 font-semibold text-right text-primary-700">{formatCurrency(total)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                 <tfoot className="bg-gray-100"><tr className="font-semibold text-gray-900"><td colSpan={2} className="px-4 py-3 text-right text-base">Tổng doanh thu tháng</td><td className="px-4 py-3 text-right text-base">{formatCurrency(currentMonthSummary.monthlyTotal)}</td></tr></tfoot>
                            </table>
                        </div>
                    </div>
                )}
                
                {viewMode === 'monthly' && <div className="grid grid-cols-1"><RevenueChart data={currentMonthSummary.dailyTotals} /></div>}

                {viewMode === 'compare' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg shadow-md">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ so sánh A</label>
                                <input type="month" value={comparisonDateA.toISOString().substring(0, 7)} onChange={e => handleComparisonDateChange('A', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ so sánh B</label>
                                <input type="month" value={comparisonDateB.toISOString().substring(0, 7)} onChange={e => handleComparisonDateChange('B', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                                <h3 className="font-bold text-lg text-primary-700 text-center">{summaryA.monthName}</h3>
                                <SummaryCard title="Tổng doanh thu" value={formatCurrency(summaryA.monthlyTotal)} icon={<DollarSignIcon className="h-6 w-6 text-primary-600"/>} />
                                <SummaryCard title="Doanh thu TB ngày" value={formatCurrency(summaryA.averageDailyRevenue)} icon={<BarChartIcon className="h-6 w-6 text-primary-600"/>} />
                                <SummaryCard title="Tổng lượt qua đêm" value={formatNumber(summaryA.totalOvernightStays)} icon={<MoonIcon className="h-6 w-6 text-primary-600"/>} />
                            </div>
                             <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                                <h3 className="font-bold text-lg text-blue-700 text-center">{summaryB.monthName}</h3>
                                <SummaryCard title="Tổng doanh thu" value={formatCurrency(summaryB.monthlyTotal)} icon={<DollarSignIcon className="h-6 w-6 text-blue-600"/>} />
                                <SummaryCard title="Doanh thu TB ngày" value={formatCurrency(summaryB.averageDailyRevenue)} icon={<BarChartIcon className="h-6 w-6 text-blue-600"/>} />
                                <SummaryCard title="Tổng lượt qua đêm" value={formatNumber(summaryB.totalOvernightStays)} icon={<MoonIcon className="h-6 w-6 text-blue-600"/>} />
                            </div>
                        </div>
                        <ComparisonChart dataA={summaryA.dailyTotals} dataB={summaryB.dailyTotals} nameA={summaryA.monthName} nameB={summaryB.monthName} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;