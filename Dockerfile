FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --create-home --uid 10001 appuser
COPY --from=build /app/target/srv-0.0.1-SNAPSHOT.jar /app/app.jar
USER appuser
EXPOSE 8080
# Tuned for Render's 512 MB / 0.1 CPU free instance: the default JVM settings give a ~128 MB heap and
# multi-threaded JIT/GC that starved the CPU (162 s boot -> every request got ERR_CONNECTION_RESET).
# Override on Render with the JAVA_TOOL_OPTIONS environment variable if you move to a bigger plan.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Xss512k -Dspring.jmx.enabled=false"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
