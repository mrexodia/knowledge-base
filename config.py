import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///knowledge.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
