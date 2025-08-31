CREATE TABLE IF NOT EXISTS AUTH(
id integer NOT NULL PRIMARY KEY,
user_id integer NOT NULL,
method varchar(10) NOT NULL,
secret varchar(255) DEFAULT NULL,
-- tempSecret varchar(255) DEFAULT NULL,
-- tempSecretExpires TIMESTAMP DEFAULT NULL,
counter integer DEFAULT NULL
);

CREATE SEQUENCE IF NOT EXISTS AUTH_SEQ START 1;

INSERT INTO AUTH (id, user_id, method)
VALUES
(nextval('AUTH_SEQ'), 1, 'biometrics');

SELECT * FROM AUTH;