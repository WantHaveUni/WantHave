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
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    // Konfiguration für die CI-Umgebung
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    },
    singleRun: true, // Wichtig für CI: Karma beendet sich nach den Tests
    restartOnFileChange: false
  });
};