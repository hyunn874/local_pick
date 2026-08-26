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
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=35", "-XX:InitialRAMPercentage=35", "-Xss256k", "-XX:+UseSerialGC", "-XX:MaxMetaspaceSize=80m", "-XX:ReservedCodeCacheSize=32m", "-jar", "app.jar"]
