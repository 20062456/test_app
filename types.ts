export interface RevenueData {
  [day: number]: string;
}

export interface DailyTotal {
  day: number;
  total: number;
}

export interface MonthSummary {
  monthlyTotal: number;
  averageDailyRevenue: number;
  totalOvernightStays: number;
  dailyTotals: DailyTotal[];
  monthName: string;
}
