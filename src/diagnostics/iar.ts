/**
 * Module for parsing IAR diagnostics
 */ /** */

import * as vscode from 'vscode';

import {oneLess, RawDiagnosticParser, FeedLineResult, RawDiagnostic} from './util';

const CODE_REGEX
    = /^\"(?<file>.*)\",(?<line>\d+)\s+(?<severity>[A-Za-z]+)\[(?<code>[A-Za-z]+[0-9]+)\]:/;

const POINTER_REGEX = /^( +)\^$/;

enum ParserState {
  init,
  pending_code,
  pending_message,
}
export class Parser extends RawDiagnosticParser {
  private state: ParserState = ParserState.init;
  private pending_diagnostic: RawDiagnostic|null = null;
  private pending_column: number|null = null;

  private translateSeverity(iar_severity: string): string {
    switch (iar_severity) {
      case 'Error':
        return 'error';
      case 'Warning':
        return 'warning';
      default:
        return 'info';
    }
  }

  private reset() {
    this.state = ParserState.init;
    this.pending_diagnostic = null;
    this.pending_column = null;
  }

  doHandleLine(line: string) {
    switch (this.state) {
      case ParserState.init: {
        const mat = POINTER_REGEX.exec(line);
        if (!mat) {
          return FeedLineResult.NotMine;
        }

        this.pending_column = mat[1].length - 2;
        this.state = ParserState.pending_code;
        return FeedLineResult.Ok;
      }
      case ParserState.pending_code: {
        const mat = CODE_REGEX.exec(line);
        if (!mat) {
          // unexpected, reset state
          this.reset();
          return FeedLineResult.NotMine;
        }

        const [full, file, lineno = '1', severity, code] = mat;
        if (file && severity) {
          this.pending_diagnostic = {
            full: full,
            file: file,
            location : new vscode.Range(oneLess(lineno), this.pending_column ?? 0, oneLess(lineno), 999),
            severity: this.translateSeverity(severity),
            message: "",
            code: code,
            related : []
          };

          this.state = ParserState.pending_message;
          return FeedLineResult.Ok;
        }
        break;
      }
      case ParserState.pending_message: {
        const diagnostic = this.pending_diagnostic!;

        if (line === '' || line[0] !== ' ') {
          this.reset();
          return diagnostic;
        }

        if (diagnostic.message !== '') {
          diagnostic.message += '\n';
        }

        diagnostic.message += line.trim();
        diagnostic.full += `\n${line}`;
        return FeedLineResult.Ok;
      }
    }

    return FeedLineResult.NotMine;
  }
}
