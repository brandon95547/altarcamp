-- Runs once, when the data directory is first created.
-- Schema itself is owned by the API's migration runner, not by this file.
ALTER DATABASE altar SET timezone TO 'UTC';
