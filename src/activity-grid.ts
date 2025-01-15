import { customElement, property, state } from './decorators';
import { ActivityData, DayCellMap, isValidActivityData } from './types';
import { themes, isValidTheme, ColorTheme } from './themes';
import { template } from './template';
import { GridRenderer } from './grid-renderer';
import { createCellClickEvent } from './events';
import { DEFAULT_EMPTY_COLOR, DATE_FORMAT_REGEX } from './constants';

@customElement('activity-grid')
export class ActivityGrid extends HTMLElement {
  private readonly gridRenderer: GridRenderer = new GridRenderer();

  @property<ActivityData[]>({ type: Array })
  set data(value: ActivityData[]) {
    if (!value || !Array.isArray(value)) {
      console.warn('Invalid activity data: must be an array. Using empty array instead.');
      this._data = [];
      return;
    }

    const invalidItems = value.filter(item => !isValidActivityData(item));

    if (invalidItems.length > 0) {
      console.warn(
        'Invalid items found in activity data. They will be filtered out:',
        invalidItems
      );
    }

    this._data = value.filter(item => !invalidItems.includes(item));

    // if (this.requestUpdate) {
    //   this.requestUpdate('data', this._data, value);
    // }
    this.updateGrid();
  }

  get data(): ActivityData[] {
    return this._data;
  }

  private _data: ActivityData[] = [];

  @property<string[]>({ type: Array })
  set colors(value: string[]) {
    // Check if value is empty or invalid
    if (!value || !Array.isArray(value) || value.length === 0) {
      console.warn('Invalid or empty colors array provided. Using default theme.');
      this._colors = themes.default;
      // if (this.requestUpdate) {
      //   this.requestUpdate('colors', this._colors, themes.default);
      // }
      this.updateGrid();
      return;
    }

    // Check if all colors are valid
    const invalidColors = value.filter(color => !CSS.supports('color', color));
    if (invalidColors.length > 0) {
      console.warn(`Invalid colors found when trying to set color theme: ${invalidColors.join(', ')}. Using default theme.`);
      this._colors = themes.default;
      if (this.requestUpdate) {
        this.requestUpdate('colors', this._colors, themes.default);
      }
      return;
    }

    // Only update colors if no theme is set or if colors are explicitly set
    if (!this._colorTheme) {
      this._colors = value;
      // if (this.requestUpdate) {
      //   this.requestUpdate('colors', this._colors, value);
      // }
      this.updateGrid();

    }
  }

  get colors(): string[] {
    return this._colorTheme ? themes[this._colorTheme] : this._colors;
  }

  private _colors: string[] = themes.default;

  @property<string>({ type: String, attribute: 'color-theme' })
  set colorTheme(value: string) {
    if (!value) {
      this._colorTheme = null;
    } else if (isValidTheme(value)) {
      this._colorTheme = value;
    } else {
      console.warn(`Invalid color theme "${value}". Using default theme.`);
      this._colorTheme = null;
    }

    // if (this.requestUpdate) {
    //   this.requestUpdate('colorTheme', null, value);
    // }
    this.updateGrid();
  }

  get colorTheme(): string {
    return this._colorTheme || '';
  }

  private _colorTheme: ColorTheme | null = null;

  @property<boolean>({ type: Boolean, attribute: 'dark-mode' })
  set darkMode(value: boolean) {
    const oldValue = this._darkMode;
    this._darkMode = value;

    // Update the empty color when dark mode changes
    this.emptyColor = value ? '#161b22' : '#ebedf0';

    // if (this.requestUpdate) {
    //   this.requestUpdate('darkMode', oldValue, value);
    // }
    this.updateGrid();
  }

  get darkMode(): boolean {
    return this._darkMode;
  }

  private _darkMode: boolean = false;

  @property<string>({ type: String })
  set emptyColor(value: string | null) {
    const oldValue = this._emptyColor;
    // Color not set => default color
    if (value === null) {
      this._emptyColor = this._darkMode ? '#161b22' : '#ebedf0';
    }
    // Invalid color set => default color
    else if (!CSS.supports('color', value)) {
      console.warn(`Invalid color found when trying to set empty color: ${value}. Using default color.`);
      this._emptyColor = this._darkMode ? '#161b22' : '#ebedf0';
    }
    else {
      this._emptyColor = value;
    }

    // if (this.requestUpdate) {
    //   this.requestUpdate('emptyColor', oldValue, this._emptyColor);
    // }
    this.updateGrid();
  }

  get emptyColor(): string {
    return this._emptyColor;
  }

  private _emptyColor: string = this._darkMode ? '#161b22' : '#ebedf0';

  @property<boolean>({ type: Boolean })
  skipWeekends: boolean = false;

