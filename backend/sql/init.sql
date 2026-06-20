-- iKuai Console — ISP backend schema (MySQL 5.7+ / 8.x)
--
-- Run once before starting the backend:
--   mysql -u root -p < backend/sql/init.sql
--
-- The backend ALSO creates the database/table automatically on boot if the
-- account has privileges; this script is for environments where the DB user
-- has no CREATE-DATABASE rights, or you prefer to provision it explicitly.

CREATE DATABASE IF NOT EXISTS `ikuai_console`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `ikuai_console`;

-- One row per probe cycle (every PROBE_INTERVAL_MS, default 5 minutes).
CREATE TABLE IF NOT EXISTS `probes` (
  `ts`             BIGINT       NOT NULL COMMENT 'unix seconds (primary key)',
  `online`         TINYINT      NOT NULL COMMENT '0/1: at least one target reachable',
  `isp`            VARCHAR(255) NULL     COMMENT 'resolved ISP name (geo-IP)',
  `ip`             VARCHAR(64)  NULL     COMMENT 'WAN public IP at probe time',
  `lat_isp`        DOUBLE       NULL     COMMENT 'ms, ICMP to WAN gateway',
  `lat_cloudflare` DOUBLE       NULL     COMMENT 'ms, TCP:443',
  `lat_google`     DOUBLE       NULL     COMMENT 'ms, TCP:443',
  `lat_github`     DOUBLE       NULL     COMMENT 'ms, TCP:443',
  `lat_microsoft`  DOUBLE       NULL     COMMENT 'ms, TCP:443',
  PRIMARY KEY (`ts`),
  KEY `idx_probes_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: a dedicated, least-privilege account for the backend.
-- Adjust the password, then point backend/.env DB_USER / DB_PASSWORD at it.
--
-- CREATE USER IF NOT EXISTS 'ikuai'@'%' IDENTIFIED BY 'change-me';
-- GRANT SELECT, INSERT, UPDATE ON `ikuai_console`.* TO 'ikuai'@'%';
-- FLUSH PRIVILEGES;
