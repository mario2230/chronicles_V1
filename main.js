const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,           
    height: 720,            
    resizable: false,      
    autoHideMenuBar: true,  
    icon: path.join(__dirname, 'icone.ico'),
    webPreferences: {
      nodeIntegration: true 
    }
  });


  win.setMenu(null);


  win.loadFile('index.html');
}


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {

    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});