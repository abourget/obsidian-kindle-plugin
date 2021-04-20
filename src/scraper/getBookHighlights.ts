import { remote } from 'electron';
import cheerio from 'cheerio';

import { Book, Highlight } from '../models';
import { parseHighlights } from './parser';

const { BrowserWindow, ipcMain } = remote;

export default function getBookHighlights(book: Book): Promise<Highlight[]> {
  return new Promise<Highlight[]>(async (resolve) => {
    const window = new BrowserWindow({
      width: 1000,
      height: 600,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
      },
      show: false,
    });

    /**
     * Everytime page finishes loading, select entire DOM and send to
     * main process for scraping
     */
    window.webContents.on('did-finish-load', async () => {
      await window.webContents.executeJavaScript(
        `require('electron').ipcRenderer.send('pageloaded', document.querySelector('body').innerHTML);`,
      );
    });

    window.webContents.openDevTools();

    await window.loadURL(
      `https://read.amazon.com/notebook?asin=${book.asin}&contentLimitState=&`,
    );

    /**
     * Listens for the `pageloaded` event to parse and scrape HTML
     */
    ipcMain.on('pageloaded', (_event, html) => {
      const $ = cheerio.load(html);

      const highlights = parseHighlights($);

      window.destroy();

      resolve(highlights);
    });
  });
}