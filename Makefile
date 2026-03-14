dev:
	docker compose -f infra/docker-compose.dev.yml up -d

dev-down:
	docker compose -f infra/docker-compose.dev.yml down

prod:
	docker compose -f infra/docker-compose.yml up --build

prod-down:
	docker compose -f infra/docker-compose.yml down