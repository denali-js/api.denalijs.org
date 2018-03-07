import { Logger } from '@denali-js/core';
import { LogLevel } from '@denali-js/core/dist/lib/runtime/logger';
import { padStart, identity } from 'lodash';

export default class ApplicationLogger extends Logger {

  scope(scopeName: string) {
    return new ScopedLogger(scopeName);
  }

  // Remove once @denali-js/core is updated
  log(level: LogLevel, msg: string) {
    if (this.levels.indexOf(level) === -1) {
      level = this.loglevel;
    }
    let padLength = this.levels.reduce((n: number, label) => Math.max(n, label.length), 0);
    let levelLabel = padStart(level.toUpperCase(), padLength);
    if (this.colorize) {
      let colorizer = this.colors[level] || identity;
      msg = colorizer(msg);
      levelLabel = colorizer(levelLabel);
    }
    let parts: string[] = [];
    if (level !== 'info') {
      parts.push(levelLabel);
    }
    parts.push(msg);
    /* tslint:disable:no-console no-debugger */
    console.log(parts.join(' '));
    if (level === 'error') {
      debugger;
    }
    /* tslint:enable:no-console no-debugger*/
  }

}

class ScopedLogger extends ApplicationLogger {

  constructor(private scopeName: string) {
    super();
  }

  log(level: LogLevel, msg: string) {
    /* tslint:disable:no-console no-debugger */
    console.log(`${ level.toUpperCase() } [${ this.scopeName }] ${ msg }`);
  }

}
