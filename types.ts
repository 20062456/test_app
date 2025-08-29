
export interface RevenueData {
  [day: number]: {
    [room: string]: string;
  };
}

export interface DailyTotal {
  day: number;
  total: number;
}