import { customElement, property, state } from './decorators';
import { ActivityData, DayCellMap } from './types';
import { themes, isValidTheme, ColorTheme } from './themes';
import { template } from './template';

@customElement('activity-grid')
export class ActivityGrid extends HTMLElement {
  @property<ActivityData[]>({ type: Array })
  data: ActivityData[] = [];

  @property<string[]>({ type: Array })
  set colors(value: string[]) {
    // Only update colors if no theme is set or if colors are explicitly set
    if (!this._colorTheme) {
      this._colors = value;
      if (this.requestUpdate) {
        this.requestUpdate('colors', this._colors, value);
      }
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
    
    if (this.requestUpdate) {
      this.requestUpdate('colorTheme', null, value);
    }
  }

  get colorTheme(): string {
    return this._colorTheme || '';
  }

  private _colorTheme: ColorTheme | null = null;

  @property<string>({ type: String })
  emptyColor: string = '#ebedf0';

  @property<boolean>({ type: Boolean })
  skipWeekends: boolean = false;

  @property<boolean>({ type: Boolean })
  set startWeekOnMonday(value: boolean) {
    const oldValue = this._startWeekOnMonday;
    // If weekends are excluded, force startWeekOnMonday to true
    this._startWeekOnMonday = this.skipWeekends ? true : value;
    if (this.requestUpdate) {
      this.requestUpdate('startWeekOnMonday', oldValue, this._startWeekOnMonday);
    }
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
      const defaultDate = new Date(this._endDate);
      defaultDate.setFullYear(defaultDate.getFullYear() - 1);

      // Adjust default day to start from start of week
      const startDayOfWeek = this.startWeekOnMonday ? (defaultDate.getDay() || 7) - 1 : defaultDate.getDay();
      if (startDayOfWeek !== 0) {
        defaultDate.setDate(defaultDate.getDate() - startDayOfWeek);
      }
      this._startDate = defaultDate;
    } else {
      this._startDate = date;
    }

    this._startDate.setHours(0, 0, 0, 1);

    if (this.requestUpdate) {
      this.requestUpdate('startDate', null, value);
    }
  }

  get startDate(): string {
    return this._startDate.toISOString().split('T')[0];
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

  @property<string>({ type: String, attribute: 'end-date' })
  set endDate(value: string) {
    const date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) {
      console.warn('Invalid end-date provided. Using current date instead.');
      this._endDate = new Date();
    } else {
      this._endDate = date;
    }

    if (this.requestUpdate) {
      this.requestUpdate('endDate', null, value);
    }
  }

  get endDate(): string {
    return this._endDate.toISOString().split('T')[0];
  }

  private _endDate: Date = new Date();

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
    return ['start-week-on-monday', 'skip-weekends', 'data', 'colors', 'color-theme','empty-color', 'max-level', 'end-date', 'start-date'];
  }

  requestUpdate(name: string, oldValue: any, newValue: any) {
    if (oldValue !== newValue) {
      if (name === 'data') {
        this.cells = this.generateGridCells();
      }
      if (name === 'skipWeekends' && newValue) {
        // If weekends are being excluded, force startWeekOnMonday to true
        this.startWeekOnMonday = true;
      }
      this.render();
    }
  }

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

  private getWeeksBetweenDates(startDate: Date, endDate: Date): number {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffInMs = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffInMs / msPerWeek);
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

    const daysInWeek = this.skipWeekends ? 5 : 7;
    for (let dayOffset = 0; dayOffset < daysInWeek; dayOffset++) {
      // For each week
      for (let week = 0; week < numWeeks; week++) {
        const currentDate = new Date(startDayWeekAligned);
        currentDate.setDate(currentDate.getDate() + dayOffset + (week * 7));
        currentDate.setHours(0, 0, 0, 1);

        // Format date as YYYY-MM-DD
        const dateKey = currentDate.toISOString().split('T')[0];
        const cell = this.cells[dateKey];

        if (currentDate < startDate) {
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
                  title="${currentDate.toDateString()}: ${cell.count} activities">
              </div>`;
          } else {
            // Create empty cell
            gridHTML += `
              <div class="cell" 
                  style="background-color: ${this.emptyColor}"
                  title="${currentDate.toDateString()}: 0 activities">
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
  }

}