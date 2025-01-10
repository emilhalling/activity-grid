
export interface ActivityData {
	date: string;
	count: number;
}

export function isValidActivityData(item: unknown): boolean {
	// Check if item has required properties
	if (!item || typeof item !== 'object' || !('date' in item) || !('count' in item)) {
	  return false;
	}
  
	// Need to cast to any since we don't know the type yet
	const data = item as any;
  
	// Validate date
	const date = new Date(data.date);
	if (isNaN(date.getTime())) {
	  return false;
	}
  
	// Validate count is a non-negative number
	if (typeof data.count !== 'number' || data.count < 0) {
	  return false;
	}
  
	return true;
}

export interface ActivityGridOptions {
	data: ActivityData[];
	colors?: string[];
	emptyColor?: string;
	maxLevel?: number;
	skipWeekends?: boolean;
	startWeekOnMonday?: boolean;
	startDate?: Date;
	endDate?: Date;
}

export interface DayCell {
	date: Date;
	count: number;
	level: number;
	ignore: boolean;
}

export interface DayCellMap {
	[date: string]: DayCell;
}