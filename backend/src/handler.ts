import { Router } from "itty-router";
import { Spotify } from "./types";

const router = Router();

const SCOPES =
  "playlist-read-private " + // Read private playlists
  "playlist-read-collaborative " + // Read collaborative playlists
  "app-remote-control " + // Control devices using the Web API / needed for changing songs
  "streaming"; // Stream content

const generateRandomString = (length: number) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const generateAuth = () => {
  return "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
};

router.get("/login", () => {
  const state = generateRandomString(16);

  const params = {
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state: state,
    show_dialog: "true",
  };

  const url =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams(params).toString();

  let response = Response.redirect(url);
  response = new Response(response.body, response);
  response.headers.append("Set-Cookie", `spotify-auth-state=${state}`);
  return response;
});

router.get("/callback", async (request: Request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.headers.get("Cookie")?.split("=")[1];

  if (state === null || code === null || state !== storedState) {
    return new Response("State mismatch", { status: 400 });
  }

  const params = {
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  };

  const authResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: generateAuth(),
    },
    body: new URLSearchParams(params).toString(),
  });
  if (!authResponse.ok) {
    return new Response("Error", { status: 500 });
  }

  const json: Spotify.AccessTokenResponse = await authResponse.json();
  const accessToken = json.access_token;
  const refreshToken = json.refresh_token;

  const redirectUrl = new URL(REDIRECT_URI);
  redirectUrl.hash = `access-token=${accessToken}&refresh-token=${refreshToken}`;
  redirectUrl.pathname = "/";

  let response = Response.redirect(redirectUrl.toString());
  response = new Response(response.body, response);
  response.headers.append(
    "Set-Cookie",
    "spotify-auth-state=; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
  return response;
});

router.get("/refresh", async (request: Request) => {
  const url = new URL(request.url);
  const refreshToken = url.searchParams.get("refresh_token");
  if (!refreshToken) {
    return new Response("No refresh token", { status: 400 });
  }
  const authResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: generateAuth(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!authResponse.ok) {
    return new Response("Error", { status: 500 });
  }
  const json: { access_token: string } = await authResponse.json();
  return new Response(JSON.stringify(json), { status: 200 });
});

router.all("*", () => new Response("Not Found.", { status: 404 }));

export default router;
