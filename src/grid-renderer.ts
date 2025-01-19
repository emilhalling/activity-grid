import { DayCellMap } from './types';
import { MONTH_LABELS, WEEKDAY_LABELS, getDateKey } from './constants';

export class GridRenderer {
	private createMonthLabels(startDate: Date, endDate: Date): string {
		const visibleMonths: string[] = [];
		const currentMonthDate = new Date(startDate);
		currentMonthDate.setDate(1);

		while (currentMonthDate <= endDate) {
			visibleMonths.push(MONTH_LABELS[currentMonthDate.getMonth()]);
			currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
		}

		return `
            <div class="months-container">
                ${visibleMonths.map(month => `<span>${month}</span>`).join('')}
            </div>
        `;
	}

	private createWeekLabels(startWeekOnMonday: boolean, weekDaysToInclude: number[] = [0, 1, 2, 3, 4, 5, 6]): string {
		const weekDays = startWeekOnMonday ? WEEKDAY_LABELS.mondayStart : WEEKDAY_LABELS.sundayStart;

		return `
            <div class="weekdays">
                ${weekDays
				.map((weekDay, index) => `<div>${weekDaysToInclude.includes(index) ? weekDay : ""}</div>`)
				.join('\n')}
            </div>
        `;
	}

	private getWeeksBetweenDates(startDate: Date, endDate: Date): number {
		const msPerWeek = 7 * 24 * 60 * 60 * 1000;
		const diffInMs = Math.abs(endDate.getTime() - startDate.getTime());
		return Math.ceil(diffInMs / msPerWeek);
	}

	private createGridCells(
		cells: DayCellMap,
		startDate: Date,
		endDate: Date,
		colors: string[],
		emptyColor: string,
		skipWeekends: boolean,
		startWeekOnMonday: boolean
	): string {
		let gridHTML = '';
		const daysInWeek = skipWeekends ? 5 : 7;
		const endDateFull = new Date(endDate);
		const startDateNoTime = new Date(startDate);
		startDateNoTime.setHours(0, 0, 0, 0);

		// Calculate end of grid (next full week)
		let endDayOffset = skipWeekends ? 5 - endDate.getDay() : 7 - endDate.getDay();
		if (startWeekOnMonday) {
			endDayOffset += 1;
		}
		endDateFull.setDate(endDateFull.getDate() + endDayOffset);

		// Adjust start date based on week start
		const startDayWeekAligned = new Date(startDate);
		const startDayOfWeek = startWeekOnMonday ?
			(startDate.getDay() || 7) - 1 :
			startDate.getDay();

		if (startDayOfWeek !== 0) {
			startDayWeekAligned.setDate(startDate.getDate() - startDayOfWeek);
		}

		// Calculate number of weeks
		const numWeeks = this.getWeeksBetweenDates(endDateFull, startDate);

		// Generate grid HTML
		for (let dayOffset = 0; dayOffset < daysInWeek; dayOffset++) {
			const isWeekend = dayOffset > 4;
			if (skipWeekends && isWeekend) continue;

			for (let week = 0; week < numWeeks; week++) {
				const currentDate = new Date(startDayWeekAligned);
				currentDate.setDate(currentDate.getDate() + dayOffset + (week * 7));
				currentDate.setHours(0, 0, 0, 0);

				const dateKey = getDateKey(currentDate);
				const cell = cells[dateKey];

				if (currentDate < startDateNoTime) {
					// Before start date - render empty transparent cell
					gridHTML += `
                        <div class="cell" 
                            style="background-color: transparent">
                        </div>`;
				}
				else if (currentDate <= endDate) {
					// Within date range - render activity cell
					if (cell) {
						gridHTML += `
                            <div class="cell" 
                                style="background-color: ${colors[cell.level] || emptyColor}"
                                title="${currentDate.toDateString()}: ${cell.count} activities"
                                data-date="${dateKey}"
                                data-count="${cell.count}">
                            </div>`;
					} else {
						gridHTML += `
                            <div class="cell" 
                                style="background-color: ${emptyColor}"
                                title="${currentDate.toDateString()}: 0 activities"
                                data-date="${dateKey}"
                                data-count="0">
                            </div>`;
					}
				}
				else if (currentDate <= endDateFull) {
					// After end date but within grid - render empty transparent cell
					gridHTML += `
                        <div class="cell" 
                            style="background-color: transparent">
                        </div>`;
				}
			}
		}

		return gridHTML;
	}

	public render(
		cells: DayCellMap,
		startDate: Date,
		endDate: Date,
		options: {
			colors: string[];
			emptyColor: string;
			skipWeekends: boolean;
			startWeekOnMonday: boolean;
		}
	): { html: string; numOfWeeks: number } {
		// Calculate number of weeks
		const endDateFull = new Date(endDate);
		let endDayOffset = options.skipWeekends ? 5 - endDate.getDay() : 7 - endDate.getDay();
		if (options.startWeekOnMonday) {
			endDayOffset += 1;
		}
		endDateFull.setDate(endDateFull.getDate() + endDayOffset);
		const numOfWeeks = this.getWeeksBetweenDates(endDateFull, startDate);

		const monthLabels = this.createMonthLabels(startDate, endDate);
		const weekLabels = this.createWeekLabels(
			options.startWeekOnMonday,
			options.startWeekOnMonday ? [0, 2, 4] : [1, 3, 5]
		);
		const gridCells = this.createGridCells(
			cells,
			startDate,
			endDate,
			options.colors,
			options.emptyColor,
			options.skipWeekends,
			options.startWeekOnMonday
		);

		return {
			html: `
            <div class="container">
                <div class="months">${monthLabels}</div>
                <div class="grid-wrapper">
                    ${weekLabels}
                    <div class="grid">
                        ${gridCells}
                    </div>
                </div>
            </div>
        `,
			numOfWeeks
		};
	}
}