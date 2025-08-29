
import React, { useState, useMemo, useCallback } from 'react';
import type { RevenueData, DailyTotal } from './types';
import RevenueChart from './components/RevenueChart';
import { CalendarIcon, PlusCircleIcon, Trash2Icon, DollarSignIcon, BarChartIcon, MoonIcon } from './components/Icons';

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
            const cleanedEntry = entry.replace(/[\.,]/g, ''); // Allow both dots and commas
            const numValue = parseInt(cleanedEntry, 10) || 0;
            if (numValue > 150000) { // Threshold for overnight stay
                hasOvernight = true;
            }
            return sum + numValue;
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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [rooms, setRooms] = useState<string[]>(['101', '102', '103', '104', '105']);
    const [revenueData, setRevenueData] = useState<RevenueData>({});

    const { year, month, daysInMonth } = useMemo(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        return {
            year: y,
            month: (m + 1).toString().padStart(2, '0'),
            daysInMonth: new Date(y, m + 1, 0).getDate(),
        };
    }, [currentDate]);
    
    const dailyTotals = useMemo<DailyTotal[]>(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayRevenue = revenueData[day] || {};
            const total = Object.values(dayRevenue).reduce((sum, current) => {
                return sum + analyzeCellValue(current).total;
            }, 0);
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
        const summary: { [room: string]: number } = {};
        let totalOvernightStays = 0;

        for (const day in revenueData) {
            for (const room in revenueData[day]) {
                const cellValue = revenueData[day][room];
                const entries = cellValue.split(' ').filter(Boolean);
                for (const entry of entries) {
                    const numValue = parseInt(entry.replace(/[\.,]/g, ''), 10) || 0; // Allow both dots and commas
                    if (numValue > 150000) {
                        summary[room] = (summary[room] || 0) + 1;
                        totalOvernightStays++;
                    }
                }
            }
        }
        return { details: summary, total: totalOvernightStays };
    }, [revenueData]);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month] = e.target.value.split('-');
        setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
        setRevenueData({}); // Clear data when month changes
    }, []);

    const handleRevenueChange = useCallback((day: number, room: string, value: string) => {
        // Allow only numbers, spaces, dots, and commas for formatting.
        // REMOVED .trim() to allow typing trailing spaces for multiple entries.
        const sanitizedValue = value.replace(/[^0-9\s.,]/g, '').replace(/\s+/g, ' ');
        setRevenueData(prevData => ({
            ...prevData,
            [day]: {
                ...prevData[day],
                [room]: sanitizedValue,
            },
        }));
    }, []);

    const handleAddRoom = useCallback(() => {
        const newRoom = prompt("Nhập số phòng mới:");
        if (newRoom && !rooms.includes(newRoom)) {
            setRooms(prevRooms => [...prevRooms, newRoom].sort());
        } else if (newRoom) {
            alert(`Phòng "${newRoom}" đã tồn tại.`);
        }
    }, [rooms]);

    const handleRemoveRoom = useCallback((roomToRemove: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ${roomToRemove}? Thao tác này sẽ xóa tất cả dữ liệu doanh thu của phòng này.`)) {
            setRooms(prevRooms => prevRooms.filter(r => r !== roomToRemove));
            setRevenueData(prevData => {
                const newData = { ...prevData };
                Object.keys(newData).forEach(day => {
                    delete newData[parseInt(day)][roomToRemove];
                });
                return newData;
            });
        }
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
                    
                    <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                             <RevenueChart data={dailyTotals} />
                        </div>
                        {overnightSummary.total > 0 && (
                          <div className="bg-white p-4 rounded-lg shadow-md">
                            <h4 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">Chi tiết phòng qua đêm</h4>
                            <ul className="space-y-2 text-sm text-gray-600 max-h-64 overflow-y-auto pr-2">
                              {Object.entries(overnightSummary.details)
                                .sort(([, countA], [, countB]) => countB - countA)
                                .map(([room, count]) => (
                                <li key={room} className="flex justify-between items-center hover:bg-gray-50 p-1 rounded">
                                  <span>Phòng <strong>{room}</strong>:</span>
                                  <span className="font-medium bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">{count} lượt</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Bảng nhập liệu doanh thu</h3>
                        <button onClick={handleAddRoom} className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors">
                            <PlusCircleIcon className="h-5 w-5 mr-2" />
                            Thêm phòng
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Ngày</th>
                                    {rooms.map(room => (
                                        <th key={room} className="px-4 py-3 font-semibold text-center group relative">
                                            Phòng {room}
                                            <button onClick={() => handleRemoveRoom(room)} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1">
                                                <Trash2Icon className="h-4 w-4" />
                                            </button>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 font-semibold text-right">Tổng ngày</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyTotals.map(({ day, total }) => (
                                    <tr key={day} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-900">{day}</td>
                                        {rooms.map(room => {
                                            const cellValue = revenueData[day]?.[room] || '';
                                            const { total: cellTotal, hasOvernight } = analyzeCellValue(cellValue);
                                            return (
                                                <td key={`${day}-${room}`} className="px-2 py-1">
                                                    <div className="relative">
                                                        {hasOvernight && (
                                                            <MoonIcon className="absolute left-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none" />
                                                        )}
                                                        <input
                                                            type="text"
                                                            placeholder="VD: 500.000 120.000"
                                                            value={cellValue}
                                                            onChange={e => handleRevenueChange(day, room, e.target.value)}
                                                            className={`w-full text-right p-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${hasOvernight ? 'pl-7' : ''}`}
                                                            aria-label={`Doanh thu phòng ${room} ngày ${day}`}
                                                        />
                                                    </div>
                                                    {cellValue && (
                                                        <div className="text-xs text-primary-700 font-medium text-right pr-1 pt-0.5" aria-label={`Tổng phụ cho phòng ${room} ngày ${day}`}>
                                                            = {formatNumber(cellTotal)}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2 font-semibold text-right text-primary-700">{formatCurrency(total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="bg-gray-100">
                                <tr className="font-semibold text-gray-900">
                                    <td colSpan={rooms.length + 1} className="px-4 py-3 text-right text-base">Tổng doanh thu tháng</td>
                                    <td className="px-4 py-3 text-right text-base">{formatCurrency(monthlyTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
