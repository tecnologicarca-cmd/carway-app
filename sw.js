'use strict';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (nomes) {
        return Promise.all(
          nomes.map(function (nome) {
            return caches.delete(nome);
          })
        );
      })
      .then(function () {
        return self.registration.unregister();
      })
      .then(function () {
        return self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
      })
      .then(function (clientes) {
        clientes.forEach(function (cliente) {
          cliente.navigate(cliente.url);
        });
      })
  );
});
