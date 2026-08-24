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
# Render 무료 인스턴스는 메모리가 512MB 라 힙을 제한한다.
# 힙 50%(≈256MB) + Tomcat 20스레드 × 512KB 스택 + Metaspace ≈ 330MB 로
# OOM 마진을 확보한다. SerialGC 는 힙이 작을 때 오버헤드가 가장 낮다.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=50 -XX:InitialRAMPercentage=50 -Xss512k -XX:+UseSerialGC"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
