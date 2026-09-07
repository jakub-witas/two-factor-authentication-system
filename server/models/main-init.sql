CREATE TABLE IF NOT EXISTS USERS(
id integer NOT NULL PRIMARY KEY,
email varchar(50) NOT NULL,
name varchar(60) NOT NULL,
password varchar(255) NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS USERS_SEQ START 1;

INSERT INTO USERS (id, email, name, password)
VALUES 
(nextval('USERS_SEQ'), 'admin@admin.pl', 'Jakub Witas', '$2a$12$nw/wI6YyBZtQNypml2G8nOGLOol/F20lOdQnv2IfhRrSEwwOJbOUa'),
(nextval('USERS_SEQ'), 'test@admin.pl', 'Maciej Witas', '$2a$12$nw/wI6YyBZtQNypml2G8nOGLOol/F20lOdQnv2IfhRrSEwwOJbOUa');

SELECT * FROM USERS;