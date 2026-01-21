# Login
docker login registry.kub2.fh-joanneum.at

# Build & Push Frontend
docker build -t registry.kub2.fh-joanneum.at/want-have/frontend:dev -f wantHave_frontend/Dockerfile wantHave_frontend/
docker push registry.kub2.fh-joanneum.at/want-have/frontend:dev

# Build & Push Backend
docker build -t registry.kub2.fh-joanneum.at/want-have/backend:dev -f wantHave_backend/Dockerfile wantHave_backend/
docker push registry.kub2.fh-joanneum.at/want-have/backend:dev

# Test
