up:
	docker-compose up -d

down:
	docker-compose down --remove-orphans

test:
	npm test

start: up
	npm start
