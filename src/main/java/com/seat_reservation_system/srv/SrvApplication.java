package com.seat_reservation_system.srv;

import com.seat_reservation_system.srv.util.AppTime;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@EnableScheduling
@SpringBootApplication
public class SrvApplication {

    public static void main(String[] args) {
        // Containers (Docker/Render) run in UTC. Pin the JVM to the business zone so
        // LocalDateTime.now(), JPA timestamps and scheduled jobs all agree.
        String zoneId = System.getenv().getOrDefault("APP_TIMEZONE", AppTime.DEFAULT_ZONE_ID);
        AppTime.configure(zoneId);
        TimeZone.setDefault(TimeZone.getTimeZone(AppTime.zone()));

        SpringApplication.run(SrvApplication.class, args);
    }
}
