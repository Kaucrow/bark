import { options } from '@/options';

class TimestampComponent {
  static #instance: TimestampComponent;
  #timestampFormat!: (d: Date) => string;

  private constructor() {
    options.subscribe((options) => {
      this.#timestampFormat = this.createTimestampFormat();
    });
  }

  public static get instance(): TimestampComponent {
    if (!TimestampComponent.#instance) {
      TimestampComponent.#instance = new TimestampComponent();
    }
    return TimestampComponent.#instance;
  }

  // Returns the current timestamp
  public now(): string {
    let timestamp = '';

    if (options.value.showTimestamp) {
      const now = new Date();
      const formatted = this.#timestampFormat(now);
      timestamp = `[${formatted}] `;
    }

    return timestamp;
  };

  private createTimestampFormat() {
    const timestampFormat = options.value.timestampFormat!;

    return (d: Date) => {
      const tokens: { [key: string]: string } = {
        'YYYY': d.getFullYear().toString(),
        'YY': d.getFullYear().toString().slice(-2),
        'MM': (d.getMonth() + 1).toString().padStart(2, '0'),
        'M': (d.getMonth() + 1).toString(),
        'DD': d.getDate().toString().padStart(2, '0'),
        'D': d.getDate().toString(),
        'HH': d.getHours().toString().padStart(2, '0'),
        'H': d.getHours().toString(),
        'mm': d.getMinutes().toString().padStart(2, '0'),
        'm': d.getMinutes().toString(),
        'ss': d.getSeconds().toString().padStart(2, '0'),
        's': d.getSeconds().toString(),
        'ms': d.getMilliseconds().toString(),
        'SSS': d.getMilliseconds().toString().padStart(3, '0'),
      };

      return timestampFormat.replace(
        /YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s|ms|SSS/g,
        (match) => tokens[match]
      );
    };
  };
}

export const timestamp = TimestampComponent.instance;