export interface CellClickEvent extends CustomEvent<CellClickDetail> {
	type: 'cell-click';
}

export interface CellClickDetail {
	date: string;
	count: number;
	id?: string;
}

export function createCellClickEvent(detail: CellClickDetail): CellClickEvent {
	return new CustomEvent('cell-click', {
		detail,
		bubbles: true,
		composed: true
	}) as CellClickEvent;
}

declare global {
	interface HTMLElementEventMap {
		'cell-click': CellClickEvent;
	}
}