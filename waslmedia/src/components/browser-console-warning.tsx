'use client';

import { useEffect } from 'react';

export function getProductionConsoleGuardScript() {
  return `
    (function () {
      if (typeof window === 'undefined' || window.__waslmediaConsoleGuardInstalled) {
        return;
      }
      window.__waslmediaConsoleGuardInstalled = true;
      var noop = function () { return undefined; };
      var methods = ['clear', 'log', 'info', 'warn', 'debug', 'error', 'trace', 'dir', 'dirxml', 'table', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'count', 'countReset', 'assert'];
      for (var index = 0; index < methods.length; index += 1) {
        var method = methods[index];
        if (window.console && typeof window.console[method] === 'function') {
          window.console[method] = noop;
        }
      }
    })();
  `;
}

function installProductionConsoleGuard() {
  if (typeof window === 'undefined' || window.__waslmediaConsoleGuardInstalled) {
    return;
  }

  window.__waslmediaConsoleGuardInstalled = true;
  const noop = () => undefined;
  const methods = [
    'clear',
    'log',
    'info',
    'warn',
    'debug',
    'error',
    'trace',
    'dir',
    'dirxml',
    'table',
    'group',
    'groupCollapsed',
    'groupEnd',
    'time',
    'timeEnd',
    'timeLog',
    'count',
    'countReset',
    'assert',
  ];
  const browserConsole = window.console as unknown as Record<string, unknown>;

  for (const method of methods) {
    if (typeof browserConsole[method] === 'function') {
      browserConsole[method] = noop;
    }
  }
}

declare global {
  interface Window {
    __waslmediaConsoleGuardInstalled?: boolean;
  }
}

export function BrowserConsoleWarning() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || typeof window === 'undefined') {
      return;
    }

    if (window.__waslmediaConsoleGuardInstalled) {
      return;
    }

    installProductionConsoleGuard();
  }, []);

  return null;
}
