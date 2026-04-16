const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'vi',
    supportedLngs: ['vi', 'en'],
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}.json')
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
      lookupQuerystring: 'lng', // ?lng=en or ?lng=vi
      lookupCookie: 'i18next'
    }
  });

module.exports = {
  i18next,
  middleware
};
