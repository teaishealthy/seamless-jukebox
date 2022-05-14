# Seamless Jukebox - Backend

## Installation

- Go to https://developer.spotify.com/dashboard/ and create an app.
- Copy .env.example to .env and fill in the values.
- (Optional) Create a new virtual environment and activate it.
- Install the dependencies using `pip install -r requirements.txt`.
- Use a WSGI server of your choice to serve the application.


## Routes

`GET /api/login` - Redirects to the correct authorization url for Spotify.

`GET /api/callback` - Handles the callback from Spotify.

`GET /api/refresh` - Refreshes the access token.

