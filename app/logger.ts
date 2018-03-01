import { Logger } from '@denali-js/core';
import { LogLevel } from '@denali-js/core/dist/lib/runtime/logger';

export default class ApplicationLogger extends Logger {

  scope(scopeName: string) {
    return new ScopedLogger(scopeName);
  }

}

class ScopedLogger extends ApplicationLogger {

  constructor(private scopeName: string) {
    super();
  }

  log(level: LogLevel, msg: string) {
    console.log(`${ level.toUpperCase() } [${ this.scopeName }] ${ msg }`);
  }

}
