# Lộ Trình Học Docker & Hạ Tầng Đa Container Trong TeamHub

Thư mục này phân tích toàn diện công nghệ **Containerization (Docker)** và công cụ điều phối **Docker Compose** — nền tảng giúp TeamHub vận hành đồng thời 6 dịch vụ độc lập một cách nhất quán trên mọi môi trường.

---

## 🗺️ Bản Đồ Lộ Trình Chuyên Đề (Roadmap)

| STT | Tài liệu | Trọng tâm kiến thức |
| :---: | :--- | :--- |
| **01** | [`01-containerization-and-compose.md`](./01-containerization-and-compose.md) | **Bản chất Container & Docker Compose:** Container vs Virtual Machine, phân tích kiến trúc đa dịch vụ của TeamHub, và One-Shot Initialization Pattern (`minio-init`). |
| **02** | [`02-networking-and-volumes.md`](./02-networking-and-volumes.md) | **Mạng Nội Bộ & Bền Vững Dữ Liệu:** Docker Bridge Network, cơ chế DNS Service Discovery (`redis:6379`, `postgres:5432`), và quản lý dữ liệu bền vững bằng Named Volumes. |

---

## 🎯 Kiến Trúc Các Container Trong TeamHub

```
                                  [ DOCKER BRIDGE NETWORK ]
                                              │
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ▼                  ▼                 ▼                 ▼                  ▼
┌─────────────────┐┌─────────────────┐┌────────────────┐┌────────────────┐┌─────────────────┐
│ teamhub-backend ││ teamhub-worker  ││teamhub-postgres││ teamhub-redis  ││  teamhub-minio  │
│ Node.js/Express ││ BullMQ Consumer ││  PostgreSQL 16 ││    Redis 7     ││ S3 Compatible   │
│ Port: 4000      ││ Port: 4001      ││  Port: 5432    ││   Port: 6379   ││ Port: 9000/9001 │
└─────────────────┘└─────────────────┘└───────┬────────┘└────────────────┘└────────┬────────┘
                                              │                                    │
                                              ▼                                    ▼
                                     [ postgres_data ]                       [ minio_data ]
                                      (Named Volume)                         (Named Volume)
```
