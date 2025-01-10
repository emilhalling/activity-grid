export const template = `
  <style>
    :host {
      display: inline-block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }

    .container {
      display: inline-grid;
      grid-template-rows: auto 1fr;
    }

    .months {
      display: flex;
      padding-left: 32px;
      font-size: 12px;
      color: #767676;
      height: 20px;
    }

    .months-spacer {
      width: 30px;
    }

    .months-container {
      display: flex;
      justify-content: space-between;
      flex: 1;
    }

    .months span {
      padding: 0 4px;
    }

    .grid-wrapper {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px;
    }

    .weekdays {
      display: grid;
      grid-template-rows: repeat(7, 1fr);
      gap: 2px;
      text-align: right;
      padding-left: 6px;
      padding-right: 2px;
      font-size: 12px;
      color: #767676;
      margin-top: -1px;
      height: calc(7 * 10px + 6 * 2px);
    }

    .weekdays div {
      height: 10px;
      line-height: 10px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(var(--grid-columns), 1fr);
      grid-template-rows: repeat(7, 1fr);
      gap: 2px;
    }

    .cell {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }
  </style>
`;