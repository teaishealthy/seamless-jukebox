import router from "./handler";

addEventListener("fetch", (event) => {
  event.respondWith(router.handle(event.request));
});
