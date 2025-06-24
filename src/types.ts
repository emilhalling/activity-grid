
export interface ActivityData {
	/** Date in YYYY-MM-DD format */
	date: string;
	/** Number of activities for this date (must be non-negative) */
	count: number;
	/** Optional identifier for the cell */
	id?: string;
}

export type TitleFormatter = {
  (date: Date, count: number): string;
  (date: Date, count: number, id?: string): string;
};

/** @internal */
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

/**
 * Configuration options for the ActivityGrid component
 */
export interface ActivityGridOptions {
	/** Array of activity data points */
	data: ActivityData[];
	/** Custom color array for the activity levels (should be 5 colors) */
	colors?: string[];
	/** Color theme name ('red' | 'green' | 'blue' | 'yellow' | 'purple') */
	colorTheme?: string;
	/** Color for days with no activity */
	emptyColor?: string;
	/** Whether to use dark mode colors */
	darkMode?: boolean;
	/** Whether to skip weekends in the grid */
	skipWeekends?: boolean;
	/** Whether to start weeks on Monday instead of Sunday */
	startWeekOnMonday?: boolean;
	/** Start date for the activity grid */
	startDate?: Date;
	/** End date for the activity grid */
	endDate?: Date;
	/** Custom function to format cell titles/tooltips */
    titleFormatter?: TitleFormatter;
}

/**
 * Representation of a day cell in the grid
 */
/** @internal */
export interface DayCell {
	/** Date object for this cell */
	date: Date;
	/** Number of activities */
	count: number;
	/** Activity level (0-4) */
	level: number;
	/** Whether this cell should be ignored in the grid */
	ignore: boolean;
	/** Optional identifier for the cell */
	id?: string;
}

/**
 * Map of date strings to day cells
 */
/** @internal */
export interface DayCellMap {
	[date: string]: DayCell;
}