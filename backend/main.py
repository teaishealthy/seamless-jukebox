"""Backend Server for Seamless Spotify"""
import base64
import os
import random
import string
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv  # type: ignore
from flask import Flask, make_response, redirect, request

load_dotenv()

CLIENT_ID = os.environ["CLIENT_ID"]
CLIENT_SECRET = os.environ["CLIENT_SECRET"]
REDIRECT_URI = os.environ["REDIRECT_URI"]

SCOPES = (
    "playlist-read-private "  # Read private playlists
    "playlist-read-collaborative "  # Read collaborative playlists
    "app-remote-control "  # Control devices using the Web API / needed for changing songs
    "streaming"  # Stream content
)
STATE_KEY = "spotify_auth_state"

app = Flask(__name__)


def generate_auth():
    """Generate the `Basic` authorization header."""
    return base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode("utf-8")).decode(
        "utf-8"
    )


def generate_random_string(length: int) -> str:
    """Generate a random string of a given length for state.
    This is supposed to help with preventing CSRF attacks.

    Parameters
    ----------
    length : int
        The length of the string to generate.

    Returns
    -------
    str
        The generated string.
    """
    return "".join(random.choice(string.ascii_letters) for _ in range(length))


@app.get("/api/login")
def login():
    """Handle login requests from the frontend."""
    state = generate_random_string(16)

    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "scope": SCOPES,
        "redirect_uri": REDIRECT_URI,
        "state": state,
        "show_dialog": True,
    }
    resp = make_response(
        redirect(f"https://accounts.spotify.com/authorize?{urlencode(params)}")
    )
    resp.set_cookie(STATE_KEY, state)
    return resp


@app.get("/api/refresh")
def refresh():
    """Handle a refresh request from the frontend."""
    refresh_token = request.args.get("refresh_token")
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={
            "Authorization": f"Basic {generate_auth()}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
    )
    response.raise_for_status()
    data = response.json()
    return {"access_token": data["access_token"]}


@app.get("/api/callback")
def callback():
    "Handle the callback from spotify."
    code = request.args.get("code")
    state = request.args.get("state")
    stored_state = request.cookies.get(STATE_KEY)

    if not state or state != stored_state:
        return "Invalid state", 403

    response = requests.post(
        "https://accounts.spotify.com/api/token",
        data={
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        headers={"Authorization": f"Basic {generate_auth()}"},
    )
    response.raise_for_status()

    data = response.json()
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]

    resp = make_response(
        redirect(
            "/#"
            + urlencode({"access_token": access_token, "refresh_token": refresh_token})
        )
    )
    resp.set_cookie(STATE_KEY, "", expires=0)

    return resp


if __name__ == "__main__":
    app.run(debug=True)
