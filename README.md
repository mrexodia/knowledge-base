# knowledge-base

## Virtual Environment

Create and activate the virtual environment:

```sh
python -m venv venv
source venv/bin/activate
```

Install the dependencies:

```sh
pip install -r requirements.txt
```

## Database

The `migrations` folder was initialized using:

```sh
flask db init
```

Then the `versions` folder populated using:

```sh
flask db migrate -m "Initial revision"
```

Finally run the migrations:

```sh
flask db upgrade
```

## Debugging

For development you can run the app with auto-reload for the `.py` files:

```sh
flask --app app.py --debug run
```
