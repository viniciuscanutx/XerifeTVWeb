const isProduction = true;

export const environment = {
  production: isProduction,
  apiUrl: isProduction
    ? 'https://chelifetvcms.vertraweb.app/'
    : 'http://localhost:5003/',
};