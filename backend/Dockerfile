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
# Render 무료 인스턴스 512MB 대응.
# 힙 35%(≈180MB) + Metaspace 80MB + CodeCache 32MB + 스레드 스택 ≈ 310MB.
# 환경변수 충돌 방지를 위해 여기서 확정한다.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=35 -XX:InitialRAMPercentage=35 -Xss256k -XX:+UseSerialGC -XX:MaxMetaspaceSize=80m -XX:ReservedCodeCacheSize=32m"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
