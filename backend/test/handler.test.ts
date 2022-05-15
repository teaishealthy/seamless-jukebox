import router from "../src/handler";

declare var global: any;

describe("handler /login", () => {
  test("handle /login", async () => {
    const result = await router.handle(new Request("http://localhost/login"));
    // Make sure we got a redirect
    expect(result.status).toBe(302);
    // Make sure we got a redirect to the right place
    expect(result.headers.get("Location")).toContain(
      "https://accounts.spotify.com/authorize"
    );
  });
});

describe("handler /callback", () => {
  beforeAll(() => {
    global.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            access_token: "access-token",
            refresh_token: "refresh-token",
          }),
        ok: true,
      });
  });
  test("handle /callback", async () => {
    const request = new Request(
      "http://localhost/callback?code=123&state=12345"
    );
    request.headers.set("Cookie", "spotify-auth-state=12345");
    const result = await router.handle(request);
    // Make sure we got a redirect
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toContain(
      "/#access-token=access-token&refresh-token=refresh-token"
    );
  });

  test("handle /callback with invalid state", async () => {
    const request = new Request(
      "http://localhost/callback?code=123&state=12345"
    );
    request.headers.set("Cookie", "spotify-auth-state=67890");
    const result: Response = await router.handle(request);
    // Make sure we got a redirect
    expect(result.status).toBe(400);
    const body = await result.body!.getReader().read();
    const text = new TextDecoder().decode(body.value);
    expect(text).toBe("State mismatch");
  });
});

describe("handler /callback with invalid access token", () => {
  beforeAll(() => {
    global.fetch = () =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            access_token: "access-token",
            refresh_token: "refresh-token",
          }),
        ok: false,
      });
  });
  test("handle /callback", async () => {
    const request = new Request(
      "http://localhost/callback?code=123&state=12345"
    );
    request.headers.set("Cookie", "spotify-auth-state=12345");
    const result: Response = await router.handle(request);
    expect(result.status).toBe(500);
  });
});

describe("handler /refresh", () => {
  beforeAll(() => {
    global.fetch = () =>
      Promise.resolve({
        json: () => Promise.resolve({ access_token: "access-token" }),
        ok: true,
      });
  });
  test("handle /refresh", async () => {
    const request = new Request("http://localhost/refresh?refresh_token=123");
    const result = await router.handle(request);
    // Make sure we got a redirect
    const json = await result.json();
    expect(json).toEqual({ access_token: "access-token" });
    expect(result.status).toBe(200);
  });

  test("handle /refresh with no refresh token", async () => {
    const request = new Request("http://localhost/refresh");
    const result: Response = await router.handle(request);
    expect(result.status).toBe(400);
  });
});

describe("handler /refresh with invalid access token", () => {
  beforeAll(() => {
    global.fetch = () =>
      Promise.resolve({
        json: () => Promise.resolve({ access_token: "access-token" }),
        ok: false,
      });
  });
  test("handle /refresh", async () => {
    const request = new Request("http://localhost/refresh?refresh_token=123");
    const result: Response = await router.handle(request);
    expect(result.status).toBe(500);
  });
});
