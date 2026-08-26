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
FROM eclipse-temurin:22-jre
WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV TZ=Asia/Seoul
EXPOSE 8080

# Render 무료 인스턴스 512MB 대응.
# exec form 배열이라 셸 변수 확장이 필요 없다.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=35", "-XX:InitialRAMPercentage=35", "-Xss256k", "-XX:+UseSerialGC", "-XX:MaxMetaspaceSize=80m", "-XX:ReservedCodeCacheSize=32m", "-jar", "app.jar"]
