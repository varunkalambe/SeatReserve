package com.seat_reservation_system.srv.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class RedissonConfig {

    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient(
            @Value("${spring.data.redis.host}") String host,
            @Value("${spring.data.redis.port}") int port,
            @Value("${spring.data.redis.password:}") String password,
            @Value("${spring.data.redis.ssl.enabled:false}") boolean ssl
    ) {
        Config config = new Config();

        String scheme =
                ssl
                        ? "rediss://"
                        : "redis://";

        SingleServerConfig singleServer =
                config.useSingleServer()
                        .setAddress(
                                scheme +
                                        host +
                                        ":" +
                                        port
                        )
                        .setConnectionMinimumIdleSize(2)
                        .setConnectionPoolSize(10)
                        .setSubscriptionConnectionMinimumIdleSize(1)
                        .setSubscriptionConnectionPoolSize(5);

        if (password != null &&
                !password.isBlank()) {
            singleServer.setPassword(password);
        }

        return Redisson.create(config);
    }
}