/**
 * Entry point of the Election app.
 */
// tslint:disable: completed-docs max-classes-per-file
import { app, BrowserWindow, TouchBarScrubber } from 'electron';
// tslint:disable-next-line: match-default-export-name import-name no-console
import * as path from 'path';
import * as url from 'url';
const { ipcMain } = require('electron')

let mainWindow: Electron.BrowserWindow | null;
require('dotenv').config();

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            webSecurity: false,            
            // enableRemoteModule:true,
            // nodeIntegrationInWorker: true,    
            // nodeIntegration: true,    
            contextIsolation :true,
            preload: __dirname + "/renderer.bundle.js", // use a preload script
            devTools: process.env.NODE_ENV === 'production' ? false : true
        }
    });

    const ipfsHash = process.env.IPFS_HASH || 'QmPzxdMJThwggymZK7okhHFMxzZFfHt3hd73N6k1ma4A8X';
    console.log("env hash " + process.env.IPFS_HASH);
    console.log("loading ipfs hash: " + ipfsHash);
    let query = process.env.QUERY || '?m=static/manifests/evmevmrelay1.yaml#/admin/event-log';
    //let windowUrl =  `https://ipfs.liquidapps.io/ipfs/${ipfsHash}/${query}`;

    let windowUrl = `https://ipfs.liquidapps.io/ipfs/${ipfsHash}/${query}`;

    // windowUrl = 'file://' +__dirname+ '/../../dist/index.html'
    console.log("windowUrl: " + windowUrl);

    mainWindow.loadURL(windowUrl);
    
    mainWindow.webContents.on('did-finish-load', () => {        
        console.log('finish load');
        if(mainWindow)
            mainWindow.webContents.send('getKey', 'whoooooooh!')
    });
    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}
ipcMain.on("log", (event:any, args:any) => {
    console.log('log',event,args);    
  });
  ipcMain.on("getKey", (event:any, args:any) => {
    if(mainWindow)
        mainWindow.webContents.send("getKey", args + ":testKey");
  });

  //       

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
app.on('activate', () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
