# Compila el frontend estático.
FROM node:22-alpine AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Empaqueta el frontend dentro de Spring Boot para mantener una sola URL pública.
FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /workspace/backend
COPY backend/mvnw ./mvnw
COPY backend/.mvn/ ./.mvn/
COPY backend/pom.xml ./pom.xml
COPY backend/src/ ./src/
COPY --from=frontend-build /workspace/frontend/dist/ ./src/main/resources/static/
RUN chmod +x ./mvnw && ./mvnw -B -DskipTests package

# Ejecuta el backend con el puerto asignado por el proveedor.
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=backend-build /workspace/backend/target/retail-0.0.1-SNAPSHOT.jar ./app.jar
ENV PORT=8081
EXPOSE 8081
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=70.0 -jar /app/app.jar --server.port=${PORT:-8081}"]