# ---- build ----
FROM eclipse-temurin:22-jdk AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# ---- run ----
FROM eclipse-temurin:22-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod
ENV TZ=Asia/Seoul
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "unset JAVA_TOOL_OPTIONS && unset JAVA_OPTS && exec java -jar app.jar"]