  @property<boolean>({ type: Boolean })
  set startWeekOnMonday(value: boolean) {
    const oldValue = this._startWeekOnMonday;
    // If weekends are excluded, force startWeekOnMonday to true
    this._startWeekOnMonday = this.skipWeekends ? true : value;
    // if (this.requestUpdate) {
    //   this.requestUpdate('startWeekOnMonday', oldValue, this._startWeekOnMonday);
    // }
    this.updateGrid();

  }

  get startWeekOnMonday(): boolean {
    return this._startWeekOnMonday;
  }

  private _startWeekOnMonday: boolean = false;

  @property<string>({ type: String, attribute: 'start-date' })
  set startDate(value: string) {
    const date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) {
      console.warn('Invalid start-date provided. Using one year before end date instead.');
      const defaultDate = this.createDefaultStartDate();
      this._startDate = defaultDate;
    }
    else if (date > this._endDate) {
      console.warn('Start date cannot be after end date. Using one year before end date instead.');
      const defaultDate = this.createDefaultStartDate();
      this._startDate = defaultDate;
    }
    else {
      this._startDate = date;
    }

    // if (this.requestUpdate) {
    //   this.requestUpdate('startDate', null, value);
    // }
    this.updateGrid();

  }

  get startDate(): string {
    return this.getDateKey(this._startDate);
  }

  private _startDate: Date = (() => {
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 1);

    const startDayOfWeek = this.startWeekOnMonday ? (defaultDate.getDay() || 7) - 1 : defaultDate.getDay();
    if (startDayOfWeek !== 0) {
      defaultDate.setDate(defaultDate.getDate() - startDayOfWeek);
    }
    return defaultDate;
  })();

  private createDefaultStartDate(): Date {
    const defaultDate = new Date(this._endDate);
    defaultDate.setFullYear(defaultDate.getFullYear() - 1);

    // Adjust to start of week
    const startDayOfWeek = this.startWeekOnMonday ? (defaultDate.getDay() || 7) - 1 : defaultDate.getDay();
    if (startDayOfWeek !== 0) {
      defaultDate.setDate(defaultDate.getDate() - startDayOfWeek);
    }
    return defaultDate;
  }

  @property<string>({ type: String, attribute: 'end-date' })
  set endDate(value: string) {
    const date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) {
      console.warn('Invalid end-date provided. Using current date instead.');
      this._endDate = new Date();
    } else {
      this._endDate = date;
    }

    // if (this.requestUpdate) {
    //   this.requestUpdate('endDate', null, value);
    // }
    this.updateGrid();
  }

  get endDate(): string {
    return this.getDateKey(this._endDate);
  }

  private _endDate: Date = new Date();

  private handleCellClick(event: MouseEvent, cellData: { date: string, count: number }) {
    const customEvent = new CustomEvent('cell-click', {
      detail: cellData,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(customEvent);
  }

  @state()
  private cells: DayCellMap = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // Convert kebab-case to camelCase
    const propName = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) as keyof this;

    if (this[propName] !== undefined) {
      const propValue = this[propName];
      if (typeof propValue === 'boolean') {
        // For boolean attributes, presence means true
        this[propName] = (newValue !== null) as any;
      } else if (typeof propValue === 'number') {
        this[propName] = Number(newValue) as any;
      } else if (Array.isArray(propValue)) {
        try {
          this[propName] = JSON.parse(newValue || '[]') as any;
        } catch (e) {
          console.warn(`Invalid array value for ${name}:`, e);
        }
      } else {
        this[propName] = newValue as any;
      }
    }
  }

  static get observedAttributes() {
    return ['start-week-on-monday', 'skip-weekends', 'data', 'colors', 'color-theme', 'empty-color', 'max-level', 'end-date', 'start-date', 'dark-mode'];
  }

  // requestUpdate(name: string, oldValue: any, newValue: any) {
  //   if (oldValue !== newValue) {
  //     if (name === 'data') {
  //       this.cells = this.generateGridCells();
  //     }
  //     if (name === 'skipWeekends' && newValue) {
  //       // If weekends are being excluded, force startWeekOnMonday to true
  //       this.startWeekOnMonday = true;
  //     }
  //     this.render();
  //   }
  // }

  private createMonthLabels() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const visibleMonths: string[] = [];

    let currentMonthDate = new Date(this.startDate);
    currentMonthDate.setDate(1);

    while (currentMonthDate <= this._endDate) {
      visibleMonths.push(months[currentMonthDate.getMonth()]);
      currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
    }

    return `
        <div class="months-container">
            ${visibleMonths.map(month => `<span>${month}</span>`).join('')}
        </div>
    `;
  }

  private createWeekLabels(weekDaysToInclude: number[] = [0, 1, 2, 3, 4, 5, 6]) {
    const weekDays = this.startWeekOnMonday ?
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
      <div class="weekdays">
        ${weekDays.map((weekDay, index) => `<div>${weekDaysToInclude.includes(index) ? weekDay : ""}</div>`).join('\n')}
      </div>
    `
  }

  private generateGridCells(): DayCellMap {
    const cells: DayCellMap = {};

    // Only create cells for days with activity
    this.data.forEach(activity => {
      cells[activity.date] = {
        date: new Date(activity.date),
        count: activity.count,
        level: this.calculateLevel(activity.count),
        ignore: false
      };
    });

    return cells;
  }

  private calculateLevel(count: number): number {
    if (count === 0) return 0;
    const maxLevel = this.colors.length - 1; // -1 because we start from 0
    const max = Math.max(...this.data.map(d => d.count));
    return Math.ceil((count / max) * maxLevel);
  }

  private updateGrid(): void {
    if (!this.shadowRoot) return;

    this.cells = this.generateGridCells();

    const rendered = this.gridRenderer.render(
      this.cells,
      this._startDate,
      this._endDate,
      {
        colors: this.colors,
        emptyColor: this.emptyColor,
        skipWeekends: this.skipWeekends,
        startWeekOnMonday: this.startWeekOnMonday
      }
    );

    this.shadowRoot.innerHTML = `${template}${rendered}`;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) return;

    const cells = this.shadowRoot.querySelectorAll('.cell[data-date]');
    cells.forEach(cell => {
      cell.addEventListener('click', (event) => {
        const date = cell.getAttribute('data-date');
        const count = parseInt(cell.getAttribute('data-count') || '0', 10);
        if (date) {
          this.dispatchEvent(createCellClickEvent({ date, count }));
        }
      });
    });
  }

  private getWeeksBetweenDates(startDate: Date, endDate: Date): number {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffInMs = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffInMs / msPerWeek);
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  private render() {
    if (!this.shadowRoot) return;

    // Calculate date range
    const endDate = new Date(this._endDate);
    const endOfDateFull = new Date(this._endDate);
    const startDate = new Date(this._startDate);

    let endDayOffset = this.skipWeekends ? 5 - endDate.getDay() : 7 - endDate.getDay();
    if (this.startWeekOnMonday) {
      endDayOffset += 1;
    }
    endOfDateFull.setDate(endOfDateFull.getDate() + endDayOffset);

    // Adjust start date based on week start
    const startDayWeekAligned = new Date(startDate);
    const startDayOfWeek = this.startWeekOnMonday ? (startDate.getDay() || 7) - 1 : startDate.getDay();
    if (startDayOfWeek !== 0) {
      startDayWeekAligned.setDate(startDate.getDate() - startDayOfWeek);
    }

    let gridHTML = '';
    const numWeeks = this.getWeeksBetweenDates(endOfDateFull, startDate);
    this.style.setProperty('--grid-columns', numWeeks.toString());

    const startDateNoTime = new Date(this.startDate)
    startDateNoTime.setHours(0, 0, 0, 0);
    const daysInWeek = this.skipWeekends ? 5 : 7;
    for (let dayOffset = 0; dayOffset < daysInWeek; dayOffset++) {
      // For each week
      for (let week = 0; week < numWeeks; week++) {
        const currentDate = new Date(startDayWeekAligned);
        currentDate.setDate(currentDate.getDate() + dayOffset + (week * 7));
        currentDate.setHours(0, 0, 0, 0);

        // Format date as YYYY-MM-DD
        const dateKey = this.getDateKey(currentDate);
        const cell = this.cells[dateKey];

        if (currentDate < startDateNoTime) {
          gridHTML += `
              <div class="cell" 
                  style="background-color: transparent">
              </div>`
        }
        else if (currentDate <= endDate) {
          if (cell) {
            // Use existing cell with activity
            gridHTML += `
              <div class="cell" 
                  style="background-color: ${this.colors[cell.level] || this.emptyColor}"
                  title="${currentDate.toDateString()}: ${cell.count} activities"
                  data-date="${dateKey}"
                  data-count="${cell.count}">
              </div>`;
          } else {
            // Create empty cell
            gridHTML += `
              <div class="cell" 
                  style="background-color: ${this.emptyColor}"
                  title="${currentDate.toDateString()}: 0 activities"
                  data-date="${dateKey}"
                  data-count="0">
              </div>`;
          }
        }
        else if (currentDate <= endOfDateFull) {
          gridHTML += `
              <div class="cell" 
                  style="background-color: transparent">
              </div>`
        }
      }
    }

    this.shadowRoot.innerHTML = `
            ${template}
            <div class="container">
                <div class="months">
                    ${this.createMonthLabels()}
                </div>
                <div class="grid-wrapper">
                    ${this.startWeekOnMonday ? this.createWeekLabels([0, 2, 4]) : this.createWeekLabels([1, 3, 5])}
                    <div class="grid">
                        ${gridHTML}
                    </div>
                </div>
            </div>
        `;

    const cells = this.shadowRoot.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.addEventListener('click', (event) => {
        const date = cell.getAttribute('data-date');
        const count = parseInt(cell.getAttribute('data-count') || '0', 10);
        if (date) {
          this.handleCellClick(event as MouseEvent, { date, count });
        }
      });
    });
  }

}