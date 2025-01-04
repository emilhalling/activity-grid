
export interface ActivityData {
	date: string;
	count: number;
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