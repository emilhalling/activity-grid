import { customElement, property, state } from './decorators';
import { ActivityData, DayCellMap, isValidActivityData, TitleFormatter } from './types';
import { themes, isValidTheme, ColorTheme } from './themes';
import { template } from './template';
import { GridRenderer } from './grid-renderer';
import { createCellClickEvent } from './events';
import { DEFAULT_EMPTY_COLOR, getDateKey } from './constants';

@customElement('activity-grid')
export class ActivityGrid extends HTMLElement {
  private readonly gridRenderer: GridRenderer = new GridRenderer();

  // #region Properties
  @property<ActivityData[]>({ type: Array })
  set data(value: ActivityData[]) {
    if (!this.validateActivityData(value)) {
      return;
    }
    this._data = value;
    this.updateGrid()
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

      this.updateGrid();
      return;
    }

    // Check if all colors are valid
    const invalidColors = value.filter(color => !this.validateColor(color));
    if (invalidColors.length > 0) {
      console.warn(`Invalid colors found when trying to set color theme: ${invalidColors.join(', ')}. Using default theme.`);
      this._colors = themes.default;

      this.updateGrid();
      return;
    }

    // Only update colors if no theme is set or if colors are explicitly set
    if (!this._colorTheme) {
      this._colors = value;

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

    this.updateGrid();
  }

  get colorTheme(): string {
    return this._colorTheme || '';
  }

  private _colorTheme: ColorTheme | null = null;

  @property<boolean>({ type: Boolean, attribute: 'dark-mode' })
  set darkMode(value: boolean) {
    this._darkMode = value;
    this.emptyColor = value ? DEFAULT_EMPTY_COLOR.dark : DEFAULT_EMPTY_COLOR.light;
    this.updateGrid();
  }

  get darkMode(): boolean {
    return this._darkMode;
  }

  private _darkMode: boolean = false;

  @property<string>({ type: String, attribute: 'empty-color' })
  set emptyColor(value: string | null) {
    if (value === null || !this.validateColor(value)) {
      this._emptyColor = this._darkMode ? DEFAULT_EMPTY_COLOR.dark : DEFAULT_EMPTY_COLOR.light;
      return;
    }
    this._emptyColor = value;
    this.updateGrid();
  }

  get emptyColor(): string {
    return this._emptyColor;
  }

  private _emptyColor: string = this._darkMode ? DEFAULT_EMPTY_COLOR.dark : DEFAULT_EMPTY_COLOR.light;

  @property<boolean>({ type: Boolean })
  set skipWeekends(value: boolean) {
    this._skipWeekends = value;
    if (value) {
      // Force Monday start when skipping weekends
      this.startWeekOnMonday = true;
    }
    this.updateGrid();
  }

  get skipWeekends(): boolean {
    return this._skipWeekends;
  }

  private _skipWeekends: boolean = false;

  @property<boolean>({ type: Boolean })
  set startWeekOnMonday(value: boolean) {
    // If weekends are excluded, force startWeekOnMonday to true
    this._startWeekOnMonday = this.skipWeekends ? true : value;
    this.updateGrid();
  }

  get startWeekOnMonday(): boolean {
    return this._startWeekOnMonday;
  }

  private _startWeekOnMonday: boolean = false;

  @property<string>({ type: String, attribute: 'end-date' })
  set endDate(value: string) {
    const date = value ? new Date(value) : new Date();
    if (isNaN(date.getTime())) {
      console.warn('Invalid end-date provided. Using current date instead.');
      this._endDate = new Date();
    } else {
      this._endDate = date;
    }

    this.updateGrid();
  }

  get endDate(): string {
    return getDateKey(this._endDate);
  }

  private _endDate: Date = new Date();

  @property<string>({ type: String, attribute: 'start-date' })
  set startDate(value: string) {
    const date = value ? new Date(value) : null;
    if (date && !isNaN(date.getTime())) {
      if (date > this._endDate) {
        console.warn('Start date cannot be after end date. Using one year before end date instead.');
        this._startDate = this.createDefaultStartDate();
      } else {
        this._startDate = date;
      }
    } else if (!this._startDate) {  // Only create default if not already set
      console.warn('Invalid start-date provided. Using one year before end date instead.');
      this._startDate = this.createDefaultStartDate();
    }

    if (this.isConnected) {
      this.updateGrid();
    }
  }

  get startDate(): string {
    return this._startDate ? getDateKey(this._startDate) : getDateKey(this.createDefaultStartDate());
  }

  private _startDate: Date | null;
    
  // Title formatter property (not an HTML attribute, only accessible via JavaScript)
  set titleFormatter(value: TitleFormatter | null) {
    this._titleFormatter = value;
    this.updateGrid();
  }

  get titleFormatter(): TitleFormatter | null {
    return this._titleFormatter;
  }

  private _titleFormatter: TitleFormatter | null = null;
  //#endregion

  // #region lifecycle Methods
  @state()
  private cells: DayCellMap = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._startDate = null;
  }

  connectedCallback() {
    if (!this._startDate) {
      this._startDate = this.createDefaultStartDate();
    }

    this.updateGrid();
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
    return [
      'start-week-on-monday',
      'skip-weekends',
      'data',
      'colors',
      'color-theme',
      'empty-color',
      'max-level',
      'end-date',
      'start-date',
      'dark-mode'
    ];
  }
  // #endregion

  // #region Private methods
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

  private generateGridCells(): DayCellMap {
    const cells: DayCellMap = {};

    // Only create cells for days with activity
    this.data.forEach(activity => {
      cells[activity.date] = {
        date: new Date(activity.date),
        count: activity.count,
        level: this.calculateLevel(activity.count),
        ignore: false,
        id: activity.id
      };
    });

    return cells;
  }

  private validateActivityData(value: ActivityData[]): boolean {
    if (!value || !Array.isArray(value)) {
      console.warn('Invalid activity data: must be an array. Using empty array instead.');
      this._data = [];
      return false;
    }

    const invalidItems = value.filter(item => !isValidActivityData(item));
    if (invalidItems.length > 0) {
      console.warn(
        'Invalid items found in activity data. They will be filtered out:',
        invalidItems
      );
    }

    return true;
  }

  private validateColor(color: string): boolean {
    return CSS.supports('color', color);
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

    // Ensure we have a valid start date
    if (!this._startDate) {
      this._startDate = this.createDefaultStartDate();
    }

    const { html, numOfWeeks } = this.gridRenderer.render(
      this.cells,
      this._startDate,
      this._endDate,
      {
        colors: this.colors,
        emptyColor: this.emptyColor,
        skipWeekends: this.skipWeekends,
        startWeekOnMonday: this.startWeekOnMonday,
        titleFormatter: this.titleFormatter
      }
    );

    this.style.setProperty('--grid-columns', numOfWeeks.toString());
    this.shadowRoot.innerHTML = `${template}${html}`;
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.shadowRoot) return;

    const cells = this.shadowRoot.querySelectorAll('.cell[data-date]');
    cells.forEach(cell => {
      cell.addEventListener('click', (event) => {
        const date = cell.getAttribute('data-date');
        const count = parseInt(cell.getAttribute('data-count') || '0', 10);
        const id = cell.getAttribute('cell-id') || undefined;
        if (date) {
          this.dispatchEvent(createCellClickEvent({ date, count, id }));
        }
      });
    });
  }

  // #endregion
}