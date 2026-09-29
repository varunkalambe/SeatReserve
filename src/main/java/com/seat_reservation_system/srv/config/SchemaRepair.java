package com.seat_reservation_system.srv.config;

import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.entity.SeatStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Fixes a classic Hibernate 6/7 + {@code ddl-auto=update} trap.
 *
 * <p>For {@code @Enumerated(EnumType.STRING)} columns Hibernate creates a CHECK constraint such as
 * {@code CHECK (status IN ('PENDING','CONFIRMED','EXPIRED'))} when the table is first created.
 * {@code ddl-auto=update} NEVER changes an existing constraint. So when a new enum value
 * ({@code CANCELLED}) is added later, every {@code UPDATE ... SET status='CANCELLED'} is rejected by
 * PostgreSQL with "violates check constraint" - the booking cannot be cancelled and nothing is
 * refunded, while everything else keeps working.
 *
 * <p>On start-up (after Hibernate has updated the schema) this runner looks at the CHECK
 * constraints of the enum-backed status columns, drops the ones that are missing a value the code
 * knows about, and re-creates a correct one. It is idempotent, PostgreSQL-only, and can never stop
 * the application from starting. Every decision is logged with the {@code [SCHEMA]} prefix.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class SchemaRepair implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaRepair.class);

    private final DataSource dataSource;

    public SchemaRepair(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    private record EnumColumn(String table, String column, List<String> values) {
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("[SCHEMA] checking enum CHECK constraints ...");

        try (Connection connection = dataSource.getConnection()) {
            String product = connection.getMetaData().getDatabaseProductName();

            if (product == null || !product.toLowerCase().contains("postgres")) {
                log.info("[SCHEMA] database is '{}', not PostgreSQL - nothing to repair", product);
                return;
            }

            connection.setAutoCommit(true);

            List<EnumColumn> targets = List.of(
                    new EnumColumn("reservations", "status",
                            Arrays.stream(ReservationStatus.values()).map(Enum::name).toList()),
                    new EnumColumn("trip_seats", "status",
                            Arrays.stream(SeatStatus.values()).map(Enum::name).toList())
            );

            for (EnumColumn target : targets) {
                repair(connection, target);
            }

            log.info("[SCHEMA] check finished");
        } catch (Exception exception) {
            // Never block start-up because of a repair problem.
            log.error("[SCHEMA] repair failed - the application continues without it", exception);
        }
    }

    private void repair(Connection connection, EnumColumn target) throws Exception {
        List<String> staleConstraints = new ArrayList<>();
        boolean hasCompleteConstraint = false;
        Pattern columnPattern = Pattern.compile("\\b" + Pattern.quote(target.column()) + "\\b");

        String sql = """
                select c.conname, pg_get_constraintdef(c.oid)
                from pg_constraint c
                join pg_class t on t.oid = c.conrelid
                join pg_namespace n on n.oid = t.relnamespace
                where c.contype = 'c'
                  and t.relname = ?
                  and n.nspname = current_schema()
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, target.table());

            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String name = rows.getString(1);
                    String definition = rows.getString(2);

                    log.info("[SCHEMA] {}.{} constraint '{}' = {}",
                            target.table(), target.column(), name, definition);

                    if (definition == null || !columnPattern.matcher(definition).find()) {
                        continue;
                    }

                    List<String> missing = target.values().stream()
                            .filter(value -> !definition.contains("'" + value + "'"))
                            .toList();

                    if (missing.isEmpty()) {
                        hasCompleteConstraint = true;
                    } else {
                        log.warn("[SCHEMA] constraint '{}' on {} is STALE - it does not allow {}",
                                name, target.table(), missing);
                        staleConstraints.add(name);
                    }
                }
            }
        }

        try (Statement statement = connection.createStatement()) {
            for (String name : staleConstraints) {
                log.warn("[SCHEMA] dropping stale constraint {}.{}", target.table(), name);
                statement.execute("ALTER TABLE \"" + target.table() + "\" DROP CONSTRAINT \"" + name + "\"");
            }

            if (!staleConstraints.isEmpty() && !hasCompleteConstraint) {
                String allowed = String.join(",", target.values().stream().map(v -> "'" + v + "'").toList());
                String newName = "chk_" + target.table() + "_" + target.column() + "_enum";

                statement.execute("ALTER TABLE \"" + target.table() + "\" DROP CONSTRAINT IF EXISTS \"" + newName + "\"");
                statement.execute("ALTER TABLE \"" + target.table() + "\" ADD CONSTRAINT \"" + newName
                        + "\" CHECK (\"" + target.column() + "\" IN (" + allowed + "))");

                log.warn("[SCHEMA] created constraint {} allowing {}", newName, target.values());
            } else if (staleConstraints.isEmpty()) {
                log.info("[SCHEMA] {}.{} constraints are up to date", target.table(), target.column());
            }
        }
    }
}
