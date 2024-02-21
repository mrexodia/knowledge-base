import os

from flask import Flask, request
from sqlalchemy.exc import SQLAlchemyError
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from model import *
import validators

app = Flask(__name__)
env_config = os.getenv("APP_SETTINGS", "config.Config")
app.config.from_object(env_config)
db = SQLAlchemy(app, model_class=Base)
migrate = Migrate(app, db)

# Make sure the database has been migrated
if not migrate.command:
    with app.app_context():
        check_revision(db.engine, migrate.get_config())

@app.errorhandler(AssertionError)
def handle_assertion(e: AssertionError):
    message = str(e).strip()
    if len(message) == 0:
        message = "Assertion error (no message)"
    return message, 400

@app.route("/")
def index():
    return f"knowledge-base"

@app.route("/links", methods=["GET", "POST"])
def links():
    if request.method == "GET":
        result = []
        for link in db.session.query(Link).all():
            result.append({
                'id': link.id,
                'url': link.url,
                'index_time': utc_to_local(link.index_time).timestamp(),
            })
        return result
    elif request.method == "POST":
        assert len(request.data) > 0, "No data"
        assert request.content_type is not None, "Missing Content-Type header"
        if request.content_type == "application/json":
            urls = []
            for url in request.get_json():
                assert isinstance(url, str), "Invalid type"
                urls.append(url)
        elif request.content_type == "text/plain":
            urls = [url.strip() for url in request.get_data(as_text=True).splitlines()]
        else:
            assert False, f"Unknown Content-Type: {request.content_type}"
        print(f"Add URLs: {urls}")
        def map_link(url):
            assert validators.url(url), f"Invalid URL: {url}"
            return Link(url)
        links = [map_link(url) for url in urls]
        count = Link.insert_deduplicated(db.session, links, Link.url)
        db.session.commit()
        return f"Added {count} new link(s)"
