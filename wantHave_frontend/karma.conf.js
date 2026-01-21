module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('jasmine-core'),
      require('karma-chrome-launcher'),
      require('karma-jasmine'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      // HINWEIS: Das '@angular-devkit/build-angular/plugins/karma' Plugin 
      // wird von neueren Angular-Buildern automatisch geladen. 
    ],
    client: {
      jasmine: {
        // Jasmine Konfigurationen können hier hinzugefügt werden
      },
      clearContext: false // Lässt das Jasmine Spec Runner Ergebnis im Browser sichtbar
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: process.env.CI ? ['progress'] : ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    // Timeout-Konfiguration für CI-Umgebung
    browserDisconnectTimeout: 10000,
    browserNoActivityTimeout: 60000,
    captureTimeout: 60000,
    processKillTimeout: 5000,
    // Konfiguration für die CI-Umgebung
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--headless=new'
        ]
      }
    },
    singleRun: true,
    restartOnFileChange: false
  });
};